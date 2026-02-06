import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { PostExistsPipe } from './pipes/post-exists.pipe';
import { UserExistsPipe } from './pipes/user-exist.pipe';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtGuard } from 'src/common/guards/jwt.guard';
import { UpdatePostDto } from './dto/update-post.dto';

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
  @UseGuards(JwtGuard)
  async findPostsByUser(
    @Param('userId', ParseUUIDPipe, UserExistsPipe) userId: string,
    @CurrentUser() user: any,
  ) {
    return this.postService.findAllByUserId(userId, user);
  }

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createPostDto: CreatePostDto) {
    return this.postService.create(createPostDto);
  }

  @Patch('update/:id')
  @UseGuards(JwtGuard)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() updatePostDto: UpdatePostDto,
  ) {
    return this.postService.update(id, user.id, updatePostDto);
  }

  @Delete('delete/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtGuard)
  async deletePost(
    @Param('id', ParseUUIDPipe, PostExistsPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return await this.postService.remove(id, user);
  }
}
