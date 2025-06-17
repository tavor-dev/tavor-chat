import { cn } from "@/lib/utils";
import { useSmoothText } from "@convex-dev/agent/react";
import {
  CheckCircleSolid,
  ChevronDownMini,
  ChevronUpMini,
  CommandLine,
  ExclamationCircleSolid,
  Spinner,
} from "@medusajs/icons";
import { Alert, CodeBlock, Text } from "@medusajs/ui";
import React, { memo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { UIMessageWithFiles } from "./Chat";

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
    part: Extract<UIMessageWithFiles["parts"][0], { type: "tool-invocation" }>;
  }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const invocation = part.toolInvocation;
    const isExecuting = invocation.state === "call";
    const isCompleted = invocation.state === "result";
    const hasError = invocation.state === "result" && !invocation.result;

    const command =
      invocation.toolName === "executeCommand"
        ? (invocation.args?.command as string)
        : null;

    if (!command) return null;

    const getStatusIcon = () => {
      if (isExecuting) {
        return (
          <Spinner className="h-4 w-4 text-ui-fg-interactive animate-spin" />
        );
      }
      if (hasError) {
        return <ExclamationCircleSolid className="h-4 w-4 text-ui-fg-error" />;
      }
      if (isCompleted) {
        return <CheckCircleSolid className="h-4 w-4 text-ui-tag-green-text" />;
      }
      return <CommandLine className="h-4 w-4 text-ui-fg-muted" />;
    };

    const getStatusText = () => {
      if (isExecuting) return "Running command";
      if (hasError) return "Command failed";
      if (isCompleted) return "Command completed";
      return "Command";
    };

    const getStatusColor = () => {
      if (isExecuting) return "text-ui-fg-interactive";
      if (hasError) return "text-ui-fg-error";
      if (isCompleted) return "text-ui-tag-green-text";
      return "text-ui-fg-base";
    };

    const hasOutput =
      isCompleted && invocation.result && String(invocation.result).trim();

    return (
      <div className="not-prose my-4">
        <div
          className={cn(
            "rounded-2xl border transition-all duration-200",
            isExecuting
              ? "border-ui-border-interactive bg-ui-bg-base shadow-sm"
              : hasError
                ? "border-ui-border-error bg-ui-bg-base"
                : "border-ui-border-base bg-ui-bg-subtle hover:bg-ui-bg-base",
            hasOutput && "",
          )}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 p-4 cursor-pointer"
            onClick={hasOutput ? () => setIsExpanded(!isExpanded) : undefined}
          >
            <div className="flex-shrink-0">{getStatusIcon()}</div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("text-sm font-medium", getStatusColor())}>
                  {getStatusText()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <code className="rounded bg-ui-bg-base-pressed px-2 py-1 font-mono text-xs text-ui-fg-subtle max-w-md truncate">
                  {command}
                </code>
                {hasOutput && (
                  <span className="text-xs text-ui-fg-muted select-none">
                    Click to {isExpanded ? "hide" : "view"} output
                  </span>
                )}
              </div>
            </div>

            {hasOutput && (
              <div className="flex-shrink-0">
                {isExpanded ? (
                  <ChevronUpMini className="h-4 w-4 text-ui-fg-muted" />
                ) : (
                  <ChevronDownMini className="h-4 w-4 text-ui-fg-muted" />
                )}
              </div>
            )}
          </div>

          {/* Expandable Output */}
          {hasOutput && isExpanded && (
            <div className="border-t border-ui-border-base">
              <div className="p-4 pt-3">
                <div className="rounded-md overflow-hidden">
                  <CodeBlock
                    snippets={[
                      {
                        language: "bash",
                        label: "Output",
                        code: String(invocation.result).trim(),
                        hideLineNumbers: true,
                      },
                    ]}
                  >
                    <CodeBlock.Body />
                  </CodeBlock>
                </div>
              </div>
            </div>
          )}
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
  isLoading,
}: {
  message?: UIMessageWithFiles;
  className?: string;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div
        className={cn("flex items-center gap-2 text-ui-fg-subtle", className)}
      >
        <Spinner className="animate-spin" />
        <Text>Thinking...</Text>
      </div>
    );
  }

  if (!message) return null;

  if (message.error) {
    return (
      <Alert variant="error" className="not-prose my-4">
        <Text className="text-ui-fg-error">An error occurred</Text>
        <Text className="text-ui-fg-subtle">{message.error}</Text>
      </Alert>
    );
  }

  const [visibleText] = useSmoothText(message.content);

  const toolInvocations =
    message.parts?.filter(
      (part): part is Extract<typeof part, { type: "tool-invocation" }> =>
        part.type === "tool-invocation",
    ) || [];

  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        "prose-p:my-2 prose-headings:my-4 prose-blockquote:my-4",
        "prose-a:text-ui-fg-interactive prose-a:no-underline hover:prose-a:underline",
        "prose-ul:my-3 prose-ol:my-3",
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
          p: ({ node, ...props }) => <Text {...props} />,
          pre: CustomCodeBlock,
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
            return <code className={className}>{children}</code>;
          },
        }}
      >
        {visibleText}
      </ReactMarkdown>
    </div>
  );
}
