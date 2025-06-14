import { useMutation } from "convex/react";
import { api } from "@cvx/_generated/api";
import {
  optimisticallySendMessage,
  toUIMessages,
  useSmoothText,
  useThreadMessages,
  type UIMessage,
} from "@convex-dev/agent/react";
import { useState } from "react";
import { Button } from "@medusajs/ui";
import { Id } from "@cvx/_generated/dataModel";

export function Chat({ threadId }: { threadId: string }) {
  const messages = useThreadMessages(
    api.messages.getByThreadId,
    { threadId: threadId as Id<"threads"> },
    { initialNumItems: 10, stream: true },
  );
  const sendMessage = useMutation(
    api.chat.streamAsynchronously,
  ).withOptimisticUpdate(optimisticallySendMessage(api.messages.getByThreadId));

  const [prompt, setPrompt] = useState("");

  function onSendClicked() {
    if (prompt.trim() === "") return;
    void sendMessage({ threadId: threadId as Id<"threads">, prompt }).catch(
      () => setPrompt(prompt),
    );
    setPrompt("");
  }

  // const messageErrors = (messages.results ?? []).map((m) => m.error);

  return (
    <div className="w-full max-w-2xl mx-auto rounded-xl shadow-lg p-6 flex flex-col gap-6">
      {messages.results?.length > 0 && (
        <div className="flex flex-col gap-4 overflow-y-auto mb-4 h-[60vh]">
          {toUIMessages(messages.results ?? []).map((m) => (
            <Message key={m.key} message={m} />
          ))}
        </div>
      )}
      <form
        className="flex gap-2 items-center"
        onSubmit={(e) => {
          e.preventDefault();
          onSendClicked();
        }}
      >
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="flex-1 px-4 py-2 rounded-lg"
          placeholder="Type your message..."
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition font-semibold disabled:opacity-50"
          disabled={!prompt.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}

function Message({ message }: { message: UIMessage }) {
  const [visibleText] = useSmoothText(message.content);

  return (
    <div className="group/message" data-role={message.role}>
      <div className="flex justify-start group-data-[role=user]/message:justify-end">
        <div className="rounded-lg px-4 py-2 max-w-lg whitespace-pre-wrap shadow-sm bg-gray-200 text-gray-800 group-data-[role=user]/message:bg-blue-100 group-data-[role=user]/message:text-blue-900">
          {visibleText}
        </div>
      </div>
      <div className="transition-opacity opacity-0 group-hover/message:opacity-100 pt-2 flex gap-2 justify-start group-data-[role=user]/message:justify-end">
        <Button size="small">Copy</Button>
        <Button size="small">Fork</Button>
      </div>
    </div>
  );
}
