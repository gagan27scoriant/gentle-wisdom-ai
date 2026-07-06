import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowUp, Square, Sparkles, Copy, Check } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import {
  deriveTitle,
  getThread,
  upsertThread,
} from "@/lib/chat-storage";

type Props = { threadId: string };

const SUGGESTIONS = [
  { title: "Explain a concept", prompt: "Explain quantum entanglement like I'm a curious teenager." },
  { title: "Write code", prompt: "Write a Python function that debounces another function." },
  { title: "Draft an email", prompt: "Draft a polite email declining a meeting invitation." },
  { title: "Plan a trip", prompt: "Plan a 3-day itinerary for Kyoto in autumn." },
];

export function ChatView({ threadId }: Props) {
  const initial = useMemo(() => getThread(threadId)?.messages ?? [], [threadId]);
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const { messages, sendMessage, status, error, stop } = useChat({
    id: threadId,
    messages: initial as UIMessage[],
    transport,
  });

  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // persist to localStorage whenever messages settle
  useEffect(() => {
    if (messages.length === 0) return;
    upsertThread({
      id: threadId,
      title: deriveTitle(messages),
      updatedAt: Date.now(),
      messages,
    });
    window.dispatchEvent(new CustomEvent("sarva:threads-changed"));
  }, [messages, threadId]);

  // autoscroll
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  // focus composer
  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId, status]);

  const busy = status === "submitted" || status === "streaming";

  function submit(text?: string) {
    const value = (text ?? input).trim();
    if (!value || busy) return;
    setInput("");
    sendMessage({ text: value });
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center justify-center border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-display text-lg">sarva</span>
          <span className="text-xs text-muted-foreground">· powered by Gemini</span>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 md:py-10">
          {messages.length === 0 ? (
            <EmptyState onPick={(p) => submit(p)} />
          ) : (
            <ul className="space-y-6">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
              {status === "submitted" && <ThinkingIndicator />}
              {error && (
                <li className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {error.message || "Something went wrong."}
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      <div className="border-t border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl px-4 py-3 md:py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="group relative flex items-end gap-2 rounded-2xl border border-border bg-card p-2 pl-4 shadow-sm focus-within:border-primary/50 focus-within:shadow-md transition"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              placeholder="Ask sarva anything…"
              className="min-h-[36px] max-h-52 flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 outline-none placeholder:text-muted-foreground/70"
              onInput={(e) => {
                const ta = e.currentTarget;
                ta.style.height = "auto";
                ta.style.height = Math.min(ta.scrollHeight, 208) + "px";
              }}
            />
            {busy ? (
              <button
                type="button"
                onClick={() => stop()}
                aria-label="Stop generating"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background transition hover:opacity-90"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label="Send message"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition enabled:hover:opacity-90 disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </form>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            sarva can make mistakes. Check important info.
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (p: string) => void }) {
  return (
    <div className="flex flex-col items-center pt-8 md:pt-20 text-center">
      <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <span className="font-display text-3xl text-primary leading-none">s</span>
      </div>
      <h1 className="mt-5 font-display text-3xl md:text-4xl tracking-tight">
        How can I help today?
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Ask anything — writing, code, ideas, analysis, or explanations.
      </p>
      <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.title}
            type="button"
            onClick={() => onPick(s.prompt)}
            className="rounded-xl border border-border bg-card px-4 py-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
          >
            <div className="text-sm font-medium">{s.title}</div>
            <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
              {s.prompt}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <li className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
      Thinking…
    </li>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const text = message.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("");
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  if (isUser) {
    return (
      <li className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-md bg-primary px-4 py-2.5 text-[15px] leading-relaxed text-primary-foreground shadow-sm">
          {text}
        </div>
      </li>
    );
  }

  return (
    <li className="group flex flex-col gap-1.5">
      <div className="prose prose-neutral max-w-none text-[15px] leading-relaxed text-foreground">
        <ReactMarkdown
          components={{
            code({ className, children, ...props }) {
              const isBlock = /language-/.test(className ?? "");
              if (!isBlock) {
                return (
                  <code
                    className="rounded bg-muted px-1.5 py-0.5 text-[0.9em] font-mono"
                    {...props}
                  >
                    {children}
                  </code>
                );
              }
              return (
                <code className={cn("font-mono text-sm", className)} {...props}>
                  {children}
                </code>
              );
            },
            pre({ children }) {
              return (
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/60 p-4 text-sm">
                  {children}
                </pre>
              );
            },
            a({ children, href }) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline underline-offset-2 hover:opacity-80"
                >
                  {children}
                </a>
              );
            },
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
      {text && (
        <div className="opacity-0 group-hover:opacity-100 transition">
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
    </li>
  );
}