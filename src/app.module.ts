import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
    MongooseModule.forRoot('mongodb+srv://marufjankhaydarov_db_user:os3zLPT1srdXeXq3@cluster0.jfahtih.mongodb.net/?appName=Cluster0'),
    ScraperModule,
    KeywordModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
