import { NextRequest } from "next/server";
import { analyzeData } from "@/lib/gemini"; // sesuaikan nama fungsinya
import { History } from "@/types"; // sesuaikan import

export const runtime = "nodejs";
export const maxDuration = 10;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { csvContent, fileName, question, history } = body as {
      csvContent: string;
      fileName: string;
      question: string;
      history: { role: "user" | "model"; text: string }[];
    };

    if (!csvContent) {
      return new Response(JSON.stringify({ error: "No data provided." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!question?.trim()) {
      return new Response(JSON.stringify({ error: "Question is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const answer = await analyzeData(csvContent, fileName, question, history);

    // ✅ Stream teks per kata
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
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
          setTimeout(pushNext, 18);
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
