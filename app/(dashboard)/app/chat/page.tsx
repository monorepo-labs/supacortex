"use client";

import { Suspense, useState, useCallback, useRef, useEffect, useDeferredValue, useMemo } from "react";
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
import { ChevronDown, Check, X, FolderOpen, FileIcon, Bookmark, PanelRight, ExternalLink, MousePointerClick, MessageSquarePlus, Link as LinkIcon, PanelLeft } from "lucide-react";
import { BookOpenIcon, ChatBubbleLeftIcon } from "@heroicons/react/16/solid";
import UserMenu from "@/app/components/UserMenu";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import Reader from "@/app/components/Reader";
import GridSearch from "@/app/components/GridSearch";
import TypeFilter from "@/app/components/TypeFilter";
import LibraryGridView from "@/app/components/LibraryGridView";
import type { BookmarkData } from "@/app/components/BookmarkNode";
import { useBookmarks, useCreateBookmark } from "@/hooks/use-bookmarks";
import { sileo } from "sileo";
import { useWorkspace, type PanelConfig } from "@/hooks/use-workspace";
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

  // Workspace panels (chat, library, reader)
  const workspace = useWorkspace();
  const { panels, addPanel, removePanel, reorderPanels, togglePanel, hasPanel, cycleWidth } = workspace;

  // Bookmark selection for attaching to chat
  const [selectedBookmarks, setSelectedBookmarks] = useState<BookmarkData[]>([]);

  const handleToggleBookmark = useCallback((bookmark: BookmarkData) => {
    setSelectedBookmarks((prev) => {
      const exists = prev.some((b) => b.id === bookmark.id);
      return exists ? prev.filter((b) => b.id !== bookmark.id) : [...prev, bookmark];
    });
  }, []);

  // Reader bookmark data (keyed by panel ID)
  const [readerBookmarks, setReaderBookmarks] = useState<Map<string, BookmarkData>>(new Map());

  const handleOpenReader = useCallback((bookmark: BookmarkData) => {
    // Find existing reader panels
    const readerPanels = panels.filter((p) => p.type === "reader");
    if (readerPanels.length === 0) {
      // Open new reader panel
      const id = `reader-${Date.now()}`;
      addPanel("reader", { bookmarkId: bookmark.id });
      // We need to store bookmark data — use effect below handles it
      setReaderBookmarks((prev) => {
        const next = new Map(prev);
        // Store by bookmark ID for lookup in render
        next.set(bookmark.id, bookmark);
        return next;
      });
    } else {
      // Replace last reader
      const lastReader = readerPanels[readerPanels.length - 1];
      removePanel(lastReader.id);
      addPanel("reader", { bookmarkId: bookmark.id });
      setReaderBookmarks((prev) => {
        const next = new Map(prev);
        next.set(bookmark.id, bookmark);
        return next;
      });
    }
  }, [panels, addPanel, removePanel]);

  const handleOpenInNewPanel = useCallback((bookmark: BookmarkData) => {
    // Don't open duplicate
    if (panels.some((p) => p.type === "reader" && p.bookmarkId === bookmark.id)) return;
    addPanel("reader", { bookmarkId: bookmark.id });
    setReaderBookmarks((prev) => {
      const next = new Map(prev);
      next.set(bookmark.id, bookmark);
      return next;
    });
  }, [panels, addPanel]);

  const handleCloseReader = useCallback((panelId: string) => {
    removePanel(panelId);
  }, [removePanel]);

  // Hydrate reader bookmark data for panels restored from localStorage
  const hydratedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const missing = panels.filter(
      (p) => p.type === "reader" && p.bookmarkId && !readerBookmarks.has(p.bookmarkId) && !hydratedRef.current.has(p.bookmarkId),
    );
    if (missing.length === 0) return;
    missing.forEach((p) => hydratedRef.current.add(p.bookmarkId!));
    Promise.all(
      missing.map(async (p) => {
        try {
          const res = await fetch(`/api/bookmarks?id=${p.bookmarkId}`);
          if (!res.ok) return null;
          const data = await res.json();
          return data?.id ? (data as BookmarkData) : null;
        } catch {
          return null;
        }
      }),
    ).then((results) => {
      setReaderBookmarks((prev) => {
        const next = new Map(prev);
        results.forEach((b) => { if (b) next.set(b.id, b); });
        return next;
      });
      // Remove panels whose bookmarks couldn't be fetched
      results.forEach((b, i) => {
        if (!b) removePanel(missing[i].id);
      });
    });
  }, [panels, readerBookmarks, removePanel]);

  const sidebarCollapsed = userCollapsedOverride ?? false;

  // Library panel state
  const [librarySearch, setLibrarySearch] = useState("");
  const deferredLibrarySearch = useDeferredValue(librarySearch);
  const [libraryTypeFilter, setLibraryTypeFilter] = useState("");
  const librarySearchRef = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>;

  const {
    data: libraryBookmarks,
    isLoading: libraryLoading,
    error: libraryError,
    fetchNextPage: libraryFetchNextPage,
    hasNextPage: libraryHasNextPage,
    isFetchingNextPage: libraryIsFetchingNextPage,
  } = useBookmarks(
    deferredLibrarySearch.length >= 3 ? deferredLibrarySearch : "",
    undefined,
    libraryTypeFilter || undefined,
    hasPanel("library"),
  );

  const { mutate: addBookmark } = useCreateBookmark();

  const handlePasteUrl = useCallback((url: string) => {
    sileo.promise(
      new Promise((resolve, reject) => {
        addBookmark({ url }, { onSuccess: resolve, onError: reject });
      }),
      {
        loading: { title: "Saving bookmark..." },
        success: { title: "Bookmark saved" },
        error: (err) => ({
          title: (err as Error).message || "Failed to save bookmark",
        }),
      },
    );
  }, [addBookmark]);

  // Derive open reader IDs for library grid highlighting
  const openReaderIds = useMemo(() => {
    const ids = new Set<string>();
    panels.forEach((p) => {
      if (p.type === "reader" && p.bookmarkId) ids.add(p.bookmarkId);
    });
    return ids;
  }, [panels]);

  // Selected bookmark IDs for library grid
  const selectedBookmarkIds = useMemo(
    () => new Set(selectedBookmarks.map((b) => b.id)),
    [selectedBookmarks],
  );

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

  // Track the active conversation ID for abort (survives stale closures)
  const activeConvIdRef = useRef<string | null>(conversationId);
  if (conversationId) activeConvIdRef.current = conversationId;

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

  // Core send logic — sends one message and returns the conversation ID used
  const doSend = useCallback(
    async (text: string, files?: FileUIPart[], bookmarks?: BookmarkData[], overrideConversationId?: string): Promise<string | undefined> => {
      let currentConversationId = overrideConversationId ?? conversationId;
      let sessionId: string | undefined;
      const dir = conversationDirs.get(currentConversationId ?? "new") ?? undefined;

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
        activeConvIdRef.current = currentConversationId;

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
      return currentConversationId;
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

      // First send — may create a new conversation, returns the real ID
      const resolvedId = await doSend(text, files, bookmarks);

      // Drain queued messages for this conversation
      const queue = queuesRef.current.get(convKey);
      while (queue && queue.length > 0) {
        const next = queue.shift()!;
        setQueueLength(queue.length);
        // Use the resolved conversation ID (not the stale closure value)
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

      sendingKeysRef.current.delete(convKey);
      queuesRef.current.delete(convKey);
      setPendingSendTick((t) => t + 1);
      setQueueLength(0);
    },
    [doSend, addLocalMessage],
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
    router.replace("/app/chat");
  }, [router]);

  const handleConversationSelect = useCallback(
    (id: string) => {
      if (id === conversationId) return;
      setSelectedBookmarks([]);
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

  // Keyboard shortcuts: ⌥S sidebar, ⌥B library, ⌥E chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;

      if (e.code === "KeyS") {
        e.preventDefault();
        setUserCollapsedOverride((prev) => !prev);
      } else if (e.code === "KeyB") {
        e.preventDefault();
        togglePanel("library");
      } else if (e.code === "KeyE") {
        e.preventDefault();
        togglePanel("chat");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePanel]);

  const showThinking = isSending && !streamedText;
  const showStreaming = streamedText && isSending;
  // Show thinking below streamed text during tool calls (has text, sending, but not actively streaming)
  const showToolCallThinking = isSending && !!streamedText && !isStreaming;

  // Context window usage for the hover card
  const activeModel = selectedModel ?? defaultModelInfo ?? null;
  const contextMaxTokens = activeModel?.contextLimit ?? 200000;
  const usedTokens = tokens.input + tokens.output + tokens.reasoning;

  // Width preset → CSS classes (per panel type)
  const widthClasses = (preset: string, panelType?: string) => {
    if (preset === "wide") {
      if (panelType === "library") return "flex-1 min-w-[1200px]";
      return "flex-1 min-w-[800px]";
    }
    if (preset === "narrow") {
      if (panelType === "chat") return "shrink-0 w-[360px] min-w-[360px]";
      return "shrink-0 w-[320px] min-w-[320px]";
    }
    // medium
    if (panelType === "chat") return "shrink-0 w-[600px] min-w-[600px]";
    if (panelType === "reader") return "shrink-0 w-[480px] min-w-[480px]";
    return "shrink-0 w-[640px] min-w-[640px]";
  };

  const renderPanel = (panel: PanelConfig, index: number) => {
    if (panel.type === "chat") {
      return (
        <main key={panel.id} id={`panel-${panel.id}`} className={`relative h-full ${widthClasses(panel.widthPreset, "chat")} bg-white shadow-card rounded-xl mx-2 overflow-hidden flex flex-col`}>

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
                              <DropdownMenuItem onClick={() => {
                                if (!hasPanel("library")) togglePanel("library");
                              }}>
                                <Bookmark className="size-4 mr-2" />
                                Add bookmarks
                              </DropdownMenuItem>
                            </PromptInputActionMenuContent>
                          </PromptInputActionMenu>
                          {(() => {
                            const canChange = messages.length === 0 && !isSending;
                            if (activeDir) {
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
                          onStop={() => {
                            const id = conversationId ?? activeConvIdRef.current;
                            if (id) abort(id);
                          }
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
        </main>
      );
    }

    if (panel.type === "library") {
      return (
        <div key={panel.id} id={`panel-${panel.id}`} className={`${widthClasses(panel.widthPreset, "library")} h-full shrink-0 mr-2 shadow-card rounded-xl overflow-hidden bg-zinc-50 flex flex-col`}>
          <GridSearch
            onSearch={setLibrarySearch}
            onRefresh={() => {}}
            inputRef={librarySearchRef}
            value={librarySearch}
            onPasteUrl={handlePasteUrl}
          />
          <TypeFilter value={libraryTypeFilter} onChange={setLibraryTypeFilter} />
          <div className="flex-1 overflow-hidden">
            <LibraryGridView
              bookmarks={libraryBookmarks}
              isLoading={libraryLoading}
              error={libraryError}
              onOpenReader={handleOpenReader}
              onOpenInNewPanel={handleOpenInNewPanel}
              openReaderIds={openReaderIds}
              fetchNextPage={libraryFetchNextPage}
              hasNextPage={libraryHasNextPage}
              isFetchingNextPage={libraryIsFetchingNextPage}
              attachedToChatIds={selectedBookmarkIds}
              contextMenuExtra={(bookmark) => (
                <>
                  <ContextMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleBookmark(bookmark);
                    }}
                    className="gap-2"
                  >
                    <MessageSquarePlus size={14} />
                    {selectedBookmarkIds.has(bookmark.id) ? "Remove from chat" : "Attach to chat"}
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                </>
              )}
            />
          </div>
        </div>
      );
    }

    if (panel.type === "reader" && panel.bookmarkId) {
      const bookmark = readerBookmarks.get(panel.bookmarkId);
      if (!bookmark) {
        return (
          <div key={panel.id} id={`panel-${panel.id}`} className={`${widthClasses(panel.widthPreset, "reader")} h-full mr-2 flex items-center justify-center rounded-xl bg-zinc-50 shadow-card`}>
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
          </div>
        );
      }
      return (
        <div key={panel.id} id={`panel-${panel.id}`} className={`${widthClasses(panel.widthPreset, "reader")} h-full mr-2`}>
          <Reader
            bookmark={bookmark}
            onClose={() => handleCloseReader(panel.id)}
            style={{ height: "100%", width: "100%" }}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <WorkspaceTabBar
        panels={panels}
        readerBookmarks={readerBookmarks}
        onTogglePanel={togglePanel}
        onRemovePanel={removePanel}
        onReorderPanels={reorderPanels}
        onCycleWidth={cycleWidth}
        hasPanel={hasPanel}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setUserCollapsedOverride((prev) => !prev)}
        onTabClick={(panelId) => {
          const el = document.getElementById(`panel-${panelId}`);
          el?.scrollIntoView({ behavior: "smooth", inline: "nearest" });
        }}
      />
      <div className="flex flex-1 min-h-0 pb-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
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
        {panels.map(renderPanel)}
      </div>
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

function faviconUrl(bookmarkUrl: string): string | null {
  try {
    const host = new URL(bookmarkUrl).hostname;
    return `https://icons.duckduckgo.com/ip3/${host}.ico`;
  } catch {
    return null;
  }
}

function TabIcon({ panel, bookmark }: { panel: PanelConfig; bookmark?: BookmarkData }) {
  if (panel.type === "chat") return <ChatBubbleLeftIcon className="h-3.5 w-3.5 shrink-0 text-zinc-600" />;
  if (panel.type === "library") return <BookOpenIcon className="h-3.5 w-3.5 shrink-0 text-zinc-600" />;
  if (panel.type === "reader" && bookmark) {
    if (bookmark.type === "tweet" || bookmark.type === "article") {
      return (
        <svg viewBox="0 0 24 24" className="size-3.5 shrink-0">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="currentColor" />
        </svg>
      );
    }
    if (bookmark.type === "youtube") {
      return (
        <svg viewBox="0 0 28 20" className="h-3 w-auto shrink-0">
          <path fill="#FF0000" d="M27.4 3.1a3.5 3.5 0 0 0-2.5-2.5C22.7 0 14 0 14 0S5.3 0 3.1.6A3.5 3.5 0 0 0 .6 3.1C0 5.3 0 10 0 10s0 4.7.6 6.9a3.5 3.5 0 0 0 2.5 2.5C5.3 20 14 20 14 20s8.7 0 10.9-.6a3.5 3.5 0 0 0 2.5-2.5C28 14.7 28 10 28 10s0-4.7-.6-6.9Z" />
          <path fill="#FFF" d="m11.2 14.3 7.2-4.3-7.2-4.3v8.6Z" />
        </svg>
      );
    }
    const favicon = faviconUrl(bookmark.url);
    if (favicon) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={favicon} alt="" className="size-3.5 shrink-0 rounded-sm" />
      );
    }
    return <LinkIcon size={13} className="shrink-0" />;
  }
  return null;
}

function WorkspaceTabBar({
  panels,
  readerBookmarks,
  onTogglePanel,
  onRemovePanel,
  onReorderPanels,
  onCycleWidth,
  hasPanel,
  sidebarCollapsed,
  onToggleSidebar,
  onTabClick,
}: {
  panels: PanelConfig[];
  readerBookmarks: Map<string, BookmarkData>;
  onTogglePanel: (type: "chat" | "library" | "reader") => void;
  onRemovePanel: (id: string) => void;
  onReorderPanels: (from: number, to: number) => void;
  onCycleWidth: (id: string) => void;
  hasPanel: (type: "chat" | "library" | "reader") => boolean;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onTabClick: (panelId: string) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = panels.findIndex((p) => p.id === active.id);
    const newIndex = panels.findIndex((p) => p.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorderPanels(oldIndex, newIndex);
    }
  }, [panels, onReorderPanels]);

  const tabLabel = (panel: PanelConfig, bookmark?: BookmarkData): string | null => {
    if (panel.type === "chat") return "Chat";
    if (panel.type === "library") return "Library";
    if (!bookmark) return "Bookmark";
    if (bookmark.type === "tweet" || bookmark.type === "article") {
      const author = bookmark.author ? `@${bookmark.author}` : "";
      const snippet = bookmark.content?.slice(0, 40) ?? "";
      if (author && snippet) return `${author} · ${snippet}`;
      return author || snippet || "Tweet";
    }
    return bookmark.title ?? bookmark.author ?? "Bookmark";
  };

  const widthLabel = (preset: string) => preset === "narrow" ? "S" : preset === "medium" ? "M" : "L";

  const activePanel = activeId ? panels.find((p) => p.id === activeId) : null;
  const activeBookmark = activePanel?.bookmarkId ? readerBookmarks.get(activePanel.bookmarkId) : undefined;

  return (
    <div
      className="flex items-center py-1 pr-2 shrink-0 overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
      style={{ paddingLeft: sidebarCollapsed ? 80 : 216 }}
    >
      <div className="flex gap-0.5 rounded-full bg-black/5 p-0.5">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="flex items-center justify-center rounded-full px-2 py-1.5 text-zinc-500 hover:text-zinc-700 transition-colors"
          title={sidebarCollapsed ? "Show sidebar (⌥S)" : "Hide sidebar (⌥S)"}
        >
          <PanelLeft size={14} />
        </button>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={panels.map((p) => p.id)} strategy={horizontalListSortingStrategy}>
            {panels.map((panel) => {
              const bookmark = panel.bookmarkId ? readerBookmarks.get(panel.bookmarkId) : undefined;
              return (
                <SortableTab
                  key={panel.id}
                  panel={panel}
                  bookmark={bookmark}
                  tabLabel={tabLabel(panel, bookmark)}
                  widthLabel={widthLabel(panel.widthPreset)}
                  onTabClick={onTabClick}
                  onCycleWidth={onCycleWidth}
                  onTogglePanel={onTogglePanel}
                  onRemovePanel={onRemovePanel}
                  isDragOverlay={false}
                />
              );
            })}
          </SortableContext>
          <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
            {activePanel ? (
              <SortableTab
                panel={activePanel}
                bookmark={activeBookmark}
                tabLabel={tabLabel(activePanel, activeBookmark)}
                widthLabel={widthLabel(activePanel.widthPreset)}
                onTabClick={onTabClick}
                onCycleWidth={onCycleWidth}
                onTogglePanel={onTogglePanel}
                onRemovePanel={onRemovePanel}
                isDragOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
      <div className="ml-auto shrink-0">
        <UserMenu />
      </div>
    </div>
  );
}

function SortableTab({
  panel,
  bookmark,
  tabLabel,
  widthLabel,
  onTabClick,
  onCycleWidth,
  onTogglePanel,
  onRemovePanel,
  isDragOverlay,
}: {
  panel: PanelConfig;
  bookmark?: BookmarkData;
  tabLabel: string | null;
  widthLabel: string;
  onTabClick: (panelId: string) => void;
  onCycleWidth: (id: string) => void;
  onTogglePanel: (type: "chat" | "library" | "reader") => void;
  onRemovePanel: (id: string) => void;
  isDragOverlay: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: panel.id, disabled: isDragOverlay });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => { if (!isDragging) onTabClick(panel.id); }}
      className={`group/tab relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium cursor-grab active:cursor-grabbing max-w-[200px] touch-none ${
        isDragOverlay
          ? "bg-white text-zinc-900 shadow-lg ring-1 ring-zinc-200/50"
          : "bg-white text-zinc-900 shadow-sm"
      }`}
    >
      <TabIcon panel={panel} bookmark={bookmark} />
      {tabLabel && (
        <span className="truncate text-zinc-600 select-none">
          {tabLabel}
        </span>
      )}
      {!isDragOverlay && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0 opacity-0 group-hover/tab:opacity-100 transition-opacity bg-inherit rounded">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCycleWidth(panel.id); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded px-1 py-0.5 text-[9px] font-medium text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200/60 transition-colors"
            title={`Resize (${panel.widthPreset})`}
          >
            {widthLabel}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (panel.type === "chat" || panel.type === "library") {
                onTogglePanel(panel.type);
              } else {
                onRemovePanel(panel.id);
              }
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded p-0.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200/60 transition-colors"
            title={panel.type === "chat" || panel.type === "library" ? `Hide ${panel.type}` : "Close"}
          >
            <X size={11} />
          </button>
        </div>
      )}
    </div>
  );
}
