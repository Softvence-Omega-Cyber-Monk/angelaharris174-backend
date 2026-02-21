import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { S3Service } from '../s3/s3.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, S3Service],
})
export class ChatModule {}
