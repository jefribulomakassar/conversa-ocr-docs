import { NextRequest } from "next/server";
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
      return new Response(JSON.stringify({ error: "No documents provided." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!question || question.trim() === "") {
      return new Response(JSON.stringify({ error: "Question is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const answer = await chatWithDocuments(documents, question);

    // ✅ Stream teks jawaban langsung, bukan JSON
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        // Simulasi streaming per kata agar efek typing terasa natural
        const words = answer.split(" ");
        let i = 0;

        const pushNext = () => {
          if (i >= words.length) {
            controller.close();
            return;
          }
          const chunk = (i === 0 ? "" : " ") + words[i];
          controller.enqueue(encoder.encode(chunk));
          i++;
          setTimeout(pushNext, 18); // delay antar kata ~18ms
        };

        pushNext();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
