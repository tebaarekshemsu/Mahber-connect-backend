import { Logger } from '@nestjs/common';
import { Job } from 'bull';

const BACKOFF_DELAYS_MS = [1000, 2000, 4000, 8000, 16000];

export abstract class BaseProcessor<T = unknown> {
  protected abstract readonly logger: Logger;

  abstract process(job: Job<T>): Promise<void>;

  protected getBackoffDelay(attemptsMade: number): number {
    const index = Math.min(attemptsMade, BACKOFF_DELAYS_MS.length - 1);
    return BACKOFF_DELAYS_MS[index];
  }

  protected async executeWithRetry(job: Job<T>): Promise<void> {
    try {
      await this.process(job);
    } catch (error) {
      const delay = this.getBackoffDelay(job.attemptsMade);
      this.logger.error(
        `Job ${job.id} (${job.name}) failed on attempt ${job.attemptsMade + 1}. ` +
          `Retrying in ${delay}ms. Error: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  protected logJobStart(job: Job<T>): void {
    this.logger.log(`Starting job ${job.id} (${job.name}), attempt ${job.attemptsMade + 1}`);
  }

  protected logJobComplete(job: Job<T>): void {
    this.logger.log(`Completed job ${job.id} (${job.name})`);
  }

  protected logJobError(job: Job<T>, error: Error): void {
    this.logger.error(
      `Failed job ${job.id} (${job.name}) after ${job.attemptsMade + 1} attempts: ${error.message}`,
      error.stack,
    );
  }
}
