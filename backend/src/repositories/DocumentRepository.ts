import { DocumentRecord } from '../types/index';

export class DocumentRepository {
  private static instance: DocumentRepository;
  private documents: Map<string, DocumentRecord> = new Map();

  private constructor() {}

  public static getInstance(): DocumentRepository {
    if (!DocumentRepository.instance) {
      DocumentRepository.instance = new DocumentRepository();
    }
    return DocumentRepository.instance;
  }

  public saveDocument(doc: DocumentRecord): DocumentRecord {
    this.documents.set(doc.id, doc);
    return doc;
  }

  public getDocument(id: string): DocumentRecord | undefined {
    return this.documents.get(id);
  }

  public getAllDocuments(): DocumentRecord[] {
    return Array.from(this.documents.values()).sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }

  public updateStatus(id: string, status: 'processing' | 'indexed' | 'error', errorMessage?: string): void {
    const doc = this.documents.get(id);
    if (doc) {
      doc.status = status;
      if (errorMessage) doc.errorMessage = errorMessage;
      this.documents.set(id, doc);
    }
  }

  public deleteDocument(id: string): boolean {
    return this.documents.delete(id);
  }
}
