import { describe, it, expect } from 'vitest';
import { MetadataGenerator } from '../../src/utils/metadataGenerator';

describe('MetadataGenerator Utility', () => {
  it('should generate valid chunk metadata with default values', () => {
    const meta = MetadataGenerator.createChunkMetadata({
      documentId: 'doc-123',
      filename: 'sample.pdf',
      page: 2,
      source: 'sample.pdf',
      fileType: 'pdf',
      chunkNumber: 1,
    });

    expect(meta.documentId).toBe('doc-123');
    expect(meta.filename).toBe('sample.pdf');
    expect(meta.page).toBe(2);
    expect(meta.fileType).toBe('pdf');
    expect(meta.chunkNumber).toBe(1);
    expect(meta.embeddingModel).toBe('BAAI/bge-small-en-v1.5');
    expect(meta.timestamp).toBeDefined();
  });
});
