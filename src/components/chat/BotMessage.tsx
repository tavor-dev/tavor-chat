import { cn } from "@/lib/utils";
import {
  CheckCircleSolid,
  ChevronDownMini,
  ChevronUpMini,
  CommandLine,
  ExclamationCircleSolid,
  Spinner,
  ArrowPath,
  ComputerDesktop,
  LightBulb,
  Link,
} from "@medusajs/icons";
import { Smartphone, Share } from "lucide-react";
import { Alert, Text, Button, Copy, Tooltip } from "@medusajs/ui";
import React, { memo, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { UIMessageWithFiles } from "./Chat";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useAtom } from "jotai";
import { reasoningStatusFamily, toolStatusFamily } from "@/lib/state/chatAtoms";

/**
 * A custom component that uses react-syntax-highlighter.
 * This is used as the override for the `<pre>` tag in ReactMarkdown.
 */
const CustomCodeBlock = memo(
  ({
    node,
    className,
    children,
    ...props
  }: React.HTMLAttributes<HTMLPreElement> & { node?: unknown }) => {
    const codeElement = React.Children.only(children) as React.ReactElement<{
      className?: string;
      children: React.ReactNode;
    }>;

    const { className: codeClassName, children: codeContent } =
      codeElement.props;

    const match = /language-(\w+)/.exec(codeClassName || "");
    const language = match ? match[1] : "text";
    const codeText = String(codeContent).replace(/\n$/, "");

    const handleCopy = () => {
      navigator.clipboard.writeText(codeText);
    };

    return (
      <div className="not-prose my-4 rounded-lg overflow-hidden border border-ui-border-base">
        <div className="flex items-center justify-between px-4 py-2 bg-ui-bg-component-hover">
          <Text size="small" className="text-ui-fg-muted">
            {language}
          </Text>
          <Tooltip content="Copy code">
            <Button
              variant="transparent"
              size="small"
              onClick={handleCopy}
              className="p-1 h-8 w-8"
            >
              <Copy content={codeText} />
            </Button>
          </Tooltip>
        </div>
        <SyntaxHighlighter
          {...props}
          style={vscDarkPlus}
          language={language}
          PreTag="div"
        >
          {codeText}
        </SyntaxHighlighter>
      </div>
    );
  },
);
CustomCodeBlock.displayName = "CustomCodeBlock";

