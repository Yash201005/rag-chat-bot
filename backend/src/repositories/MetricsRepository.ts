import { AggregateMetrics, RAGMetrics } from '../types/index.js';

export class MetricsRepository {
  private static instance: MetricsRepository;
  private metricsList: RAGMetrics[] = [];
  private totalDocuments = 0;
  private totalChunksIndexed = 0;

  private constructor() {}

  public static getInstance(): MetricsRepository {
    if (!MetricsRepository.instance) {
      MetricsRepository.instance = new MetricsRepository();
    }
    return MetricsRepository.instance;
  }

  public recordQueryMetrics(metrics: RAGMetrics): void {
    this.metricsList.push(metrics);
  }

  public incrementDocumentStats(chunkCount: number): void {
    this.totalDocuments += 1;
    this.totalChunksIndexed += chunkCount;
  }

  public decrementDocumentStats(chunkCount: number): void {
    this.totalDocuments = Math.max(0, this.totalDocuments - 1);
    this.totalChunksIndexed = Math.max(0, this.totalChunksIndexed - chunkCount);
  }

  public getAggregateMetrics(): AggregateMetrics {
    const totalQueries = this.metricsList.length;

    if (totalQueries === 0) {
      return {
        totalQueries: 0,
        totalDocuments: this.totalDocuments,
        totalChunksIndexed: this.totalChunksIndexed,
        avgResponseTimeMs: 0,
        avgRetrievalTimeMs: 0,
        avgEmbeddingTimeMs: 0,
        totalTokensProcessed: 0,
      };
    }

    const sumResponseTime = this.metricsList.reduce((acc, m) => acc + m.totalResponseTimeMs, 0);
    const sumRetrievalTime = this.metricsList.reduce((acc, m) => acc + m.retrievalTimeMs, 0);
    const sumEmbeddingTime = this.metricsList.reduce((acc, m) => acc + m.embeddingTimeMs, 0);
    const sumTokens = this.metricsList.reduce((acc, m) => acc + m.totalTokens, 0);

    return {
      totalQueries,
      totalDocuments: this.totalDocuments,
      totalChunksIndexed: this.totalChunksIndexed,
      avgResponseTimeMs: Math.round(sumResponseTime / totalQueries),
      avgRetrievalTimeMs: Math.round(sumRetrievalTime / totalQueries),
      avgEmbeddingTimeMs: Math.round(sumEmbeddingTime / totalQueries),
      totalTokensProcessed: sumTokens,
    };
  }
}
