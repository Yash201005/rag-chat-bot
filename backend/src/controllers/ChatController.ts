import { Request, Response, NextFunction } from 'express';
import { RAGPipeline } from '../rag/RAGPipeline';
import { CitationSource, RAGMetrics } from '../types/index';
import { z } from 'zod';

const chatRequestSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  sessionId: z.string().optional().default('default-session'),
  namespace: z.string().optional(),
  topK: z.number().int().positive().optional().default(4),
  similarityThreshold: z.number().min(0).max(1).optional().default(0.5),
  searchType: z.enum(['similarity', 'mmr']).optional().default('similarity'),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  maxTokens: z.number().int().positive().optional().default(1024),
  stream: z.boolean().optional().default(false),
});

export class ChatController {
  constructor(private ragPipeline: RAGPipeline) {}

  public handleChat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = chatRequestSchema.parse(req.body);

      if (validated.stream) {
        // SSE (Server-Sent Events) Header Setup
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders?.();

        const streamGen = this.ragPipeline.executeQueryStream({
          question: validated.question,
          sessionId: validated.sessionId,
          namespace: validated.namespace,
          topK: validated.topK,
          similarityThreshold: validated.similarityThreshold,
          searchType: validated.searchType,
          temperature: validated.temperature,
          maxTokens: validated.maxTokens,
        });

        for await (const chunk of streamGen) {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }

        res.write('event: end\ndata: {}\n\n');
        res.end();
      } else {
        // Standard JSON aggregate completion
        let fullAnswer = '';
        let sources: CitationSource[] = [];
        let metrics: RAGMetrics | null = null;

        const streamGen = this.ragPipeline.executeQueryStream({
          question: validated.question,
          sessionId: validated.sessionId,
          namespace: validated.namespace,
          topK: validated.topK,
          similarityThreshold: validated.similarityThreshold,
          searchType: validated.searchType,
          temperature: validated.temperature,
          maxTokens: validated.maxTokens,
        });

        for await (const chunk of streamGen) {
          if (chunk.token) fullAnswer += chunk.token;
          if (chunk.isComplete) {
            sources = chunk.sources || [];
            metrics = chunk.metrics || null;
          }
        }

        res.status(200).json({
          answer: fullAnswer,
          sources,
          similarityScore: sources.length > 0 ? sources[0].similarityScore : 0,
          retrievedChunks: sources,
          latency: metrics?.totalResponseTimeMs || 0,
          conversationId: validated.sessionId,
          tokenUsage: {
            promptTokens: metrics?.promptTokens || 0,
            completionTokens: metrics?.completionTokens || 0,
            totalTokens: metrics?.totalTokens || 0,
          },
          metrics,
        });
      }
    } catch (error) {
      next(error);
    }
  };
}
