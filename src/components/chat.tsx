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

export function Chat({ threadId }: { threadId: string }) {
  const messages = useThreadMessages(
    api.messages.getByThreadId,
    { threadId },
    { initialNumItems: 10, stream: true },
  );
  const sendMessage = useMutation(
    api.chat.streamAsynchronously,
  ).withOptimisticUpdate(optimisticallySendMessage(api.messages.getByThreadId));

  const [prompt, setPrompt] = useState("");

  function onSendClicked() {
    if (prompt.trim() === "") return;
    void sendMessage({ threadId, prompt }).catch(() => setPrompt(prompt));
    setPrompt("");
  }

  // const messageErrors = (messages.results ?? []).map((m) => m.error);

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6 flex flex-col gap-6">
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
          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
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
  const isUser = message.role === "user";
  const [visibleText] = useSmoothText(message.content);
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`rounded-lg px-4 py-2 max-w-lg whitespace-pre-wrap shadow-sm ${
          isUser ? "bg-blue-100 text-blue-900" : "bg-gray-200 text-gray-800"
        }`}
      >
        {visibleText}
      </div>
    </div>
  );
}
