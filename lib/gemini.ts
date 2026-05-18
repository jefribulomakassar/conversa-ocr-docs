import {
  GoogleGenerativeAI,
  GenerativeModel,
  Part,
} from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY in environment variables.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Primary model: Gemini Flash for OCR & document processing
export const geminiFlash: GenerativeModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 0.2,
    maxOutputTokens: 8192,
  },
});

// Max files allowed per batch
export const MAX_BATCH_FILES = 10;

// Supported MIME types
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

// Helper: convert file buffer to Gemini-compatible Part
export function fileToGenerativePart(buffer: Buffer, mimeType: string): Part {
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType,
    },
  };
}

// Extract a single document — internal use
async function extractSingle(doc: DocumentInput): Promise<ExtractedDocument> {
  const filePart = fileToGenerativePart(doc.buffer, doc.mimeType);

  const prompt = `
You are an enterprise document intelligence agent.
Analyze this document ("${doc.fileName}") and return structured JSON:
{
  "summary": "brief summary",
  "document_type": "invoice | contract | report | form | other",
  "key_fields": { "field_name": "value" },
  "tables": [ { "title": "", "headers": [], "rows": [[]] } ],
  "full_text": "complete extracted text"
}
Be precise. Do not hallucinate. Return only valid JSON, no markdown fences.
  `.trim();

  const result = await geminiFlash.generateContent([prompt, filePart]);
  const text = result.response.text().replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(text);

  return { fileName: doc.fileName, ...parsed };
}

// Batch extract up to MAX_BATCH_FILES documents in parallel
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

// Answer a question across all extracted documents
export async function chatWithDocuments(
  documents: ExtractedDocument[],
  question: string
): Promise<string> {
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

  const result = await geminiFlash.generateContent(prompt);
  return result.response.text();
}
