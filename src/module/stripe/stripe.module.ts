import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StripeController } from './stripe.controller';
import { EmailModule } from '../email/email.module';

@Module({
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService],
  imports: [PrismaModule, EmailModule]
})
export class StripeModule { }

