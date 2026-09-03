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
  private readonly modelName = 'openai/gpt-oss-120b';
  private client: ChatGroq | null = null;

  constructor() {
    if (env.GROQ_API_KEY) {
      this.client = new ChatGroq({
        apiKey: env.GROQ_API_KEY,
        modelName: this.modelName,
        temperature: 0.2,
      });

      logger.info(
        `GroqService initialized using model '${this.modelName}'.`
      );
    } else {
      logger.warn(
        'GROQ_API_KEY not configured. GroqService using local context synthesis engine.'
      );
    }
  }

  public async *streamCompletion(
    options: GroqCompletionOptions
  ): AsyncGenerator<
    {
      token: string;
      promptTokens: number;
      completionTokens: number;
    },
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

    logger.info('========== GROQ SERVICE DEBUG ==========');
    logger.info(`Prompt length: ${prompt.length} characters`);
    logger.info(
      `Prompt contains <context>: ${prompt.includes('<context>')}`
    );
    logger.info(
      `Prompt contains </context>: ${prompt.includes('</context>')}`
    );

    const extractedContext = this.extractContext(prompt);

    logger.info(
      `Extracted context length: ${extractedContext.length} characters`
    );

    if (extractedContext.length > 0) {
      logger.info(
        `Extracted context preview:\n${extractedContext.substring(0, 2000)}`
      );
    } else {
      logger.warn('No context could be extracted from the RAG prompt.');
    }

    const extractedQuestion = this.extractQuestion(prompt);

    if (extractedQuestion) {
      logger.info(`Extracted question: "${extractedQuestion}"`);
    } else {
      logger.warn('No user question could be extracted from the RAG prompt.');
    }

    logger.info('========== END GROQ SERVICE DEBUG ==========');

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

    let promptTokens = this.estimateTokens(
      prompt + (systemPrompt || '')
    );

    let completionTokens = 0;

    /*
     * ------------------------------------------------------------
     * GROQ MODE
     * ------------------------------------------------------------
     */

    if (this.client) {
      try {
        const customClient = new ChatGroq({
          apiKey: env.GROQ_API_KEY,
          modelName: this.modelName,
          temperature,
          maxTokens,
        });

        logger.info(
          `Sending request to Groq model '${this.modelName}'.`
        );

        const stream = await customClient.stream(fullInput, {
          signal,
        });

        for await (const chunk of stream) {
          let textChunk = '';

          if (typeof chunk.content === 'string') {
            textChunk = chunk.content;
          } else if (Array.isArray(chunk.content)) {
            textChunk = chunk.content
              .map((item: unknown) => {
                if (
                  typeof item === 'object' &&
                  item !== null &&
                  'text' in item &&
                  typeof (item as { text?: unknown }).text === 'string'
                ) {
                  return (item as { text: string }).text;
                }

                return '';
              })
              .join('');
          }

          if (!textChunk) {
            continue;
          }

          completionTokens += this.estimateTokens(textChunk);

          yield {
            token: textChunk,
            promptTokens,
            completionTokens,
          };
        }

        logger.info('Groq generation completed successfully.');

        return;
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : String(error);

        logger.error(
          `Groq streaming request failed: ${errorMessage}. ` +
            'Falling back to local context synthesis.'
        );
      }
    }

    /*
     * ------------------------------------------------------------
     * LOCAL FALLBACK MODE
     * ------------------------------------------------------------
     */

    const fallbackResponse =
      this.generateFallbackSynthesis(prompt);

    logger.info(
      `Fallback response length: ${fallbackResponse.length} characters`
    );

    const words = fallbackResponse.split(/\s+/);

    for (const word of words) {
      if (signal?.aborted) {
        break;
      }

      if (!word) {
        continue;
      }

      const token = word + ' ';

      completionTokens += 1;

      yield {
        token,
        promptTokens,
        completionTokens,
      };

      await new Promise((resolve) =>
        setTimeout(resolve, 20)
      );
    }
  }

  /*
   * ------------------------------------------------------------
   * TOKEN ESTIMATION
   * ------------------------------------------------------------
   */

  public estimateTokens(text: string): number {
    if (!text || !text.trim()) {
      return 0;
    }

    return Math.ceil(
      text.trim().split(/\s+/).length * 1.3
    );
  }

  /*
   * ------------------------------------------------------------
   * CONTEXT EXTRACTION
   * ------------------------------------------------------------
   *
   * Extracts everything between:
   *
   * <context>
   *     ...
   * </context>
   *
   * The previous implementation had a malformed regular
   * expression, which caused valid RAG context to be
   * detected but extracted as an empty string.
   * ------------------------------------------------------------
   */

  private extractContext(prompt: string): string {
    if (!prompt) {
      return '';
    }

    const contextMatch = prompt.match(
      /<context>\s*([\s\S]*?)\s*<\/context>/i
    );

    if (!contextMatch || !contextMatch[1]) {
      return '';
    }

    const context = contextMatch[1].trim();

    if (!context) {
      return '';
    }

    return context;
  }

  /*
   * ------------------------------------------------------------
   * QUESTION EXTRACTION
   * ------------------------------------------------------------
   *
   * Extracts:
   *
   * User Question: ...
   *
   * from the RAG prompt.
   * ------------------------------------------------------------
   */

  private extractQuestion(prompt: string): string {
    if (!prompt) {
      return '';
    }

    const questionMatch = prompt.match(
      /User Question:\s*([\s\S]*?)(?:\n\s*Answer:|$)/i
    );

    if (!questionMatch || !questionMatch[1]) {
      return '';
    }

    return questionMatch[1].trim();
  }

  /*
   * ------------------------------------------------------------
   * FALLBACK SYNTHESIS
   * ------------------------------------------------------------
   *
   * Used if Groq is unavailable or the API request fails.
   *
   * This does not generate new information. It only returns
   * the retrieved RAG context.
   * ------------------------------------------------------------
   */

  private generateFallbackSynthesis(
    prompt: string
  ): string {
    const contextText = this.extractContext(prompt);
    const question = this.extractQuestion(prompt);

    if (
      !contextText ||
      contextText.trim().length === 0 ||
      contextText.trim().toLowerCase() ===
        'no relevant context found.'
    ) {
      logger.warn(
        'Fallback synthesis received no usable context.'
      );

      return "I couldn't find that information in the uploaded documents.";
    }

    logger.info(
      'Fallback synthesis found usable retrieved context.'
    );

    let response =
      'Based on the uploaded documentation:\n\n';

    response += contextText;

    if (question) {
      response +=
        '\n\nThe retrieved document context above is the source used for this answer.';
    }

    return response;
  }
}