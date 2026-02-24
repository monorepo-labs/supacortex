"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import type { ChatMessage, ChatAttachment } from "@/hooks/use-chat";
import type { ProviderModel } from "@/hooks/use-opencode";
import { useSessionMessages } from "@/hooks/use-opencode";
import { extractScxRefs, stripScxRefs } from "@/lib/scx-refs";
import { useBookmarksByIds } from "@/hooks/use-bookmark-by-id";
import InlineBookmarkCard from "@/app/components/InlineBookmarkCard";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import {
  ChevronDown,
  Check,
  X,
  FolderOpen,
  FileIcon,
  Bookmark,
  Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BookmarkData } from "@/app/components/BookmarkNode";
import type { ChatStatus, FileUIPart } from "ai";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputTools,
  PromptInputButton,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  ModelSelector,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorInput,
  ModelSelectorList,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorLogo,
  ModelSelectorName,
} from "@/components/ai-elements/model-selector";
import {
  Context,
  ContextTrigger,
  ContextContent,
  ContextContentHeader,
  ContextContentBody,
  ContextContentFooter,
  ContextInputUsage,
  ContextOutputUsage,
} from "@/components/ai-elements/context";

// ── Types ────────────────────────────────────────────────────────

interface ProviderInfo {
  id: string;
  name: string;
  models: ProviderModel[];
}

type SendMessageFn = (
  conversationId: string,
  sessionId: string,
  text: string,
  options?: {
    model?: { providerID: string; modelID: string };
    agent?: string;
    files?: { url: string; mime: string; filename?: string }[];
    directory?: string;
    bookmarkSystem?: string;
  },
) => Promise<string>;

type GetStateFn = (conversationId: string | null) => {
  isSending: boolean;
  isStreaming: boolean;
  streamedText: string;
  tokens: {
    input: number;
    output: number;
    reasoning: number;
    cacheRead: number;
    cacheWrite: number;
    cost: number;
  };
};

// ── Context ──────────────────────────────────────────────────────

interface ChatPanelContextValue {
  connected: boolean;
  connecting: boolean;
  connectionError: string | null;
  isTauri: boolean;
  localMessages: Map<string, ChatMessage[]>;
  setLocalMessages: React.Dispatch<
    React.SetStateAction<Map<string, ChatMessage[]>>
  >;
  conversationDirs: Map<string, string>;
  setConversationDirs: React.Dispatch<
    React.SetStateAction<Map<string, string>>
  >;
  sendMessage: SendMessageFn;
  abort: (conversationId: string) => void;
  getState: GetStateFn;
  markSendComplete: (conversationId: string) => void;
  loadTokens: (conversationId: string, sessionId: string) => void;
  createSession: (
    title?: string,
    directory?: string,
  ) => Promise<{ id: string } | undefined>;
  refetchSessions: () => void;
  providers: ProviderInfo[];
  defaultModel: string | null;
  onOpenBrowser: (url: string) => void;
  onOpenReader: (bookmark: BookmarkData) => void;
  onOpenInNewPanel: (bookmark: BookmarkData) => void;
  selectedBookmarks: BookmarkData[];
  onClearSelectedBookmarks: () => void;
  onRemoveSelectedBookmark: (id: string) => void;
}

const ChatPanelContext = createContext<ChatPanelContextValue | null>(null);

export function ChatPanelProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: ChatPanelContextValue;
}) {
  return (
    <ChatPanelContext.Provider value={value}>
      {children}
    </ChatPanelContext.Provider>
  );
}

function useChatPanelContext() {
  const ctx = useContext(ChatPanelContext);
  if (!ctx)
    throw new Error("ChatPanel must be wrapped in ChatPanelProvider");
  return ctx;
}

// ── ChatPanel Component ──────────────────────────────────────────

