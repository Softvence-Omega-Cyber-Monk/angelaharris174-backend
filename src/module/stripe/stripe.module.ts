import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StripeController } from './stripe.controller';

@Module({
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService],
  imports: [PrismaModule]
})
export class StripeModule { }
