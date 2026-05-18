// app/api/debug/route.ts
export async function GET() {
  return Response.json({
    hasKey: !!process.env.GEMINI_API_KEY,
    keyPrefix: process.env.GEMINI_API_KEY?.slice(0, 8) ?? "not found",
  });
}
