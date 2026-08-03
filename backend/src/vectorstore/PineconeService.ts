import { Pinecone, RecordMetadata } from '@pinecone-database/pinecone';
import { IPineconeService } from '../interfaces/index';
import { VectorSearchResult, ChunkMetadata } from '../types/index';
import { env } from '../config/environment';
import { logger } from '../config/logger';

interface InMemoryVectorRecord {
  id: string;
  values: number[];
  metadata: Record<string, unknown>;
  namespace: string;
}

export class PineconeService implements IPineconeService {
  private client: Pinecone | null = null;
  private indexName: string;
  private inMemoryStore: InMemoryVectorRecord[] = [];

  constructor() {
    this.indexName = env.PINECONE_INDEX;
    if (env.PINECONE_API_KEY) {
      try {
        this.client = new Pinecone({
          apiKey: env.PINECONE_API_KEY,
        });
        logger.info(`PineconeService initialized targeting index '${this.indexName}'.`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Pinecone initialization failed: ${message}. Switching to in-memory vector store fallback.`);
      }
    } else {
      logger.warn('PINECONE_API_KEY not set. PineconeService operating in in-memory vector store fallback mode.');
    }
  }

  public async upsertVectors(
    vectors: { id: string; values: number[]; metadata: Record<string, unknown> }[],
    namespace: string = env.PINECONE_NAMESPACE
  ): Promise<void> {
    if (vectors.length === 0) return;

    if (this.client) {
      try {
        const index = this.client.index(this.indexName);
        const batchSize = 100;
        for (let i = 0; i < vectors.length; i += batchSize) {
          const batch = vectors.slice(i, i + batchSize);
          await index.namespace(namespace).upsert(batch as unknown as Parameters<ReturnType<typeof this.client.index>['upsert']>[0]);
        }
        logger.info(`Upserted ${vectors.length} vectors to Pinecone namespace '${namespace}'.`);
        return;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(`Pinecone upsert error: ${message}. Storing in memory fallback.`);
      }
    }

    // In-memory fallback upsert
    vectors.forEach((v) => {
      const existingIndex = this.inMemoryStore.findIndex(
        (item) => item.id === v.id && item.namespace === namespace
      );
      if (existingIndex >= 0) {
        this.inMemoryStore[existingIndex] = { ...v, namespace };
      } else {
        this.inMemoryStore.push({ ...v, namespace });
      }
    });
    logger.info(`Upserted ${vectors.length} vectors into local fallback vector memory.`);
  }

  public async searchVectors(
    queryVector: number[],
    topK: number = env.TOP_K,
    filter?: RecordMetadata,
    namespace: string = env.PINECONE_NAMESPACE
  ): Promise<VectorSearchResult[]> {
    if (this.client) {
      try {
        const index = this.client.index(this.indexName);
        const queryOptions: { vector: number[]; topK: number; includeMetadata: boolean; filter?: RecordMetadata } = {
          vector: queryVector,
          topK,
          includeMetadata: true,
        };
        if (filter && Object.keys(filter).length > 0) {
          queryOptions.filter = filter;
        }

        const queryResponse = await index.namespace(namespace).query(queryOptions);

        return (queryResponse.matches || []).map((match) => ({
          chunkId: match.id,
          documentId: (match.metadata?.documentId as string) || '',
          text: (match.metadata?.text as string) || '',
          score: match.score || 0,
          metadata: (match.metadata || {}) as unknown as ChunkMetadata,
        }));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(`Pinecone query failed: ${message}. Falling back to in-memory search.`);
      }
    }

    // In-memory cosine similarity search
    const filteredRecords = this.inMemoryStore.filter((record) => {
      if (record.namespace !== namespace) return false;
      if (!filter) return true;
      return Object.entries(filter).every(([key, val]) => record.metadata[key] === val);
    });

    const scoredResults = filteredRecords.map((record) => {
      const score = this.cosineSimilarity(queryVector, record.values);
      return {
        chunkId: record.id,
        documentId: (record.metadata.documentId as string) || '',
        text: (record.metadata.text as string) || '',
        score,
        metadata: record.metadata as unknown as ChunkMetadata,
      };
    });

    scoredResults.sort((a, b) => b.score - a.score);
    return scoredResults.slice(0, topK);
  }

  public async searchMMR(
    queryVector: number[],
    topK: number = env.TOP_K,
    lambda: number = 0.5,
    filter?: Record<string, any>,
    namespace: string = env.PINECONE_NAMESPACE
  ): Promise<VectorSearchResult[]> {
    // Fetch larger candidate pool
    const fetchK = Math.min(topK * 4, 20);
    const candidates = await this.searchVectors(queryVector, fetchK, filter, namespace);

    if (candidates.length <= topK) {
      return candidates;
    }

    // Select items maximizing relevance and diversity
    const selected: VectorSearchResult[] = [];
    const remaining = [...candidates];

    while (selected.length < topK && remaining.length > 0) {
      let bestScore = -Infinity;
      let bestIndex = -1;

      for (let i = 0; i < remaining.length; i++) {
        const item = remaining[i];
        const relevance = item.score;
        let maxSimilarityToSelected = 0;

        if (selected.length > 0) {
          // Approximate similarity between candidates based on snippet text overlap or scores
          maxSimilarityToSelected = Math.max(
            ...selected.map((sel) => this.textOverlapSimilarity(sel.text, item.text))
          );
        }

        const mmrScore = lambda * relevance - (1 - lambda) * maxSimilarityToSelected;
        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestIndex = i;
        }
      }

      if (bestIndex !== -1) {
        selected.push(remaining[bestIndex]);
        remaining.splice(bestIndex, 1);
      } else {
        break;
      }
    }

    return selected;
  }

  public async deleteVectorsByDocumentId(
    documentId: string,
    namespace: string = env.PINECONE_NAMESPACE
  ): Promise<void> {
    if (this.client) {
      try {
        const index = this.client.index(this.indexName);
        await index.namespace(namespace).deleteMany({
          filter: { documentId: { $eq: documentId } },
        });
        logger.info(`Deleted Pinecone vectors for document '${documentId}' in namespace '${namespace}'.`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(`Pinecone delete failed: ${message}. Cleaning in-memory fallback store.`);
      }
    }

    this.inMemoryStore = this.inMemoryStore.filter(
      (item) => !(item.metadata.documentId === documentId && item.namespace === namespace)
    );
  }

  public async getIndexStats(): Promise<{ totalVectorCount: number; namespaces: Record<string, unknown> }> {
    if (this.client) {
      try {
        const index = this.client.index(this.indexName);
        const stats = await index.describeIndexStats();
        return {
          totalVectorCount: stats.totalRecordCount || 0,
          namespaces: (stats.namespaces as unknown as Record<string, unknown>) || {},
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(`Pinecone stats failed: ${message}. Returning memory stats.`);
      }
    }

    return {
      totalVectorCount: this.inMemoryStore.length,
      namespaces: {
        [env.PINECONE_NAMESPACE]: { recordCount: this.inMemoryStore.length },
      },
    };
  }

  private cosineSimilarity(v1: number[], v2: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < v1.length; i++) {
      dotProduct += v1[i] * v2[i];
      normA += v1[i] * v1[i];
      normB += v2[i] * v2[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private textOverlapSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }
}
