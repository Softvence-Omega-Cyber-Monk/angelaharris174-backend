import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './module/prisma/prisma.module';
import { AuthModule } from './module/auth/auth.module';
import { HighlightsModule } from './module/highlights/highlights.module';
import { StripeModule } from './module/stripe/stripe.module';
import { SeederService } from './seeder/seeder.service';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
  }),
    AuthModule,
    PrismaModule,
    HighlightsModule,
    StripeModule,

  ],
  controllers: [AppController],
  providers: [AppService , SeederService],
})
export class AppModule { }
