import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async saveMessage(data: {
    senderId: string;
    receiverId: string;
    content?: string;
    files?: any;
  }) {
    const filesArray = Array.isArray(data.files) ? data.files : [];

    return await this.prisma.client.message.create({
      data: {
        senderId: data.senderId,
        receiverId: data.receiverId,
        content: data.content,
        attachments: {
          create: filesArray.map((file) => ({
            fileUrl: file.url || file.fileUrl,
            fileType: file.type || file.fileType,
          })),
        },
      },
      include: {
        attachments: true,
        sender: {
          select: { id: true, athleteFullName: true, imgUrl: true },
        },
      },
    });
  }

  async saveMessage1(data: {
    senderId: string;
    receiverId: string;
    content?: string;
    files?: { url: string; type: string }[];
  }) {
    return await this.prisma.client.message.create({
      data: {
        senderId: data.senderId,
        receiverId: data.receiverId,
        content: data.content,
        attachments: {
          create: data.files?.map((file) => ({
            fileUrl: file.url,
            fileType: file.type,
          })),
        },
      },
      include: {
        attachments: true,
        sender: {
          select: { id: true, athleteFullName: true, imgUrl: true },
        },
      },
    });
  }

  async getChatHistory(userId: string, contactId: string) {
    return await this.prisma.client.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: contactId },
          { senderId: contactId, receiverId: userId },
        ],
      },
      include: {
        attachments: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
