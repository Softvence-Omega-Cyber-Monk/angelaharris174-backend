import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentService {
  constructor(private prisma: PrismaService) {}

  // Create commnet
  async createComment(userId: string, dto: CreateCommentDto) {
    const { content, postId, parentId } = dto;

    return await this.prisma.client.$transaction(async (tx) => {
      // Create new comment
      const newComment = await tx.comment.create({
        data: {
          content,
          userId,
          postId,
          parentId: parentId || null,
        },
        include: {
          user: {
            select: { athleteFullName: true, imgUrl: true },
          },
        },
      });

      // Count comment
      await tx.post.update({
        where: { id: postId },
        data: {
          comments: { increment: 1 },
        },
      });

      return newComment;
    });
  }

  // Update Comment
  async updateComment(
    commentId: string,
    userId: string,
    dto: UpdateCommentDto,
  ) {
    // 1. Check comment if the user available
    const comment = await this.prisma.client.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only update your own comments');
    }

    // 2. Update comment
    return await this.prisma.client.comment.update({
      where: { id: commentId },
      data: {
        content: dto.content,
      },
      include: {
        user: {
          select: { athleteFullName: true, imgUrl: true },
        },
      },
    });
  }
}
