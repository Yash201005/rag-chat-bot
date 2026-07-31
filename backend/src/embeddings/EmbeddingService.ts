import { HfInference } from '@huggingface/inference';
import { IEmbeddingService } from '../interfaces/index';
import { env } from '../config/environment';
import { logger } from '../config/logger';

export class EmbeddingService implements IEmbeddingService {
  private hf: HfInference | null = null;
  private readonly model = 'BAAI/bge-small-en-v1.5';
  private readonly dimension = 384;
  private cache: Map<string, number[]> = new Map();
  private readonly maxCacheSize = 1000;

  constructor() {
    if (env.HUGGINGFACE_API_KEY) {
      this.hf = new HfInference(env.HUGGINGFACE_API_KEY);
    } else {
      logger.warn('HUGGINGFACE_API_KEY not configured. EmbeddingService using semantic fallback embeddings.');
    }
  }

  public getDimension(): number {
    return this.dimension;
  }

  public async embedQuery(text: string): Promise<number[]> {
    const cached = this.cache.get(text);
    if (cached) {
      return cached;
    }

    const embeddings = await this.embedDocuments([text]);
    const embedding = embeddings[0];

    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(text, embedding);

    return embedding;
  }

  public async embedDocuments(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const batchSize = 16;
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchEmbeddings = await this.processBatchWithRetry(batch);
      results.push(...batchEmbeddings);
    }

    return results;
  }

  private async processBatchWithRetry(batch: string[], retries = 3): Promise<number[][]> {
    let attempt = 0;
    let delay = 1000;

    while (attempt < retries) {
      try {
        if (this.hf) {
          const response = await this.hf.featureExtraction({
            model: this.model,
            inputs: batch,
          });

          if (Array.isArray(response)) {
            // Check if 2D or 3D tensor output
            if (Array.isArray(response[0])) {
              if (typeof response[0][0] === 'number') {
                return response as number[][];
              } else if (Array.isArray(response[0][0])) {
                // Mean pooling across sequence dimension
                return (response as number[][][]).map((seq) => this.meanPool(seq));
              }
            }
          }
        }
        // Fallback to local feature vector calculation if API fails or unavailable
        return batch.map((text) => this.generateLocalFallbackEmbedding(text));
      } catch (error: any) {
        attempt++;
        logger.warn(`HuggingFace Embedding attempt ${attempt} failed: ${error.message}`);
        if (attempt >= retries) {
          logger.error('Embedding service retries exhausted. Returning local fallback embeddings.');
          return batch.map((text) => this.generateLocalFallbackEmbedding(text));
        }
        await new Promise((res) => setTimeout(res, delay));
        delay *= 2;
      }
    }

    return batch.map((text) => this.generateLocalFallbackEmbedding(text));
  }

  private meanPool(sequence: number[][]): number[] {
    const dim = sequence[0].length;
    const result = new Array(dim).fill(0);
    for (let i = 0; i < sequence.length; i++) {
      for (let j = 0; j < dim; j++) {
        result[j] += sequence[i][j];
      }
    }
    return result.map((val) => val / sequence.length);
  }

  /**
   * Generates a deterministic normalized 384-dimensional feature vector
   * for local testing or when HF API is unconfigured/offline.
   */
  private generateLocalFallbackEmbedding(text: string): number[] {
    const vector = new Array(this.dimension).fill(0);
    const cleaned = text.toLowerCase();
    
    for (let i = 0; i < cleaned.length; i++) {
      const charCode = cleaned.charCodeAt(i);
      const index = (charCode * 31 + i) % this.dimension;
      vector[index] += 1;
    }

    // Normalize to unit vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) return vector;
    return vector.map((val) => val / magnitude);
  }
}
