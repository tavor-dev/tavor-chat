import { cn } from "@/lib/utils";
import { Text, CodeBlock, Heading } from "@medusajs/ui";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function BotMessage({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <div className={cn("text-ui-fg-base", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => (
            <Heading level="h1" {...props} className="mb-4 mt-6" />
          ),
          h2: ({ node, ...props }) => (
            <Heading level="h2" {...props} className="mb-3 mt-5" />
          ),
          h3: ({ node, ...props }) => (
            <Heading level="h3" {...props} className="mb-2 mt-4" />
          ),
          p: ({ node, ...props }) => <Text {...props} className="my-4" />,
          ul: ({ node, ...props }) => (
            <ul {...props} className="list-disc list-inside my-4 space-y-2" />
          ),
          ol: ({ node, ...props }) => (
            <ol
              {...props}
              className="list-decimal list-inside my-4 space-y-2"
            />
          ),
          li: ({ children }) => (
            <li>
              <Text as="span">{children}</Text>
            </li>
          ),
          a: ({ node, ...props }) => (
            <a
              {...props}
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            />
          ),
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const codeText = String(children).replace(/\n$/, "");

            if (inline) {
              return (
                <code
                  {...props}
                  className="bg-ui-bg-base-pressed rounded px-1 py-0.5 font-mono text-sm text-ui-fg-subtle"
                >
                  {children}
                </code>
              );
            }

            return (
              <div className="my-4">
                <CodeBlock
                  snippets={[
                    {
                      language: match ? match[1] : "text",
                      label: match ? match[1] : "code",
                      code: codeText,
                    },
                  ]}
                >
                  <CodeBlock.Header />
                  <CodeBlock.Body />
                </CodeBlock>
              </div>
            );
          },
        }}
      >
        {message}
      </ReactMarkdown>
    </div>
  );
}
