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

  // Feed
  @Get('feed')
  @UseGuards(JwtGuard)
  async getSmartFeed(@CurrentUser() user: any) {
    const userId = user.id;
    return await this.postService.getSmartFeedTwo(userId);
  }

  // Seen Posts
  @Post(':id/seen')
  @UseGuards(JwtGuard)
  async markAsSeen(
    @Param('id', ParseUUIDPipe) postId: string,
    @CurrentUser() user: any,
  ) {
    const userId = user.id;
    return await this.postService.markAsSeenTwo(postId, userId);
  }

  @Get()
  @UseGuards(JwtGuard)
  async findAllPost() {
    return this.postService.findAll();
  }

  @Get('user')
  @UseGuards(JwtGuard)
  async findCurrentUserAllPost(@CurrentUser() user: any) {
    const { id } = user;
    return this.postService.findCurrentUserAllPost(id);
  }

  @Get('user/:userId')
  @UseGuards(JwtGuard)
  async findPostsByUser(
    @Param('userId', ParseUUIDPipe, UserExistsPipe) userId: string,
  ) {
    return this.postService.findAllByUserId(userId);
  }

  @Post('create')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: any, @Body() createPostDto: CreatePostDto) {
    const { id } = user;
    return this.postService.create(createPostDto, id);
  }

  @Get(':id')
  @UseGuards(JwtGuard)
  async finSinglePost(@Param('id', ParseUUIDPipe, PostExistsPipe) id: string) {
    return this.postService.findOne(id);
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
