import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationGateway,
  ) {}

  async createAndSend({
    recipientId,
    senderId,
    postId,
    title,
    message,
    type,
  }: {
    recipientId: string;
    senderId: string;
    postId?: string;
    title: string;
    message: string;
    type: 'LIKE' | 'COMMENT' | 'NEW_POST' | 'REPLY';
  }) {
    const notification = await this.prisma.client.notification.create({
      data: {
        userId: recipientId,
        senderId,
        postId,
        title,
        message,
        type,
      },
      include: {
        sender: {
          select: { athleteFullName: true, imgUrl: true },
        },
      },
    });

    this.gateway.sendToUser(recipientId, notification);

    return notification;
  }

  // async create(
  //   userId: string,
  //   title: string,
  //   message: string,
  //   type: string,
  //   postId?: string,
  // ) {
  //   const notification = await this.prisma.notification.create({
  //     data: { userId, title, message, type, postId },
  //   });

  //   this.gateway.send(userId, notification);

  //   return notification;
  // }

  async createLikeNotification(
    postOwnerId: string,
    likerName: string,
    postId: string,
  ) {
    const newNotification = await this.prisma.client.notification.create({
      data: {
        userId: postOwnerId,
        title: 'New Like ❤️',
        message: `${likerName} liked your post`,
        type: 'LIKE',
        postId: postId,
      },
    });

    this.gateway.sendNotification(postOwnerId, newNotification);

    return newNotification;
  }

  async getNotificationsForUser(userId: string) {
    return await this.prisma.client.notification.findMany({
      where: { userId },
      include: {
        sender: {
          select: { athleteFullName: true, imgUrl: true },
        },
        post: {
          select: { images: true, caption: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    try {
      return await this.prisma.client.notification.update({
        where: { id: notificationId, userId: userId },
        data: { isRead: true },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(
          `Notification with ID ${notificationId} not found`,
        );
      }
      throw error;
    }
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.client.notification.count({
      where: { userId, isRead: false },
    });
    return { unreadCount: count };
  }

  async getReadNotifications(userId: string) {
    return await this.prisma.client.notification.findMany({
      where: {
        userId,
        isRead: true,
      },
      include: {
        sender: {
          select: { athleteFullName: true, imgUrl: true },
        },
        post: {
          select: { images: true, caption: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async getUnreadNotifications(userId: string) {
    return await this.prisma.client.notification.findMany({
      where: {
        userId,
        isRead: false,
      },
      include: {
        sender: {
          select: { athleteFullName: true, imgUrl: true },
        },
        post: {
          select: { images: true, caption: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async markAllAsRead(userId: string) {
    return await this.prisma.client.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
