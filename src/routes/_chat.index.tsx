import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { newThreadId } from "@/lib/chat-storage";

export const Route = createFileRoute("/_chat/")({
  ssr: false,
  component: NewChatRedirect,
});

function NewChatRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    const id = newThreadId();
    navigate({ to: "/c/$threadId", params: { threadId: id }, replace: true });
  }, [navigate]);
  return null;
}