export function ChatPanel({
  panelId,
  conversationId,
  widthClass,
  onConversationCreated,
  highlighted,
}: {
  panelId: string;
  conversationId: string | null;
  widthClass: string;
  onConversationCreated: (panelId: string, newConversationId: string) => void;
  highlighted?: boolean;
}) {
  const ctx = useChatPanelContext();
  const chatPanelRef = useRef<HTMLElement>(null);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);

  // Per-panel model selection (initialized from shared localStorage default)
  const [selectedModel, setSelectedModel] = useState<ProviderModel | null>(
    () => {
      if (typeof window === "undefined") return null;
      try {
        const stored = localStorage.getItem("opencode-selected-model");
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    },
  );

  const handleModelSelect = useCallback((model: ProviderModel) => {
    setSelectedModel(model);
    try {
      localStorage.setItem("opencode-selected-model", JSON.stringify(model));
    } catch {
      // ignore
    }
  }, []);

  // Per-panel queue for messages sent while streaming
  const queuesRef = useRef<Map<string, string[]>>(new Map());
  const sendingKeysRef = useRef<Set<string>>(new Set());
  const [queueLength, setQueueLength] = useState(0);
  const [pendingSendTick, setPendingSendTick] = useState(0);

  // Track conversation ID for abort (survives stale closures)
  const activeConvIdRef = useRef<string | null>(conversationId);
  if (conversationId) activeConvIdRef.current = conversationId;

  // Per-conversation streaming state
  const { isSending: hookSending, isStreaming, streamedText, tokens } =
    ctx.getState(conversationId);

  // Derive isSending (hook + local pending)
  void pendingSendTick;
  const pendingSend = sendingKeysRef.current.has(conversationId ?? panelId);
  const isSending = hookSending || pendingSend;

  const chatStatus: ChatStatus = isStreaming
    ? "streaming"
    : isSending
      ? "submitted"
      : "ready";

  // Seed local messages from opencode when switching conversations
  const seededRef = useRef<Set<string>>(new Set());
  const { messages: sessionMessages } = useSessionMessages(
    conversationId,
    ctx.connected,
  );
  useEffect(() => {
    if (!conversationId || !sessionMessages?.length) return;
    if (seededRef.current.has(conversationId)) return;
    seededRef.current.add(conversationId);
    ctx.setLocalMessages((prev) => {
      if (prev.has(conversationId)) return prev;
      const next = new Map(prev);
      next.set(conversationId, [...sessionMessages]);
      return next;
    });
  }, [conversationId, sessionMessages, ctx]);

  // Load token usage on conversation switch
  const tokensLoadedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!conversationId || !ctx.connected) return;
    if (tokensLoadedRef.current.has(conversationId)) return;
    tokensLoadedRef.current.add(conversationId);
    ctx.loadTokens(conversationId, conversationId);
  }, [conversationId, ctx]);

  // Messages for this panel
  const localKey = conversationId ?? panelId;
  const messages = ctx.localMessages.get(localKey) ?? [];

  const addLocalMessage = useCallback(
    (convId: string, msg: ChatMessage) => {
      ctx.setLocalMessages((prev) => {
        const next = new Map(prev);
        next.set(convId, [...(next.get(convId) ?? []), msg]);
        return next;
      });
    },
    [ctx],
  );

  // Core send logic
  const doSend = useCallback(
    async (
      text: string,
      files?: FileUIPart[],
      bookmarks?: BookmarkData[],
      overrideConversationId?: string,
    ): Promise<string | undefined> => {
      let currentConversationId = overrideConversationId ?? conversationId;
      const dir =
        ctx.conversationDirs.get(currentConversationId ?? panelId) ?? undefined;

      if (!currentConversationId) {
        const titleText =
          stripScxRefs(text).slice(0, 50) || "New conversation";
        const session = await ctx.createSession(titleText, dir);
        if (!session) return;
        currentConversationId = session.id;

        // Move local messages from panelId key to the session ID
        ctx.setLocalMessages((prev) => {
          const next = new Map(prev);
          const msgs = next.get(panelId) ?? [];
          next.delete(panelId);
          next.set(
            currentConversationId!,
            msgs.map((m) => ({
              ...m,
              conversationId: currentConversationId!,
            })),
          );
          return next;
        });
        // Move directory
        ctx.setConversationDirs((prev) => {
          const newDir = prev.get(panelId);
          if (!newDir) return prev;
          const next = new Map(prev);
          next.delete(panelId);
          next.set(currentConversationId!, newDir);
          return next;
        });
        seededRef.current.add(currentConversationId);
        activeConvIdRef.current = currentConversationId;

        onConversationCreated(panelId, currentConversationId);
        ctx.refetchSessions();
      }

      const fileParts = files?.map((f) => ({
        url: f.url,
        mime: f.mediaType ?? "application/octet-stream",
        filename: f.filename,
      }));

      let bookmarkSystem: string | undefined;
      if (bookmarks && bookmarks.length > 0) {
        const ids = bookmarks.map((b) => b.id).join(", ");
        bookmarkSystem = `The user has attached ${bookmarks.length} bookmark(s) from their library. Bookmark IDs: ${ids}. Use \`scx bookmarks list --json\` to fetch the full content of these bookmarks when answering.`;
      }

      const responseText = await ctx.sendMessage(
        currentConversationId,
        currentConversationId,
        text,
        {
          model: selectedModel
            ? {
                providerID: selectedModel.providerId,
                modelID: selectedModel.id,
              }
            : undefined,
          agent: "assistant",
          files: fileParts,
          directory: dir,
          bookmarkSystem,
        },
      );

      if (responseText) {
        addLocalMessage(currentConversationId, {
          id: `msg-assistant-${Date.now()}`,
          conversationId: currentConversationId,
          role: "assistant",
          content: responseText,
          createdAt: new Date().toISOString(),
        });
      }

      ctx.markSendComplete(currentConversationId);
      return currentConversationId;
    },
    [conversationId, ctx, addLocalMessage, panelId, onConversationCreated, selectedModel],
  );

  // Process queue
  const processQueue = useCallback(
    async (
      convKey: string,
      text: string,
      files?: FileUIPart[],
      bookmarks?: BookmarkData[],
    ) => {
      sendingKeysRef.current.add(convKey);
      setPendingSendTick((t) => t + 1);

      try {
        const resolvedId = await doSend(text, files, bookmarks);

        const queue = queuesRef.current.get(convKey);
        while (queue && queue.length > 0) {
          const next = queue.shift()!;
          setQueueLength(queue.length);
          const activeConvId = resolvedId ?? convKey;
          addLocalMessage(activeConvId, {
            id: `temp-user-${Date.now()}`,
            conversationId: activeConvId,
            role: "user",
            content: next,
            createdAt: new Date().toISOString(),
          });
          setPendingSendTick((t) => t + 1);
          await doSend(next, undefined, undefined, resolvedId);
        }
      } finally {
        sendingKeysRef.current.delete(convKey);
        queuesRef.current.delete(convKey);
        setPendingSendTick((t) => t + 1);
        setQueueLength(0);
      }
    },
    [doSend, addLocalMessage],
  );

  const handleSend = useCallback(
    (text: string, files?: FileUIPart[], bookmarks?: BookmarkData[]) => {
      if ((!text.trim() && !bookmarks?.length) || !ctx.connected) return;

      const convKey = conversationId ?? panelId;

      if (sendingKeysRef.current.has(convKey)) {
        let queueText = text;
        if (bookmarks?.length) {
          const tkns = bookmarks.map((b) => `scx:${b.id}`).join(" ");
          queueText = queueText.trim() ? `${queueText}\n\n${tkns}` : tkns;
        }
        const queue = queuesRef.current.get(convKey) ?? [];
        queue.push(queueText);
        queuesRef.current.set(convKey, queue);
        setQueueLength(queue.length);
      } else {
        let messageText = text;
        if (bookmarks?.length) {
          const tkns = bookmarks.map((b) => `scx:${b.id}`).join(" ");
          messageText = messageText.trim()
            ? `${messageText}\n\n${tkns}`
            : tkns;
        }

        const fileAttachments = files?.map((f) => ({
          url: f.url,
          filename: f.filename,
          mediaType: f.mediaType,
        }));

        addLocalMessage(convKey, {
          id: `temp-user-${Date.now()}`,
          conversationId: convKey,
          role: "user",
          content: messageText,
          createdAt: new Date().toISOString(),
          attachments: fileAttachments?.length ? fileAttachments : undefined,
        });
        processQueue(convKey, messageText, files, bookmarks);
      }
    },
    [ctx.connected, conversationId, addLocalMessage, processQueue],
  );

  const handleSubmit = useCallback(
    (message: { text: string; files: FileUIPart[] }) => {
      const bookmarks =
        ctx.selectedBookmarks.length > 0
          ? [...ctx.selectedBookmarks]
          : undefined;
      handleSend(
        message.text,
        message.files.length > 0 ? message.files : undefined,
        bookmarks,
      );
      ctx.onClearSelectedBookmarks();
    },
    [handleSend, ctx],
  );

  const clearQueue = useCallback(() => {
    const convKey = conversationId ?? panelId;
    queuesRef.current.delete(convKey);
    setQueueLength(0);
  }, [conversationId, panelId]);

  const handleSelectDirectory = useCallback(async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select working directory",
      });
      if (selected && typeof selected === "string") {
        const key = conversationId ?? panelId;
        ctx.setConversationDirs((prev) => {
          const next = new Map(prev);
          next.set(key, selected);
          return next;
        });
      }
    } catch (err) {
      console.error("[chat] Failed to open directory picker:", err);
    }
  }, [conversationId, ctx]);

  const activeDir =
    ctx.conversationDirs.get(conversationId ?? panelId) ?? null;

  const showThinking = isSending && !streamedText;
  const showStreaming = streamedText && isSending;
  const showToolCallThinking = isSending && !!streamedText && !isStreaming;
  const linkSafetyOff = useMemo(() => ({ enabled: false }), []);

  // Model info
  const defaultModelInfo = ctx.defaultModel
    ? ctx.providers
        .flatMap((p) => p.models)
        .find(
          (m) =>
            m.id === ctx.defaultModel ||
            `${m.providerId}/${m.id}` === ctx.defaultModel,
        )
    : null;
  const activeModelName = selectedModel
    ? selectedModel.name
    : defaultModelInfo
      ? defaultModelInfo.name
      : null;
  const activeModel = selectedModel ?? defaultModelInfo ?? null;
  const contextMaxTokens = activeModel?.contextLimit ?? 200000;
  const usedTokens = tokens.input + tokens.output + tokens.reasoning;

  return (
    <main
      ref={chatPanelRef}
      key={panelId}
      id={`panel-${panelId}`}
      data-chat-links
      className={`relative h-full ${widthClass} shadow-card rounded-xl mx-2 overflow-hidden flex flex-col transition-colors ${highlighted ? "bg-blue-50" : "bg-white"}`}
    >
      <ChatLinkInterceptor
        containerRef={chatPanelRef}
        onOpenBrowser={ctx.onOpenBrowser}
      />

      {/* Messages area */}
      <Conversation className="flex-1">
        {messages.length === 0 && (
          <ConversationEmptyState
            className={`absolute inset-0 z-10 ${isSending ? "opacity-0 transition-opacity duration-150" : "opacity-100 transition-opacity duration-150"}`}
            title="Start a conversation"
            description="Ask questions about your bookmarks, get summaries, or explore connections in your saved content."
          />
        )}
        <ConversationContent
          className="max-w-3xl mx-auto w-full px-4 py-6"
          scrollClassName="[&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
        >
          {messages.length > 0 && (
            <>
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onOpenBookmark={ctx.onOpenReader}
                  onOpenBookmarkInNewPanel={ctx.onOpenInNewPanel}
                />
              ))}
              {showThinking && (
                <div className="flex justify-start py-2">
                  <span className="text-sm bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer bg-gradient-to-r from-zinc-400 via-zinc-200 via-50% to-zinc-400">
                    Thinking...
                  </span>
                </div>
              )}
              {showStreaming && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] text-sm text-zinc-800">
                    <div className="prose prose-sm prose-zinc max-w-none">
                      <Streamdown
                        isAnimating={isStreaming}
                        animated={{ animation: "fadeIn", sep: "word" }}
                        caret={isStreaming ? "block" : undefined}
                        linkSafety={linkSafetyOff}
                      >
                        {streamedText}
                      </Streamdown>
                    </div>
                  </div>
                </div>
              )}
              {showToolCallThinking && (
                <div className="flex justify-start py-2">
                  <span className="text-sm bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer bg-gradient-to-r from-zinc-400 via-zinc-200 via-50% to-zinc-400">
                    Thinking...
                  </span>
                </div>
              )}
            </>
          )}
        </ConversationContent>
        <ConversationScrollButton className="bg-white hover:bg-zinc-50" />
      </Conversation>

      {/* Input area */}
      {ctx.isTauri && (
        <div className="px-4 py-3">
          <div className="max-w-3xl mx-auto">
            {ctx.connecting ? (
              <div className="flex items-center gap-2 text-sm text-zinc-400 py-2">
                <div className="size-3 border-2 border-zinc-300 border-t-transparent rounded-full animate-spin" />
                Connecting to OpenCode...
              </div>
            ) : ctx.connectionError ? (
              <div className="text-sm text-red-500 py-2">
                Failed to connect: {ctx.connectionError}
              </div>
            ) : (
              <TooltipProvider>
                <PromptInput onSubmit={handleSubmit} globalDrop>
                  <AttachmentPreviews />
                  <BookmarkChips
                    bookmarks={ctx.selectedBookmarks}
                    onRemove={ctx.onRemoveSelectedBookmark}
                  />
                  <PromptInputTextarea placeholder="Ask anything..." />
                  <PromptInputFooter>
                    <PromptInputTools>
                      <AttachFileButton />
                      {(() => {
                        const canChange =
                          messages.length === 0 && !isSending;
                        if (activeDir) {
                          return (
                            <span className="inline-flex items-center gap-0.5">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 gap-1.5 text-xs text-muted-foreground"
                                    onClick={
                                      canChange
                                        ? handleSelectDirectory
                                        : undefined
                                    }
                                    disabled={!canChange}
                                  >
                                    <FolderOpen className="size-3.5" />
                                    <span className="max-w-[120px] truncate">
                                      {activeDir.split("/").pop()}
                                    </span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  {activeDir}
                                </TooltipContent>
                              </Tooltip>
                              {canChange && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const key = conversationId ?? panelId;
                                    ctx.setConversationDirs((prev) => {
                                      const next = new Map(prev);
                                      next.delete(key);
                                      return next;
                                    });
                                  }}
                                  className="rounded-full p-0.5 text-muted-foreground hover:bg-zinc-200 transition-colors"
                                >
                                  <X className="size-3" />
                                </button>
                              )}
                            </span>
                          );
                        }
                        if (canChange) {
                          return (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-muted-foreground"
                                  onClick={handleSelectDirectory}
                                >
                                  <FolderOpen className="size-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                Change directory
                              </TooltipContent>
                            </Tooltip>
                          );
                        }
                        return null;
                      })()}
                      <ModelSelector
                        open={modelSelectorOpen}
                        onOpenChange={setModelSelectorOpen}
                      >
                        <ModelSelectorTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1.5 text-xs text-muted-foreground"
                          >
                            {(selectedModel || defaultModelInfo) && (
                              <ModelSelectorLogo
                                provider={
                                  selectedModel?.providerId ??
                                  defaultModelInfo?.providerId ??
                                  ""
                                }
                              />
                            )}
                            <span className="max-w-[140px] truncate">
                              {activeModelName ?? "Loading..."}
                            </span>
                            <ChevronDown className="size-3" />
                          </Button>
                        </ModelSelectorTrigger>
                        <ModelSelectorContent title="Select a model">
                          <ModelSelectorInput placeholder="Search models..." />
                          <ModelSelectorList>
                            <ModelSelectorEmpty>
                              No models found.
                            </ModelSelectorEmpty>
                            {ctx.providers.map((provider) => (
                              <ModelSelectorGroup
                                key={provider.id}
                                heading={provider.name}
                              >
                                {provider.models.map((model) => {
                                  const isSelected =
                                    selectedModel?.id === model.id &&
                                    selectedModel?.providerId ===
                                      provider.id;
                                  return (
                                    <ModelSelectorItem
                                      key={`${provider.id}/${model.id}`}
                                      onSelect={() =>
                                        {
                                          handleModelSelect(model);
                                          setModelSelectorOpen(false);
                                        }
                                      }
                                      className="gap-2"
                                    >
                                      <ModelSelectorLogo
                                        provider={provider.id}
                                      />
                                      <ModelSelectorName>
                                        {model.name}
                                      </ModelSelectorName>
                                      {isSelected && (
                                        <Check className="size-3.5 text-zinc-500 shrink-0" />
                                      )}
                                    </ModelSelectorItem>
                                  );
                                })}
                              </ModelSelectorGroup>
                            ))}
                          </ModelSelectorList>
                        </ModelSelectorContent>
                      </ModelSelector>
                      {queueLength > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <span>{queueLength} queued</span>
                          <button
                            type="button"
                            onClick={clearQueue}
                            className="rounded-full p-0.5 hover:bg-zinc-200 transition-colors"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      )}
                      {usedTokens > 0 && (
                        <Context
                          usedTokens={usedTokens}
                          maxTokens={contextMaxTokens}
                          usage={{
                            inputTokens: tokens.input,
                            outputTokens: tokens.output,
                            reasoningTokens: tokens.reasoning,
                            cachedInputTokens: tokens.cacheRead,
                            totalTokens: usedTokens,
                            inputTokenDetails: {
                              noCacheTokens:
                                tokens.input - tokens.cacheRead,
                              cacheReadTokens: tokens.cacheRead,
                              cacheWriteTokens: tokens.cacheWrite,
                            },
                            outputTokenDetails: {
                              textTokens:
                                tokens.output - tokens.reasoning,
                              reasoningTokens: tokens.reasoning,
                            },
                          }}
                          modelId={activeModel?.id}
                        >
                          <ContextTrigger className="h-7 text-xs" />
                          <ContextContent>
                            <ContextContentHeader />
                            <ContextContentBody>
                              <ContextInputUsage />
                              <ContextOutputUsage />
                            </ContextContentBody>
                            <ContextContentFooter />
                          </ContextContent>
                        </Context>
                      )}
                    </PromptInputTools>
                    <PromptInputSubmit
                      status={chatStatus}
                      onStop={() => {
                        const id =
                          conversationId ?? activeConvIdRef.current;
                        if (id) ctx.abort(id);
                      }}
                    />
                  </PromptInputFooter>
                </PromptInput>
              </TooltipProvider>
            )}
          </div>
        </div>
      )}

      {/* Read-only message view for web */}
      {!ctx.isTauri && conversationId && messages.length > 0 && (
        <div className="border-t border-zinc-100 px-4 py-3">
          <p className="text-center text-xs text-zinc-400">
            Viewing conversation history (read-only)
          </p>
        </div>
      )}
    </main>
  );
}

