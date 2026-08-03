import fs from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse/lib/pdf-parse';
import mammoth from 'mammoth';
import Papa from 'papaparse';
import * as cheerio from 'cheerio';
import { IDocumentLoader, LoadedDocument } from '../interfaces/index';
import { SupportedFileType } from '../types/index';
import { TextCleaner } from '../utils/textCleaner';
import { logger } from '../config/logger';

export class PDFDocumentLoader implements IDocumentLoader {
  async load(filePath: string, filename: string): Promise<LoadedDocument[]> {
    const dataBuffer = await fs.readFile(filePath);
    const pdfData = await pdfParse(dataBuffer);

    // Extract pages if available or split by form feed / page markers
    const pageTexts = pdfData.text.split('\f');
    const documents: LoadedDocument[] = [];

    if (pageTexts.length > 1) {
      pageTexts.forEach((text, index) => {
        const cleaned = TextCleaner.clean(text);
        if (cleaned.length > 0) {
          documents.push({
            pageContent: cleaned,
            metadata: {
              page: index + 1,
              section: `Page ${index + 1}`,
              source: filename,
            },
          });
        }
      });
    } else {
      const cleaned = TextCleaner.clean(pdfData.text);
      documents.push({
        pageContent: cleaned,
        metadata: {
          page: 1,
          section: 'Document Content',
          source: filename,
        },
      });
    }

    return documents;
  }
}

export class DOCXDocumentLoader implements IDocumentLoader {
  async load(filePath: string, filename: string): Promise<LoadedDocument[]> {
    const dataBuffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
    const cleaned = TextCleaner.clean(result.value);

    // Split paragraphs into sections
    const paragraphs = cleaned.split('\n\n');
    const documents: LoadedDocument[] = [];
    
    let currentPage = 1;
    let currentBatch = '';

    for (let i = 0; i < paragraphs.length; i++) {
      currentBatch += paragraphs[i] + '\n\n';
      // Create a page break roughly every 1500 characters
      if (currentBatch.length >= 1500 || i === paragraphs.length - 1) {
        documents.push({
          pageContent: currentBatch.trim(),
          metadata: {
            page: currentPage,
            section: `Section ${currentPage}`,
            source: filename,
          },
        });
        currentPage++;
        currentBatch = '';
      }
    }

    return documents.length > 0
      ? documents
      : [{ pageContent: cleaned, metadata: { page: 1, section: 'Full Document', source: filename } }];
  }
}

export class CSVDocumentLoader implements IDocumentLoader {
  async load(filePath: string, filename: string): Promise<LoadedDocument[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = Papa.parse<Record<string, string>>(content, {
      header: true,
      skipEmptyLines: true,
    });

    const documents: LoadedDocument[] = [];
    const rowsPerPage = 20;

    for (let i = 0; i < parsed.data.length; i += rowsPerPage) {
      const chunkRows = parsed.data.slice(i, i + rowsPerPage);
      const textBlock = chunkRows
        .map((row, idx) => `Row ${i + idx + 1}: ` + Object.entries(row).map(([k, v]) => `${k}=${v}`).join(', '))
        .join('\n');

      const pageNum = Math.floor(i / rowsPerPage) + 1;
      documents.push({
        pageContent: TextCleaner.clean(textBlock),
        metadata: {
          page: pageNum,
          section: `CSV Rows ${i + 1}-${Math.min(i + rowsPerPage, parsed.data.length)}`,
          source: filename,
        },
      });
    }

    return documents;
  }
}

export class HTMLDocumentLoader implements IDocumentLoader {
  async load(filePath: string, filename: string): Promise<LoadedDocument[]> {
    const htmlContent = await fs.readFile(filePath, 'utf-8');
    const $ = cheerio.load(htmlContent);
    
    // Strip scripts, styles, and unwanted tags
    $('script, style, svg, nav, footer, iframe').remove();

    const title = $('title').text() || $('h1').first().text() || filename;
    const bodyText = $('body').text() || $.text();
    const cleaned = TextCleaner.clean(bodyText);

    return [
      {
        pageContent: cleaned,
        metadata: {
          page: 1,
          section: title.trim(),
          source: filename,
        },
      },
    ];
  }
}

export class TextDocumentLoader implements IDocumentLoader {
  async load(filePath: string, filename: string): Promise<LoadedDocument[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const cleaned = TextCleaner.clean(content);

    return [
      {
        pageContent: cleaned,
        metadata: {
          page: 1,
          section: 'Text Document',
          source: filename,
        },
      },
    ];
  }
}

export class DocumentLoaderFactory {
  public static getLoader(fileType: SupportedFileType): IDocumentLoader {
    switch (fileType) {
      case 'pdf':
        return new PDFDocumentLoader();
      case 'docx':
        return new DOCXDocumentLoader();
      case 'csv':
        return new CSVDocumentLoader();
      case 'html':
        return new HTMLDocumentLoader();
      case 'txt':
      case 'md':
        return new TextDocumentLoader();
      default:
        logger.warn(`Unsupported file type '${fileType}', defaulting to TextLoader.`);
        return new TextDocumentLoader();
    }
  }

  public static getFileType(filename: string): SupportedFileType {
    const ext = path.extname(filename).toLowerCase().replace('.', '');
    if (['pdf', 'docx', 'csv', 'html', 'txt', 'md'].includes(ext)) {
      return ext as SupportedFileType;
    }
    return 'txt';
  }
}
