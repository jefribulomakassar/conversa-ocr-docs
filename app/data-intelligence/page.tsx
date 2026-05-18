"use client";

import Link from "next/link";
import DataAnalyst from "@/app/components/DataAnalyst";

export default function DataIntelligencePage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-10">
      {/* Header */}
      <div className="w-full max-w-3xl mb-8">
        <div className="flex items-center justify-between mb-2">
          <Link
            href="/"
            className="text-xs text-gray-400 hover:text-gray-600 transition flex items-center gap-1"
          >
            ← Back to OCR Docs
          </Link>
          <span className="text-xs px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full font-medium">
            Track 4 · Data & Intelligence
          </span>
        </div>
        <div className="text-center mt-4">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Conversa <span className="text-emerald-600">AI</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Data Intelligence Agent — powered by Gemini Flash
          </p>
        </div>
      </div>

      <div className="w-full max-w-3xl">
        <DataAnalyst />
      </div>
    </main>
  );
}
