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
@UseGuards(JwtGuard)
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
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      // limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadFiles(@UploadedFiles() files: Array<Express.Multer.File>) {
    if (!files || files.length === 0) return [];

    try {
      const uploadResults = await Promise.all(
        files.map(async (file) => {
          const isImage = file.mimetype.startsWith('image/');
          const isVideo = file.mimetype.startsWith('video/');

          const folder = isImage
            ? 'chat/images'
            : isVideo
              ? 'chat/videos'
              : 'chat/files';
          const type = isImage ? 'IMAGE' : isVideo ? 'VIDEO' : 'FILE';

          const url = await this.s3Service.uploadFile(file, folder);

          return { url, type };
        }),
      );

      return uploadResults;
    } catch (error: any) {
      throw new InternalServerErrorException(`Upload failed: ${error.message}`);
    }
  }

  // @Post('upload')
  // @UseInterceptors(FilesInterceptor('files', 10))
  // async uploadFiles(@UploadedFiles() files: Array<Express.Multer.File>) {
  //   try {
  //     const uploadPromises = files.map(async (file) => {
  //       const folder = file.mimetype.startsWith('image')
  //         ? 'chat/images'
  //         : 'chat/files';
  //       const url = await this.s3Service.uploadFile(file, folder);

  //       return {
  //         url,
  //         type: file.mimetype.startsWith('image') ? 'IMAGE' : 'FILE',
  //       };
  //     });

  //     return await Promise.all(uploadPromises);
  //   } catch (error: any) {
  //     throw new InternalServerErrorException(`Upload failed: ${error.message}`);
  //   }
  // }
}
