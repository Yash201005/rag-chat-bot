import { Router } from 'express';
import { MetricsController } from '../controllers/MetricsController';

export function createMetricsRouter(controller: MetricsController): Router {
  const router = Router();
  router.get('/metrics', controller.getMetrics);
  router.get('/health', controller.getHealth);
  return router;
}
