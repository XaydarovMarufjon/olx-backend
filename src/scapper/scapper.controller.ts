import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { KeywordService } from '../keyword/keyword.service';
import { ScraperService } from './scapper.service';

@Controller('scraper')
export class ScraperController {
  constructor(
    private readonly scraperService: ScraperService,
    private readonly keywordService: KeywordService,
  ) {}
  
  @Get('run')
  async runAllKeywords() {
    const keywords = await this.keywordService.getKeywords();

    if (!keywords.length) {
      throw new BadRequestException('keyword.txt bo‘sh');
    }

    const results: Record<string, number> = {};

    for (const kw of keywords) {
      const count = await this.scraperService.scrapeKeyword(kw);
      results[kw] = count;

      // OLX uchun xavfsiz pauza
      const delay = 6000 + Math.floor(Math.random() * 8000);
      await new Promise(r => setTimeout(r, delay));
    }

    return {
      status: 'ok',
      total: Object.keys(results).length,
      results,
    };
  }

  @Get('ads')
  async getAds(
    @Query('keyword') keyword?: string,
    // @Query('limit') limit = '100',
  ) {
    const filter = keyword ? { keyword } : {};
    const ads = await this.scraperService.getAds(
      filter,
      // Math.min(Number(limit), 200),
    );

    return {
      count: ads.length,
      ads,
    };
  }
}

