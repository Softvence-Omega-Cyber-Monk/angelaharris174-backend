import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ChatAttachment {
  url?: string;
  fileUrl?: string;
  type?: string;
  fileType?: string;
}

export interface ChatListItem {
  conversationId: string;
  contactInfo: {
    id: string;
    athleteFullName: string | null;
    imgUrl: string | null;
  };
  lastMessage: {
    id: string;
    content: string | null;
    createdAt: Date;
  } | null;
}

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async saveMessage(data: {
    senderId: string;
    receiverId: string;
    content?: string;
    files?: ChatAttachment[];
  }) {
    const { senderId, receiverId, content, files } = data;

    if (senderId === receiverId) {
      throw new BadRequestException('You cannot send a message to yourself');
    }

    const filesArray = Array.isArray(files) ? files : [];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    let conversation = await this.prisma.client.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { id: senderId } } },
          { participants: { some: { id: receiverId } } },
        ],
      },
    });

    if (!conversation) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      conversation = await this.prisma.client.conversation.create({
        data: {
          participants: {
            connect: [{ id: senderId }, { id: receiverId }],
          },
        },
      });
    }

    // ২. মেসেজ তৈরি করা
    return await this.prisma.client.message.create({
      data: {
        senderId,
        receiverId,
        content: content ?? null,
        conversationId: conversation.id,
        attachments: {
          create: filesArray.map((file) => ({
            fileUrl: file.url ?? file.fileUrl ?? '',
            fileType: file.type ?? file.fileType ?? 'FILE',
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

  async getMyChatList(userId: string): Promise<ChatListItem[]> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const conversations = await this.prisma.client.conversation.findMany({
      where: {
        participants: {
          some: { id: userId },
        },
      },
      include: {
        participants: {
          where: {
            id: { not: userId },
          },
          select: {
            id: true,
            athleteFullName: true,
            imgUrl: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return conversations.map((conv) => {
      const contact = conv.participants[0];
      const lastMsg = conv.messages[0];

      return {
        conversationId: conv.id,
        contactInfo: {
          id: contact?.id ?? '',
          athleteFullName: contact?.athleteFullName ?? null,
          imgUrl: contact?.imgUrl ?? null,
        },
        lastMessage: lastMsg
          ? {
              id: lastMsg.id,
              content: lastMsg.content,
              createdAt: lastMsg.createdAt,
            }
          : null,
      };
    });
  }
}
