import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

export const SUPPORTED_DATA_TYPES = [
  "text/csv",
  "text/plain",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export interface AnalyzeInput {
  csvContent: string;
  fileName: string;
  question: string;
  history: Array<{ role: "user" | "model"; text: string }>;
}

function getModel(): GenerativeModel {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY in environment variables.");
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
    },
  });
}

export async function analyzeData(input: AnalyzeInput): Promise<string> {
  const { csvContent, fileName, question, history } = input;

  const model = getModel();

  const systemContext = `
You are an expert enterprise data analyst AI agent.
The user has uploaded a data file named "${fileName}".
Here is the full content of the file:

\`\`\`
${csvContent}
\`\`\`

Your job:
- Answer questions about this data accurately
- Identify trends, anomalies, totals, averages, and patterns
- Provide actionable insights when relevant
- If asked to summarize, give a concise structured summary
- If data has issues (missing values, duplicates), flag them
- Always base answers strictly on the data above
- Format numbers clearly (e.g. use commas for thousands)
- If the question cannot be answered from the data, say so clearly
  `.trim();

  // Build conversation history
  const historyMessages = history.map((h) => ({
    role: h.role,
    parts: [{ text: h.text }],
  }));

  const chat = model.startChat({
    history: [
      {
        role: "user",
        parts: [{ text: systemContext }],
      },
      {
        role: "model",
        parts: [{ text: "Understood. I have analyzed the data and I'm ready to answer your questions." }],
      },
      ...historyMessages,
    ],
  });

  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await chat.sendMessage(question);
      return result.response.text();
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      console.error(`[analyzeData] Attempt ${attempt} failed:`, lastErr.message);
      if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }

  throw lastErr ?? new Error("All retry attempts failed.");
}
