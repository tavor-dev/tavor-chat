import { cn } from "@/lib/utils";
import { UIMessage, useSmoothText } from "@convex-dev/agent/react";
import { Spinner } from "@medusajs/icons";
import { CodeBlock, Text } from "@medusajs/ui";
import React, { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * A custom component that wraps the Medusa UI CodeBlock.
 * This is used as the override for the `<pre>` tag in ReactMarkdown.
 */
const CustomCodeBlock = memo(
  ({
    node,
    className,
    children,
    ...props
  }: React.HTMLAttributes<HTMLPreElement> & { node?: unknown }) => {
    // The `children` of a <pre> tag is a <code> element.
    // We need to extract its props to get the language and content.
    const codeElement = React.Children.only(children) as React.ReactElement<{
      className?: string;
      children: React.ReactNode;
    }>;

    const { className: codeClassName, children: codeContent } =
      codeElement.props;

    // Extract language from className (e.g., "language-js")
    const match = /language-(\w+)/.exec(codeClassName || "");
    const language = match ? match[1] : "text";
    const codeText = String(codeContent).replace(/\n$/, "");

    return (
      // The `not-prose` class is important to prevent Tailwind Typography
      // from styling the code block, so we can use Medusa's styles.
      <pre className="not-prose my-4" {...props}>
        <CodeBlock
          snippets={[
            {
              language: language,
              label: language, // Medusa uses this for the header
              code: codeText,
            },
          ]}
        >
          <CodeBlock.Header />
          <CodeBlock.Body />
        </CodeBlock>
      </pre>
    );
  },
);
CustomCodeBlock.displayName = "CustomCodeBlock";

const ToolStatus = memo(
  ({
    part,
  }: {
    part: Extract<UIMessage["parts"][0], { type: "tool-invocation" }>;
  }) => {
    const invocation = part.toolInvocation;
    const isExecuting = invocation.state === "call";
    const command =
      invocation.toolName === "executeCommand"
        ? (invocation.args?.command as string)
        : null;

    if (!command) return null;

    return (
      <div className="not-prose my-4 rounded-lg border border-ui-border-base bg-ui-bg-surface p-4">
        <div className="flex items-center gap-3">
          {isExecuting && (
            <Spinner className="h-4 w-4 text-ui-fg-muted animate-spin" />
          )}
          <div className="flex-1 max-w-full">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-ui-fg-base">
                {isExecuting ? "Executing" : "Executed"} command
              </span>
              <code className="rounded bg-ui-bg-base-pressed px-2 py-1 font-mono text-xs text-ui-fg-subtle max-w-96 truncate text-ellipsis">
                {command}
              </code>
            </div>
            {invocation.state === "result" && invocation.result && (
              <div className="mt-3">
                <div className="text-xs font-medium text-ui-fg-muted mb-1">
                  Output:
                </div>
                <p className="break-words rounded bg-ui-bg-base-pressed p-3 font-mono text-xs text-ui-fg-subtle">
                  {String(invocation.result).trim()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);
ToolStatus.displayName = "ToolStatus";

// --- Main BotMessage Component ---

export function BotMessage({
  message,
  className,
}: {
  message: UIMessage;
  className?: string;
}) {
  const [visibleText] = useSmoothText(message.content);

  const toolInvocations =
    message.parts?.filter(
      (part): part is Extract<typeof part, { type: "tool-invocation" }> =>
        part.type === "tool-invocation",
    ) || [];

  return (
    // We use the `prose` class from Tailwind Typography for beautiful default
    // styling of all markdown elements (headings, paragraphs, lists, etc.).
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        // Customizations for prose elements
        "prose-p:my-2 prose-headings:my-4 prose-blockquote:my-4",
        "prose-a:text-blue-500 prose-a:no-underline hover:prose-a:underline",
        "prose-ul:my-3 prose-ol:my-3",
        // Base text color
        "text-ui-fg-base",
        className,
      )}
    >
      {toolInvocations.map((invocation, index) => (
        <ToolStatus key={index} part={invocation} />
      ))}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Use `Text` component for paragraphs to ensure consistent styling
          p: ({ node, ...props }) => <Text {...props} />,

          // Override `pre` to use our custom code block component
          pre: CustomCodeBlock,
          // Override `code` to handle ONLY inline code.
          code: ({ node, className, children, ...props }) => {
            const inline = !className?.includes("language-");
            if (inline) {
              return (
                <code
                  {...props}
                  className="not-prose rounded bg-ui-bg-base-pressed px-[0.4rem] py-[0.2rem] font-mono text-sm font-semibold text-ui-fg-subtle"
                >
                  {children}
                </code>
              );
            }

            // Block code is handled by the `pre` component override.
            // This `<code>` is the child of that `<pre>`, so we just pass it along.
            return <code className={className}>{children}</code>;
          },
        }}
      >
        {visibleText}
      </ReactMarkdown>
    </div>
  );
}
