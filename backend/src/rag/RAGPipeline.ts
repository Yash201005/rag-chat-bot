import { RetrieverService } from './RetrieverService';
import { MemoryService } from './MemoryService';
import { GroqService } from '../services/GroqService';
import { PromptService } from '../prompts/promptTemplates';
import { MetricsRepository } from '../repositories/MetricsRepository';
import { CitationSource, RAGMetrics } from '../types/index';
import { IRAGQueryOptions } from '../interfaces/index';
import { logger } from '../config/logger';

export interface RAGPipelineResponse {
  answer: string;
  sources: CitationSource[];
  metrics: RAGMetrics;
  sessionId: string;
}

export class RAGPipeline {
  private memoryService: MemoryService;
  private metricsRepo: MetricsRepository;

  constructor(
    private retrieverService: RetrieverService,
    private groqService: GroqService
  ) {
    this.memoryService = new MemoryService();
    this.metricsRepo = MetricsRepository.getInstance();
  }

  public async *executeQueryStream(
    options: IRAGQueryOptions
  ): AsyncGenerator<
    { token?: string; isComplete?: boolean; sources?: CitationSource[]; metrics?: RAGMetrics },
    void,
    unknown
  > {
    const startTime = Date.now();
    const { question, sessionId, namespace, topK, similarityThreshold, searchType, temperature, maxTokens } = options;

    // 1. Save user query to conversation history
    this.memoryService.saveUserMessage(sessionId, question);

    // 2. Fetch conversation history for context rephrasing
    const chatHistory = this.memoryService.getFormattedHistory(sessionId);

    // 3. Perform retrieval (Similarity / MMR / History-aware)
    const retrievalResult = await this.retrieverService.retrieve({
      query: question,
      chatHistory,
      topK,
      similarityThreshold,
      searchType,
      namespace,
    });

    const contextText = this.retrieverService.formatContextForPrompt(retrievalResult.chunks);

    // 4. Build Citation Sources from retrieved chunks with normalized relevance scores
    const sources: CitationSource[] = retrievalResult.chunks.map((chunk) => {
      // Normalize raw Cosine Similarity float (e.g. 0.15 to 0.42) to intuitive 50%-98% relevance
      const rawScore = chunk.score;
      let relevanceScore = 0;
      if (rawScore > 0) {
        if (rawScore > 1) {
          relevanceScore = Math.min(100, Math.round(rawScore));
        } else {
          const minRaw = 0.15;
          const maxRaw = 0.42;
          const normalized = Math.min(1.0, Math.max(0.1, (rawScore - minRaw) / (maxRaw - minRaw)));
          relevanceScore = Number((50 + normalized * 48).toFixed(1));
        }
      }
      return {
        filename: chunk.metadata.filename,
        page: chunk.metadata.page,
        chunkId: chunk.chunkId,
        similarityScore: relevanceScore,
        textSnippet: chunk.text,
        section: chunk.metadata.section,
      };
    });

    // 5. Format prompt with LCEL template
    const formattedPrompt = await PromptService.RAG_PROMPT_TEMPLATE.format({
      chat_history: chatHistory,
      context: contextText,
      question,
    });

    // 6. Stream Groq LLM completion
    const generationStart = Date.now();
    let accumulatedText = '';
    let promptTokens = 0;
    let completionTokens = 0;

    for await (const chunk of this.groqService.streamCompletion({
      prompt: formattedPrompt,
      temperature,
      maxTokens,
    })) {
      accumulatedText += chunk.token;
      promptTokens = chunk.promptTokens;
      completionTokens = chunk.completionTokens;

      yield { token: chunk.token, isComplete: false };
    }

    const generationTimeMs = Date.now() - generationStart;
    const totalResponseTimeMs = Date.now() - startTime;

    const metrics: RAGMetrics = {
      totalResponseTimeMs,
      embeddingTimeMs: retrievalResult.embeddingTimeMs,
      retrievalTimeMs: retrievalResult.retrievalTimeMs,
      generationTimeMs,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    };

    // 7. Persist assistant message & metrics
    this.memoryService.saveAssistantMessage(sessionId, accumulatedText, sources, metrics);
    this.metricsRepo.recordQueryMetrics(metrics);

    logger.info(
      `RAG Query completed in ${totalResponseTimeMs}ms (Retrieval: ${retrievalResult.retrievalTimeMs}ms, Gen: ${generationTimeMs}ms)`
    );

    yield {
      isComplete: true,
      sources,
      metrics,
    };
  }
}
