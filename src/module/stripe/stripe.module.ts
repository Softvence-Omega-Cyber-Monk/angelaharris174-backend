import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  providers: [StripeService],
  exports: [StripeService],
  imports:[PrismaModule]
})
export class StripeModule {}
