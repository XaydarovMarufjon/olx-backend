import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class KeywordService {
  private readonly filePath = path.join(process.cwd(), 'keyword.txt');

  async getKeywords(): Promise<string[]> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      return content
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith('//') && !l.startsWith('#'));
    } catch {
      return [];
    }
  }
}