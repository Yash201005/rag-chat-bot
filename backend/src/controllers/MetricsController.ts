import { Request, Response, NextFunction } from 'express';
import { MetricsRepository } from '../repositories/MetricsRepository';
import { PineconeService } from '../vectorstore/PineconeService';

export class MetricsController {
  private metricsRepo = MetricsRepository.getInstance();

  constructor(private pineconeService: PineconeService) {}

  public getMetrics = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const aggregate = this.metricsRepo.getAggregateMetrics();
      const indexStats = await this.pineconeService.getIndexStats();

      res.status(200).json({
        metrics: aggregate,
        vectorStoreStats: indexStats,
        systemStatus: 'healthy',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  public getHealth = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({
        status: 'UP',
        service: 'Enterprise RAG Platform Backend API',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };
}
