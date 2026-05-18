import {
  GoogleGenerativeAI,
  GenerativeModel,
  Part,
} from "@google/generative-ai";

// ---------------------------------------------------------------------------
// pdfjs-dist is used ONLY on the server (Node.js runtime).
// We import it lazily inside functions so Next.js build never tries to bundle
// canvas (a native module) into the client or edge bundles.
// ---------------------------------------------------------------------------

export const MAX_BATCH_FILES = 10;

// Minimum full_text length that we consider a "successful" native-text pass.
// If the result is shorter than this we assume the PDF is scanned/image-only
// and trigger the image-fallback path.
const SCAN_DETECTION_THRESHOLD = 100;

// How many PDF pages to render concurrently in the fallback path.
// Keep this low to avoid memory spikes on Vercel (512 MB default).
const PAGE_CONCURRENCY = 3;

// Resolution for rendering PDF pages to PNG before sending to Gemini Vision.
const PDF_RENDER_SCALE = 2.0; // 2× = ~144 dpi equivalent — good OCR quality

export const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

export interface DocumentInput {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

export interface ExtractedDocument {
  fileName: string;
  summary: string;
  document_type: string;
  key_fields: Record<string, string>;
  tables: Array<{
    title: string;
    headers: string[];
    rows: string[][];
  }>;
  full_text: string;
}

export interface BatchExtractionResult {
  success: ExtractedDocument[];
  failed: Array<{ fileName: string; error: string }>;
}

// ---------------------------------------------------------------------------
// Gemini model factory — lazy, never called at build time
// ---------------------------------------------------------------------------
function getModel(): GenerativeModel {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY in environment variables.");

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192,
    },
  });
}

export function fileToGenerativePart(buffer: Buffer, mimeType: string): Part {
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType,
    },
  };
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------
function buildExtractionPrompt(fileName: string): string {
  return `
You are an enterprise document intelligence agent.
Analyze this document ("${fileName}") and return structured JSON:
{
  "summary": "brief summary",
  "document_type": "invoice | contract | report | form | other",
  "key_fields": { "field_name": "value" },
  "tables": [ { "title": "", "headers": [], "rows": [[]] } ],
  "full_text": "complete extracted text"
}
Be precise. Do not hallucinate. Return only valid JSON, no markdown fences.
  `.trim();
}

function buildPageOcrPrompt(fileName: string, pageNum: number, totalPages: number): string {
  return `
You are an OCR engine processing page ${pageNum} of ${totalPages} from the document "${fileName}".
Extract ALL text visible on this page exactly as it appears — preserve layout, line breaks, tables, and numbers.
Return only plain text, no JSON, no commentary.
  `.trim();
}

function buildMergePrompt(fileName: string, pagesText: string): string {
  return `
You are an enterprise document intelligence agent.
Below is the full OCR text extracted page-by-page from the scanned document "${fileName}".
Analyze the combined text and return structured JSON:
{
  "summary": "brief summary",
  "document_type": "invoice | contract | report | form | other",
  "key_fields": { "field_name": "value" },
  "tables": [ { "title": "", "headers": [], "rows": [[]] } ],
  "full_text": "complete extracted text (verbatim concatenation of all pages)"
}
Be precise. Do not hallucinate. Return only valid JSON, no markdown fences.

--- OCR TEXT ---
${pagesText}
  `.trim();
}

// ---------------------------------------------------------------------------
// Retry wrapper
// ---------------------------------------------------------------------------
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delaysMs = [2000, 4000, 8000]
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delaysMs[attempt] ?? 8000));
      }
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// PDF → per-page PNG buffers (server-only, uses pdfjs-dist + canvas)
// ---------------------------------------------------------------------------
async function renderPdfPages(pdfBuffer: Buffer): Promise<Buffer[]> {
  // Dynamic import keeps canvas out of the client/edge bundle
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { createCanvas } = await import("canvas");

  // pdfjs requires a Uint8Array
  const data = new Uint8Array(pdfBuffer);
  const loadingTask = pdfjsLib.getDocument({ data, useSystemFonts: true });
  const pdfDoc = await loadingTask.promise;

  const numPages = pdfDoc.numPages;
  const pageBuffers: Buffer[] = [];

  // Process pages in small concurrent batches to limit memory usage
  for (let start = 1; start <= numPages; start += PAGE_CONCURRENCY) {
    const end = Math.min(start + PAGE_CONCURRENCY - 1, numPages);
    const batch = Array.from({ length: end - start + 1 }, (_, i) => start + i);

    const batchBuffers = await Promise.all(
      batch.map(async (pageNum) => {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });

        // node-canvas — cast to unknown because pdfjs types expect a browser canvas
        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext("2d");

        await page.render({
          canvasContext: context as unknown as CanvasRenderingContext2D,
          viewport,
          canvas: canvas as unknown as HTMLCanvasElement,
        }).promise;

        return canvas.toBuffer("image/png");
      })
    );

    pageBuffers.push(...batchBuffers);
  }

  return pageBuffers;
}

// ---------------------------------------------------------------------------
// OCR a single scanned-PDF page image with Gemini Vision
// ---------------------------------------------------------------------------
async function ocrPageWithGemini(
  model: GenerativeModel,
  pageBuffer: Buffer,
  fileName: string,
  pageNum: number,
  totalPages: number
): Promise<string> {
  const imagePart = fileToGenerativePart(pageBuffer, "image/png");
  const prompt = buildPageOcrPrompt(fileName, pageNum, totalPages);

  return withRetry(async () => {
    const result = await model.generateContent([prompt, imagePart]);
    return result.response.text().trim();
  });
}