// ── Helper components (moved from page.tsx) ──────────────────────

function MessageBubble({
  message,
  onOpenBookmark,
  onOpenBookmarkInNewPanel,
}: {
  message: ChatMessage;
  onOpenBookmark: (bookmark: BookmarkData) => void;
  onOpenBookmarkInNewPanel: (bookmark: BookmarkData) => void;
}) {
  const refs = extractScxRefs(message.content);
  const displayText = stripScxRefs(message.content);
  const { data: bookmarkMap, isLoading: bookmarksLoading } =
    useBookmarksByIds(refs);
  const fileAtts =
    message.attachments?.filter(
      (a): a is Extract<ChatAttachment, { url: string }> => "url" in a,
    ) ?? [];

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const linkSafetyOff = useMemo(() => ({ enabled: false }), []);

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] space-y-2">
          {fileAtts.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-end">
              {fileAtts.map((att, i) => (
                <FileAttachmentCard key={i} attachment={att} />
              ))}
            </div>
          )}
          {refs.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-end">
              {refs.map((id) => (
                <InlineBookmarkCard
                  key={id}
                  bookmarkId={id}
                  bookmarkData={bookmarkMap?.[id]}
                  isLoading={bookmarksLoading}
                  onOpen={onOpenBookmark}
                  onOpenInNewPanel={onOpenBookmarkInNewPanel}
                />
              ))}
            </div>
          )}
          {displayText && (
            <div
              className="rounded-2xl rounded-br-md px-4 py-2.5 text-sm text-white"
              style={{ backgroundColor: "#2b8bf2" }}
            >
              {displayText}
            </div>
          )}
        </div>
      </div>
    );
  }

  const assistantText = refs.length > 0 ? displayText : message.content;

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] space-y-2">
        {refs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {refs.map((id) => (
              <InlineBookmarkCard
                key={id}
                bookmarkId={id}
                bookmarkData={bookmarkMap?.[id]}
                isLoading={bookmarksLoading}
                onOpen={onOpenBookmark}
                onOpenInNewPanel={onOpenBookmarkInNewPanel}
              />
            ))}
          </div>
        )}
        <div className="text-sm text-zinc-800">
          <div className="prose prose-sm prose-zinc max-w-none">
            <Streamdown linkSafety={linkSafetyOff}>
              {assistantText}
            </Streamdown>
          </div>
        </div>
      </div>
    </div>
  );
}

