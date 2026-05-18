import { NextRequest, NextResponse } from "next/server";
import { extractBatch, MAX_BATCH_FILES, SUPPORTED_MIME_TYPES, DocumentInput } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 10;

interface FilePayload {
  fileName: string;
  mimeType: string;
  base64: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { files: FilePayload[] };
    const { files } = body;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided." }, { status: 400 });
    }

    if (files.length > MAX_BATCH_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_BATCH_FILES} files allowed per batch.` },
        { status: 400 }
      );
    }

    const unsupported = files.filter((f) => !SUPPORTED_MIME_TYPES.includes(f.mimeType));
    if (unsupported.length > 0) {
      return NextResponse.json(
        { error: `Unsupported file type(s): ${unsupported.map((f) => f.fileName).join(", ")}` },
        { status: 415 }
      );
    }

    const docs: DocumentInput[] = files.map((f) => ({
      buffer: Buffer.from(f.base64, "base64"),
      mimeType: f.mimeType,
      fileName: f.fileName,
    }));

    const result = await extractBatch(docs);
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    console.error("[/api/extract]", err);
    const message = err instanceof Error ? err.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
