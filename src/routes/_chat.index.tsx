import { createFileRoute, redirect } from "@tanstack/react-router";
import { newThreadId } from "@/lib/chat-storage";

export const Route = createFileRoute("/_chat/")({
  beforeLoad: () => {
    throw redirect({
      to: "/c/$threadId",
      params: { threadId: newThreadId() },
      replace: true,
    });
  },
});