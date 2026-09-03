import { ChatSession, ChatMessage } from '../types/index';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export class SessionRepository {
  private static instance: SessionRepository;

  private sessions: Map<string, ChatSession> = new Map();

  private readonly dataDirectory: string;
  private readonly dataFile: string;

  private constructor() {
    this.dataDirectory = path.join(process.cwd(), 'data');
    this.dataFile = path.join(this.dataDirectory, 'sessions.json');

    this.loadSessions();
  }

  public static getInstance(): SessionRepository {
    if (!SessionRepository.instance) {
      SessionRepository.instance = new SessionRepository();
    }

    return SessionRepository.instance;
  }

  /*
   * ------------------------------------------------------------
   * PERSISTENCE
   * ------------------------------------------------------------
   */

  private loadSessions(): void {
    try {
      if (!fs.existsSync(this.dataDirectory)) {
        fs.mkdirSync(this.dataDirectory, { recursive: true });
      }

      if (!fs.existsSync(this.dataFile)) {
        this.createDefaultSession();
        this.saveSessions();
        return;
      }

      const rawData = fs.readFileSync(this.dataFile, 'utf-8');

      if (!rawData.trim()) {
        this.createDefaultSession();
        this.saveSessions();
        return;
      }

      const parsedSessions = JSON.parse(rawData) as ChatSession[];

      if (!Array.isArray(parsedSessions)) {
        throw new Error('Invalid sessions.json format.');
      }

      for (const session of parsedSessions) {
        if (
          session &&
          typeof session.id === 'string' &&
          typeof session.title === 'string' &&
          Array.isArray(session.messages)
        ) {
          this.sessions.set(session.id, session);
        }
      }

      /*
       * Make sure the application always has a default session
       * available if the storage file was empty.
       */
      if (this.sessions.size === 0) {
        this.createDefaultSession();
        this.saveSessions();
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);

      console.error(
        `Failed to load sessions from disk: ${message}`
      );

      this.sessions.clear();
      this.createDefaultSession();
      this.saveSessions();
    }
  }

  private saveSessions(): void {
    try {
      if (!fs.existsSync(this.dataDirectory)) {
        fs.mkdirSync(this.dataDirectory, { recursive: true });
      }

      const sessions = Array.from(this.sessions.values());

      fs.writeFileSync(
        this.dataFile,
        JSON.stringify(sessions, null, 2),
        'utf-8'
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);

      console.error(
        `Failed to save sessions to disk: ${message}`
      );
    }
  }

  private createDefaultSession(): ChatSession {
    const defaultId = 'default-session';
    const now = new Date().toISOString();

    const defaultSession: ChatSession = {
      id: defaultId,
      title: 'New Conversation',
      messages: [],
      createdAt: now,
      updatedAt: now,
      namespace: 'default',
    };

    this.sessions.set(defaultId, defaultSession);

    return defaultSession;
  }

  /*
   * ------------------------------------------------------------
   * SESSION CREATION
   * ------------------------------------------------------------
   */

  public createSession(
    title?: string,
    namespace = 'default'
  ): ChatSession {
    const id = uuidv4();
    const now = new Date().toISOString();

    const session: ChatSession = {
      id,
      title: title || 'New Conversation',
      messages: [],
      createdAt: now,
      updatedAt: now,
      namespace,
    };

    this.sessions.set(id, session);
    this.saveSessions();

    return session;
  }

  /*
   * ------------------------------------------------------------
   * GET SESSION
   * ------------------------------------------------------------
   */

  public getSession(id: string): ChatSession | undefined {
    return this.sessions.get(id);
  }

  /*
   * ------------------------------------------------------------
   * GET ALL SESSIONS
   * ------------------------------------------------------------
   */

  public getAllSessions(): ChatSession[] {
    return Array.from(this.sessions.values()).sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() -
        new Date(a.updatedAt).getTime()
    );
  }

  /*
   * ------------------------------------------------------------
   * ADD MESSAGE
   * ------------------------------------------------------------
   */

  public addMessage(
    sessionId: string,
    message: ChatMessage
  ): ChatSession | undefined {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return undefined;
    }

    session.messages.push(message);
    session.updatedAt = new Date().toISOString();

    /*
     * Automatically name a new conversation using the
     * first user question.
     */
    if (
      session.title === 'New Conversation' &&
      message.role === 'user'
    ) {
      session.title =
        message.content.slice(0, 35) +
        (message.content.length > 35 ? '...' : '');
    }

    this.sessions.set(sessionId, session);
    this.saveSessions();

    return session;
  }

  /*
   * ------------------------------------------------------------
   * DELETE SESSION
   * ------------------------------------------------------------
   */

  public deleteSession(id: string): boolean {
    const deleted = this.sessions.delete(id);

    if (deleted) {
      this.saveSessions();
    }

    return deleted;
  }

  /*
   * ------------------------------------------------------------
   * CLEAR ALL
   * ------------------------------------------------------------
   */

  public clearAll(): void {
    this.sessions.clear();
    this.saveSessions();
  }
}