import { ChatSession, ChatMessage } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

export class SessionRepository {
  private static instance: SessionRepository;
  private sessions: Map<string, ChatSession> = new Map();

  private constructor() {
    // Initialize default session
    const defaultId = 'default-session';
    this.sessions.set(defaultId, {
      id: defaultId,
      title: 'New Conversation',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      namespace: 'default',
    });
  }

  public static getInstance(): SessionRepository {
    if (!SessionRepository.instance) {
      SessionRepository.instance = new SessionRepository();
    }
    return SessionRepository.instance;
  }

  public createSession(title?: string, namespace = 'default'): ChatSession {
    const id = uuidv4();
    const session: ChatSession = {
      id,
      title: title || 'New Conversation',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      namespace,
    };
    this.sessions.set(id, session);
    return session;
  }

  public getSession(id: string): ChatSession | undefined {
    return this.sessions.get(id);
  }

  public getAllSessions(): ChatSession[] {
    return Array.from(this.sessions.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  public addMessage(sessionId: string, message: ChatMessage): ChatSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    session.messages.push(message);
    session.updatedAt = new Date().toISOString();

    // Auto update title based on first user question
    if (session.title === 'New Conversation' && message.role === 'user') {
      session.title = message.content.slice(0, 35) + (message.content.length > 35 ? '...' : '');
    }

    this.sessions.set(sessionId, session);
    return session;
  }

  public deleteSession(id: string): boolean {
    return this.sessions.delete(id);
  }

  public clearAll(): void {
    this.sessions.clear();
  }
}
