import { Body, Controller, Delete, HttpStatus, Post, Res, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Public } from '../../common/decorators/public.decorators';
import { HighlightsService } from './highlights.service';
import { Response } from 'express';
import sendResponse from '../../utils/sendResponse';
import { HighlightsDto } from './dto/highlights.dto';
import { RemoveClipDto } from './dto/remove-clip.dto';

@Controller('highlights')
export class HighlightsController {
    constructor(private highlightService: HighlightsService) { }

    @Public()
    @Post('merge-video')
    @UseInterceptors(FilesInterceptor('clips'))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        type: HighlightsDto,
    })
    async mergeVideo(
        @Body() dto: HighlightsDto,
        @UploadedFiles() clips: Express.Multer.File[],
        @Res() res: Response
    ) {
        const result = await this.highlightService.mergeVideo(
            dto,
            clips
        );

        return sendResponse(res, {
            statusCode: HttpStatus.CREATED,
            success: true,
            message: 'Video merging started successfully',
            data: result,
        });
    }

    @Public()
    @Delete('remove-clip')
    async removeClip(
        @Body() dto: RemoveClipDto,
        @Res() res: Response
    ) {
        const result = await this.highlightService.removeClip(dto);

        return sendResponse(res, {
            statusCode: HttpStatus.OK,
            success: true,
            message: 'Clip removed and video re-merging started',
            data: result,
        });
    }

}
