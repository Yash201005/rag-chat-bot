import { SessionRepository } from '../repositories/SessionRepository.js';
import { ChatMessage } from '../types/index.js';

export class MemoryService {
  private repository: SessionRepository;

  constructor() {
    this.repository = SessionRepository.getInstance();
  }

  public getFormattedHistory(sessionId: string, maxMessages = 6): string {
    const session = this.repository.getSession(sessionId);
    if (!session || session.messages.length === 0) {
      return 'None';
    }

    const recentMessages = session.messages.slice(-maxMessages);
    return recentMessages
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n');
  }

  public saveUserMessage(sessionId: string, text: string): ChatMessage {
    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    this.repository.addMessage(sessionId, message);
    return message;
  }

  public saveAssistantMessage(
    sessionId: string,
    text: string,
    sources?: any[],
    metrics?: any
  ): ChatMessage {
    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      role: 'assistant',
      content: text,
      sources,
      metrics,
      timestamp: new Date().toISOString(),
    };
    this.repository.addMessage(sessionId, message);
    return message;
  }
}
