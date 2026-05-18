import { NextRequest } from "next/server";
import { chatWithDocumentsStream, ExtractedDocument } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documents, question } = body as {
      documents: ExtractedDocument[];
      question: string;
    };

    if (!documents || documents.length === 0) {
      return new Response(JSON.stringify({ error: "No documents provided." }), { status: 400 });
    }
    if (!question || question.trim() === "") {
      return new Response(JSON.stringify({ error: "Question is required." }), { status: 400 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of chatWithDocumentsStream(documents, question)) {
            controller.enqueue(new TextEncoder().encode(chunk));
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error.";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
