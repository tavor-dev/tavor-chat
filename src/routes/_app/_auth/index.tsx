import { Logo } from "@/components/logo";
import { ChatPanel, ProcessedFile } from "@/components/chat/ChatPanel";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@cvx/_generated/api";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useCallback, useState } from "react";
import { Id } from "@cvx/_generated/dataModel";
import { toast } from "@medusajs/ui";

export const Route = createFileRoute("/_app/_auth/")({
  component: NewChatComponent,
});

function NewChatComponent() {
  const { data: user } = useQuery(convexQuery(api.app.getCurrentUser, {}));

  const navigate = useNavigate({ from: "/" });
  const createThread = useMutation(api.threads.create);
  const sendMessage = useMutation(api.chat.streamAsynchronously);

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(
    async (prompt: string, files: ProcessedFile[]) => {
      if ((prompt.trim() === "" && files.length === 0) || isLoading) return;
      setIsLoading(true);
      try {
        const threadId = await createThread({
          model: user?.selectedModel || undefined,
        });

        const filesForBackend = files.map((f) => ({
          fileId: f.fileId,
        })) as { fileId: Id<"files"> }[];

        await sendMessage({
          threadId,
          prompt,
          files: filesForBackend,
          model: user?.selectedModel || undefined,
        })
          .then(() => {
            navigate({ to: "/chat/$threadId", params: { threadId } });
          })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .catch((error: any) => {
            const errorMessage =
              typeof error.data === "string"
                ? error.data
                : error.data?.message || error.message;
            if (errorMessage?.includes("MESSAGE_LIMIT_EXCEEDED")) {
              toast.error("You've reached your free message limit.", {
                action: {
                  label: "Upgrade",
                  onClick: () =>
                    navigate({ to: "/settings", search: { tab: "billing" } }),
                  altText: "",
                },
                duration: 10000,
              });
            } else {
              throw error;
            }
          });
      } catch (error) {
        console.error("Failed to create new chat:", error);
        toast.error("Failed to create new chat with files. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [sendMessage, createThread, isLoading, navigate, user?.selectedModel],
  );

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
                return `Hello, ${greeting}!`;
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

