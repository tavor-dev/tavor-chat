import { Logo } from "@/components/logo";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@cvx/_generated/api";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useState, useRef } from "react";

export const Route = createFileRoute("/_app/_auth/")({
  component: NewChatComponent,
});

function NewChatComponent() {
  const { data: user } = useQuery(convexQuery(api.app.getCurrentUser, {}));

  const navigate = useNavigate({ from: "/" });
  const createThread = useMutation(api.threads.create);
  const sendMessage = useMutation(api.chat.streamAsynchronously);

  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const threadId = await createThread({
        model: user?.selectedModel || undefined,
      });
      await sendMessage({
        threadId,
        prompt: input,
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
            Hello, {user?.name || "there"}!
          </h1>
        </div>
      </div>

      <ChatPanel
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
        showScrollToBottomButton={false}
        scrollContainerRef={scrollContainerRef}
      />
    </div>
  );
}
