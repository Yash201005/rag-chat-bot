import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  GROQ_API_KEY: z.string().optional().default(''),
  HUGGINGFACE_API_KEY: z.string().optional().default(''),
  PINECONE_API_KEY: z.string().optional().default(''),
  PINECONE_INDEX: z.string().default('rag-platform-index'),
  PINECONE_NAMESPACE: z.string().default('default'),
  MAX_FILE_SIZE: z.coerce.number().default(10 * 1024 * 1024), // 10MB
  TOP_K: z.coerce.number().default(4),
  SIMILARITY_THRESHOLD: z.coerce.number().default(0.3),
  CHUNK_SIZE: z.coerce.number().default(1000),
  CHUNK_OVERLAP: z.coerce.number().default(200),
  UPLOADS_DIR: z.string().default(path.join(process.cwd(), 'uploads')),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Environment validation failed:', parsedEnv.error.format());
  throw new Error('Invalid environment configuration');
}

export const env = parsedEnv.data;