function FileAttachmentCard({
  attachment,
}: {
  attachment: Extract<ChatAttachment, { url: string }>;
}) {
  const isImage = attachment.mediaType?.startsWith("image/");

  if (isImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={attachment.url}
        alt={attachment.filename ?? "image"}
        className="max-w-[240px] max-h-[240px] rounded-xl object-cover"
      />
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs">
      <FileIcon className="size-4 text-zinc-400" />
      <div className="min-w-0">
        <p className="truncate font-medium text-zinc-700 max-w-[160px]">
          {attachment.filename ?? "file"}
        </p>
        <p className="text-zinc-400">
          {attachment.mediaType?.split("/").pop() ?? "file"}
        </p>
      </div>
    </div>
  );
}

function AttachFileButton() {
  const attachments = usePromptInputAttachments();
  return (
    <PromptInputButton
      tooltip="Attach files"
      onClick={() => attachments.openFileDialog()}
    >
      <Paperclip className="size-4" />
    </PromptInputButton>
  );
}

function AttachmentPreviews() {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) return null;

  return (
    <PromptInputHeader className="p-2 gap-2">
      {attachments.files.map((file) => {
        const isImage = file.mediaType?.startsWith("image/");
        return (
          <div
            key={file.id}
            className="group relative inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-1.5 pr-3 text-xs"
          >
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={file.url}
                alt={file.filename ?? "attachment"}
                className="size-10 rounded object-cover"
              />
            ) : (
              <div className="flex size-10 items-center justify-center rounded bg-zinc-100">
                <FileIcon className="size-4 text-zinc-400" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-zinc-700 max-w-[120px]">
                {file.filename ?? "file"}
              </p>
              <p className="text-zinc-400">
                {file.mediaType?.split("/").pop() ?? "file"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => attachments.remove(file.id)}
              className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-zinc-800 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="size-3" />
            </button>
          </div>
        );
      })}
    </PromptInputHeader>
  );
}

