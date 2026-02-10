import { Injectable, Logger } from '@nestjs/common';
import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ad } from './schemas/ad.schema';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private readonly baseUrl: string;

  constructor(
    @InjectModel(Ad.name) private adModel: Model<Ad>,
    private readonly configService: ConfigService,
  ) {
     this.baseUrl = this.configService.get<string>('URL') || '';
  }

  async scrapeKeyword(keyword: string, pageNumber = 1): Promise<number> {
    const url = `${this.baseUrl}/list/q-${encodeURIComponent(keyword)}/?page=${pageNumber}`;
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/132.0 Safari/537.36',
      viewport: { width: 1366, height: 768 },
    });

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

      /// Sahifa e’lonlarini kutish (agar bo‘lsa)
      try {
        await page.waitForSelector('[data-cy], [data-testid], h6', {
          timeout: 20000,
        });
      } catch {
        this.logger.warn(
          'Hech qanday data-cy yoki data-testid elementi topilmadi',
        );
      }

      const html = await page.content();
      const $ = cheerio.load(html);

      const ads: Partial<Ad>[] = [];

      /// Tekshiruv: barcha potentsial elementlar
      const cards = $('[data-cy="l-card"], [data-testid="adCard"], div[class*="offer"]', );
      this.logger.log(`"${keyword}" uchun topilgan karta soni: ${cards.length}`,  );

      if (cards.length === 0) {
        this.logger.warn(`"${keyword}" bo‘yicha hech qanday e’lon topilmadi`);
      }

      cards.each((i, card) => {
        const $card = $(card);

        /// Sarlavha tekshiruv
        let title =
          $card.find('[data-testid="adTitle"]').text().trim() ||
          $card.find('h6').text().trim() ||
          $card.find('div > h6').text().trim() ||
          $card.find('h4[data-nx-name="H4"]').text().trim() || 
          'Nomaʼlum';

        console.log(`Title #${i}:`, title);

        /// Narx tekshiruv
        let price =
          $card.find('[data-testid="adPrice"]').text().trim() || 
          $card.find('[data-testid="ad-price"]').text().trim() || 
          $card.find('strong').text().trim() ||
          $card.find('[class*="price"]').text().trim() ||
          'Kelishiladi';

        /// Joylashuv tekshiruv
        let location =
          $card.find('[data-testid="location"]').text().trim() || 
          $card.find('[data-testid="location-date"]').text().trim() || 
          $card.find('span > span').last().text().trim() ||
          $card.find('[class*="location"]').text().trim() ||
          'Nomaʼlum';

        /// Link tekshiruv
        const href = $card.find('a').first().attr('href') || '';
        const link = href.startsWith('http') ? href : this.baseUrl + href;
        console.log(`Link #${i}:`, link);

        if (link.includes('/d/')) {
          ads.push({
            keyword,
            title: title || 'Nomaʼlum',
            price,
            location,
            link,
            scrapedAt: new Date(),
          });
        }
      });

      console.log(`Natija: ${ads.length} ta e’lon topildi`);

      if (ads.length > 0) {
        //// MongoDB upsert
        const bulkOps = ads.map((ad) => ({
          updateOne: {
            filter: { link: ad.link },
            update: { $set: ad },
            upsert: true,
          },
        }));
        await this.adModel.bulkWrite(bulkOps);
      }

      return ads.length;
    } catch (err) {
      this.logger.error(`Scrape xatosi (${keyword}): ${err.message}`);
      return 0;
    } finally {
      await browser.close();
    }
  }

  async getAds(filter: any = {}, limit = 100): Promise<Ad[]> {
    return (
      this.adModel
        .find(filter)
        .sort({ scrapedAt: -1 })
        // .limit(limit)
        .lean()
        .exec()
    );
  }
}
