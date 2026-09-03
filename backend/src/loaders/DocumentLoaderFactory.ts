import fs from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import Papa from 'papaparse';
import * as cheerio from 'cheerio';
import { createWorker } from 'tesseract.js';

import { IDocumentLoader, LoadedDocument } from '../interfaces/index';
import { SupportedFileType } from '../types/index';
import { TextCleaner } from '../utils/textCleaner';
import { logger } from '../config/logger';

export class PDFDocumentLoader implements IDocumentLoader {
  async load(
    filePath: string,
    filename: string
  ): Promise<LoadedDocument[]> {
    logger.info('========== PDF LOADER DEBUG ==========');
    logger.info(`Loading PDF: ${filename}`);
    logger.info(`File path: ${filePath}`);

    const dataBuffer = await fs.readFile(filePath);

    logger.info(`PDF file size: ${dataBuffer.length} bytes`);

    const pdfData = await pdfParse(dataBuffer);

    logger.info(
      `PDF page count reported by pdf-parse: ${pdfData.numpages}`
    );

    logger.info(
      `PDF extracted text length: ${pdfData.text?.length || 0} characters`
    );

    if (pdfData.text?.trim()) {
      logger.info(
        `PDF extracted text preview:\n${pdfData.text.substring(0, 2000)}`
      );
    } else {
      logger.warn('PDF parser returned no meaningful text.');
    }

    logger.info('========== END PDF LOADER DEBUG ==========');

    const rawText = pdfData.text || '';

    /*
     * First attempt:
     * Use normal PDF text extraction.
     *
     * This handles normal digitally-generated PDFs without
     * unnecessarily running OCR.
     */
    if (rawText.trim().length > 20) {
      logger.info(
        `PDF '${filename}' contains extractable text. Using normal PDF text extraction.`
      );

      const pageTexts = rawText.split('\f');
      const documents: LoadedDocument[] = [];

      pageTexts.forEach((text: string, index: number) => {
        const cleaned = TextCleaner.clean(text);

        if (cleaned.length === 0) {
          return;
        }

        documents.push({
          pageContent: cleaned,
          metadata: {
            page: index + 1,
            section: `Page ${index + 1}`,
            source: filename,
          },
        });
      });

      if (documents.length > 0) {
        logger.info(
          `PDF loader produced ${documents.length} text page(s).`
        );

        documents.forEach((document, index) => {
          logger.info(
            `PDF page ${index + 1}: ${document.pageContent.length} characters`
          );
        });

        return documents;
      }
    }

    /*
     * Second attempt:
     * The PDF is probably scanned/image-based.
     *
     * Render each PDF page to an image and run OCR.
     */
    logger.warn(
      `PDF '${filename}' appears to be scanned/image-based. Starting OCR.`
    );

    return this.extractWithOCR(filePath, filename, pdfData.numpages);
  }

  private async extractWithOCR(
    filePath: string,
    filename: string,
    pageCount: number
  ): Promise<LoadedDocument[]> {
    const documents: LoadedDocument[] = [];

    let worker: Awaited<ReturnType<typeof createWorker>> | null = null;

    try {
      /*
       * pdf-to-img v7 is ESM.
       *
       * Because this backend uses CommonJS, we load it dynamically
       * instead of converting the entire project to ESM.
       */
      const pdfToImg = await import('pdf-to-img');

      logger.info(
        `Starting OCR rendering for '${filename}' (${pageCount} page(s)).`
      );

      /*
       * pdf-to-img v7 exposes the PDF renderer through `pdf`.
       */
      const pdfDocument = await pdfToImg.pdf(filePath, {
        scale: 2.5,
      });

      worker = await createWorker('eng');

      logger.info('Tesseract OCR worker initialized.');

      let pageNumber = 0;

      for await (const image of pdfDocument) {
        pageNumber++;

        logger.info(
          `Rendering/OCR processing page ${pageNumber}/${pageCount}...`
        );

        /*
         * pdf-to-img returns the rendered page as a Buffer.
         *
         * Tesseract accepts a Buffer directly.
         */
        const { data } = await worker.recognize(image);

        const rawOCRText = data.text || '';
        const cleanedText = TextCleaner.clean(rawOCRText);

        logger.info(
          `OCR page ${pageNumber}: extracted ${cleanedText.length} characters.`
        );

        if (cleanedText.length === 0) {
          logger.warn(
            `OCR page ${pageNumber} produced no meaningful text.`
          );

          continue;
        }

        logger.info(
          `OCR page ${pageNumber} preview:\n${cleanedText.substring(0, 1000)}`
        );

        documents.push({
          pageContent: cleanedText,
          metadata: {
            page: pageNumber,
            section: `OCR Page ${pageNumber}`,
            source: filename,
          },
        });
      }

      if (documents.length === 0) {
        throw new Error(
          `PDF '${filename}' contains no extractable text and OCR could not detect any meaningful text.`
        );
      }

      logger.info(
        `OCR successfully extracted ${documents.length} page(s) from '${filename}'.`
      );

      return documents;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);

      logger.error(
        `OCR processing failed for '${filename}': ${message}`
      );

      throw new Error(
        `Could not extract text from PDF '${filename}'. The PDF may be corrupted or its contents may not be readable by OCR.`
      );
    } finally {
      if (worker) {
        try {
          await worker.terminate();
          logger.info('Tesseract OCR worker terminated.');
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);

          logger.warn(
            `Failed to terminate Tesseract worker cleanly: ${message}`
          );
        }
      }
    }
  }
}

