"use client";

import { useRef, useState } from "react";
import { ExtractedDocument } from "@/lib/gemini";

const MAX_FILES = 10;
const ACCEPTED = ".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif";

interface Props {
  onExtracted: (docs: ExtractedDocument[]) => void;
  onError: (msg: string) => void;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]); // strip data:mime;base64,
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

export default function DocumentUpload({ onExtracted, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [fileNames, setFileNames] = useState<string[]>([]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const arr = Array.from(files);
    if (arr.length > MAX_FILES) {
      onError(`Maximum ${MAX_FILES} files allowed per batch.`);
      return;
    }

    setFileNames(arr.map((f) => f.name));
    setLoading(true);

    try {
      const payload = await Promise.all(
        arr.map(async (file) => ({
          fileName: file.name,
          mimeType: file.type,
          base64: await fileToBase64(file),
        }))
      );

      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: payload }),
      });

      const data = await res.json();

      if (!res.ok) {
        onError(data.error ?? "Extraction failed.");
        return;
      }

      if (data.failed?.length > 0) {
        onError(`Some files failed: ${data.failed.map((f: { fileName: string }) => f.fileName).join(", ")}`);
      }

      if (data.success?.length > 0) {
        onExtracted(data.success);
      }
    } catch {
      onError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="w-full">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {loading ? (
          <div className="flex flex-col items-center gap-2 text-blue-600">
            <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-sm font-medium">Extracting {fileNames.length} file(s)...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-500">
            <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 16v-8m0 0l-3 3m3-3l3 3M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1" />
            </svg>
            <p className="text-sm font-medium">Drop files here or click to upload</p>
            <p className="text-xs text-gray-400">PDF, JPG, PNG, WEBP — up to {MAX_FILES} files</p>
          </div>
        )}
      </div>

      {fileNames.length > 0 && !loading && (
        <ul className="mt-3 space-y-1">
          {fileNames.map((name) => (
            <li key={name} className="text-xs text-gray-600 flex items-center gap-1">
              <span className="text-green-500">✓</span> {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
