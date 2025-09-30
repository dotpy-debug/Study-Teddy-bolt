import { Processor, OnWorkerEvent, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { DocumentJob } from '../queue.service';
import * as fs from 'fs/promises';
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';

@Processor('document')
export class DocumentProcessor extends WorkerHost {
  private readonly logger = new Logger(DocumentProcessor.name);

  async process(job: Job): Promise<any> {
    const jobType = job.name;
    this.logger.debug(`Processing document job ${job.id} of type ${jobType}`);

    switch (jobType) {
      case 'process-document':
        return this.processDocument(job.data as DocumentJob);
      case 'extract-text':
        return this.extractText(job.data);
      case 'generate-embeddings':
        return this.generateEmbeddings(job.data);
      default:
        throw new Error(`Unknown job type: ${jobType}`);
    }
  }

  private async processDocument(data: DocumentJob): Promise<any> {
    const { documentId, userId, filePath, mimeType } = data;

    try {
      // Extract text based on file type
      let text = '';
      if (mimeType === 'application/pdf') {
        text = await this.extractPdfText(filePath);
      } else if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        text = await this.extractDocxText(filePath);
      } else if (mimeType === 'text/plain') {
        text = await this.extractPlainText(filePath);
      } else {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }

      // Chunk the text for better processing
      const chunks = this.chunkText(text, 500, 50);

      // Generate summary
      const summary = this.generateSummary(text);

      // Extract key concepts
      const concepts = this.extractKeyConcepts(text);

      this.logger.log(`Document ${documentId} processed successfully`);

      return {
        documentId,
        userId,
        text,
        chunks,
        summary,
        concepts,
        wordCount: text.split(/\s+/).length,
        chunkCount: chunks.length,
      };
    } catch (error) {
      this.logger.error(`Failed to process document ${documentId}:`, error);
      throw error;
    }
  }

  private async extractText(data: { documentId: string; filePath: string }): Promise<string> {
    const { documentId, filePath } = data;

    try {
      const buffer = await fs.readFile(filePath);
      const extension = filePath.split('.').pop()?.toLowerCase();

      let text = '';
      switch (extension) {
        case 'pdf':
          text = await this.extractPdfText(filePath);
          break;
        case 'docx':
          text = await this.extractDocxText(filePath);
          break;
        case 'txt':
        case 'md':
          text = await this.extractPlainText(filePath);
          break;
        default:
          throw new Error(`Unsupported file extension: ${extension}`);
      }

      this.logger.log(`Text extracted from document ${documentId}`);
      return text;
    } catch (error) {
      this.logger.error(`Failed to extract text from document ${documentId}:`, error);
      throw error;
    }
  }

  private async extractPdfText(filePath: string): Promise<string> {
    try {
      const buffer = await fs.readFile(filePath);
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      this.logger.error('Failed to extract PDF text:', error);
      throw error;
    }
  }

  private async extractDocxText(filePath: string): Promise<string> {
    try {
      const buffer = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      this.logger.error('Failed to extract DOCX text:', error);
      throw error;
    }
  }

  private async extractPlainText(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      this.logger.error('Failed to read plain text file:', error);
      throw error;
    }
  }

  private chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];

    let currentChunk = '';
    let currentLength = 0;

    for (const sentence of sentences) {
      const sentenceLength = sentence.length;

      if (currentLength + sentenceLength <= chunkSize) {
        currentChunk += sentence;
        currentLength += sentenceLength;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }

        // Start new chunk with overlap
        const overlapText = currentChunk.substring(currentChunk.length - overlap);
        currentChunk = overlapText + sentence;
        currentLength = overlapText.length + sentenceLength;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  private generateSummary(text: string): string {
    // Simple extractive summary - take first few sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const summaryLength = Math.min(3, sentences.length);
    return sentences.slice(0, summaryLength).join(' ').trim();
  }

  private extractKeyConcepts(text: string): string[] {
    // Simple keyword extraction based on frequency
    const words = text.toLowerCase().split(/\W+/);
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'as',
      'is',
      'was',
      'are',
      'were',
      'been',
      'be',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'should',
      'could',
      'may',
      'might',
      'can',
      'must',
      'shall',
      'ought',
      'i',
      'you',
      'he',
      'she',
      'it',
      'we',
      'they',
      'them',
      'their',
      'this',
      'that',
      'these',
      'those',
      'what',
      'which',
      'who',
      'when',
      'where',
      'why',
      'how',
      'if',
      'then',
      'else',
      'not',
      'no',
      'nor',
      'so',
      'than',
    ]);

    const wordFreq = new Map<string, number>();

    for (const word of words) {
      if (word.length > 3 && !stopWords.has(word)) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    }

    // Sort by frequency and get top concepts
    const sorted = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    return sorted;
  }

  private async generateEmbeddings(data: { documentId: string; chunks: string[] }): Promise<any> {
    const { documentId, chunks } = data;

    try {
      // This would integrate with OpenAI or another embedding service
      // For now, we'll return placeholder embeddings
      const embeddings = chunks.map(() =>
        Array(1536)
          .fill(0)
          .map(() => Math.random()),
      );

      this.logger.log(`Generated ${embeddings.length} embeddings for document ${documentId}`);

      return {
        documentId,
        embeddings,
        dimensions: 1536,
      };
    } catch (error) {
      this.logger.error(`Failed to generate embeddings for document ${documentId}:`, error);
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Document job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Document job ${job.id} failed:`, error);
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.debug(`Document job ${job.id} started`);
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job, progress: number) {
    this.logger.debug(`Document job ${job.id} progress: ${progress}%`);
  }
}
