/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  MODEL_CONFIGS,
  getAvailableModels,
  getDefaultModel,
  type ModelId,
} from "@/lib/models";
import { isGeneratingAtom } from "@/lib/state/chatAtoms";
import { cn } from "@/lib/utils";
import { convexQuery } from "@convex-dev/react-query";
import { useThread } from "@/hooks/use-thread";
import { api } from "@cvx/_generated/api";
import { Id } from "@cvx/_generated/dataModel";
import {
  ArrowDown,
  ArrowPath,
  ArrowUpMini,
  DocumentText,
  // Github,
  PaperClip,
  PlaySolid,
  SquareRedSolid,
  XMark,
} from "@medusajs/icons";
import {
  IconButton,
  Select,
  StatusBadge,
  Text,
  Tooltip,
  toast,
  // Button,
  Prompt,
} from "@medusajs/ui";
import { useQuery } from "@tanstack/react-query";
import { useAction, useMutation } from "convex/react";
import { useAtomValue } from "jotai";
import {
  useCallback,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import TextareaAutosize, {
  type TextareaHeightChangeMeta,
} from "react-textarea-autosize";

const MAX_FILES = 3;
const MAX_IMAGE_SIZE_MB = 2;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const MAX_TEXT_SIZE_KB = 250;
const MAX_TEXT_SIZE_BYTES = MAX_TEXT_SIZE_KB * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

const ALLOWED_TEXT_TYPES = [
  "text/plain",
  "text/markdown",
  "application/json",
  "text/html",
  "text/css",
  "text/javascript",
  "text/csv",
  "text/x-go",
  "application/x-sh",
  "text/x-python",
  "text/x-rust",
  "text/x-zig",
  "text/x-elixir",
  "text/jsx",
  "application/x-typescript",
];

// const ALLOWED_FILE_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_TEXT_TYPES];

// Extension to MIME type mapping for better file type detection
const EXTENSION_TO_MIME: Record<string, string> = {
  txt: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
  json: "application/json",
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  js: "text/javascript",
  jsx: "text/jsx",
  ts: "application/x-typescript",
  tsx: "application/x-typescript",
  py: "text/x-python",
  rs: "text/x-rust",
  go: "text/x-go",
  zig: "text/x-zig",
  ex: "text/x-elixir",
  exs: "text/x-elixir",
  csv: "text/csv",
};

export interface ProcessedFile {
  name: string;
  type: string;
  size: number;
  content?: string; // For text files
  file?: File; // For image files
  lastModified: number;
  isProcessing?: boolean;
  error?: string;
  fileId?: string;
  url?: string;
}

interface ChatPanelProps {
  handleSubmit: (prompt: string, files: ProcessedFile[]) => void;
  onInputHeightChange: (height: number, meta: TextareaHeightChangeMeta) => void;
  showScrollToBottomButton: boolean;
  onScrollToBottom?: () => void;
  threadId: Id<"threads">;
  inputRef?: React.RefObject<HTMLTextAreaElement>;
}

// const SelectGitRepo = () => {
//   const currencies = [
//     {
//       value: "s4m1nd/dotfiles",
//
//       label: "s4m1nd/dotfiles",
//     },
//
//     {
//       value: "s4m1nd/infra",
//
//       label: "s4m1nd/infra",
//     },
//
//     {
//       value: "s4m1nd/persops",
//
//       label: "s4m1nd/persops",
//     },
//   ];
//
//   return (
//     <>
//       <div className="w-52">
//         <Select size="small">
//           <Select.Trigger>
//             <Select.Value placeholder="Select a repository" />
//           </Select.Trigger>
//
//           <Select.Content>
//             {currencies.map((item) => (
//               <Select.Item key={item.value} value={item.value}>
//                 <Text className="flex items-center gap-2 text-xs">
//                   <Github className="bg-white rounded-full" /> {item.label}
//                 </Text>
//               </Select.Item>
//             ))}
//           </Select.Content>
//         </Select>
//       </div>
//     </>
//   );
// };

const SandboxComponent = ({ threadId }: { threadId: Id<"threads"> }) => {
  const getBoxStatus = useAction(api.tavor.getBoxStatus);
  const { data: boxStatusResult, refetch } = useQuery({
    queryKey: ["boxStatus", threadId],
    queryFn: () => getBoxStatus({ threadId }),
    refetchInterval: 10000,
    enabled: !!threadId,
  });

  const startBox = useAction(api.tavor.startTavorBox);
  const stopBox = useAction(api.tavor.stopTavorBox);
  const restartBox = useAction(api.tavor.restartTavorBox);

  const [isMutating, setIsMutating] = useState(false);
  const [showStopPrompt, setShowStopPrompt] = useState(false);

  const handleStart = async () => {
    setIsMutating(true);
    try {
      await startBox({ threadId });
      toast.success("Sandbox starting...");
      await refetch();
    } catch (e: any) {
      toast.error(`Failed to start sandbox: ${e.message}`);
      console.error(e);
    } finally {
      setIsMutating(false);
    }
  };

  const handleStop = async () => {
    setIsMutating(true);
    try {
      await stopBox({ threadId });
      toast.success("Sandbox stopping...");
      await refetch();
    } catch (e: any) {
      toast.error(`Failed to stop sandbox: ${e.message}`);
      console.error(e);
    } finally {
      setIsMutating(false);
    }
  };

  const handleRestart = async () => {
    setIsMutating(true);
    try {
      await restartBox({ threadId });
      toast.success("Sandbox restarting...");
      await refetch();
    } catch (e: any) {
      toast.error(`Failed to restart sandbox: ${e.message}`);
      console.error(e);
    } finally {
      setIsMutating(false);
    }
  };

  const boxStatus = boxStatusResult?.status;
  const isRunning = boxStatus === "running";
  const statusText =
    {
      running: "Container running",
      starting: "Container starting",
      stopping: "Container stopping",
      stopped: "Container stopped",
      off: "Container off",
    }[boxStatus ?? ""] || "Loading...";

  const statusColor =
    {
      running: "green",
      starting: "orange",
      stopping: "orange",
      stopped: "red",
      off: "grey",
    }[boxStatus ?? ""] || "grey";

  return (
    <div className="w-auto size-8 flex p-1 items-center justify-start gap-2">
      <Tooltip content={statusText}>
        <StatusBadge color={statusColor as any}>
          <Text className="text-xs text-ui-fg-muted">{statusText}</Text>
        </StatusBadge>
      </Tooltip>
      <Tooltip content="Restart container">
        <IconButton
          size="xsmall"
          onClick={handleRestart}
          disabled={isMutating || !isRunning}
        >
          <ArrowPath />
        </IconButton>
      </Tooltip>
      <Tooltip content={isRunning ? "Stop container" : "Start container"}>
        <IconButton
          size="xsmall"
          onClick={isRunning ? () => setShowStopPrompt(true) : handleStart}
          disabled={isMutating}
        >
          {isRunning ? <SquareRedSolid /> : <PlaySolid />}
        </IconButton>
      </Tooltip>
      <Prompt open={showStopPrompt} onOpenChange={setShowStopPrompt}>
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>Stop container?</Prompt.Title>
            <Prompt.Description>
              Are you sure you want to stop the running container? This will
              interrupt any ongoing processes.
            </Prompt.Description>
          </Prompt.Header>
          <Prompt.Footer>
            <Prompt.Cancel>Cancel</Prompt.Cancel>
            <Prompt.Action
              onClick={async () => {
                setShowStopPrompt(false);
                await handleStop();
              }}
              disabled={isMutating}
            >
              Stop
            </Prompt.Action>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>
    </div>
  );
};

export function ChatPanel({
  handleSubmit,
  onInputHeightChange,
  showScrollToBottomButton,
  onScrollToBottom,
  threadId,
  inputRef: inputRefProp, // <-- get from props
}: ChatPanelProps) {
  const stopGeneration = useMutation(api.messages.stopGeneration);
  const isGenerating = useAtomValue(isGeneratingAtom);

  const handleStop = useCallback(() => {
    stopGeneration({ threadId });
  }, [stopGeneration, threadId]);

  const uploadFile = useAction(api.chat.uploadFile);
  const inputRef = inputRefProp ?? useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [input, setInput] = useState("");
  // const [showFilePreview, setShowFilePreview] = useState<string | null>(null);

  const { data: user } = useQuery(convexQuery(api.app.getCurrentUser, {}));
  const thread = useThread(threadId);
  const updateUserPreferences = useMutation(api.account.updateUserPreferences);
  const updateThread = useMutation(api.threads.update);

  const userPlan = user?.subscription?.planKey || "free";

  const selectedModelId = (thread?.model ??
    user?.selectedModel ??
    getDefaultModel(userPlan).id) as ModelId;
  const setSelectedModel = useCallback(
    (selectedModel: ModelId) => {
      updateUserPreferences({ selectedModel });
      if (threadId) {
        updateThread({
          threadId,
          patch: { model: selectedModel },
        });
      }
    },
    [updateUserPreferences, updateThread, threadId],
  );

  const availableModels = getAvailableModels(userPlan);
  const modelsByProvider = availableModels.reduce(
    (acc, model) => {
      if (!acc[model.provider]) {
        acc[model.provider] = [];
      }
      acc[model.provider].push(model);
      return acc;
    },
    {} as Record<string, typeof availableModels>,
  );

  // Utility functions for file processing
  const getFileTypeFromExtension = (filename: string): string => {
    const ext = filename.toLowerCase().split(".").pop();
    return ext ? EXTENSION_TO_MIME[ext] || "text/plain" : "text/plain";
  };

  const validateFile = (file: File): { isValid: boolean; reason?: string } => {
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isText =
      ALLOWED_TEXT_TYPES.includes(file.type) ||
      ALLOWED_TEXT_TYPES.includes(getFileTypeFromExtension(file.name));

    if (!isImage && !isText) {
      return {
        isValid: false,
        reason: `File type ${file.type || "unknown"} is not supported.`,
      };
    }

    const modelConfig = MODEL_CONFIGS[selectedModelId];
    const canUseVision = modelConfig.features.includes("images");

    if (isImage) {
      if (!canUseVision) {
        return {
          isValid: false,
          reason: `The selected model (${modelConfig.name}) does not support images.`,
        };
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        return {
          isValid: false,
          reason: `Image file is too large (max ${MAX_IMAGE_SIZE_MB}MB).`,
        };
      }
    } else if (isText) {
      if (file.size > MAX_TEXT_SIZE_BYTES) {
        return {
          isValid: false,
          reason: `Text file is too large (max ${MAX_TEXT_SIZE_KB}KB).`,
        };
      }
    }

    return { isValid: true };
  };

  const handleFileChange = async (newFilesList: FileList | null) => {
    if (!newFilesList) return;

    const newFiles = Array.from(newFilesList);

    if (files.length + newFiles.length > MAX_FILES) {
      toast.error(
        `Cannot add ${newFiles.length} files. You can only attach up to ${MAX_FILES} files.`,
      );
      return;
    }

    const validFiles: File[] = [];
    for (const file of newFiles) {
      const validation = validateFile(file);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        toast.error(`${file.name}: ${validation.reason}`);
      }
    }

    if (validFiles.length === 0) return;

    const processingFiles: ProcessedFile[] = validFiles.map((file) => ({
      name: file.name,
      type: file.type || getFileTypeFromExtension(file.name),
      size: file.size,
      lastModified: file.lastModified,
      isProcessing: true,
    }));

    setFiles((prevFiles) => [...prevFiles, ...processingFiles]);

    await Promise.all(
      validFiles.map(async (file) => {
        try {
          const { fileId, url } = await uploadFile({
            bytes: await file.arrayBuffer(),
            filename: file.name,
            mimeType: file.type,
          });

          const processedFile = {
            name: file.name,
            type: file.type,
            size: file.size,
            file,
            lastModified: file.lastModified,
            fileId,
            url,
          } as ProcessedFile;

          setFiles((prevFiles) =>
            prevFiles.map((f) =>
              f.name === file.name && f.lastModified === file.lastModified
                ? { ...processedFile, isProcessing: false }
                : f,
            ),
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Processing failed";
          toast.error(`Failed to process ${file.name}: ${errorMessage}`);

          setFiles((prevFiles) =>
            prevFiles.map((f) =>
              f.name === file.name && f.lastModified === file.lastModified
                ? { ...f, error: errorMessage }
                : f,
            ),
          );
        }
      }),
    );
  };

  const removeFile = (fileToRemove: ProcessedFile) => {
    setFiles((prevFiles) =>
      prevFiles.filter(
        (file) =>
          !(
            file.name === fileToRemove.name &&
            file.lastModified === fileToRemove.lastModified
          ),
      ),
    );
    /* if (showFilePreview === `${fileToRemove.name}-${fileToRemove.lastModified}`) {
      setShowFilePreview(null);
    } */
  };

  /* const toggleFilePreview = (file: ProcessedFile) => {
    const fileKey = `${file.name}-${file.lastModified}`;
    setShowFilePreview(showFilePreview === fileKey ? null : fileKey);
  }; */

  const formSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isGenerating) {
      toast.error("Please wait for the current response to finish.");
      return;
    }
    if (input.trim() === "" && files.length === 0) return;

    // Filter out files with errors and processing files
    const validFiles = files.filter(
      (file) => !file.error && !file.isProcessing,
    );

    if (files.some((file) => file.isProcessing)) {
      toast.warning("Please wait for all files to finish processing.");
      return;
    }

    if (files.some((file) => file.error)) {
      toast.error("Please remove files with errors before submitting.");
      return;
    }

    handleSubmit(input, validFiles);
    setInput("");
    setFiles([]);
    // setShowFilePreview(null);
  };

  const handleDragEvents = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    handleDragEvents(e);
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    handleDragEvents(e);
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    handleDragEvents(e);
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const handleScrollToBottom = () => {
    onScrollToBottom?.();
  };

  const getFileIcon = (file: ProcessedFile) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return null; // We could add an image icon here
    }
    return <DocumentText className="w-4 h-4" />;
  };

  const getFileStatusColor = (file: ProcessedFile) => {
    if (file.isProcessing) return "text-ui-fg-muted";
    if (file.error) return "text-red-400";
    return "text-ui-fg-subtle";
  };

  return (
    <div
      className={cn(
        "bg-ui-bg-field-component-hover w-full group/form-container absolute bottom-0 z-0 px-2 pb-2",
      )}
      onDrop={handleDrop}
      onDragOver={handleDragEvents}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    >
      <form
        onSubmit={formSubmit}
        className={cn("max-w-3xl w-full mx-auto relative")}
      >
        {isDragging && (
          <div className="absolute inset-0 bg-ui-bg-interactive/10 border-2 border-dashed border-ui-border-interactive rounded-2xl flex items-center justify-center z-50">
            <p className="text-ui-fg-interactive font-medium">
              Drop files here
            </p>
          </div>
        )}

        {showScrollToBottomButton && (
          <div className="absolute -top-10 right-0.5 z-20 size-8 w-full flex items-end justify-end">
            <Tooltip content="Scroll to bottom">
              <IconButton variant="transparent" onClick={handleScrollToBottom}>
                <ArrowDown />
              </IconButton>
            </Tooltip>
          </div>
        )}
        {threadId && (
          <div className="absolute -top-12 left-0.5 w-auto flex p-1 items-center justify-start bg-ui-bg-field-component rounded-lg gap-2 border border-ui-tag-neutral-border shadow-md backdrop-blur-sm z-20">
            <SandboxComponent threadId={threadId} />
            {/* <SelectGitRepo /> */}
          </div>
        )}

        <div className="flex p-1 rounded-2xl bg-ui-bg-field-component-hover border border-ui-border-base">
          <div className="relative flex flex-col w-full gap-2 bg-ui-bg-field-component rounded-xl border border-ui-border-base z-10">
            {files.length > 0 && (
              <div className="p-3 border-b border-ui-border-base">
                <div className="flex flex-col gap-2">
                  {files.map((file) => {
                    const fileKey = `${file.name}-${file.lastModified}`;
                    // const isPreviewOpen = showFilePreview === fileKey;

                    return (
                      <div key={fileKey} className="space-y-2">
                        <div className="flex items-center gap-2 bg-ui-bg-base-pressed rounded-lg pl-3 pr-2 py-1.5 text-sm">
                          {getFileIcon(file)}
                          <span
                            className={cn(
                              "max-w-xs truncate",
                              getFileStatusColor(file),
                            )}
                          >
                            {file.name}
                            {file.isProcessing && " (processing...)"}
                            {file.error && " (error)"}
                          </span>
                          <div className="flex items-center gap-1 ml-auto">
                            {/* {file.content && !file.error && (
                              <Tooltip content={isPreviewOpen ? "Hide preview" : "Show preview"}>
                                <IconButton
                                  size="small"
                                  variant="transparent"
                                  onClick={() => toggleFilePreview(file)}
                                >
                                  <Eye className="w-4 h-4" />
                                </IconButton>
                              </Tooltip>
                            )} */}
                            <IconButton
                              size="small"
                              variant="transparent"
                              onClick={() => removeFile(file)}
                            >
                              <XMark />
                            </IconButton>
                          </div>
                        </div>

                        {/* {isPreviewOpen && file.content && (
                          <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-3 text-xs">
                            <div className="text-ui-fg-muted mb-2 font-medium">Preview:</div>
                            <pre className="whitespace-pre-wrap text-ui-fg-subtle max-h-32 overflow-y-auto">
                              {file.content.length > 500
                                ? file.content.substring(0, 500) + "..."
                                : file.content}
                            </pre>
                          </div>
                        )} */}

                        {file.error && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-600">
                            Error: {file.error}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <TextareaAutosize
              onHeightChange={onInputHeightChange}
              ref={inputRef}
              name="input"
              rows={2}
              tabIndex={0}
              placeholder="Ask a question..."
              spellCheck={false}
              value={input}
              className="resize-none w-full min-h-12 bg-transparent border-0 p-4 text-base placeholder:text-ui-fg-muted focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 text-ui-fg-base max-h-64"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  if (input.trim().length === 0 && files.length === 0) {
                    e.preventDefault();
                    return;
                  }
                  e.preventDefault();
                  const textarea = e.target as HTMLTextAreaElement;
                  textarea.form?.requestSubmit();
                }
              }}
            />

            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-2">
                <Tooltip content="Attach files">
                  <IconButton
                    type="button"
                    variant="transparent"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isGenerating} // Disable when streaming
                  >
                    <PaperClip className="text-ui-fg-muted" />
                  </IconButton>
                </Tooltip>
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  // accept={ALLOWED_FILE_TYPES.join(",")}
                  onChange={(e) => handleFileChange(e.target.files)}
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedModelId}
                    onValueChange={(value) =>
                      setSelectedModel(value as ModelId)
                    }
                  >
                    <Select.Trigger className="w-48 bg-ui-bg-field border-ui-border-base">
                      <Select.Value placeholder="Select a model" />
                    </Select.Trigger>
                    <Select.Content className="bg-ui-bg-component border-ui-border-base max-h-80">
                      {Object.entries(modelsByProvider).map(
                        ([provider, models]) => (
                          <Select.Group key={provider}>
                            <Select.Label className="text-ui-fg-muted">
                              {provider}
                            </Select.Label>
                            {models.map((model) => (
                              <Select.Item
                                key={model.id}
                                value={model.id}
                                className="text-ui-fg-base hover:bg-ui-bg-component-hover"
                              >
                                {model.name}
                              </Select.Item>
                            ))}
                          </Select.Group>
                        ),
                      )}
                    </Select.Content>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isGenerating ? (
                  <IconButton type="button" onClick={handleStop} className="">
                    <SquareRedSolid />
                  </IconButton>
                ) : (
                  <IconButton
                    type={isGenerating ? "button" : "submit"}
                    className={cn(
                      isGenerating && "animate-pulse",
                      input.length === 0 &&
                        files.length === 0 &&
                        !isGenerating &&
                        "",
                    )}
                    disabled={
                      (input.length === 0 && files.length === 0) ||
                      isGenerating ||
                      files.some((file) => file.isProcessing || file.error)
                    }
                  >
                    {isGenerating ? <SquareRedSolid /> : <ArrowUpMini />}
                  </IconButton>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
