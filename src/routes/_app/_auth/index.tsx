import { Logo } from "@/components/logo";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@cvx/_generated/api";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useState } from "react";

export const Route = createFileRoute("/_app/_auth/")({
  component: NewChatComponent,
});

function NewChatComponent() {
  const { data: user } = useQuery(convexQuery(api.app.getCurrentUser, {}));

  const navigate = useNavigate({ from: "/" });
  const createThread = useMutation(api.threads.create);
  const sendMessage = useMutation(api.chat.streamAsynchronously);

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (prompt: string) => {
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const threadId = await createThread({
        model: user?.selectedModel || undefined,
      });
      await sendMessage({
        threadId,
        prompt,
        model: user?.selectedModel || undefined,
      });
      navigate({ to: "/chat/$threadId", params: { threadId } });
    } catch (error) {
      console.error("Failed to create new chat:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col h-screen">
      <div className="flex-1 flex flex-col justify-center p-8">
        <div className="w-full flex justify-center flex-col items-center mb-8 gap-4">
          <Logo />
          <h1 className="text-2xl font-semibold text-ui-fg-base mt-4">
            {(() => {
              const now = new Date();
              const hour = now.getHours();
              let greeting = "Hello";
              if (hour >= 5 && hour < 12) greeting = "Good morning";
              else if (hour >= 12 && hour < 18) greeting = "Good afternoon";
              else if (hour >= 18 && hour < 24) greeting = "Good evening";
              else if (hour >= 1 && hour < 5) greeting = "Night owl";
              if (greeting === "Night owl") {
                return `${greeting}!`;
              } else {
                return `${greeting}, ${user?.name || "there"}!`;
              }
            })()}
          </h1>
        </div>
      </div>

      <ChatPanel
        handleSubmit={handleSubmit}
        isLoading={isLoading}
        showScrollToBottomButton={false}
        onInputHeightChange={() => {}}
      />
    </div>
  );
}
