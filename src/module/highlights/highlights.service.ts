import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { HighlightsDto } from './dto/highlights.dto';
import { RemoveClipDto } from './dto/remove-clip.dto';

@Injectable()
export class HighlightsService {
  private readonly logger = new Logger(HighlightsService.name);

  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
  ) {}

  async mergeVideo(
    userId: string,
    dto: HighlightsDto,
    files: Express.Multer.File[],
  ) {
    try {
      if (!files || files.length < 2) {
        throw new InternalServerErrorException(
          'At least 2 video clips are required for merging',
        );
      }

      // 1. Create a highlight record in the database with isProcessing = true
      // We store an initial placeholder for clips, which we'll update soon
      const highlight = await this.prisma.client.highlights.create({
        data: {
          caption: dto.caption,
          description: dto.description,
          userId: userId,
          clips: [] as any,
          isProcessing: true,
        },
      });

      try {
        // 2. Upload each clip to S3 and collect information
        const uploadedClips = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const url = await this.s3Service.uploadVideo(file);
          const s3Key = this.s3Service.extractKeyFromUrl(url);

          uploadedClips.push({
            key: file.originalname,
            s3Key: s3Key,
            url: url,
            order: i,
          });
        }

        // 3. Perform video merging
        const mergedVideoUrl = await this.s3Service.mergeVideos(
          uploadedClips.map((c) => ({ s3Key: c.s3Key, order: c.order })),
        );
        const highLightsLink = `${process.env.BASE_URL}/?videoUrl=${mergedVideoUrl}`;
        // 4. Update the highlight record with the merged video URL and final clip list
        const updatedHighlight = await this.prisma.client.highlights.update({
          where: { id: highlight.id },
          data: {
            mergedVideoUrl: mergedVideoUrl,
            clips: uploadedClips as any,
            isProcessing: false,
            highLightsLink: highLightsLink,
          },
        });

        return updatedHighlight;
      } catch (error) {
        // If merging fails, we should still set isProcessing = false
        await this.prisma.client.highlights
          .update({
            where: { id: highlight.id },
            data: { isProcessing: false },
          })
          .catch(() => {}); // Ignore update error if it happens during error handling
        throw error;
      }
    } catch (error) {
      if (
        error instanceof InternalServerErrorException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to process video merging: ${error.message}`,
      );
    }
  }

  async removeClip(dto: RemoveClipDto) {
    // 1. Find the highlight
    const highlight = await this.prisma.client.highlights.findUnique({
      where: { id: dto.highlightId },
    });

    if (!highlight) {
      throw new BadRequestException('Highlight not found');
    }

    const clips = (highlight.clips as any[]) || [];
    const clipIndex = clips.findIndex((c) => c.order === dto.order);

    if (clipIndex === -1) {
      throw new BadRequestException('Clip with specified order not found');
    }

    const clipToRemove = clips[clipIndex];
    const remainingClips = clips.filter((_, index) => index !== clipIndex);

    // 2. Re-order remaining clips to maintain sequence
    const updatedClips = remainingClips.map((c, index) => ({
      ...c,
      order: index,
    }));

    // 3. Update database with isProcessing = true
    await this.prisma.client.highlights.update({
      where: { id: highlight.id },
      data: { isProcessing: true },
    });

    try {
      // 4. Delete the clip from S3
      if (clipToRemove.url) {
        await this.s3Service.deleteFile(clipToRemove.url).catch((err) => {
          this.logger.error(`Failed to delete clip from S3: ${err.message}`);
        });
      }

      // 5. Delete the old merged video from S3
      if (highlight.mergedVideoUrl) {
        await this.s3Service
          .deleteFile(highlight.mergedVideoUrl)
          .catch((err) => {
            this.logger.error(
              `Failed to delete old merged video from S3: ${err.message}`,
            );
          });
      }

      // 6. Re-merge if there are at least 2 clips remaining
      let newMergedVideoUrl = null;
      if (updatedClips.length >= 2) {
        newMergedVideoUrl = await this.s3Service.mergeVideos(
          updatedClips.map((c) => ({ s3Key: c.s3Key, order: c.order })),
        );
      }

      // 7. Final update
      const result = await this.prisma.client.highlights.update({
        where: { id: highlight.id },
        data: {
          clips: updatedClips as any,
          mergedVideoUrl: newMergedVideoUrl,
          isProcessing: false,
        },
      });

      return result;
    } catch (error) {
      await this.prisma.client.highlights
        .update({
          where: { id: highlight.id },
          data: { isProcessing: false },
        })
        .catch(() => {});
      throw new InternalServerErrorException(
        `Failed to remove clip and re-merge: ${error.message}`,
      );
    }
  }

  async getAllHighlights() {
    return this.prisma.client.highlights.findMany({
      include: {
        user: {
          select: {
            id: true,
            athleteFullName: true,
            imgUrl: true,
            role: true,
            createdAt: true,
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async incrementLike(highlightId: string, userId: string) {
    // 1. Verify the highlight exists
    const highlight = await this.prisma.client.highlights.findUnique({
      where: { id: highlightId },
    });

    if (!highlight) {
      throw new BadRequestException('Highlight not found');
    }

    // 2. Check if the user has already liked this highlight
    const existingLike = await this.prisma.client.likeHighlights.findUnique({
      where: {
        userId_highlightId: {
          userId,
          highlightId,
        },
      },
    });

    if (existingLike) {
      // --- UNLIKE LOGIC ---
      // Delete the like record
      await this.prisma.client.likeHighlights.delete({
        where: {
          id: existingLike.id, // Assuming 'id' is the primary key of the like table
          // OR use your composite key if no single ID exists:
          // userId_highlightId: { userId, highlightId }
        },
      });

      // Decrement the like count on the highlight
      return this.prisma.client.highlights.update({
        where: { id: highlightId },
        data: {
          likes: { decrement: 1 },
        },
      });
    } else {
      // --- LIKE LOGIC ---
      // Create the new like record
      await this.prisma.client.likeHighlights.create({
        data: {
          userId,
          highlightId,
        },
      });

      // Increment the like count on the highlight
      return this.prisma.client.highlights.update({
        where: { id: highlightId },
        data: {
          likes: { increment: 1 },
        },
      });
    }
  }

  async incrementView(highlightId: string) {
    const highlight = await this.prisma.client.highlights.findUnique({
      where: { id: highlightId },
    });

    if (!highlight) {
      throw new BadRequestException('Highlight not found');
    }

    return highlight;
  }

  async deleteHighlight(
    highlightId: string,
    userId: string,
    userRole?: string,
  ) {
    const highlight = await this.prisma.client.highlights.findUnique({
      where: { id: highlightId },
    });

    if (!highlight) {
      throw new NotFoundException('Highlight not found');
    }

    const clips = (highlight.clips as any[]) || [];
    const urlsToDelete = [
      ...clips.map((c) => c?.url).filter(Boolean),
      highlight.mergedVideoUrl,
    ].filter(Boolean) as string[];

    for (const url of urlsToDelete) {
      await this.s3Service.deleteFile(url);
    }

    await this.prisma.client.$transaction([
      this.prisma.client.likeHighlights.deleteMany({
        where: { highlightId },
      }),
      this.prisma.client.highlights.delete({
        where: { id: highlightId },
      }),
    ]);

    return { message: 'Highlight deleted successfully' };
  }
}
