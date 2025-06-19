import { cn } from "@/lib/utils";
import { useSmoothText as useSmoothTextHook } from "@convex-dev/agent/react";
import {
  CheckCircleSolid,
  ChevronDownMini,
  ChevronUpMini,
  CommandLine,
  ExclamationCircleSolid,
  Spinner,
  ArrowPath,
  ComputerDesktop,
} from "@medusajs/icons";
import { Smartphone, ChevronLeft, ChevronRight, Share } from "lucide-react";
import { Alert, CodeBlock, Text, Button } from "@medusajs/ui";
import React, { memo, useState, useRef } from "react";
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
                <div className="rounded-md overflow-hidden flex flex-col gap-4">
                  <CodeBlock
                    snippets={[
                      {
                        language: "bash",
                        label: "Command",
                        code: String(command).trim(),
                        hideLineNumbers: true,
                      },
                    ]}
                  >
                    <CodeBlock.Body />
                  </CodeBlock>
                  <CodeBlock
                    snippets={[
                      {
                        language: "json",
                        label: "Output",
                        code: prettyPrintJson(invocation.result),
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

// URL Preview Component with Navigation
const URLPreview = memo(
  ({
    url,
    urls,
    currentIndex,
  }: {
    url: string;
    urls: string[];
    currentIndex: number;
  }) => {
    const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
    const [key, setKey] = useState(0);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const handleRefresh = () => {
      setKey((prev) => prev + 1);
    };

    const handleOpenInNewTab = () => {
      window.open(url, "_blank");
    };

    const getIframeWidth = () => {
      return viewMode === "mobile" ? "w-80" : "w-full";
    };

    const canNavigate = urls.length > 1;

    return (
      <div className="not-prose my-6">
        <div className="rounded-lg border border-ui-border-base bg-ui-bg-base shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-ui-border-base bg-ui-bg-subtle">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-ui-tag-red-icon"></div>
              <div className="w-3 h-3 rounded-full bg-ui-tag-orange-icon"></div>
              <div className="w-3 h-3 rounded-full bg-ui-tag-green-icon"></div>
              <div className="ml-2 px-3 py-1 bg-ui-bg-base rounded-md">
                <Text className="text-xs text-ui-fg-subtle font-mono truncate max-w-xs">
                  {url}
                </Text>
              </div>
              {canNavigate && (
                <div className="ml-2 px-2 py-1 bg-ui-bg-base-pressed rounded-md">
                  <Text className="text-xs text-ui-fg-muted">
                    {currentIndex + 1} of {urls.length}
                  </Text>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              {canNavigate && (
                <>
                  <Button
                    variant="transparent"
                    size="small"
                    onClick={() => {
                      // This would need to be handled by parent component
                      // For now, just a placeholder
                    }}
                    disabled={currentIndex === 0}
                    className="p-1 h-8 w-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="transparent"
                    size="small"
                    onClick={() => {
                      // This would need to be handled by parent component
                      // For now, just a placeholder
                    }}
                    disabled={currentIndex === urls.length - 1}
                    className="p-1 h-8 w-8"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button
                variant="transparent"
                size="small"
                onClick={handleRefresh}
                className="p-1 h-8 w-8"
              >
                <ArrowPath className="h-4 w-4" />
              </Button>
              <Button
                variant="transparent"
                size="small"
                onClick={handleOpenInNewTab}
                className="p-1 h-8 w-8"
              >
                <Share className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "mobile" ? "primary" : "transparent"}
                size="small"
                onClick={() => setViewMode("mobile")}
                className="p-1 h-8 w-8"
              >
                <Smartphone className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "desktop" ? "primary" : "transparent"}
                size="small"
                onClick={() => setViewMode("desktop")}
                className="p-1 h-8 w-8"
              >
                <ComputerDesktop className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Iframe Container */}
          <div className="p-4 bg-ui-bg-base">
            <div
              className={cn(
                "mx-auto transition-all duration-300 ease-in-out",
                getIframeWidth(),
              )}
            >
              <iframe
                key={key}
                ref={iframeRef}
                src={url}
                className="w-full h-96 rounded-lg border border-ui-border-base"
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
URLPreview.displayName = "URLPreview";

// Enhanced ReactMarkdown component with URL detection and navigation
const EnhancedMarkdown = memo(
  ({
    content,
    useSmoothText = false,
  }: {
    content: string;
    useSmoothText?: boolean;
  }) => {
    const currentUrlIndex = useState(0);
    const [visibleText] = useSmoothText
      ? useSmoothTextHook(content)
      : [content];

    // Regex to match the specific URL pattern (extract unique URLs)
    const urlRegex = /https:\/\/\d+-[a-f0-9-]+\.tavor\.app?/g;
    const urls = visibleText.match(urlRegex) || [];

    // Get unique URLs to avoid duplicates
    const uniqueUrls = [...new Set(urls)];

    return (
      <>
        {/* Render the full markdown content as-is */}
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

        {/* Add URL preview for the current selected URL */}
        {uniqueUrls.length > 0 && (
          <URLPreviewWithNavigation
            urls={uniqueUrls}
            currentIndex={currentUrlIndex[0]}
          />
        )}
      </>
    );
  },
);
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

    // const canNavigate = urls.length > 1;

    return (
      <div className="not-prose my-6">
        <div className="rounded-xl border border-ui-border-base bg-ui-bg-base shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-ui-border-base bg-ui-bg-subtle">
            <div className="flex items-center gap-2">
              {/* <div className="w-3 h-3 rounded-full bg-ui-tag-red-icon"></div> */}
              {/* <div className="w-3 h-3 rounded-full bg-ui-tag-orange-icon"></div> */}
              {/* <div className="w-3 h-3 rounded-full bg-ui-tag-green-icon"></div> */}
              <div className="ml-2 px-3 py-1 bg-ui-bg-base rounded-md">
                <Text className="text-xs text-ui-fg-subtle font-mono truncate max-w-xs">
                  {currentUrl}
                </Text>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="transparent"
                size="small"
                onClick={handleOpenInNewTab}
                className="p-1 h-8 w-8"
              >
                <Share className="h-4 w-4" />
              </Button>
              <Button
                variant="transparent"
                size="small"
                onClick={handleRefresh}
                className="p-1 h-8 w-8"
              >
                <ArrowPath className="h-4 w-4" />
              </Button>

              <Button
                variant={viewMode === "mobile" ? "primary" : "transparent"}
                size="small"
                onClick={() => setViewMode("mobile")}
                className="p-1 h-8 w-8"
              >
                <Smartphone className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "desktop" ? "primary" : "transparent"}
                size="small"
                onClick={() => setViewMode("desktop")}
                className="p-1 h-8 w-8"
              >
                <ComputerDesktop className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Iframe Container */}
          <div className="p-4 bg-ui-bg-base">
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
                className="w-full h-96 rounded-lg border border-ui-border-base"
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

// --- Main BotMessage Component ---

function prettyPrintJson(data: unknown) {
  if (typeof data === "string") {
    try {
      // Try to parse the string as JSON
      const parsed = JSON.parse(data);
      // If parsing succeeds, pretty-print it
      return JSON.stringify(parsed, null, 2);
    } catch {
      // If parsing fails, just return the original string
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
            return <ToolStatus key={`part-${index}`} part={part} />;
          } else if (part.type === "reasoning") {
            return (
              <EnhancedMarkdown
                key={`part-${index}`}
                content={part.reasoning}
                useSmoothText={true}
              />
            );
          } else if (part.type === "text") {
            return (
              <EnhancedMarkdown
                key={`part-${index}`}
                content={part.text}
                useSmoothText={true}
              />
            );
          }
          return null;
        })}
      </div>
    );
  }

  // Fallback to rendering the message content if no parts
  const [visibleText] = useSmoothTextHook(message.content);
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
      <EnhancedMarkdown content={visibleText} />
    </div>
  );
}
