import {
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { LikeService } from './like.service';
import { JwtGuard } from 'src/common/guards/jwt.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('post')
export class LikeController {
  constructor(private readonly likeService: LikeService) {}

  @Post(':id/like')
  @UseGuards(JwtGuard)
  async togglePostLike(
    @Param('id', ParseUUIDPipe) id: string, // post id
    @CurrentUser() user: any,
  ) {
    return this.likeService.toggleLike(id, user.id);
  }
}