const ToolStatus = memo(
  ({
    part,
    messageId,
    partId,
  }: {
    part: Extract<UIMessageWithFiles["parts"][0], { type: "tool-invocation" }>;
    messageId: string;
    partId: number;
  }) => {
    // Create a unique ID for this tool invocation
    const toolId = `${messageId}-${partId}`;
    const [isExpanded, setIsExpanded] = useAtom(toolStatusFamily(toolId));

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
            "rounded-xl border transition-all duration-200",
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
            <div className="border-t border-ui-border-base p-4">
              <div className="space-y-4">
                <div className="bg-ui-bg-base-pressed rounded-lg overflow-hidden border border-ui-border-base">
                  <div className="px-4 py-2 bg-ui-bg-subtle text-sm font-semibold">
                    Command
                  </div>
                  <SyntaxHighlighter
                    language="bash"
                    style={vscDarkPlus}
                    PreTag="div"
                  >
                    {String(command).trim()}
                  </SyntaxHighlighter>
                </div>

                <div className="bg-ui-bg-base-pressed rounded-lg overflow-hidden border border-ui-border-base">
                  <div className="px-4 py-2 bg-ui-bg-subtle text-sm font-semibold">
                    Output
                  </div>
                  <SyntaxHighlighter
                    language="json"
                    style={vscDarkPlus}
                    PreTag="div"
                  >
                    {prettyPrintJson(invocation.result)}
                  </SyntaxHighlighter>
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

// Enhanced ReactMarkdown component with URL detection and navigation
const EnhancedMarkdown = memo(({ content }: { content: string }) => {
  const currentUrlIndex = useState(0);
  const visibleText = content;

  const urlRegex = /https:\/\/\d+-[a-f0-9-]+\.tavor\.app?/g;
  const urls = visibleText.match(urlRegex) || [];

  const uniqueUrls = [...new Set(urls)];

  return (
    <>
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

      {uniqueUrls.length > 0 && (
        <URLPreviewWithNavigation
          urls={uniqueUrls}
          currentIndex={currentUrlIndex[0]}
        />
      )}
    </>
  );
});
EnhancedMarkdown.displayName = "EnhancedMarkdown";

// URL Preview Component with proper navigation handling
const URLPreviewWithNavigation = memo(
  ({ urls, currentIndex }: { urls: string[]; currentIndex: number }) => {
    const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
    const [key, setKey] = useState(0);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const currentUrl = urls[currentIndex];

    const handleRefresh = () => {
      setKey((prev) => prev + 1);
    };

    const handleOpenInNewTab = () => {
      window.open(currentUrl, "_blank");
    };

    const getIframeWidth = () => {
      return viewMode === "mobile" ? "w-80" : "w-full";
    };

    return (
      <div className="not-prose my-6">
        <div className="rounded-xl border border-ui-border-base bg-ui-bg-base shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-ui-border-base bg-ui-bg-subtle">
            <div className="flex items-center gap-2"></div>

            <div className="flex items-center gap-1">
              <Copy content={currentUrl}>
                <Button
                  variant="transparent"
                  size="small"
                  className="p-1 h-8 w-8"
                >
                  <Link className="h-4 w-4" />
                </Button>
              </Copy>
              <Tooltip content="Open link in a new tab">
                <Button
                  variant="transparent"
                  size="small"
                  onClick={handleOpenInNewTab}
                  className="p-1 h-8 w-8"
                >
                  <Share className="h-4 w-4" />
                </Button>
              </Tooltip>
              <Tooltip content="Refresh">
                <Button
                  variant="transparent"
                  size="small"
                  onClick={handleRefresh}
                  className="p-1 h-8 w-8"
                >
                  <ArrowPath className="h-4 w-4" />
                </Button>
              </Tooltip>
              <Tooltip content="Mobile view">
                <Button
                  variant={viewMode === "mobile" ? "primary" : "transparent"}
                  size="small"
                  onClick={() => setViewMode("mobile")}
                  className="p-1 h-8 w-8"
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
              </Tooltip>
              <Tooltip content="Desktop view">
                <Button
                  variant={viewMode === "desktop" ? "primary" : "transparent"}
                  size="small"
                  onClick={() => setViewMode("desktop")}
                  className="p-1 h-8 w-8"
                >
                  <ComputerDesktop className="h-4 w-4" />
                </Button>
              </Tooltip>
            </div>
          </div>

          {/* Iframe Container */}
          <div className="bg-ui-bg-base">
            <div
              className={cn(
                "mx-auto transition-all duration-300 ease-in-out",
                getIframeWidth(),
              )}
            >
              <iframe
                key={`${key}-${currentIndex}`}
                ref={iframeRef}
                src={currentUrl}
                className="w-full h-[40rem] rounded-lg"
                title="URL Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              />
            </div>
          </div>
        </div>
      </div>
    );
  },
);
URLPreviewWithNavigation.displayName = "URLPreviewWithNavigation";

const ReasoningStatus = memo(
  ({
    part,
    messageId,
    partId,
  }: {
    part: Extract<UIMessageWithFiles["parts"][0], { type: "reasoning" }>;
    messageId: string;
    partId: number;
  }) => {
    const reasoningId = `${messageId}-${partId}`;
    const [isExpanded, setIsExpanded] = useAtom(
      reasoningStatusFamily(reasoningId),
    );
    const reasoning = part.reasoning;

    if (!reasoning?.trim()) return null;

    return (
      <div className="not-prose my-6">
        <div
          className={cn(
            "rounded-xl border transition-all duration-200",
            "border-ui-border-base bg-ui-bg-subtle hover:bg-ui-bg-base",
            "shadow-sm",
          )}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 p-5 cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex-shrink-0">
              <LightBulb className="h-5 w-5 text-ui-fg-interactive" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base font-medium text-ui-fg-interactive">
                  Reasoning
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-ui-fg-muted">
                  See the thinking process
                </span>
              </div>
            </div>

            <div className="flex-shrink-0">
              {isExpanded ? (
                <ChevronUpMini className="h-5 w-5 text-ui-fg-muted" />
              ) : (
                <ChevronDownMini className="h-5 w-5 text-ui-fg-muted" />
              )}
            </div>
          </div>

          {/* Expandable Reasoning Content */}
          {isExpanded && (
            <div className="border-t border-ui-border-base">
              <div className="p-5 pt-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="rounded-lg p-0">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ node, ...props }) => (
                          <Text
                            className="text-ui-fg-base mb-3 last:mb-0"
                            {...props}
                          />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul
                            className="list-disc list-inside space-y-1 text-ui-fg-base"
                            {...props}
                          />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol
                            className="list-decimal list-inside space-y-1 text-ui-fg-base"
                            {...props}
                          />
                        ),
                        li: ({ node, ...props }) => (
                          <li className="text-ui-fg-base" {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                          <strong
                            className="font-semibold text-ui-fg-base"
                            {...props}
                          />
                        ),
                        em: ({ node, ...props }) => (
                          <em className="italic text-ui-fg-base" {...props} />
                        ),
                        code: ({ node, className, children, ...props }) => {
                          const inline = !className?.includes("language-");
                          if (inline) {
                            return (
                              <code
                                {...props}
                                className="rounded bg-ui-bg-base-pressed px-2 py-1 font-mono text-sm text-ui-fg-subtle"
                              >
                                {children}
                              </code>
                            );
                          }
                          return <code className={className}>{children}</code>;
                        },
                      }}
                    >
                      {reasoning}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
);
ReasoningStatus.displayName = "ReasoningStatus";

// --- Main BotMessage Component ---

function prettyPrintJson(data: unknown) {
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return data.trim();
    }
  }
  if (typeof data === "object" && data !== null) {
    return JSON.stringify(data, null, 2);
  }
  return String(data).trim();
}

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
    return <Alert variant="error">An error occurred {message.error}</Alert>;
  }

  // If there are parts, render them in order
  if (message.parts && message.parts.length > 0) {
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
        {message.parts.map((part, index) => {
          if (part.type === "tool-invocation") {
            return (
              <ToolStatus
                key={`part-${index}`}
                part={part}
                messageId={message.key}
                partId={index}
              />
            );
          } else if (part.type === "text") {
            return (
              <EnhancedMarkdown key={`part-${index}`} content={part.text} />
            );
          } else if (part.type === "reasoning") {
            return (
              <ReasoningStatus
                key={`part-${index}`}
                part={part}
                messageId={message.key}
                partId={index}
              />
            );
          }
          return null;
        })}
      </div>
    );
  }

  // Fallback to rendering the message content if no parts
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
      <EnhancedMarkdown content={message.content} />
    </div>
  );
}
