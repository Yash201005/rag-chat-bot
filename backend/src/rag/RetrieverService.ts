import { EmbeddingService } from '../embeddings/EmbeddingService';
import { PineconeService } from '../vectorstore/PineconeService';
import { VectorSearchResult, SearchType } from '../types/index';
import { GroqService } from '../services/GroqService';
import { PromptService } from '../prompts/promptTemplates';
import { env } from '../config/environment';
import { logger } from '../config/logger';

export interface RetrievalOptions {
  query: string;
  chatHistory?: string;
  topK?: number;
  similarityThreshold?: number;
  searchType?: SearchType;
  namespace?: string;
  filter?: Record<string, any>;
}

export interface RetrievalResult {
  chunks: VectorSearchResult[];
  retrievalTimeMs: number;
  embeddingTimeMs: number;
  rephrasedQuery?: string;
}

export class RetrieverService {
  constructor(
    private embeddingService: EmbeddingService,
    private pineconeService: PineconeService,
    private groqService: GroqService
  ) {}

  public async retrieve(options: RetrievalOptions): Promise<RetrievalResult> {
    const {
      query,
      chatHistory,
      topK = env.TOP_K,
      similarityThreshold = env.SIMILARITY_THRESHOLD,
      searchType = 'similarity',
      namespace = env.PINECONE_NAMESPACE,
      filter,
    } = options;

    let targetQuery = query;
    let rephrasedQuery: string | undefined = undefined;

    // 1. History-aware rephrasing if conversational history exists
    if (chatHistory && chatHistory !== 'None' && chatHistory.trim().length > 0) {
      try {
        const promptInput = await PromptService.REPHRASE_QUESTION_TEMPLATE.format({
          chat_history: chatHistory,
          question: query,
        });

        let generated = '';
        for await (const chunk of this.groqService.streamCompletion({
          prompt: promptInput,
          maxTokens: 120,
        })) {
          generated += chunk.token;
        }

        rephrasedQuery = generated.trim();

        if (
          rephrasedQuery &&
          rephrasedQuery.length > 3 &&
          !rephrasedQuery.toLowerCase().includes("couldn't find") &&
          !rephrasedQuery.toLowerCase().includes("could not find")
        ) {
          targetQuery = rephrasedQuery;
          logger.info(`Rephrased conversational query: "${query}" -> "${targetQuery}"`);
        } else {
          logger.info(`Rephrased query skipped or invalid, using original query: "${query}"`);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.warn(`History-aware rephrasing error: ${message}. Using original query.`);
      }
    }

    // 2. Generate embedding for query
    const embedStart = Date.now();
    const queryVector = await this.embeddingService.embedQuery(targetQuery);
    const embeddingTimeMs = Date.now() - embedStart;

    // 3. Retrieve vectors from Pinecone (Similarity or MMR)
    const retrieveStart = Date.now();
    let searchResults: VectorSearchResult[];

    if (searchType === 'mmr') {
      searchResults = await this.pineconeService.searchMMR(
        queryVector,
        topK,
        0.5,
        filter,
        namespace
      );
    } else {
      searchResults = await this.pineconeService.searchVectors(
        queryVector,
        topK,
        filter,
        namespace
      );
    }

    const retrievalTimeMs = Date.now() - retrieveStart;

    // 4. Context Compression: Filter chunks by similarity threshold
    const compressedChunks = searchResults.filter((chunk) => {
      // If score is 0 (uncalculated) or exceeds threshold, include
      return chunk.score === 0 || chunk.score >= similarityThreshold;
    });

    // If threshold filtering removes everything, return top 1 chunk to avoid empty context
    const finalChunks =
      compressedChunks.length > 0
        ? compressedChunks
        : searchResults.slice(0, 1);

    return {
      chunks: finalChunks,
      retrievalTimeMs,
      embeddingTimeMs,
      rephrasedQuery,
    };
  }

  public formatContextForPrompt(chunks: VectorSearchResult[]): string {
    if (chunks.length === 0) {
      return 'No relevant context found.';
    }

    return chunks
      .map(
        (chunk, idx) =>
          `[Chunk ${idx + 1} | Source: ${chunk.metadata.filename} | Page: ${chunk.metadata.page} | Section: ${
            chunk.metadata.section
          } | Score: ${(chunk.score * 100).toFixed(1)}%]\n${chunk.text}`
      )
      .join('\n\n---\n\n');
  }
}