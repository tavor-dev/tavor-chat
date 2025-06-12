import { createFileRoute } from "@tanstack/react-router";
import { Chat } from "@/components/chat";

export const Route = createFileRoute("/_app/_auth/chat/$threadId")({
  component: ChatComponent,
});

function ChatComponent() {
  const { threadId } = Route.useParams();

  return (
    <div className="p-8">
      <Chat threadId={threadId} />
    </div>
  );
}
