import { Link, useNavigate, useParams, useRouterState } from "@tanstack/react-router";
import { Plus, MessageSquare, Trash2, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { deleteThread, loadThreads, newThreadId, type ChatThread } from "@/lib/chat-storage";

export function ChatSidebar() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [open, setOpen] = useState(false);
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
    setOpen(false);
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
      {/* mobile toggle */}
      <button
        type="button"
        aria-label="Open menu"
        className="fixed top-3 left-3 z-40 md:hidden rounded-md border border-border bg-card p-2 shadow-sm"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "z-50 flex h-dvh w-72 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground",
          "fixed inset-y-0 left-0 transition-transform md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
              <span className="font-display text-lg leading-none text-primary-foreground">s</span>
            </div>
            <span className="font-display text-xl tracking-tight">sarva</span>
          </Link>
          <button
            type="button"
            aria-label="Close menu"
            className="md:hidden rounded p-1 hover:bg-accent"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3 py-2">
          <button
            type="button"
            onClick={startNew}
            className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-medium hover:border-primary/40 hover:bg-primary/5 transition"
          >
            <Plus className="h-4 w-4" />
            New chat
          </button>
        </div>

        <div className="mt-2 flex-1 overflow-y-auto px-2 pb-4">
          <div className="px-2 py-1.5 text-xs uppercase tracking-wider text-muted-foreground">
            Conversations
          </div>
          {threads.length === 0 && (
            <div className="px-3 py-6 text-sm text-muted-foreground">
              No chats yet. Start a new conversation.
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
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm truncate transition",
                      active
                        ? "bg-primary/10 text-foreground"
                        : "text-foreground/80 hover:bg-accent",
                    )}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
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
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
          Chats saved in this browser only.
        </div>
      </aside>
    </>
  );
}