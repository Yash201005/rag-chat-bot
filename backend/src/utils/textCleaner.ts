/**
 * TextCleaner utility for normalizing document content prior to chunking and embedding.
 * Strips non-printable control characters, normalizes line breaks and whitespace,
 * while maintaining paragraph structure and semantic layout.
 */
export class TextCleaner {
  public static clean(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    let cleaned = text;

    // 1. Remove non-printable control characters (except newline \n and tab \t)
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');

    // 2. Normalize Windows/Mac line endings to standard Unix \n
    cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // 3. Replace multiple spaces or non-breaking spaces with a single space
    cleaned = cleaned.replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000]/g, ' ');
    cleaned = cleaned.replace(/[ \t]+/g, ' ');

    // 4. Reduce excessive consecutive line breaks (keep max 2 for paragraph separation)
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // 5. Trim leading and trailing whitespace per line
    cleaned = cleaned
      .split('\n')
      .map((line) => line.trim())
      .join('\n');

    return cleaned.trim();
  }
}
