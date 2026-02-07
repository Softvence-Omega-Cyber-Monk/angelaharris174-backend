import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Post } from '@prisma';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostService {
  constructor(private prisma: PrismaService) {}

  // get Smart Feed
  async getSmartFeed(userId: string) {
    const posts = await this.prisma.client.post.findMany({
      where: {
        NOT: {
          views: { some: { userId: userId } },
        },
      },
      include: {
        user: {
          select: { athleteFullName: true, imgUrl: true },
        },
        _count: {
          select: {
            commentsList: true,
            likesList: true,
            views: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    if (posts.length === 0) {
      return await this.prisma.client.post.findMany({
        include: {
          user: { select: { athleteFullName: true, imgUrl: true } },
          _count: {
            select: {
              commentsList: true,
              likesList: true,
              views: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    }

    return posts;
  }

  // get Smart Feed Two
  async getSmartFeedTwo(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    let posts = await this.prisma.client.post.findMany({
      where: {
        NOT: {
          views: { some: { userId: userId } },
        },
      },
      include: {
        user: { select: { athleteFullName: true, imgUrl: true } },
        // _count: {
        //   select: {
        //     commentsList: true,
        //     likesList: true,
        //   },
        // },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: skip,
    });

    if (posts.length < limit) {
      const seenPosts = await this.prisma.client.post.findMany({
        where: {
          views: { some: { userId: userId } },
        },
        include: {
          user: { select: { athleteFullName: true, imgUrl: true } },
          // _count: {
          //   select: {
          //     commentsList: true,
          //     likesList: true,
          //   },
          // },
        },
        orderBy: { createdAt: 'desc' },
        take: limit - posts.length,
        skip: skip,
      });
      posts = [...posts, ...seenPosts];
    }

    return posts;
  }

  async markAsSeen(postId: string, userId: string) {
    await this.prisma.client.$transaction(async (tx) => {
      const existingView = await tx.postView.findUnique({
        where: {
          userId_postId: { userId, postId },
        },
      });

      if (!existingView) {
        await tx.postView.create({
          data: { userId, postId },
        });

        await tx.post.update({
          where: { id: postId },
          data: { viewCount: { increment: 1 } },
        });
      }
    });

    return { success: true };
  }

  async markAsSeenTwo(postId: string, userId: string) {
    return await this.prisma.client.$transaction(async (tx) => {
      const existingView = await tx.postView.findUnique({
        where: {
          userId_postId: { userId, postId },
        },
      });

      if (!existingView) {
        await tx.postView.create({
          data: { userId, postId },
        });

        await tx.post.update({
          where: { id: postId },
          data: { viewCount: { increment: 1 } },
        });

        return { message: 'First time seen, count incremented', status: 'new' };
      }

      return { message: 'Already seen', status: 'existing' };
    });
  }

  // Create Post
  async create(createPostDto: CreatePostDto, id: string): Promise<Post> {
    try {
      const { url, caption } = createPostDto;
      const createPost = await this.prisma.client.post.create({
        data: {
          url,
          caption,
          user: {
            connect: { id },
          },
        },
        include: {
          user: {
            select: {
              id: true,
              athleteFullName: true,
              email: true,
            },
          },
        },
      });
      return createPost;
    } catch (error) {
      throw new InternalServerErrorException(
        'Could not create post. Make sure the User ID is valid.',
      );
    }
  }

  // FindOne By Id
  async findOne(id: string): Promise<Post> {
    const singlePost = await this.prisma.client.post.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            athleteFullName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!singlePost) {
      throw new NotFoundException(`Post with ID ${id} is not found`);
    }
    return singlePost;
  }

  // Find All Post
  async findAll(): Promise<Post[]> {
    const posts = await this.prisma.client.post.findMany({
      include: {
        user: {
          select: {
            id: true,
            athleteFullName: true,
            email: true,
            role: true,
          },
        },
        commentsList: {},
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return posts;
  }

  // Find Current User Post
  async findCurrentUserAllPost(id: string): Promise<Post[]> {
    const posts = await this.prisma.client.post.findMany({
      where: {
        userId: id,
      },
      include: {
        user: {
          select: {
            id: true,
            athleteFullName: true,
            email: true,
          },
        },
        commentsList: {},
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return posts;
  }

  // Find All Posts by User ID
  async findAllByUserId(userId: string): Promise<Post[]> {
    const posts = await this.prisma.client.post.findMany({
      where: {
        userId: userId,
      },
      include: {
        user: {
          select: {
            id: true,
            athleteFullName: true,
            email: true,
          },
        },
        commentsList: {},
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return posts;
  }

  // Find Current User All Posts by User ID
  async findCurrentUserAllByUserId(userId: string, user: any): Promise<Post[]> {
    const { id } = user;
    if (userId !== user.id) {
      throw new NotFoundException('User is not valid');
    }
    const posts = await this.prisma.client.post.findMany({
      where: {
        userId: id,
      },
      include: {
        user: {
          select: {
            id: true,
            athleteFullName: true,
            email: true,
          },
        },
        commentsList: {},
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return posts;
  }

  // Update Post only user
  async update(
    postId: string,
    userId: string,
    updatePostDto: UpdatePostDto,
  ): Promise<Post> {
    const post = await this.prisma.client.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`);
    }

    if (post.userId !== userId) {
      throw new ForbiddenException('You are not allowed to update this post');
    }

    try {
      const updatedPost = await this.prisma.client.post.update({
        where: { id: postId },
        data: {
          ...updatePostDto,
        },
        include: {
          user: {
            select: {
              id: true,
              athleteFullName: true,
              email: true,
            },
          },
        },
      });

      return updatedPost;
    } catch (error) {
      throw new InternalServerErrorException('Failed to update the post');
    }
  }

  // Detele Post
  async remove(id: string, user: any) {
    const postToDelete = await this.prisma.client.post.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!postToDelete) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    const isOwner = postToDelete.userId === user.id;
    const isAdmin = user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to delete this post',
      );
    }
    await this.prisma.client.post.delete({
      where: { id },
    });

    return { message: 'Post deleted successfully' };
  }
}
