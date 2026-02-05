import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Post, User } from '@prisma';
import { CreatePostDto } from './dto/create-post.dto';

@Injectable()
export class PostService {
  constructor(private prisma: PrismaService) {}

  // Create Post
  async create(createPostDto: CreatePostDto): Promise<Post> {
    try {
      const { url, caption, userId } = createPostDto;
      const createPost = await this.prisma.client.post.create({
        data: {
          url,
          caption,
          user: {
            connect: { id: userId },
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return posts;
  }

  // Detele Post
  async remove(id: string, user: User): Promise<void> {
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
  }
}
