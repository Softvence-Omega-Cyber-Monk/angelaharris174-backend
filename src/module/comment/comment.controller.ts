import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

import { CommentService } from './comment.service';

@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}
  @Post('comment')
  //   @UseGuards(JwtAuthGuard)
  async addComment(@CurrentUser() user: any, @Body() dto: CreateCommentDto) {
    return this.commentService.createComment(user.id, dto);
  }
}
