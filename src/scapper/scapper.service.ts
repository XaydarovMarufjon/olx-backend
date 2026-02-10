import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as cheerio from 'cheerio';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ad } from './schemas/ad.schema';

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private readonly baseUrl = 'https://www.olx.uz';

  constructor(
    private httpService: HttpService,
    @InjectModel(Ad.name) private adModel: Model<Ad>,
  ) { }

  /**
   * Bitta keyword bo'yicha scrape qilish
   * @returns saqlangan/yangilangan e'lonlar soni
   */
  async scrapeKeyword(keyword: string): Promise<number> {
    const searchUrl = `${this.baseUrl}/q-${encodeURIComponent(keyword)}/?search%5Border%5D=created_at%3Adesc`;

    try {
      const response = await firstValueFrom(
        this.httpService.get(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'uz-UZ,uz;q=0.9,en-US;q=0.8,en;q=0.7,ru;q=0.6',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Referer': 'https://www.olx.uz/',  // ← bu muhim, saytdan kelgan so'rovdek ko'rinadi
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1',
          },
          timeout: 15000,
        }),
      );

      const html = response.data;
      const $ = cheerio.load(html);

      const ads: Partial<Ad>[] = [];

      // Asosiy e'lon kartalari (eng barqaror selector)
      const cards = $('[data-cy="l-card"]');

      if (cards.length === 0) {
        this.logger.warn(`"${keyword}" uchun [data-cy="l-card"] topilmadi. HTML uzunligi: ${html.length}`);
      }

      cards.each((_, card) => {
        const $card = $(card);

        // Sarlavha
        let title =
          $card.find('[data-testid="adTitle"]').text().trim() ||
          $card.find('h6').text().trim() ||
          $card.find('div > h6').text().trim() ||
          '';

        // Narx
        let price =
          $card.find('[data-testid="adPrice"]').text().trim() ||
          $card.find('strong').text().trim() ||
          $card.find('p strong').text().trim() ||
          $card.find('[class*="price"]').text().trim() ||
          'Kelishiladi';

        // Joylashuv
        let location =
          $card.find('[data-testid="location"]').text().trim() ||
          $card.find('span > span').last().text().trim() ||
          $card.find('[class*="location"]').text().trim() ||
          $card.find('p:last-child').text().trim() ||
          'Nomaʼlum';

        // Link
        let href = $card.find('a').first().attr('href') || '';
        let link = href ? (href.startsWith('http') ? href : this.baseUrl + href) : '';

        // Rasm
        let image =
          $card.find('img').first().attr('src') ||
          $card.find('img').first().attr('data-src') ||
          $card.find('img').first().attr('data-lazy') ||
          '';

        // Faqat ma'noli ma'lumot bo'lsa qo'shamiz
        if (title && link && link.includes('/d/')) {
          ads.push({
            keyword,
            title,
            price,
            location,
            link,
            image,
            scrapedAt: new Date(),
          });
        }
      });

      if (ads.length === 0) {
        this.logger.warn(`"${keyword}" bo'yicha hech qanday e'lon parse qilinmadi`);
        return 0;
      }

      // Bulk upsert — duplicate'larni yangilaydi yoki qo'shadi
      const bulkOps = ads.map((ad) => ({
        updateOne: {
          filter: { link: ad.link },
          update: { $set: ad },
          upsert: true,
        },
      }));

      await this.adModel.bulkWrite(bulkOps);

      this.logger.log(`"${keyword}" → ${ads.length} ta e'lon saqlandi/yangilandi`);
      return ads.length;
    } catch (error) {
      this.logger.error(`Scrape xatosi (${keyword}): ${error.message}`);
      return 0;
    }
  }

  /**
   * Barcha keyword'larni ketma-ket scrape qilish (pauza bilan)
   */
  async scrapeAllKeywords(keywords: string[]): Promise<Record<string, number>> {
    const results: Record<string, number> = {};

    for (const kw of keywords) {
      if (!kw) continue;

      results[kw] = await this.scrapeKeyword(kw);

      // OLX bloklamasligi uchun pauza (5-15 soniya)
      const delay = 5000 + Math.floor(Math.random() * 10000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    return results;
  }

  /**
   * Controller uchun: e'lonlarni olish (filter bilan)
   */
  async getAds(filter: any = {}, limit = 100): Promise<Ad[]> {
    return this.adModel
      .find(filter)
      .sort({ scrapedAt: -1 })
      .limit(limit)
      .lean() // oddiy JS object qaytaradi
      .exec();
  }
}