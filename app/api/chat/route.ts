import { NextRequest, NextResponse } from "next/server";
import { chatWithDocuments, ExtractedDocument } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documents, question } = body as {
      documents: ExtractedDocument[];
      question: string;
    };

    if (!documents || documents.length === 0) {
      return NextResponse.json({ error: "No documents provided." }, { status: 400 });
    }

    if (!question || question.trim() === "") {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }

    const answer = await chatWithDocuments(documents, question);

    return NextResponse.json({ answer }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
