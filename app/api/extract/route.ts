import { NextRequest, NextResponse } from "next/server";
import { extractBatch, MAX_BATCH_FILES, SUPPORTED_MIME_TYPES, DocumentInput } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
    }

    if (files.length > MAX_BATCH_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_BATCH_FILES} files allowed per batch.` },
        { status: 400 }
      );
    }

    const unsupported = files.filter((f) => !SUPPORTED_MIME_TYPES.includes(f.type));
    if (unsupported.length > 0) {
      return NextResponse.json(
        { error: `Unsupported file type(s): ${unsupported.map((f) => f.name).join(", ")}` },
        { status: 415 }
      );
    }

    const docs: DocumentInput[] = await Promise.all(
      files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        return {
          buffer: Buffer.from(arrayBuffer),
          mimeType: file.type,
          fileName: file.name,
        };
      })
    );

    const result = await extractBatch(docs);

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
