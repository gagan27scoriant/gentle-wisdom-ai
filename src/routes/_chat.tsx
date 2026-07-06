import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ChatSidebar } from "@/components/chat-sidebar";
import { createContext, useContext, useState } from "react";

// Shared context for sidebar state
export const SidebarContext = createContext<{
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}>({ sidebarOpen: false, toggleSidebar: () => {} });

export function useSidebar() {
  return useContext(SidebarContext);
}

export const Route = createFileRoute("/_chat")({
  component: ChatLayout,
});

function ChatLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function toggleSidebar() {
    setSidebarOpen((o) => !o);
  }

  return (
    <SidebarContext.Provider value={{ sidebarOpen, toggleSidebar }}>
      <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
        <ChatSidebar open={sidebarOpen} onToggle={toggleSidebar} />
        <main className="flex-1 min-w-0 flex flex-col">
          <Outlet />
        </main>
      </div>
    </SidebarContext.Provider>
  );
}