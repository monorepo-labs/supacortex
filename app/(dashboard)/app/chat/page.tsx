"use client";

import { Suspense, useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import { useIsTauri } from "@/hooks/use-tauri";
import { useQueryClient } from "@tanstack/react-query";
import {
  useConversations,
  useMessages,
  useCreateConversation,
  useUpdateConversation,
  useSaveMessage,
  type ChatMessage,
  type ChatAttachment,
} from "@/hooks/use-chat";
import {
  useOpenCode,
  useCreateSession,
  useSendMessage,
  useProviders,
  type ProviderModel,
} from "@/hooks/use-opencode";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import { Monitor, ChevronDown, Check, X, FolderOpen, FileIcon, Bookmark, PanelRight, ExternalLink, MousePointerClick } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import BookmarkPickerPanel from "@/app/components/BookmarkPickerPanel";
import ReadersContainer from "@/app/components/ReadersContainer";
import type { BookmarkData } from "@/app/components/BookmarkNode";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
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
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionAddAttachments,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
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
import { Button } from "@/components/ui/button";

export default function ChatPage() {
  return (
    <Suspense>
      <ChatPageContent />
    </Suspense>
  );
}

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = searchParams.get("id");

  const isTauri = useIsTauri();
  const { connected, connecting, error: connectionError } = useOpenCode();
  const { create: createSession } = useCreateSession();
  const {
    send: sendMessage,
    abort,
    getState,
    markSendComplete,
    loadTokens,
  } = useSendMessage();
  const { providers, defaultModel } = useProviders(connected);

  const { data: conversations } = useConversations();
  const { data: dbMessages } = useMessages(conversationId);
  const { mutateAsync: createConversation } = useCreateConversation();
  const { mutate: updateConversation } = useUpdateConversation();
  const { mutateAsync: saveMessage } = useSaveMessage();

  const [userCollapsedOverride, setUserCollapsedOverride] = useState<boolean | null>(null);
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
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);

  // Local-first messages: keyed by conversationId, "new" for unsaved convos
  // This is the source of truth for the active session. DB is only for loading old convos.
  const [localMessages, setLocalMessages] = useState<
    Map<string, ChatMessage[]>
  >(new Map());

  // Force re-render trigger for pending send state
  const [pendingSendTick, setPendingSendTick] = useState(0);

  // Per-conversation directory (for folder selector)
  const [conversationDirs, setConversationDirs] = useState<Map<string, string>>(new Map());
  const activeDir = conversationDirs.get(conversationId ?? "new") ?? null;

  // Bookmark picker state
  const [selectedBookmarks, setSelectedBookmarks] = useState<BookmarkData[]>([]);
  const [bookmarkPickerOpen, setBookmarkPickerOpen] = useState(false);
  const [chatHidden, setChatHidden] = useState(false);

  const handleToggleBookmark = useCallback((bookmark: BookmarkData) => {
    setSelectedBookmarks((prev) => {
      const exists = prev.some((b) => b.id === bookmark.id);
      return exists ? prev.filter((b) => b.id !== bookmark.id) : [...prev, bookmark];
    });
  }, []);

  // Reader panels for bookmark attachments (same pattern as library page)
  const [openReaders, setOpenReaders] = useState<BookmarkData[]>([]);

  const handleOpenReader = useCallback((bookmark: BookmarkData) => {
    setOpenReaders((prev) => {
      if (prev.length === 0) return [bookmark];
      const next = [...prev];
      next[next.length - 1] = bookmark;
      return next;
    });
  }, []);

  const handleOpenInNewPanel = useCallback((bookmark: BookmarkData) => {
    setOpenReaders((prev) => {
      if (prev.some((r) => r.id === bookmark.id)) return prev;
      return [...prev, bookmark];
    });
  }, []);

  const handleCloseReader = useCallback((id: string) => {
    setOpenReaders((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleReorderReaders = useCallback((fromIndex: number, toIndex: number) => {
    setOpenReaders((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  // Auto-collapse sidebar when 2+ readers are open
  const autoCollapsed = openReaders.length >= 2;
  const sidebarCollapsed = userCollapsedOverride ?? autoCollapsed;

  useEffect(() => {
    if (openReaders.length === 0) {
      setUserCollapsedOverride(null);
    }
  }, [openReaders.length]);

  // Seed directory from DB conversation
  useEffect(() => {
    if (!conversationId || !conversations) return;
    const conv = conversations.find((c) => c.id === conversationId);
    if (conv?.directory && !conversationDirs.has(conversationId)) {
      setConversationDirs((prev) => {
        const next = new Map(prev);
        next.set(conversationId, conv.directory!);
        return next;
      });
    }
  }, [conversationId, conversations, conversationDirs]);

  // Per-conversation streaming state (isSending derived below after sendingKeysRef)
  const { isSending: hookSending, isStreaming, streamedText, tokens } = getState(conversationId);

  // Seed local messages from DB when switching to a conversation we don't have locally
  const seededRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!conversationId || !dbMessages?.length) return;
    if (seededRef.current.has(conversationId)) return;
    seededRef.current.add(conversationId);
    setLocalMessages((prev) => {
      if (prev.has(conversationId)) return prev;
      const next = new Map(prev);
      next.set(conversationId, [...dbMessages]);
      return next;
    });
  }, [conversationId, dbMessages]);

  // Load token usage from session on conversation switch (survives page reload)
  const tokensLoadedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!conversationId || !connected || !conversations) return;
    if (tokensLoadedRef.current.has(conversationId)) return;
    const conv = conversations.find((c) => c.id === conversationId);
    if (!conv?.sessionId) return;
    tokensLoadedRef.current.add(conversationId);
    loadTokens(conversationId, conv.sessionId);
  }, [conversationId, connected, conversations, loadTokens]);

  // Messages for the active conversation
  const localKey = conversationId ?? "new";
  const messages = localMessages.get(localKey) ?? [];

  const addLocalMessage = useCallback(
    (convId: string, msg: ChatMessage) => {
      setLocalMessages((prev) => {
        const next = new Map(prev);
        next.set(convId, [...(next.get(convId) ?? []), msg]);
        return next;
      });
    },
    [],
  );

  // Per-conversation queue for messages sent while streaming is active
  const queuesRef = useRef<Map<string, string[]>>(new Map());
  const sendingKeysRef = useRef<Set<string>>(new Set());
  const [queueLength, setQueueLength] = useState(0);

  // Derive isSending for current conversation (uses sendingKeysRef + pendingSendTick for reactivity)
  void pendingSendTick; // consumed for reactivity
  const pendingSend = sendingKeysRef.current.has(conversationId ?? "new");
  const isSending = hookSending || pendingSend;

  // ChatStatus for PromptInputSubmit
  const chatStatus: ChatStatus = isStreaming
    ? "streaming"
    : isSending
      ? "submitted"
      : "ready";

  // Core send logic — sends one message and processes queue after
  const doSend = useCallback(
    async (text: string, files?: FileUIPart[], bookmarks?: BookmarkData[]) => {
      let currentConversationId = conversationId;
      let sessionId: string | undefined;
      const dir = conversationDirs.get(conversationId ?? "new") ?? undefined;

      // If no conversation, create one
      if (!currentConversationId) {
        const session = await createSession(text.slice(0, 50), dir);
        if (!session) return;
        sessionId = session.id;

        const conversation = await createConversation({
          title: text.slice(0, 50) + (text.length > 50 ? "..." : ""),
          sessionId: session.id,
          directory: dir,
        });
        currentConversationId = conversation.id;

        // Move local messages from "new" to the real conversation ID
        setLocalMessages((prev) => {
          const next = new Map(prev);
          const msgs = next.get("new") ?? [];
          next.delete("new");
          next.set(
            currentConversationId!,
            msgs.map((m) => ({ ...m, conversationId: currentConversationId! })),
          );
          return next;
        });
        // Move directory from "new" to real conversation ID
        setConversationDirs((prev) => {
          const newDir = prev.get("new");
          if (!newDir) return prev;
          const next = new Map(prev);
          next.delete("new");
          next.set(currentConversationId!, newDir);
          return next;
        });
        seededRef.current.add(currentConversationId);

        router.replace(`/app/chat?id=${currentConversationId}`);
      } else {
        const conv = conversations?.find(
          (c) => c.id === currentConversationId,
        );
        sessionId = conv?.sessionId ?? undefined;

        if (!sessionId) {
          const session = await createSession(text.slice(0, 50), dir);
          if (!session) return;
          sessionId = session.id;

          updateConversation({
            id: currentConversationId,
            sessionId: session.id,
          });
        }
      }

      // Save user message to DB in background
      // Build combined attachments for DB
      const dbAttachments = [
        ...(files?.map((f) => ({
          url: f.url,
          filename: f.filename,
          mediaType: f.mediaType,
        })) ?? []),
        ...(bookmarks?.map((b) => ({
          bookmarkId: b.id,
          bookmarkTitle: b.title ?? (b.content ? b.content.slice(0, 120) : null),
          bookmarkUrl: b.url,
          bookmarkType: b.type,
        })) ?? []),
      ];

      saveMessage({
        conversationId: currentConversationId,
        role: "user",
        content: text,
        attachments: dbAttachments.length > 0 ? dbAttachments : undefined,
      });

      // Build file parts for opencode
      const fileParts = files?.map((f) => ({
        url: f.url,
        mime: f.mediaType ?? "application/octet-stream",
        filename: f.filename,
      }));

      // Build bookmark system prompt
      let bookmarkSystem: string | undefined;
      if (bookmarks && bookmarks.length > 0) {
        const ids = bookmarks.map((b) => b.id).join(", ");
        bookmarkSystem = `The user has attached ${bookmarks.length} bookmark(s) from their library. Bookmark IDs: ${ids}. Use \`scx bookmarks list --json\` to fetch the full content of these bookmarks when answering.`;
      }

      // Send to opencode
      const responseText = await sendMessage(
        currentConversationId,
        sessionId,
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

        saveMessage({
          conversationId: currentConversationId,
          role: "assistant",
          content: responseText,
        });
      } else {
        console.warn("[chat] responseText was empty — assistant message not saved");
      }

      markSendComplete(currentConversationId);
    },
    [
      conversationId,
      conversations,
      conversationDirs,
      addLocalMessage,
      createSession,
      createConversation,
      updateConversation,
      saveMessage,
      sendMessage,
      markSendComplete,
      selectedModel,
      router,
    ],
  );

  // Process queue: send current message, then drain any queued messages
  const processQueue = useCallback(
    async (convKey: string, text: string, files?: FileUIPart[], bookmarks?: BookmarkData[]) => {
      sendingKeysRef.current.add(convKey);
      setPendingSendTick((t) => t + 1);

      await doSend(text, files, bookmarks);

      // Drain queued messages for this conversation
      const queue = queuesRef.current.get(convKey);
      while (queue && queue.length > 0) {
        const next = queue.shift()!;
        setQueueLength(queue.length);
        // Show queued user message now that it's being sent
        const activeConvId = conversationId ?? convKey;
        addLocalMessage(activeConvId, {
          id: `temp-user-${Date.now()}`,
          conversationId: activeConvId,
          role: "user",
          content: next,
          createdAt: new Date().toISOString(),
        });
        setPendingSendTick((t) => t + 1);
        await doSend(next);
      }

      sendingKeysRef.current.delete(convKey);
      queuesRef.current.delete(convKey);
      setPendingSendTick((t) => t + 1);
      setQueueLength(0);
    },
    [doSend, conversationId, addLocalMessage],
  );

  const handleSend = useCallback(
    (text: string, files?: FileUIPart[], bookmarks?: BookmarkData[]) => {
      if (!text.trim() || !connected) return;

      const convKey = conversationId ?? "new";

      if (sendingKeysRef.current.has(convKey)) {
        // Currently streaming in this conversation — queue the message (text only)
        const queue = queuesRef.current.get(convKey) ?? [];
        queue.push(text);
        queuesRef.current.set(convKey, queue);
        setQueueLength(queue.length);
      } else {
        // Build attachments for the local message
        const msgAttachments = [
          ...(files?.map((f) => ({
            url: f.url,
            filename: f.filename,
            mediaType: f.mediaType,
          })) ?? []),
          ...(bookmarks?.map((b) => ({
            bookmarkId: b.id,
            bookmarkTitle: b.title ?? (b.content ? b.content.slice(0, 120) : null),
            bookmarkUrl: b.url,
            bookmarkType: b.type,
          })) ?? []),
        ];

        addLocalMessage(convKey, {
          id: `temp-user-${Date.now()}`,
          conversationId: convKey,
          role: "user",
          content: text,
          createdAt: new Date().toISOString(),
          attachments: msgAttachments.length > 0 ? msgAttachments : undefined,
        });
        processQueue(convKey, text, files, bookmarks);
      }
    },
    [connected, conversationId, addLocalMessage, processQueue],
  );

  const handleSubmit = useCallback(
    (message: { text: string; files: FileUIPart[] }) => {
      const bookmarks = selectedBookmarks.length > 0 ? [...selectedBookmarks] : undefined;
      handleSend(message.text, message.files.length > 0 ? message.files : undefined, bookmarks);
      setSelectedBookmarks([]);
    },
    [handleSend, selectedBookmarks],
  );

  const handleNewConversation = useCallback(() => {
    setSelectedBookmarks([]);
    setBookmarkPickerOpen(false);
    router.replace("/app/chat");
  }, [router]);

  const handleConversationSelect = useCallback(
    (id: string) => {
      if (id === conversationId) return;
      setSelectedBookmarks([]);
      setBookmarkPickerOpen(false);
      router.replace(`/app/chat?id=${id}`);
    },
    [conversationId, router],
  );

  // Resolve active model display name
  // defaultModel may be "provider/model" or just "model"
  const defaultModelInfo = defaultModel
    ? providers
        .flatMap((p) => p.models)
        .find(
          (m) =>
            m.id === defaultModel ||
            `${m.providerId}/${m.id}` === defaultModel,
        )
    : null;
  const activeModelName = selectedModel
    ? selectedModel.name
    : defaultModelInfo
      ? defaultModelInfo.name
      : null;

  const clearQueue = useCallback(() => {
    const convKey = conversationId ?? "new";
    queuesRef.current.delete(convKey);
    setQueueLength(0);
  }, [conversationId]);

  const handleModelSelect = useCallback((model: ProviderModel) => {
    setSelectedModel(model);
    setModelSelectorOpen(false);
    try {
      localStorage.setItem("opencode-selected-model", JSON.stringify(model));
    } catch {
      // ignore
    }
  }, []);

  const handleSelectDirectory = useCallback(async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({ directory: true, multiple: false, title: "Select working directory" });
      if (selected && typeof selected === "string") {
        const key = conversationId ?? "new";
        setConversationDirs((prev) => {
          const next = new Map(prev);
          next.set(key, selected);
          return next;
        });
        if (conversationId) {
          updateConversation({ id: conversationId, directory: selected });
        }
      }
    } catch (err) {
      console.error("[chat] Failed to open directory picker:", err);
    }
  }, [conversationId, updateConversation]);

  // Keyboard shortcuts: ⌥S sidebar, ⌥B bookmarks, ⌥E chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;

      if (e.code === "KeyS") {
        e.preventDefault();
        setUserCollapsedOverride((prev) => prev === null ? !autoCollapsed : !prev);
      } else if (e.code === "KeyB") {
        e.preventDefault();
        setBookmarkPickerOpen((prev) => !prev);
      } else if (e.code === "KeyE") {
        e.preventDefault();
        setChatHidden((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [autoCollapsed]);

  const showThinking = isSending && !streamedText;
  const showStreaming = streamedText && isSending;
  // Show thinking below streamed text during tool calls (has text, sending, but not actively streaming)
  const showToolCallThinking = isSending && !!streamedText && !isStreaming;

  // Context window usage for the hover card
  const activeModel = selectedModel ?? defaultModelInfo ?? null;
  const contextMaxTokens = activeModel?.contextLimit ?? 200000;
  const usedTokens = tokens.input + tokens.output + tokens.reasoning;

  return (
    <div className="flex h-screen overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
      <Sidebar
        activeGroupId={null}
        onGroupSelect={() => {}}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setUserCollapsedOverride}
        sidebarTab="ask"
        onSidebarTabChange={(tab) => {
          if (tab === "library") router.push("/app/library");
        }}
        activeConversationId={conversationId}
        onConversationSelect={handleConversationSelect}
        onNewConversation={handleNewConversation}
      />
      {!chatHidden && <main className="relative flex-1 min-w-[480px] bg-white shadow-card rounded-xl m-2 overflow-hidden flex flex-col">
        {!isTauri && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-100 text-amber-800 text-sm">
            <Monitor size={14} />
            <span>
              AI chat requires the desktop app. Download it to chat with AI.
            </span>
          </div>
        )}

        {/* Messages area */}
        <Conversation className="flex-1">
          <ConversationContent
            className="max-w-3xl mx-auto w-full px-4 py-6"
            scrollClassName="scrollbar-light"
          >
            {messages.length === 0 ? (
              <ConversationEmptyState
                className={isSending ? "opacity-0 transition-opacity duration-150" : "opacity-100 transition-opacity duration-150"}
                title="Start a conversation"
                description="Ask questions about your bookmarks, get summaries, or explore connections in your saved content."
              />
            ) : (
              <>
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} onOpenBookmark={handleOpenReader} onOpenBookmarkInNewPanel={handleOpenInNewPanel} />
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
        {isTauri && (
          <div className="px-4 py-3">
            <div className="max-w-3xl mx-auto">
              {connecting ? (
                <div className="flex items-center gap-2 text-sm text-zinc-400 py-2">
                  <div className="size-3 border-2 border-zinc-300 border-t-transparent rounded-full animate-spin" />
                  Connecting to OpenCode...
                </div>
              ) : connectionError ? (
                <div className="text-sm text-red-500 py-2">
                  Failed to connect: {connectionError}
                </div>
              ) : (
                <TooltipProvider>
                  <PromptInput onSubmit={handleSubmit} globalDrop>
                    <AttachmentPreviews />
                    <BookmarkChips bookmarks={selectedBookmarks} onRemove={(id) => setSelectedBookmarks((prev) => prev.filter((b) => b.id !== id))} />
                    <PromptInputTextarea placeholder="Ask anything..." />
                    <PromptInputFooter>
                      <PromptInputTools>
                        <PromptInputActionMenu>
                          <PromptInputActionMenuTrigger tooltip="Attach" />
                          <PromptInputActionMenuContent>
                            <PromptInputActionAddAttachments />
                            <DropdownMenuItem onClick={() => setBookmarkPickerOpen(true)}>
                              <Bookmark className="size-4 mr-2" />
                              Add bookmarks
                            </DropdownMenuItem>
                          </PromptInputActionMenuContent>
                        </PromptInputActionMenu>
                        {(() => {
                          const canChange = messages.length === 0 && !isSending;
                          if (activeDir) {
                            // Always show dir label when set
                            return (
                              <span className="inline-flex items-center gap-0.5">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 gap-1.5 text-xs text-muted-foreground"
                                      onClick={canChange ? handleSelectDirectory : undefined}
                                      disabled={!canChange}
                                    >
                                      <FolderOpen className="size-3.5" />
                                      <span className="max-w-[120px] truncate">
                                        {activeDir.split("/").pop()}
                                      </span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">{activeDir}</TooltipContent>
                                </Tooltip>
                                {canChange && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const key = conversationId ?? "new";
                                      setConversationDirs((prev) => {
                                        const next = new Map(prev);
                                        next.delete(key);
                                        return next;
                                      });
                                      if (conversationId) {
                                        updateConversation({ id: conversationId, directory: undefined });
                                      }
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
                                <TooltipContent side="top">Change directory</TooltipContent>
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
                              {providers.map((provider) => (
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
                                          handleModelSelect(model)
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
                                noCacheTokens: tokens.input - tokens.cacheRead,
                                cacheReadTokens: tokens.cacheRead,
                                cacheWriteTokens: tokens.cacheWrite,
                              },
                              outputTokenDetails: {
                                textTokens: tokens.output - tokens.reasoning,
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
                        onStop={() =>
                          conversationId && abort(conversationId)
                        }
                      />
                    </PromptInputFooter>
                  </PromptInput>
                </TooltipProvider>
              )}
            </div>
          </div>
        )}

        {/* Read-only message view for web */}
        {!isTauri && conversationId && messages.length > 0 && (
          <div className="border-t border-zinc-100 px-4 py-3">
            <p className="text-center text-xs text-zinc-400">
              Viewing conversation history (read-only)
            </p>
          </div>
        )}
      </main>}

      {bookmarkPickerOpen && (
        <BookmarkPickerPanel
          onClose={() => setBookmarkPickerOpen(false)}
          selectedBookmarks={selectedBookmarks}
          onAttach={handleToggleBookmark}
          onOpenReader={handleOpenReader}
          onOpenInNewPanel={handleOpenInNewPanel}
        />
      )}

      <ReadersContainer
        readers={openReaders}
        onClose={handleCloseReader}
        onReorder={handleReorderReaders}
      />
    </div>
  );
}

function MessageBubble({ message, onOpenBookmark, onOpenBookmarkInNewPanel }: { message: ChatMessage; onOpenBookmark: (bookmark: BookmarkData) => void; onOpenBookmarkInNewPanel: (bookmark: BookmarkData) => void }) {
  if (message.role === "user") {
    const bookmarkAtts = message.attachments?.filter((a): a is Extract<ChatAttachment, { bookmarkId: string }> => "bookmarkId" in a) ?? [];
    const fileAtts = message.attachments?.filter((a): a is Extract<ChatAttachment, { url: string }> => "url" in a) ?? [];

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
          {bookmarkAtts.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-end">
              {bookmarkAtts.map((att) => (
                <BookmarkAttachmentCard key={att.bookmarkId} attachment={att} onOpen={onOpenBookmark} onOpenInNewPanel={onOpenBookmarkInNewPanel} />
              ))}
            </div>
          )}
          <div className="rounded-2xl rounded-br-md bg-zinc-100 px-4 py-2.5 text-sm text-zinc-900">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] text-sm text-zinc-800">
        <div className="prose prose-sm prose-zinc max-w-none">
          <Streamdown>{message.content}</Streamdown>
        </div>
      </div>
    </div>
  );
}

function BookmarkAttachmentCard({ attachment, onOpen, onOpenInNewPanel }: {
  attachment: Extract<ChatAttachment, { bookmarkId: string }>;
  onOpen: (bookmark: BookmarkData) => void;
  onOpenInNewPanel: (bookmark: BookmarkData) => void;
}) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const fetchAndOpen = useCallback(async (handler: (b: BookmarkData) => void) => {
    if (loading) return;

    // Check tanstack cache first
    const cacheKey = ["bookmark", attachment.bookmarkId];
    const cached = queryClient.getQueryData<BookmarkData>(cacheKey);
    if (cached) {
      handler(cached);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/bookmarks?id=${attachment.bookmarkId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data?.id) {
        queryClient.setQueryData(cacheKey, data);
        handler(data as BookmarkData);
      }
    } catch {
      window.open(attachment.bookmarkUrl, "_blank");
    } finally {
      setLoading(false);
    }
  }, [attachment.bookmarkId, attachment.bookmarkUrl, loading, queryClient]);

  const domain = (() => {
    try { return new URL(attachment.bookmarkUrl).hostname.replace("www.", ""); } catch { return ""; }
  })();
  const typeLabel = attachment.bookmarkType === "tweet" ? "Tweet" : attachment.bookmarkType === "link" ? "Link" : attachment.bookmarkType;
  const displayText = attachment.bookmarkTitle ?? "Bookmark";

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey) {
              fetchAndOpen(onOpenInNewPanel);
            } else {
              fetchAndOpen(onOpen);
            }
          }}
          className="relative w-56 rounded-xl border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden text-left cursor-pointer select-none"
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
            </div>
          )}
          <div className="px-3.5 py-3 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
                {typeLabel}
              </span>
            </div>
            <p className="text-sm font-medium text-zinc-800 line-clamp-2 leading-snug">
              {displayText}
            </p>
            {domain && (
              <p className="text-xs text-zinc-400 truncate">{domain}</p>
            )}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={() => fetchAndOpen(onOpenInNewPanel)} className="gap-2">
          <PanelRight size={14} />
          Open in New Panel
          <ContextMenuShortcut>⌘ <MousePointerClick size={12} /></ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => window.open(attachment.bookmarkUrl, "_blank")}
          className="gap-2"
        >
          <ExternalLink size={14} />
          {attachment.bookmarkType === "tweet" ? "View on Twitter" : "Visit link"}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function FileAttachmentCard({ attachment }: { attachment: Extract<ChatAttachment, { url: string }> }) {
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

function BookmarkChips({ bookmarks, onRemove }: { bookmarks: BookmarkData[]; onRemove: (id: string) => void }) {
  if (bookmarks.length === 0) return null;

  return (
    <PromptInputHeader className="p-2 gap-2">
      {bookmarks.map((b) => {
        const domain = (() => {
          try { return new URL(b.url).hostname.replace("www.", ""); } catch { return ""; }
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
              <p className="text-blue-400 text-[10px]">{b.type}{domain ? ` · ${domain}` : ""}</p>
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
