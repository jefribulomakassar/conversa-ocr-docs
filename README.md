# Conversa AI — Enterprise Document Intelligence Agent

> Submission for **TechEx Intelligent Enterprise Solutions Hackathon**
> Track: 🤖 AI Agents with Google AI Studio (Powered by Google DeepMind & Google AI Studio)

---

## 🧠 Overview

**Conversa AI** is an enterprise-grade AI Agent Platform that enables users to upload, extract, and converse with documents using Gemini's long-context and vision capabilities. Designed to solve real-world enterprise document processing challenges — from contracts and reports to invoices and forms.

🔗 **Live Demo:** [https://conversa2026.vercel.app](https://conversa2026.vercel.app)

---

## 🚩 Problem

Enterprises deal with massive volumes of unstructured documents daily. Extracting structured insights from PDFs, scanned files, or lengthy reports is slow, error-prone, and expensive when done manually.

---

## ✅ Solution

Conversa AI leverages **Gemini Flash** (via Google AI Studio) to:

- 📄 **OCR & Extract** — Parse text, tables, and key data from uploaded documents (PDF, images, scanned files)
- 💬 **Conversational Q&A** — Ask questions about document content in natural language
- 🤖 **Agentic Workflow** — Automatic summarization, data structuring, and insight extraction
- 🏢 **Enterprise Ready** — Built for use cases like contract review, report analysis, and operational data extraction

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js (App Router) |
| AI Model | Gemini Flash (Google AI Studio) |
| Document Processing | Gemini Vision API (OCR + long-context) |
| Deployment | Vercel |

---

## ✨ Key Features

- **Document Upload** — Supports PDF and image formats
- **AI-Powered OCR** — Gemini Vision extracts text from scanned/image-based documents
- **Long-Context Processing** — Handles lengthy enterprise documents without chunking loss
- **Chat Interface** — Converse with your documents naturally
- **Structured Output** — Extract tables, key fields, and summaries automatically

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Google AI Studio API Key → [Get yours here](https://aistudio.google.com)

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/conversa-ai.git
cd conversa-ai
npm install
```

### Environment Setup

Create a `.env.local` file:

```env
GEMINI_API_KEY=your_google_ai_studio_api_key_here
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
conversa-ai/
├── app/
│   ├── api/
│   │   └── extract/        # Gemini OCR & document processing endpoint
│   ├── components/
│   │   ├── ChatInterface/  # Conversational UI
│   │   └── DocumentUpload/ # File upload handler
│   └── page.tsx
├── lib/
│   └── gemini.ts           # Google AI Studio client
├── public/
└── README.md
```

---

## 🎯 Hackathon Track Alignment

This project addresses the **AI Agents with Google AI Studio** track:

- ✅ **Long-context document processing** — contracts, reports, invoices
- ✅ **Gemini-powered agent workflow** — extract → structure → converse
- ✅ **Enterprise integration ready** — API-first design for CRM/ERP connectivity
- ✅ **Production-grade demo** — live deployment on Vercel

---

## 👥 Team

Built for TechEx Intelligent Enterprise Solutions Hackathon 2026.

---

## 📄 License

MIT
