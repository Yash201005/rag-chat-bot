import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

const app = createApp();

describe('Backend API Endpoints', () => {
  it('GET /api/health - should return status UP', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
  });

  it('GET /api/documents - should return document list', async () => {
    const res = await request(app).get('/api/documents');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.documents)).toBe(true);
  });

  it('GET /api/sessions - should return session list with default session', async () => {
    const res = await request(app).get('/api/sessions');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.sessions)).toBe(true);
    expect(res.body.sessions.length).toBeGreaterThan(0);
  });

  it('GET /api/metrics - should return system metrics', async () => {
    const res = await request(app).get('/api/metrics');
    expect(res.status).toBe(200);
    expect(res.body.metrics).toBeDefined();
    expect(res.body.systemStatus).toBe('healthy');
  });

  it('POST /api/chat (JSON mode) - should return answer and metrics', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({
        question: 'What is the system capability?',
        stream: false,
      });

    expect(res.status).toBe(200);
    expect(res.body.answer).toBeDefined();
    expect(res.body.conversationId).toBe('default-session');
  });
});
