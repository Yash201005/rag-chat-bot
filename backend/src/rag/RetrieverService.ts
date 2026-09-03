import { EmbeddingService } from '../embeddings/EmbeddingService';
import { PineconeService } from '../vectorstore/PineconeService';
import {
  VectorSearchResult,
  SearchType,
} from '../types/index';
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

  public async retrieve(
    options: RetrievalOptions
  ): Promise<RetrievalResult> {
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

    /*
     * ------------------------------------------------------------
     * HISTORY-AWARE QUERY REPHRASING
     * ------------------------------------------------------------
     */

    if (
      chatHistory &&
      chatHistory !== 'None' &&
      chatHistory.trim().length > 0
    ) {
      try {
        const promptInput =
          await PromptService.REPHRASE_QUESTION_TEMPLATE.format({
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
          !rephrasedQuery
            .toLowerCase()
            .includes("couldn't find") &&
          !rephrasedQuery
            .toLowerCase()
            .includes('could not find')
        ) {
          targetQuery = rephrasedQuery;

          logger.info(
            `Rephrased conversational query: "${query}" -> "${targetQuery}"`
          );
        } else {
          logger.info(
            `Rephrased query skipped or invalid, using original query: "${query}"`
          );
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : String(err);

        logger.warn(
          `History-aware rephrasing error: ${message}. Using original query.`
        );
      }
    }

    /*
     * ------------------------------------------------------------
     * EMBEDDING
     * ------------------------------------------------------------
     */

    const embedStart = Date.now();

    const queryVector =
      await this.embeddingService.embedQuery(targetQuery);

    const embeddingTimeMs = Date.now() - embedStart;

    /*
     * ------------------------------------------------------------
     * VECTOR SEARCH
     * ------------------------------------------------------------
     */

    const retrieveStart = Date.now();

    let searchResults: VectorSearchResult[];

    if (searchType === 'mmr') {
      searchResults =
        await this.pineconeService.searchMMR(
          queryVector,
          topK,
          0.5,
          filter,
          namespace
        );
    } else {
      searchResults =
        await this.pineconeService.searchVectors(
          queryVector,
          topK,
          filter,
          namespace
        );
    }

    const retrievalTimeMs =
      Date.now() - retrieveStart;

    /*
     * ------------------------------------------------------------
     * DEBUG RETRIEVAL RESULTS
     * ------------------------------------------------------------
     *
     * This is the important part.
     *
     * We already know the vector search is finding a result.
     * Now we verify whether that result actually contains
     * the document text.
     */

    logger.info(
      `DEBUG RETRIEVAL RESULTS: ${searchResults.length} result(s) returned.`
    );

    searchResults.forEach((chunk, index) => {
      logger.info(
        `DEBUG CHUNK ${index + 1}: ` +
          `id=${chunk.chunkId}, ` +
          `score=${chunk.score}, ` +
          `filename=${chunk.metadata?.filename}, ` +
          `page=${chunk.metadata?.page}, ` +
          `textLength=${chunk.text?.length || 0}`
      );

      if (chunk.text && chunk.text.trim().length > 0) {
        logger.info(
          `DEBUG CHUNK ${index + 1} TEXT:\n${chunk.text.substring(
            0,
            2000
          )}`
        );
      } else {
        logger.warn(
          `DEBUG CHUNK ${index + 1}: TEXT IS EMPTY.`
        );

        logger.info(
          `DEBUG CHUNK ${index + 1} METADATA:\n${JSON.stringify(
            chunk.metadata,
            null,
            2
          )}`
        );
      }
    });

    /*
     * ------------------------------------------------------------
     * SIMILARITY FILTERING
     * ------------------------------------------------------------
     */

    const compressedChunks = searchResults.filter(
      (chunk) => {
        return (
          chunk.score === 0 ||
          chunk.score >= similarityThreshold
        );
      }
    );

    const finalChunks =
      compressedChunks.length > 0
        ? compressedChunks
        : searchResults.slice(0, 1);

    logger.info(
      `DEBUG FINAL CHUNKS: ${finalChunks.length} chunk(s) selected for context.`
    );

    finalChunks.forEach((chunk, index) => {
      logger.info(
        `DEBUG FINAL CHUNK ${index + 1}: ` +
          `textLength=${chunk.text?.length || 0}, ` +
          `score=${chunk.score}`
      );
    });

    return {
      chunks: finalChunks,
      retrievalTimeMs,
      embeddingTimeMs,
      rephrasedQuery,
    };
  }

  /*
   * ------------------------------------------------------------
   * FORMAT RETRIEVED CHUNKS FOR THE LLM
   * ------------------------------------------------------------
   */

  public formatContextForPrompt(
    chunks: VectorSearchResult[]
  ): string {
    if (!chunks || chunks.length === 0) {
      logger.warn(
        'formatContextForPrompt received zero chunks.'
      );

      return 'No relevant context found.';
    }

    const usableChunks = chunks.filter(
      (chunk) =>
        chunk.text &&
        chunk.text.trim().length > 0
    );

    logger.info(
      `DEBUG CONTEXT FORMAT: ${chunks.length} retrieved chunk(s), ` +
        `${usableChunks.length} chunk(s) contain usable text.`
    );

    if (usableChunks.length === 0) {
      logger.warn(
        'All retrieved chunks have empty text. ' +
          'The vector records contain metadata but no document content.'
      );

      return 'No relevant context found.';
    }

    return usableChunks
      .map(
        (chunk, idx) =>
          `[Chunk ${idx + 1} | Source: ${
            chunk.metadata.filename
          } | Page: ${chunk.metadata.page} | Section: ${
            chunk.metadata.section
          } | Score: ${(chunk.score * 100).toFixed(
            1
          )}%]\n${chunk.text}`
      )
      .join('\n\n---\n\n');
  }
}