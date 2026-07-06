import { Link, useNavigate, useParams, useRouterState } from "@tanstack/react-router";
import { Plus, MessageSquare, Trash2, PanelLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { deleteThread, loadThreads, newThreadId, type ChatThread } from "@/lib/chat-storage";

type Props = {
  open: boolean;
  onToggle: () => void;
};

export function ChatSidebar({ open, onToggle }: Props) {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const params = useParams({ strict: false }) as { threadId?: string };
  const activeId = params.threadId;

  useEffect(() => {
    const refresh = () => setThreads(loadThreads());
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === "sarva.threads.v1") refresh();
    };
    const onCustom = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("sarva:threads-changed", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("sarva:threads-changed", onCustom);
    };
  }, [pathname]);

  function startNew() {
    const id = newThreadId();
    onToggle(); // close sidebar
    navigate({ to: "/c/$threadId", params: { threadId: id } });
  }

  function remove(id: string) {
    deleteThread(id);
    setThreads(loadThreads());
    window.dispatchEvent(new CustomEvent("sarva:threads-changed"));
    if (activeId === id) navigate({ to: "/" });
  }

  return (
    <>
      {/* Overlay on mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm md:hidden"
          onClick={onToggle}
          aria-hidden
        />
      )}

      {/* Always-visible floating toggle */}
      <button
        type="button"
        aria-label="Toggle sidebar"
        onClick={onToggle}
        className="fixed top-3 left-3 z-50 rounded-lg border border-border bg-card p-2 shadow-sm hover:bg-accent hover:text-foreground transition text-muted-foreground"
      >
        <PanelLeft className="h-4 w-4" />
      </button>

      <aside
        className={cn(
          "z-50 flex h-dvh shrink-0 flex-col bg-sidebar text-sidebar-foreground",
          "transition-all duration-300 ease-in-out overflow-hidden",
          "fixed inset-y-0 left-0 md:static border-r border-border",
          open ? "w-72 shadow-xl md:shadow-none" : "w-0 border-r-0"
        )}
      >
        <div className="flex flex-col h-full w-72">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <Link
              to="/"
              className="flex items-center gap-2.5"
              onClick={() => open && onToggle()}
            >
              <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                <span className="font-display text-base leading-none text-primary-foreground">s</span>
              </div>
              <span className="font-display text-xl tracking-tight">sarva</span>
            </Link>
            <button
              type="button"
              aria-label="Close sidebar"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition"
              onClick={onToggle}
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          </div>

          {/* New chat button */}
          <div className="px-3 pb-2">
            <button
              type="button"
              onClick={startNew}
              className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-medium hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm transition"
            >
              <Plus className="h-4 w-4 text-primary" />
              New chat
            </button>
          </div>

          {/* Thread list */}
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            <div className="px-2 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Recent
            </div>
            {threads.length === 0 && (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground/60">
                No conversations yet.
                <br />Start a new chat to begin.
              </div>
            )}
            <ul className="space-y-0.5">
              {threads.map((t) => {
                const active = t.id === activeId;
                return (
                  <li key={t.id} className="group relative">
                    <Link
                      to="/c/$threadId"
                      params={{ threadId: t.id }}
                      onClick={() => open && onToggle()}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm truncate transition",
                        active
                          ? "bg-primary/10 text-foreground font-medium"
                          : "text-foreground/75 hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <MessageSquare
                        className={cn(
                          "h-3.5 w-3.5 shrink-0",
                          active ? "text-primary" : "opacity-50"
                        )}
                      />
                      <span className="truncate flex-1">{t.title || "New chat"}</span>
                    </Link>
                    <button
                      type="button"
                      aria-label="Delete conversation"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        remove(t.id);
                      }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground/60">
            Conversations stored locally in this browser.
          </div>
        </div>
      </aside>
    </>
  );
}