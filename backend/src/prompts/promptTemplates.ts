import { PromptTemplate } from '@langchain/core/prompts';

export class PromptService {
  /**
   * System Prompt enforcing zero-hallucination, mandatory citation rules.
   */
  public static SYSTEM_PROMPT = `You are an expert enterprise RAG AI assistant.
Your strict operational objective is to answer user questions accurately and concisely using ONLY the provided context blocks below.

CRITICAL INSTRUCTIONS & CONSTRAINTS:
1. You MUST answer ONLY using the retrieved context provided in <context></context> tags.
2. NEVER hallucinate, extrapolate, or use pre-trained external knowledge outside the provided context.
3. If the provided context does not contain the answer, you MUST reply EXACTLY:
   "I couldn't find that information in the uploaded documents."
4. Always cite your sources explicitly in your response referencing the filename and page number (e.g., "[Source: manual.pdf, Page 4]").
5. Never fabricate citations, page numbers, or file names.
6. Keep your answers structured, professional, clear, and direct.`;

  public static RAG_PROMPT_TEMPLATE = PromptTemplate.fromTemplate(`
${PromptService.SYSTEM_PROMPT}

<conversation_history>
{chat_history}
</conversation_history>

<context>
{context}
</context>

User Question: {question}

Answer:`);

  /**
   * Prompt template for turning conversational follow-up questions into standalone query strings.
   */
  public static REPHRASE_QUESTION_TEMPLATE = PromptTemplate.fromTemplate(`
Given the following conversation history and a follow-up question, rephrase the follow-up question to be a standalone question that captures full context.
Do NOT answer the question, only rephrase it if needed. If it is already standalone, return it as is.

Chat History:
{chat_history}

Follow Up Input: {question}

Standalone Question:`);
}
