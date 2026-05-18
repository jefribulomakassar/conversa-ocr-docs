
"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface History {
  role: "user" | "model";
  text: string;
}

const ACCEPTED = ".csv,.xlsx,.xls,.txt";
const MAX_SIZE_MB = 5;

function parseFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      reject(new Error(`File too large. Max ${MAX_SIZE_MB}MB.`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsText(file);
  });
}

export default function DataAnalyst() {
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFile = async (file: File) => {
    setFileLoading(true);
    setError(null);
    try {
      const content = await parseFile(file);
      setCsvContent(content);
      setFileName(file.name);
      setMessages([]);
      setHistory([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load file.");
    } finally {
      setFileLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const send = async () => {
    const question = input.trim();
    if (!question || !csvContent || loading) return;

    const newMessage: Message = { role: "user", content: question };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent, fileName, question, history }),
      });

      const data = await res.json();
      const answer = res.ok ? data.answer : data.error ?? "Something went wrong.";

      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
      setHistory((prev) => [
        ...prev,
        { role: "user", text: question },
        { role: "model", text: answer },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Network error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const reset = () => {
    setCsvContent(null);
    setFileName("");
    setMessages([]);
    setHistory([]);
    setError(null);
    setInput("");
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Upload area */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">
            Upload Data File
            <span className="ml-2 text-xs font-normal text-gray-400">(CSV, Excel, TXT — max {MAX_SIZE_MB}MB)</span>
          </h2>
          {csvContent && (
            <button onClick={reset} className="text-xs text-red-400 hover:text-red-600 transition">
              Clear
            </button>
          )}
        </div>

        {!csvContent ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all"
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {fileLoading ? (
              <div className="flex flex-col items-center gap-2 text-emerald-600">
                <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span className="text-sm font-medium">Loading file...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-500">
                <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3 10h18M3 6h18M3 14h12M3 18h8" />
                </svg>
                <p className="text-sm font-medium">Drop data file here or click to upload</p>
                <p className="text-xs text-gray-400">CSV, Excel, TXT supported</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <span className="text-emerald-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-800">{fileName}</p>
              <p className="text-xs text-gray-500">{(csvContent.length / 1024).toFixed(1)} KB loaded</p>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-3 text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}
      </section>

      {/* Suggested questions */}
      {csvContent && messages.length === 0 && (
        <section className="flex flex-wrap gap-2">
          {[
            "Summarize this data",
            "What are the key trends?",
            "Are there any anomalies?",
            "What is the total and average?",
          ].map((q) => (
            <button
              key={q}
              onClick={() => { setInput(q); }}
              className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-full text-gray-600 hover:border-emerald-400 hover:text-emerald-600 transition"
            >
              {q}
            </button>
          ))}
        </section>
      )}

      {/* Chat */}
      {csvContent && (
        <section className="h-[480px] flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-white">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <span className="text-sm font-semibold text-gray-700">
              Data Intelligence Agent
            </span>
            <span className="ml-2 text-xs text-gray-400">— {fileName}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <p className="text-sm text-gray-400 text-center mt-8">
                Ask anything about your data — trends, totals, anomalies, summaries.
              </p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                    msg.role === "user"
                      ? "bg-emerald-600 text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-2">
                  <span className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your data..."
              disabled={loading}
              className="flex-1 text-sm px-4 py-2 rounded-full border border-gray-200 outline-none focus:border-emerald-400 transition disabled:opacity-50"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-full hover:bg-emerald-700 transition disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
