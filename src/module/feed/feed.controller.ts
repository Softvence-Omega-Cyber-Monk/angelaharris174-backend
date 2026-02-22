import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { FeedService } from './feed.service';
import { JwtGuard } from 'src/common/guards/jwt.guard';
import { Request } from 'express';

@Controller('post-reel')
@UseGuards(JwtGuard)
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get('feeds')
  async getSmartFeed(
    @Req() req: Request,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    const userId = req.user!.id;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 100) || 20;

    return await this.feedService.getSmartFeed(userId, pageNum, limitNum);
  }
}
