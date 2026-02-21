import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private chatService: ChatService) {}

  async handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      await client.join(userId);
      console.log(`User connected and joined room: ${userId}`);
    } else {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId as string;
    console.log(`User disconnected: ${userId}`);
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { receiverId: string; content?: string; files?: any },
  ) {
    try {
      const senderId = client.handshake.query.userId as string;
      const { receiverId } = payload;

      if (!senderId || !receiverId) {
        console.error('Sender or Receiver ID missing');
        return;
      }

      const savedMessage = await this.chatService.saveMessage({
        senderId,
        ...payload,
      });

      this.server.to(receiverId).emit('newMessage', savedMessage);
      this.server.to(senderId).emit('messageSent', savedMessage);
    } catch (error) {
      console.log('Error: ', error.message);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { receiverId: string; isTyping: boolean },
  ) {
    const senderId = client.handshake.query.userId as string;
    this.server.to(payload.receiverId).emit('displayTyping', {
      senderId,
      isTyping: payload.isTyping,
    });
  }
}
