import { ChatGroq } from '@langchain/groq';
import { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { env } from '../config/environment';
import { logger } from '../config/logger';

export interface GroqCompletionOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export class GroqService {
  private modelName = 'llama-3.3-70b-versatile';
  private client: ChatGroq | null = null;

  constructor() {
    if (env.GROQ_API_KEY) {
      this.client = new ChatGroq({
        apiKey: env.GROQ_API_KEY,
        modelName: this.modelName,
        temperature: 0.2,
      });

      logger.info(`GroqService initialized using model '${this.modelName}'.`);
    } else {
      logger.warn(
        'GROQ_API_KEY not configured. GroqService using local context synthesis engine.'
      );
    }
  }

  public async *streamCompletion(
    options: GroqCompletionOptions
  ): AsyncGenerator<
    { token: string; promptTokens: number; completionTokens: number },
    void,
    unknown
  > {
    const {
      prompt,
      systemPrompt,
      temperature = 0.2,
      maxTokens = 2048,
      signal,
    } = options;

    const fullInput: BaseLanguageModelInput = [
      {
        role: 'system',
        content: systemPrompt || 'You are an enterprise AI assistant.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    let promptTokens = this.estimateTokens(prompt + (systemPrompt || ''));
    let completionTokens = 0;

    if (this.client) {
      try {
        const customClient = new ChatGroq({
          apiKey: env.GROQ_API_KEY,
          modelName: this.modelName,
          temperature,
          maxTokens,
        });

        const stream = await customClient.stream(fullInput, { signal });

        for await (const chunk of stream) {
          const textChunk =
            typeof chunk.content === 'string' ? chunk.content : '';

          if (textChunk) {
            completionTokens += this.estimateTokens(textChunk);

            yield {
              token: textChunk,
              promptTokens,
              completionTokens,
            };
          }
        }

        return;
      } catch (error: any) {
        logger.error(
          `Groq streaming request failed: ${error.message}. Falling back to context synthesis stream.`
        );
      }
    }

    const fallbackResponse = this.generateFallbackSynthesis(prompt);
    const words = fallbackResponse.split(' ');

    for (const word of words) {
      if (signal?.aborted) break;

      const token = word + ' ';
      completionTokens += 1;

      yield {
        token,
        promptTokens,
        completionTokens,
      };

      await new Promise((res) => setTimeout(res, 35));
    }
  }

  public estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.trim().split(/\s+/).length * 1.3);
  }

  private generateFallbackSynthesis(prompt: string): string {
    if (prompt.includes('Follow Up Input:') || prompt.includes('Standalone Question:')) {
      const followUpMatch = prompt.match(/Follow Up Input:\s*(.*)/i);
      if (followUpMatch && followUpMatch[1]) {
        return followUpMatch[1].trim();
      }
    }

    const contextMatch = prompt.match(
      /<context>([\s\S]*?)<\/context>/i
    );

    const contextText = contextMatch ? contextMatch[1].trim() : '';

    if (!contextText || contextText.includes('No relevant context')) {
      return "I couldn't find that information in the uploaded documents.";
    }

    return `Based on the uploaded documentation:\n\n${contextText}\n\nThis synthesis directly leverages the retrieved context blocks matching your query.`;
  }
}