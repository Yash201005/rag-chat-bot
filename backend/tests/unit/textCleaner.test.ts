import { describe, it, expect } from 'vitest';
import { TextCleaner } from '../../src/utils/textCleaner.js';

describe('TextCleaner Utility', () => {
  it('should clean control characters and normalize newlines', () => {
    const rawText = "Hello\r\nWorld!\x00\x07  This  is   a   test.\n\n\n\nDone.";
    const cleaned = TextCleaner.clean(rawText);

    expect(cleaned).not.toContain('\r');
    expect(cleaned).not.toContain('\x00');
    expect(cleaned).toContain('Hello\nWorld!');
    expect(cleaned).toContain('This is a test.');
    expect(cleaned).not.toContain('\n\n\n');
  });

  it('should return empty string for null or empty input', () => {
    expect(TextCleaner.clean('')).toBe('');
  });
});
