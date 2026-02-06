import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LikeService {
  constructor(private prisma: PrismaService) {}

  async toggleLike(postId: string, userId: string) {
    const existingLike = await this.prisma.client.like.findUnique({
      where: {
        userId_postId: { userId, postId }, // Composite key used
      },
    });

    return await this.prisma.client.$transaction(async (tx) => {
      if (existingLike) {
        await tx.like.delete({
          where: { id: existingLike.id },
        });

        await tx.post.update({
          where: { id: postId },
          data: { likes: { decrement: 1 } },
        });

        return { liked: false, message: 'Like removed' };
      } else {
        await tx.like.create({
          data: { userId, postId },
        });

        await tx.post.update({
          where: { id: postId },
          data: { likes: { increment: 1 } },
        });

        return { liked: true, message: 'Post liked' };
      }
    });
  }
}
