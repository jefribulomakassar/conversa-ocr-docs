# Conversa AI — Enterprise Document Intelligence Agent
> Submission for **TechEx Intelligent Enterprise Solutions Hackathon**
> Track 2: AI Agents with Google AI Studio + Track 4: Data & Intelligence

---

## 🧠 Overview
Conversa AI adalah enterprise-grade AI Agent Platform dengan dua fitur utama:
1. **OCR Docs** — upload dokumen (PDF/image), extract, dan chat
2. **Data Intelligence** — upload CSV/Excel, analisis data dengan natural language

🔗 **Live Demo:** [https://conversa-ocr-docs.vercel.app](https://conversa-ocr-docs.vercel.app)

---

## 🛠️ Tech Stack
| Layer | Technology |
|-------|------------|
| Framework | Next.js 15.3.2 (App Router) |
| AI Model | Gemini 2.5 Flash (Google AI Studio) |
| Document Processing | Gemini Vision API (OCR + long-context) |
| Excel Parsing | SheetJS (xlsx) |
| Deployment | Vercel |

---

## 📁 Project Structure
```
conversa-ai/
├── app/
│   ├── api/
│   │   ├── extract/route.ts       # OCR endpoint (maxDuration: 60s)
│   │   ├── chat/route.ts          # Document Q&A endpoint (maxDuration: 30s)
│   │   └── analyze/route.ts       # Data analysis endpoint (maxDuration: 60s)
│   ├── components/
│   │   ├── DocumentUpload/        # File upload handler (PDF/image)
│   │   ├── ChatInterface/         # Document chat UI
│   │   └── DataAnalyst/           # Excel/CSV upload + analyst chat UI
│   ├── data-intelligence/
│   │   └── page.tsx               # Route /data-intelligence
│   └── page.tsx                   # Route / (OCR Docs)
├── lib/
│   ├── gemini.ts                  # Gemini OCR client (lazy init, retry 3x)
│   └── analyst.ts                 # Gemini data analyst client (lazy init, retry 3x)
├── next.config.ts                 # bodySizeLimit: 10mb
└── package.json                   # next: ^15.3.2
```

---

## ✅ Perubahan yang Sudah Dilakukan

### Bug Fixes
- Update Next.js `15.1.0` → `15.3.2` (fix Vercel vulnerable warning yang block deployment)
- `maxDuration` extract: 10s → 60s (fix timeout saat OCR dokumen besar)
- `maxDuration` chat: 10s → 30s (fix timeout saat context panjang)
- Ganti model `gemini-2.0-flash` → `gemini-2.5-flash` (2.0 akan shutdown 1 Juni 2026, 1.5 sudah 404)
- Tambah retry logic 3x (delay 2s, 4s) di `extractSingle` dan `analyzeData` untuk handle 503 Gemini
- Tambah try/catch di `JSON.parse` Gemini response dengan error message yang jelas
- Tambah `console.error` detail di `extractSingle` untuk debug log Vercel

### Fitur Baru
- Tambah **Data Intelligence** page (`/data-intelligence`)
- Tambah `lib/analyst.ts` — Gemini data analyst dengan conversation history (multi-turn)
- Tambah `app/api/analyze/route.ts` — endpoint analisis data
- Tambah `app/components/DataAnalyst/index.tsx` — UI upload CSV/Excel + chat analyst
- Excel parsing dengan SheetJS (`xlsx`) — baca semua sheet sekaligus, convert ke CSV sebelum kirim ke Gemini
- Navigasi antar halaman (OCR Docs ↔ Data Intelligence)

### Yang Masih Perlu Diperbaiki (TODO)
- OCR masih sering error untuk PDF hasil scan — perlu fallback strategy
- Gemini 503 masih bisa terjadi di peak hours meski sudah ada retry

---

## 🔑 Environment Variables
```env
GEMINI_API_KEY=your_google_ai_studio_api_key_here
```

---

## 🚀 Getting Started
```bash
git clone https://github.com/jefribulomakassar/conversa-ocr-docs.git
cd conversa-ocr-docs
npm install
npm run dev
```
