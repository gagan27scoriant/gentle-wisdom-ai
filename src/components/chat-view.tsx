import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  ArrowUp,
  Square,
  Sparkles,
  Copy,
  Check,
  Lightbulb,
  Code2,
  Mail,
  Plane,
  PenLine,
  GraduationCap,
  Plus,
  Mic,
  X,
  Paperclip,
} from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { deriveTitle, getThread, upsertThread } from "@/lib/chat-storage";

type Props = { threadId: string };

const SUGGESTIONS: { title: string; prompt: string; icon: ReactNode }[] = [
  {
    title: "Explain",
    prompt: "Explain quantum entanglement like I'm a curious teenager.",
    icon: <Lightbulb className="h-4 w-4" />,
  },
  {
    title: "Code",
    prompt: "Write a Python function that debounces another function.",
    icon: <Code2 className="h-4 w-4" />,
  },
  {
    title: "Write",
    prompt: "Draft a polite email declining a meeting invitation.",
    icon: <Mail className="h-4 w-4" />,
  },
  {
    title: "Plan",
    prompt: "Plan a 3-day itinerary for Kyoto in autumn.",
    icon: <Plane className="h-4 w-4" />,
  },
  {
    title: "Brainstorm",
    prompt: "Give me 10 unusual weekend project ideas for a solo developer.",
    icon: <PenLine className="h-4 w-4" />,
  },
  {
    title: "Learn",
    prompt: "Teach me the basics of statistical significance in 5 minutes.",
    icon: <GraduationCap className="h-4 w-4" />,
  },
];

