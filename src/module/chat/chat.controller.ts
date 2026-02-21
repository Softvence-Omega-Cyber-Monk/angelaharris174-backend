import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  InternalServerErrorException,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ChatService } from './chat.service';
import { JwtGuard } from 'src/common/guards/jwt.guard';
import { S3Service } from '../s3/s3.service';
import { Request } from 'express';

@Controller('chat')
// @UseGuards(JwtGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly s3Service: S3Service,
  ) {}

  @Get('history/:contactId')
  async getHistory(
    @Req() req: Request,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ) {
    const userId = req.user!.id;
    return await this.chatService.getChatHistory(userId, contactId);
  }

  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadFiles(@UploadedFiles() files: Array<Express.Multer.File>) {
    try {
      const uploadPromises = files.map(async (file) => {
        const folder = file.mimetype.startsWith('image')
          ? 'chat/images'
          : 'chat/files';
        const url = await this.s3Service.uploadFile(file, folder);

        return {
          url,
          type: file.mimetype.startsWith('image') ? 'IMAGE' : 'FILE',
        };
      });

      return await Promise.all(uploadPromises);
    } catch (error) {
      throw new InternalServerErrorException(`Upload failed: ${error.message}`);
    }
  }
}
