import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { ScraperModule } from './scapper/scapper.module';
import { KeywordModule } from './keyword/keyword.module';
import { AppService } from './app.service';
import { AppController } from './app.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    HttpModule,
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),

    ScraperModule,
    KeywordModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