export function ChatView({ threadId }: Props) {
  const initial = useMemo(
    () => getThread(threadId)?.messages ?? [],
    [threadId]
  );
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    []
  );
  const { messages, sendMessage, status, error, stop } = useChat({
    id: threadId,
    messages: initial as UIMessage[],
    transport,
  });

  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [recording, setRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  function handleFiles(selected: FileList | null) {
    if (!selected) return;
    setFiles((prev) => [...prev, ...Array.from(selected)]);
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function toggleMic() {
    setRecording((r) => !r);
  }

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

  // auto-resize textarea
  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }

  const busy = status === "submitted" || status === "streaming";

  function submit(text?: string) {
    const value = (text ?? input).trim();
    if (!value || busy) return;
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    sendMessage({ text: value });
  }

  const empty = messages.length === 0;

  const composer = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="relative flex flex-col rounded-2xl border border-border bg-card shadow-md transition focus-within:border-primary/40 focus-within:shadow-lg"
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* File chips row — only shown when files are attached */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pt-3">
          {files.map((f, i) => (
            <div
              key={i}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-2.5 py-1 text-xs text-foreground/80"
            >
              <Paperclip className="h-3 w-3 text-primary/70" />
              <span className="max-w-[140px] truncate">{f.name}</span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive transition"
                aria-label="Remove file"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Textarea row: [+] | textarea | [🎤] */}
      <div className="flex items-start gap-1 px-3 pt-3">
        {/* Attach button — left */}
        <div className="relative group/btn shrink-0 mt-0.5">
          <button
            type="button"
            aria-label="Attach file"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition"
          >
            <Plus className="h-4 w-4" />
          </button>
          <span className="pointer-events-none absolute bottom-full left-0 mb-1.5 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] text-background opacity-0 group-hover/btn:opacity-100 transition">
            Attach file
          </span>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            autoResize(e.target);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder={recording ? "Recording…" : "Message sarva…"}
          className="min-h-[36px] max-h-[200px] flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground/60"
        />

        {/* Mic button — right */}
        <div className="relative group/btn shrink-0 mt-0.5">
          <button
            type="button"
            aria-label={recording ? "Stop recording" : "Voice input"}
            onClick={toggleMic}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition",
              recording
                ? "bg-primary/10 text-primary ring-2 ring-primary/30"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {recording ? (
              <span className="relative flex h-4 w-4 items-center justify-center">
                <span className="absolute h-full w-full animate-ping rounded-full bg-primary/40" />
                <Mic className="relative h-3.5 w-3.5 text-primary" />
              </span>
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </button>
          <span className="pointer-events-none absolute bottom-full right-0 mb-1.5 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] text-background opacity-0 group-hover/btn:opacity-100 transition">
            {recording ? "Stop recording" : "Voice input"}
          </span>
        </div>
      </div>

      {/* Bottom toolbar */}
      <div className="flex items-center justify-between px-3 pb-3">
        {/* Left: Gemini badge */}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          <Sparkles className="h-2.5 w-2.5 text-primary" />
          Powered by Gemini
        </span>

        {/* Right: Send / Stop */}
        <div>
          {busy ? (
            <button
              type="button"
              onClick={() => stop()}
              aria-label="Stop generating"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background shadow-sm transition hover:opacity-80"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() && files.length === 0}
              aria-label="Send message"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition enabled:hover:opacity-90 disabled:opacity-25"
            >
              <ArrowUp className="h-4 w-4" />
            </button>

          )}
        </div>
      </div>
    </form>
  );

  return (
    <div className="flex h-dvh flex-col">

      {empty ? (
        /* ── LANDING PAGE ── */
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center px-4 py-10">
            {/* Hero greeting */}
            <div className="flex flex-col items-center text-center mb-10">
              {/* Glow orb */}
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-full bg-primary/30 blur-2xl scale-150 opacity-60" />
                <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/80 to-primary border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/20">
                  <Sparkles className="h-7 w-7 text-primary-foreground" />
                </div>
              </div>

              <h1 className="font-display text-4xl md:text-5xl tracking-tight text-foreground">
                <TimeGreeting />
              </h1>
              <p className="mt-3 text-base text-muted-foreground max-w-sm">
                Your thoughtful AI companion for writing, coding, planning, and exploring ideas.
              </p>
            </div>

            {/* Composer */}
            <div className="w-full">{composer}</div>

            {/* Suggestion pills */}
            <div className="mt-6 flex w-full flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => submit(s.prompt)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-foreground/80 transition hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                >
                  <span className="text-primary/80">{s.icon}</span>
                  {s.title}
                </button>
              ))}
            </div>

            <p className="mt-6 text-center text-[11px] text-muted-foreground/70">
              sarva can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      ) : (
        /* ── CHAT VIEW ── */
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl px-4 py-6 md:py-10">
              <ul className="space-y-6">
                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} />
                ))}
                {status === "submitted" && <ThinkingIndicator />}
                {error && (
                  <li className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {error.message || "Something went wrong."}
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Composer */}
          <div className="border-t border-border/60 bg-background/80 backdrop-blur-md">
            <div className="mx-auto w-full max-w-3xl px-4 py-3 md:py-4">
              {composer}
              <p className="mt-2 text-center text-[11px] text-muted-foreground/60">
                sarva can make mistakes. Verify important information.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TimeGreeting() {
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return "Still up?";
    if (h < 12) return "Good morning.";
    if (h < 17) return "Good afternoon.";
    if (h < 22) return "Good evening.";
    return "Working late?";
  }, []);
  return <>{greeting}</>;
}

function ThinkingIndicator() {
  return (
    <li className="flex items-center gap-3 text-sm text-muted-foreground pl-1">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block h-2 w-2 rounded-full bg-primary/60 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <span>sarva is thinking…</span>
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
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-[15px] leading-relaxed text-primary-foreground shadow-sm">
          {text}
        </div>
      </li>
    );
  }

  return (
    <li className="group flex flex-col gap-2">
      {/* Avatar + name */}
      <div className="flex items-center gap-2 mb-0.5">
        <div className="h-6 w-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
          <span className="font-display text-xs text-primary leading-none">s</span>
        </div>
        <span className="text-xs font-medium text-muted-foreground">sarva</span>
      </div>

      <div className="prose prose-neutral max-w-none text-[15px] leading-relaxed text-foreground pl-8">
        <ReactMarkdown
          components={{
            code({ className, children, ...props }) {
              const isBlock = /language-/.test(className ?? "");
              if (!isBlock) {
                return (
                  <code
                    className="rounded-md bg-muted px-1.5 py-0.5 text-[0.88em] font-mono"
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
                <pre className="overflow-x-auto rounded-xl border border-border bg-muted/60 p-4 text-sm">
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
                  className="text-primary underline underline-offset-2 hover:opacity-80 transition"
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
        <div className="pl-8 opacity-0 group-hover:opacity-100 transition">
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-border/80 transition"
          >
            {copied ? (
              <Check className="h-3 w-3 text-primary" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
    </li>
  );
}