function BookmarkChips({
  bookmarks,
  onRemove,
}: {
  bookmarks: BookmarkData[];
  onRemove: (id: string) => void;
}) {
  if (bookmarks.length === 0) return null;

  return (
    <PromptInputHeader className="p-2 gap-2">
      {bookmarks.map((b) => {
        const domain = (() => {
          try {
            return new URL(b.url).hostname.replace("www.", "");
          } catch {
            return "";
          }
        })();
        return (
          <div
            key={b.id}
            className="group relative inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs"
          >
            <Bookmark className="size-3.5 text-blue-500 shrink-0" />
            <div className="min-w-0">
              <p className="truncate font-medium text-zinc-700 max-w-[120px]">
                {b.title ?? "Bookmark"}
              </p>
              <p className="text-blue-400 text-[10px]">
                {b.type}
                {domain ? ` · ${domain}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(b.id)}
              className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-blue-600 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="size-3" />
            </button>
          </div>
        );
      })}
    </PromptInputHeader>
  );
}

// ── Chat Link Interceptor ────────────────────────────────────────

function ChatLinkInterceptor({
  containerRef,
  onOpenBrowser,
}: {
  containerRef: React.RefObject<HTMLElement | null>;
  onOpenBrowser: (url: string) => void;
}) {
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    url: string;
  } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const getExternalHref = (e: Event): string | null => {
      const anchor = (e.target as HTMLElement).closest(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (!anchor) return null;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript"))
        return null;
      try {
        const url = new URL(href, window.location.href);
        if (url.origin === window.location.origin) return null;
        return url.href;
      } catch {
        return null;
      }
    };

    const handleClick = (e: MouseEvent) => {
      const href = getExternalHref(e);
      if (!href) return;
      e.preventDefault();
      e.stopPropagation();
      setMenu(null);
      onOpenBrowser(href);
    };

    const handleContextMenu = (e: MouseEvent) => {
      const href = getExternalHref(e);
      if (!href) return;
      e.preventDefault();
      setMenu({ x: e.clientX, y: e.clientY, url: href });
    };

    el.addEventListener("click", handleClick, true);
    el.addEventListener("contextmenu", handleContextMenu, true);
    return () => {
      el.removeEventListener("click", handleClick, true);
      el.removeEventListener("contextmenu", handleContextMenu, true);
    };
  }, [containerRef, onOpenBrowser]);

  useEffect(() => {
    if (!menu) return;
    const handleClose = () => setMenu(null);
    document.addEventListener("click", handleClose);
    return () => document.removeEventListener("click", handleClose);
  }, [menu]);

  if (!menu) return null;

  return (
    <div
      className="fixed z-50 min-w-[200px] rounded-lg border border-zinc-200 bg-white shadow-lg py-1"
      style={{ left: menu.x, top: menu.y }}
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 transition-colors"
        onClick={() => {
          import("@tauri-apps/plugin-shell")
            .then(({ open }) => open(menu.url))
            .catch(console.error);
          setMenu(null);
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-zinc-400"
        >
          <path d="M15 3h6v6" />
          <path d="M10 14 21 3" />
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        </svg>
        Open in external browser
      </button>
    </div>
  );
}
