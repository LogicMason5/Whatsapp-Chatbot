import { Test, TestingModule } from '@nestjs/testing';
import { AudioService } from './audio.service';

describe('AudioService', () => {
  let service: AudioService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AudioService],
    }).compile();

    service = module.get<AudioService>(AudioService);
  });

  describe('service initialization', () => {
    it('should be defined', () => {
      // Assert
      expect(service).toBeDefined();
    });
  });
});
