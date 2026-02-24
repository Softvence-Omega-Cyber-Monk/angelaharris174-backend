import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeedService {
  constructor(private prisma: PrismaService) {}

  async getSmartFeed(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const dbTake = skip + limit;

    const [posts, highlightsList] = await Promise.all([
      this.prisma.client.post.findMany({
        include: {
          images: {
            select: {
              id: true,
              url: true,
            },
          },
          user: {
            select: {
              id: true,
              athleteFullName: true,
              imgUrl: true,
              isActive: true,
              subscribeStatus: true,
            },
          },
          likesList: { where: { userId }, select: { id: true } },
          views: { where: { userId }, select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: dbTake,
      }),
      this.prisma.client.highlights.findMany({
        where: { isProcessing: false },

        select: {
          id: true,
          mergedVideoUrl: true,
          caption: true,
          description: true,
          userId: true,
          isProcessing: true,
          likes: true,
          views: true,
          createdAt: true,
          highLightsLink: true,
          user: {
            select: {
              id: true,
              athleteFullName: true,
              imgUrl: true,
              isActive: true,
              subscribeStatus: true,
            },
          },
          likedBy: {
            where: { userId },
            select: { id: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: dbTake,
      }),
    ]);

    const combinedFeed = [
      ...posts.map(({ likesList, views, ...p }) => ({
        ...p,
        feedType: 'POST',
        totalLikes: p.likes || 0,
        totalViews: p.viewCount || 0,
        isSeen: views.length > 0,
        isLiked: likesList.length > 0,
      })),
      ...highlightsList.map(({ likedBy, ...h }) => ({
        ...h,
        feedType: 'HIGHLIGHT',
        totalLikes: h.likes || 0,
        totalViews: h.views || 0,
        isSeen: false,
        isLiked: likedBy.length > 0,
      })),
    ];

    const now = Date.now();
    const oneDayInMs = 24 * 60 * 60 * 1000;

    const sortedFeed = combinedFeed.sort((a, b) => {
      if (a.isSeen !== b.isSeen) return a.isSeen ? 1 : -1;

      const isANew = now - a.createdAt.getTime() < oneDayInMs;
      const isBNew = now - b.createdAt.getTime() < oneDayInMs;

      if (isANew && !isBNew) return -1;
      if (!isANew && isBNew) return 1;

      const scoreA = a.totalLikes + a.totalViews;
      const scoreB = b.totalLikes + b.totalViews;
      if (scoreB !== scoreA) return scoreB - scoreA;

      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return sortedFeed.slice(skip, skip + limit);
  }
}
