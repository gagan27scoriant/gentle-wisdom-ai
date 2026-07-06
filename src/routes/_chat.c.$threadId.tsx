import { createFileRoute } from "@tanstack/react-router";
import { ChatView } from "@/components/chat-view";

export const Route = createFileRoute("/_chat/c/$threadId")({
  ssr: false,
  component: ChatPage,
});

function ChatPage() {
  const { threadId } = Route.useParams();
  return <ChatView key={threadId} threadId={threadId} />;
}