// ---------------------------------------------------------------------------
// Scanned PDF fallback — renders pages to PNG, OCRs each, merges into JSON
// ---------------------------------------------------------------------------
async function extractScannedPdf(doc: DocumentInput): Promise<ExtractedDocument> {
  console.log(`[gemini] "${doc.fileName}": native text too short, switching to scanned-PDF path`);

  const model = getModel();

  // 1. Render every page to a PNG buffer
  const pageBuffers = await renderPdfPages(doc.buffer);
  const totalPages = pageBuffers.length;
  console.log(`[gemini] "${doc.fileName}": rendered ${totalPages} page(s)`);

  // 2. OCR each page (in batches to avoid overwhelming Gemini rate limits)
  const pageTexts: string[] = [];
  for (let start = 0; start < totalPages; start += PAGE_CONCURRENCY) {
    const end = Math.min(start + PAGE_CONCURRENCY, totalPages);
    const batch = pageBuffers.slice(start, end);

    const batchTexts = await Promise.all(
      batch.map((buf, i) =>
        ocrPageWithGemini(model, buf, doc.fileName, start + i + 1, totalPages)
      )
    );
    pageTexts.push(...batchTexts);
  }

  // 3. Merge all page texts and ask Gemini to produce structured JSON
  const combinedText = pageTexts
    .map((t, i) => `=== Page ${i + 1} ===\n${t}`)
    .join("\n\n");

  const mergePrompt = buildMergePrompt(doc.fileName, combinedText);

  const mergeResult = await withRetry(() => model.generateContent(mergePrompt));
  const raw = mergeResult.response.text().replace(/```json|```/g, "").trim();

  let parsed: Omit<ExtractedDocument, "fileName">;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Last-resort: return the raw OCR text even if JSON parsing fails
    console.error(`[gemini] "${doc.fileName}": failed to parse merge JSON, returning raw OCR`);
    parsed = {
      summary: "Scanned document (OCR fallback)",
      document_type: "other",
      key_fields: {},
      tables: [],
      full_text: combinedText,
    };
  }

  return { fileName: doc.fileName, ...parsed };
}

// ---------------------------------------------------------------------------
// Primary extractor — tries native path first, falls back to scanned path
// ---------------------------------------------------------------------------
async function extractSingle(doc: DocumentInput): Promise<ExtractedDocument> {
  const model = getModel();

  // ── Pass 1: send the file directly (works well for native-text PDFs & images)
  const filePart = fileToGenerativePart(doc.buffer, doc.mimeType);
  const prompt = buildExtractionPrompt(doc.fileName);

  let nativeResult: ExtractedDocument | null = null;

  try {
    const result = await withRetry(() => model.generateContent([prompt, filePart]));
    const text = result.response.text().replace(/```json|```/g, "").trim();

    let parsed: Omit<ExtractedDocument, "fileName">;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`Failed to parse Gemini response for "${doc.fileName}"`);
    }

    nativeResult = { fileName: doc.fileName, ...parsed };
  } catch (err) {
    console.error(`[gemini] "${doc.fileName}": native pass failed —`, err);
    // If the native pass hard-errors on a PDF, go straight to scanned path
    if (doc.mimeType === "application/pdf") {
      return extractScannedPdf(doc);
    }
    throw err; // For images, propagate — no fallback available
  }

  // ── Pass 2 check: did we actually get text?
  //    For images there is no fallback, so always accept the result.
  if (
    doc.mimeType === "application/pdf" &&
    (nativeResult.full_text ?? "").trim().length < SCAN_DETECTION_THRESHOLD
  ) {
    return extractScannedPdf(doc);
  }

  return nativeResult;
}

// ---------------------------------------------------------------------------
// Public API — batch extraction
// ---------------------------------------------------------------------------
export async function extractBatch(
  docs: DocumentInput[]
): Promise<BatchExtractionResult> {
  if (docs.length > MAX_BATCH_FILES) {
    throw new Error(`Maximum ${MAX_BATCH_FILES} files allowed per batch.`);
  }

  const results = await Promise.allSettled(docs.map(extractSingle));

  const success: ExtractedDocument[] = [];
  const failed: Array<{ fileName: string; error: string }> = [];

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      success.push(result.value);
    } else {
      failed.push({
        fileName: docs[i].fileName,
        error: result.reason?.message ?? "Unknown error",
      });
    }
  });

  return { success, failed };
}

// ---------------------------------------------------------------------------
// Public API — chat with extracted documents
// ---------------------------------------------------------------------------
export async function chatWithDocuments(
  documents: ExtractedDocument[],
  question: string
): Promise<string> {
  const model = getModel();

  const context = documents
    .map(
      (doc, i) =>
        `--- Document ${i + 1}: ${doc.fileName} (${doc.document_type}) ---\n${doc.full_text}`
    )
    .join("\n\n");

  const prompt = `
You are an enterprise document assistant.
The user has uploaded ${documents.length} document(s). Here is their content:
${context}
Answer this question based ONLY on the documents above:
"${question}"
If the answer spans multiple documents, reference each by filename.
Be concise, accurate, and cite relevant parts when useful.
  `.trim();

  const result = await withRetry(() => model.generateContent(prompt));
  return result.response.text();
}
