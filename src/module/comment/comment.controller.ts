import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

import { CommentService } from './comment.service';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ReplyCommentDto } from './dto/reply-comment.dto';
import { JwtGuard } from 'src/common/guards/jwt.guard';

@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get('post/:postId') // post id
  @UseGuards(JwtGuard)
  async getComments(@Param('postId', ParseUUIDPipe) postId: string) {
    return this.commentService.getCommentsByPost(postId);
  }

  @Get('tree/post/:postId')
  @UseGuards(JwtGuard)
  async getTreeComments(@Param('postId', ParseUUIDPipe) postId: string) {
    return this.commentService.getCommentsTreeByPost(postId);
  }

  // Create comment
  @Post()
  @UseGuards(JwtGuard)
  async addComment(@CurrentUser() user: any, @Body() dto: CreateCommentDto) {
    return this.commentService.createComment(user.id, dto);
  }

  // Update comment
  @Put('update/:id')
  @UseGuards(JwtGuard)
  async update(
    @Param('id', ParseUUIDPipe) id: string, // comment id
    @CurrentUser() user: any, // login user
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    return this.commentService.updateComment(id, user.id, updateCommentDto);
  }

  // Delete comment
  @Delete('delete/:id')
  @UseGuards(JwtGuard)
  async delete(
    @Param('id', ParseUUIDPipe) id: string, // comment id
    @CurrentUser() user: any,
  ) {
    return this.commentService.removeComment(id, user);
  }

  @Post('reply')
  @UseGuards(JwtGuard)
  async createReply(@CurrentUser() user: any, @Body() dto: ReplyCommentDto) {
    return this.commentService.createReply(user.id, dto);
  }
}
