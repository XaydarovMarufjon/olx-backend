import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Ad, AdSchema } from './schemas/ad.schema';
import { ScraperController } from './scapper.controller';
import { ScraperService } from './scapper.service';
import { HttpModule } from '@nestjs/axios';
import { KeywordModule } from 'src/keyword/keyword.module';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([{ name: Ad.name, schema: AdSchema }]),
    KeywordModule
  ],
  controllers: [ScraperController],
  providers: [ScraperService],
  exports: [ScraperService],
})
export class ScraperModule {}