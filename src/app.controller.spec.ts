import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('getHello', () => {
    it('should return welcome message', () => {
      expect(appController.getHello()).toBe('MahberConnect API is running');
    });
  });

  describe('getHealth', () => {
    it('should return health status with ok status', () => {
      const health = appController.getHealth();
      expect(health.status).toBe('ok');
    });

    it('should return health status with a valid ISO timestamp', () => {
      const health = appController.getHealth();
      expect(new Date(health.timestamp).toISOString()).toBe(health.timestamp);
    });
  });
});
