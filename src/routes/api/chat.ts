import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

// ── MOCK MODE ────────────────────────────────────────────────────────────────
// Set to true to stream a predefined reply without hitting the AI backend.
// Flip back to false when you're ready for real responses.
const MOCK_MODE = true;

const MOCK_REPLY = `Hey there! 👋 This is a **predefined test message** so you can check how the chat flow looks and feels.

Here's what you're seeing right now:
- ✅ Message sent from the composer
- ✅ Thinking indicator appeared
- ✅ Response streamed in word-by-word
- ✅ Markdown rendering (bold, lists, code)

\`\`\`ts
// Even code blocks work!
const sarva = "your AI companion";
console.log(sarva);
\`\`\`

Once you're happy with the flow, set **MOCK_MODE = false** in \`src/routes/api/chat.ts\` to switch to real AI responses. 🚀`;
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Sarva, a warm, capable AI assistant. Answer clearly and helpfully, like ChatGPT or Claude. Format responses in Markdown when helpful: use headings, bold, lists, tables, and fenced code blocks with language tags. Be concise by default, but go deep when the user asks. If you're unsure, say so.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { messages?: unknown };
        if (!Array.isArray(body.messages)) {
          return new Response("messages required", { status: 400 });
        }

        // ── Mock mode: stream the predefined reply ──
        if (MOCK_MODE) {
          const encoder = new TextEncoder();
          const words = MOCK_REPLY.split(" ");
          const stream = new ReadableStream({
            async start(controller) {
              // Emit an initial message-start chunk
              controller.enqueue(
                encoder.encode(
                  `f:{"messageId":"mock-${Date.now()}"}\n`
                )
              );
              // Stream word by word with a small delay
              for (const word of words) {
                await new Promise((r) => setTimeout(r, 30));
                controller.enqueue(
                  encoder.encode(`0:${JSON.stringify(word + " ")}\n`)
                );
              }
              // Emit finish chunk
              controller.enqueue(
                encoder.encode(
                  `e:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0},"isContinued":false}\n`
                )
              );
              controller.enqueue(
                encoder.encode(
                  `d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`
                )
              );
              controller.close();
            },
          });
          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream",
              "X-Vercel-AI-Data-Stream": "v1",
            },
          });
        }
        // ───────────────────────────────────────────

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        try {
          const gateway = createLovableAiGatewayProvider(key);
          const result = streamText({
            model: gateway("google/gemini-3-flash-preview"),
            system: SYSTEM_PROMPT,
            messages: await convertToModelMessages(body.messages as UIMessage[]),
          });
          return result.toUIMessageStreamResponse({
            originalMessages: body.messages as UIMessage[],
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "AI request failed";
          return new Response(message, { status: 500 });
        }
      },
    },
  },
});