import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { PostExistsPipe } from './pipes/post-exists.pipe';
import { UserExistsPipe } from './pipes/user-exist.pipe';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('post')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Get()
  async findAllPost() {
    return this.postService.findAll();
  }

  @Get(':id')
  async finSinglePost(@Param('id', ParseUUIDPipe, PostExistsPipe) id: string) {
    return this.postService.findOne(id);
  }

  @Get('user/:userId')
  async findPostsByUser(
    @Param('userId', ParseUUIDPipe, UserExistsPipe) userId: string,
  ) {
    return this.postService.findAllByUserId(userId);
  }

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createPostDto: CreatePostDto) {
    return this.postService.create(createPostDto);
  }

  @Delete('delete/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePost(
    @Param('id', ParseUUIDPipe, PostExistsPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<void> {
    await this.postService.remove(id, user);
  }
}
