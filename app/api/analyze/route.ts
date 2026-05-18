import { NextRequest, NextResponse } from "next/server";
import { analyzeData } from "@/lib/analyst";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      csvContent: string;
      fileName: string;
      question: string;
      history: Array<{ role: "user" | "model"; text: string }>;
    };

    const { csvContent, fileName, question, history } = body;

    if (!csvContent || csvContent.trim() === "") {
      return NextResponse.json({ error: "No data provided." }, { status: 400 });
    }

    if (!question || question.trim() === "") {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }

    const answer = await analyzeData({ csvContent, fileName, question, history });
    return NextResponse.json({ answer }, { status: 200 });
  } catch (err: unknown) {
    console.error("[/api/analyze]", err);
    const message = err instanceof Error ? err.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
