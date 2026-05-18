"use client";

import { useState } from "react";
import DocumentUpload from "@/app/components/DocumentUpload";
import ChatInterface from "@/app/components/ChatInterface";
import { ExtractedDocument } from "@/lib/gemini";

export default function Home() {
  const [documents, setDocuments] = useState<ExtractedDocument[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleExtracted = (docs: ExtractedDocument[]) => {
    setDocuments((prev) => [...prev, ...docs]);
    setError(null);
  };

  const handleReset = () => {
    setDocuments([]);
    setError(null);
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-10">
      {/* Header */}
      <div className="w-full max-w-3xl mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Conversa <span className="text-blue-600">AI</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Enterprise Document Intelligence — powered by Gemini Flash
        </p>
      </div>

      <div className="w-full max-w-3xl flex flex-col gap-6">
        {/* Upload */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">
              Upload Documents
              <span className="ml-2 text-xs font-normal text-gray-400">(max 10 files)</span>
            </h2>
            {documents.length > 0 && (
              <button
                onClick={handleReset}
                className="text-xs text-red-400 hover:text-red-600 transition"
              >
                Clear all
              </button>
            )}
          </div>

          <DocumentUpload onExtracted={handleExtracted} onError={setError} />

          {error && (
            <p className="mt-3 text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </section>

        {/* Extracted summary cards */}
        {documents.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-gray-700">
              Extracted ({documents.length} document{documents.length > 1 ? "s" : ""})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {documents.map((doc) => (
                <div
                  key={doc.fileName}
                  className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm"
                >
                  <p className="text-xs font-semibold text-gray-800 truncate">{doc.fileName}</p>
                  <span className="inline-block mt-1 text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full capitalize">
                    {doc.document_type}
                  </span>
                  <p className="mt-2 text-xs text-gray-500 line-clamp-2">{doc.summary}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Chat */}
        {documents.length > 0 && (
          <section className="h-[480px]">
            <ChatInterface documents={documents} />
          </section>
        )}
      </div>
    </main>
  );
}
