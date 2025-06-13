import { createFileRoute } from "@tanstack/react-router";
import { Chat } from "@/components/chat/Chat";

export const Route = createFileRoute("/_app/_auth/chat/$threadId")({
  component: ChatComponent,
});

function ChatComponent() {
  const { threadId } = Route.useParams();
  return (
    <div className="h-full flex flex-col">
      <Chat threadId={threadId} />
    </div>
  );
}
