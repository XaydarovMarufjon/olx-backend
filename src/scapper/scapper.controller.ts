import { Controller, Get, Query } from '@nestjs/common';
import { KeywordService } from '../keyword/keyword.service';
import { ScraperService } from './scapper.service';

@Controller('scraper')
export class ScraperController {
  constructor(
    private scraperService: ScraperService,
    private keywordService: KeywordService,
  ) {}

  @Get('run')
  async runScraper(@Query('keyword') singleKeyword?: string) {
    if (singleKeyword) {
      const count = await this.scraperService.scrapeKeyword(singleKeyword);
      return { status: 'ok', keyword: singleKeyword, saved: count };
    }

    const keywords = await this.keywordService.getKeywords();
    if (keywords.length === 0) {
      return { status: 'error', message: 'keyword.txt da hech narsa yoʻq' };
    }

    const results = await this.scraperService.scrapeAllKeywords(keywords);
    return { status: 'ok', results };
  }

  @Get('ads')
async getAllAds(@Query('keyword') keyword?: string) {
  const filter = keyword ? { keyword } : {};
  const ads = await this.scraperService.getAds(filter, 100);
  return ads;
}
}