export class DOCXDocumentLoader implements IDocumentLoader {
  async load(
    filePath: string,
    filename: string
  ): Promise<LoadedDocument[]> {
    const dataBuffer = await fs.readFile(filePath);

    const result = await mammoth.extractRawText({
      buffer: dataBuffer,
    });

    const cleaned = TextCleaner.clean(result.value);

    const paragraphs = cleaned.split('\n\n');

    const documents: LoadedDocument[] = [];

    let currentPage = 1;
    let currentBatch = '';

    for (let i = 0; i < paragraphs.length; i++) {
      currentBatch += paragraphs[i] + '\n\n';

      if (
        currentBatch.length >= 1500 ||
        i === paragraphs.length - 1
      ) {
        const cleanedBatch = TextCleaner.clean(currentBatch);

        if (cleanedBatch.length > 0) {
          documents.push({
            pageContent: cleanedBatch,
            metadata: {
              page: currentPage,
              section: `Section ${currentPage}`,
              source: filename,
            },
          });
        }

        currentPage++;
        currentBatch = '';
      }
    }

    return documents.length > 0
      ? documents
      : [
          {
            pageContent: cleaned,
            metadata: {
              page: 1,
              section: 'Full Document',
              source: filename,
            },
          },
        ];
  }
}

export class CSVDocumentLoader implements IDocumentLoader {
  async load(
    filePath: string,
    filename: string
  ): Promise<LoadedDocument[]> {
    const content = await fs.readFile(
      filePath,
      'utf-8'
    );

    const parsed = Papa.parse<Record<string, string>>(
      content,
      {
        header: true,
        skipEmptyLines: true,
      }
    );

    const documents: LoadedDocument[] = [];

    const rowsPerPage = 20;

    for (
      let i = 0;
      i < parsed.data.length;
      i += rowsPerPage
    ) {
      const chunkRows = parsed.data.slice(
        i,
        i + rowsPerPage
      );

      const textBlock = chunkRows
        .map(
          (row, idx) =>
            `Row ${i + idx + 1}: ` +
            Object.entries(row)
              .map(
                ([k, v]) => `${k}=${v}`
              )
              .join(', ')
        )
        .join('\n');

      const pageNum =
        Math.floor(i / rowsPerPage) + 1;

      const cleanedText = TextCleaner.clean(
        textBlock
      );

      if (cleanedText.length === 0) {
        continue;
      }

      documents.push({
        pageContent: cleanedText,
        metadata: {
          page: pageNum,
          section: `CSV Rows ${i + 1}-${Math.min(
            i + rowsPerPage,
            parsed.data.length
          )}`,
          source: filename,
        },
      });
    }

    return documents;
  }
}

export class HTMLDocumentLoader implements IDocumentLoader {
  async load(
    filePath: string,
    filename: string
  ): Promise<LoadedDocument[]> {
    const htmlContent = await fs.readFile(
      filePath,
      'utf-8'
    );

    const $ = cheerio.load(htmlContent);

    $('script, style, svg, nav, footer, iframe').remove();

    const title =
      $('title').text() ||
      $('h1').first().text() ||
      filename;

    const bodyText =
      $('body').text() || $.text();

    const cleaned = TextCleaner.clean(
      bodyText
    );

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
  async load(
    filePath: string,
    filename: string
  ): Promise<LoadedDocument[]> {
    const content = await fs.readFile(
      filePath,
      'utf-8'
    );

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
  public static getLoader(
    fileType: SupportedFileType
  ): IDocumentLoader {
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
        logger.warn(
          `Unsupported file type '${fileType}', defaulting to TextLoader.`
        );

        return new TextDocumentLoader();
    }
  }

  public static getFileType(
    filename: string
  ): SupportedFileType {
    const ext = path
      .extname(filename)
      .toLowerCase()
      .replace('.', '');

    if (
      [
        'pdf',
        'docx',
        'csv',
        'html',
        'txt',
        'md',
      ].includes(ext)
    ) {
      return ext as SupportedFileType;
    }

    return 'txt';
  }
}