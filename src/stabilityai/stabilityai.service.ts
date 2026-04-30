import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import * as fs from 'fs/promises';
import { join } from 'path';

interface StabilityAIResponse {
  artifacts: {
    base64: string;
    seed: number;
    finishReason: string;
  }[];
}

@Injectable()
export class StabilityaiService {
  private readonly logger = new Logger(StabilityaiService.name);

  constructor(private readonly httpService: HttpService) {}

  private readonly configuration = {
    apiHost: process.env.STABILITYAI_API_HOST,
    token: process.env.STABILITYAI_TOKEN,
    engineId: 'stable-diffusion-xl-1024-v1-0',
  };

  private validateConfig() {
    if (!this.configuration.apiHost || !this.configuration.token) {
      throw new Error('StabilityAI configuration is missing');
    }
  }

  async textToImage(prompt: string): Promise<string[]> {
    this.validateConfig();

    const url = `${this.configuration.apiHost}/v1/generation/${this.configuration.engineId}/text-to-image`;

    const payload = {
      text_prompts: [{ text: prompt }],
      steps: 40,
    };

    try {
      const response$ = this.httpService.post<StabilityAIResponse>(
        url,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: this.configuration.token,
          },
        },
      ).pipe(
        map((res) => res.data),
        catchError((error) => {
          this.logger.error('StabilityAI API error', error?.response?.data || error.message);
          throw new BadRequestException('Error generating image');
        }),
      );

      const result = await lastValueFrom(response$);

      const folderPath = join(process.cwd(), 'generatedImages');

      // Ensure directory exists (non-blocking)
      await fs.mkdir(folderPath, { recursive: true });

      const fileNames = await Promise.all(
        result.artifacts.map(async (image, index) => {
          const fileName = `txt2img_${Date.now()}_${index}.png`;
          const filePath = join(folderPath, fileName);

          await fs.writeFile(
            filePath,
            Buffer.from(image.base64, 'base64'),
          );

          return fileName;
        }),
      );

      return fileNames;
    } catch (error) {
      this.logger.error('Image generation failed', error);
      throw new BadRequestException('Image generation failed, try later.');
    }
  }
}
