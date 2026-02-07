import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './module/prisma/prisma.module';
import { AuthModule } from './module/auth/auth.module';
import { HighlightsModule } from './module/highlights/highlights.module';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
  }),
    AuthModule,
    PrismaModule,
    HighlightsModule,

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
