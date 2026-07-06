import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ChatView } from "@/components/chat-view";
import { newThreadId } from "@/lib/chat-storage";

export const Route = createFileRoute("/_chat/")({
  ssr: false,
  component: NewChatLanding,
});

function NewChatLanding() {
  const navigate = useNavigate();

  // When user sends first message, mint an id and route to /c/:id via ChatView's onFirstMessage.
  useEffect(() => {}, []);

  return (
    <ChatView
      key="landing"
      threadId={null}
      onFirstMessage={(userText) => {
        const id = newThreadId();
        navigate({
          to: "/c/$threadId",
          params: { threadId: id },
          search: { seed: userText },
        });
      }}
    />
  );
}