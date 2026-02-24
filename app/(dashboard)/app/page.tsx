"use client";

import { Suspense, useState, useCallback, useRef, useEffect, useDeferredValue, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import { useIsTauri } from "@/hooks/use-tauri";
import { useTauriDrag } from "@/hooks/use-tauri-drag";
import type { ChatMessage } from "@/hooks/use-chat";
import {
  useOpenCode,
  useOpenCodeSessions,
  useCreateSession,
  useSendMessage,
  useProviders,

} from "@/hooks/use-opencode";
import { getClient, untrackSessionId } from "@/services/opencode";
import { X, MessageSquarePlus, Link as LinkIcon, PanelLeft, Globe, ExternalLink, BookOpen, Bookmark, BookmarkCheck } from "lucide-react";
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
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import Reader from "@/app/components/Reader";
import GridSearch from "@/app/components/GridSearch";
import TypeFilter from "@/app/components/TypeFilter";
import LibraryGridView from "@/app/components/LibraryGridView";
import type { BookmarkData } from "@/app/components/BookmarkNode";
import { useBookmarks, useCreateBookmark, useBookmarkExists } from "@/hooks/use-bookmarks";
import { sileo } from "sileo";
import { useWorkspace, type PanelConfig } from "@/hooks/use-workspace";
import { ChatPanel, ChatPanelProvider } from "@/app/components/ChatPanel";
import type { Session } from "@opencode-ai/sdk/client";

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
  const urlConversationId = searchParams.get("id");

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

  const { sessions, refetch: refetchSessions } = useOpenCodeSessions(connected);

  const [userCollapsedOverride, setUserCollapsedOverride] = useState<boolean | null>(null);
  // Local-first messages: keyed by conversationId, "new" for unsaved convos
  const [localMessages, setLocalMessages] = useState<Map<string, ChatMessage[]>>(new Map());

  // Per-conversation directory (for folder selector)
  const [conversationDirs, setConversationDirs] = useState<Map<string, string>>(new Map());

  // Workspace panels (chat, library, reader)
  const workspace = useWorkspace();
  const { panels, addPanel, updatePanel, removePanel, reorderPanels, togglePanel, hasPanel, cycleWidth } = workspace;

  const handleDeleteSession = useCallback(async (id: string) => {
    try {
      const client = getClient();
      await client.session.delete({ path: { id } });
      await untrackSessionId(id);
      refetchSessions();
      if (urlConversationId === id) {
        router.replace("/app");
      }
      // Clear conversationId from any panel showing the deleted session
      for (const p of panels) {
        if (p.type === "chat" && p.conversationId === id) {
          updatePanel(p.id, { conversationId: undefined });
        }
      }
    } catch {
      // silently fail
    }
  }, [refetchSessions, urlConversationId, router, panels, updatePanel]);

  // Seed the default chat panel's conversationId from URL on mount
  const urlSeededRef = useRef(false);
  useEffect(() => {
    if (urlSeededRef.current || !urlConversationId) return;
    urlSeededRef.current = true;
    const chatPanel = panels.find((p) => p.type === "chat" && !p.conversationId);
    if (chatPanel) {
      updatePanel(chatPanel.id, { conversationId: urlConversationId });
    }
  }, [urlConversationId, panels, updatePanel]);

  // When URL changes (e.g. sidebar click), update the first chat panel without a matching conversation
  const prevUrlRef = useRef(urlConversationId);
  useEffect(() => {
    if (urlConversationId === prevUrlRef.current) return;
    prevUrlRef.current = urlConversationId;
    if (!urlConversationId) return;
    // If a panel already shows this conversation, just scroll to it
    const existing = panels.find((p) => p.type === "chat" && p.conversationId === urlConversationId);
    if (existing) {
      requestAnimationFrame(() => {
        document.getElementById(`panel-${existing.id}`)?.scrollIntoView({ behavior: "smooth", inline: "nearest" });
      });
      return;
    }
    // Otherwise load into the first chat panel
    const firstChat = panels.find((p) => p.type === "chat");
    if (firstChat) {
      updatePanel(firstChat.id, { conversationId: urlConversationId });
    }
  }, [urlConversationId, panels, updatePanel]);

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

  // Scroll last chat panel into view when chat panels change
  const scrollToChatRef = useRef(false);
  const chatPanelIds = panels.filter((p) => p.type === "chat").map((p) => p.id).join(",");
  useEffect(() => {
    if (!scrollToChatRef.current) return;
    scrollToChatRef.current = false;
    const chatPanels = panels.filter((p) => p.type === "chat");
    const last = chatPanels[chatPanels.length - 1];
    if (last) {
      requestAnimationFrame(() => {
        const el = document.getElementById(`panel-${last.id}`);
        el?.scrollIntoView({ behavior: "smooth", inline: "nearest" });
      });
    }
  }, [chatPanelIds, panels]);

  // Scroll library panel into view when it's added
  const scrollToLibraryRef = useRef(false);
  const libraryPanelIds = panels.filter((p) => p.type === "library").map((p) => p.id).join(",");
  useEffect(() => {
    if (!scrollToLibraryRef.current) return;
    scrollToLibraryRef.current = false;
    const libraryPanel = panels.find((p) => p.type === "library");
    if (libraryPanel) {
      requestAnimationFrame(() => {
        const el = document.getElementById(`panel-${libraryPanel.id}`);
        el?.scrollIntoView({ behavior: "smooth", inline: "nearest" });
      });
    }
  }, [libraryPanelIds, panels]);

  // Scroll last reader panel into view when reader panels change
  const scrollToReaderRef = useRef(false);
  const readerPanelIds = panels.filter((p) => p.type === "reader").map((p) => p.id).join(",");
  useEffect(() => {
    if (!scrollToReaderRef.current) return;
    scrollToReaderRef.current = false;
    const readerPanels = panels.filter((p) => p.type === "reader");
    const last = readerPanels[readerPanels.length - 1];
    if (last) {
      requestAnimationFrame(() => {
        const el = document.getElementById(`panel-${last.id}`);
        el?.scrollIntoView({ behavior: "smooth", inline: "nearest" });
      });
    }
  }, [readerPanelIds, panels]);

  const handleOpenReader = useCallback((bookmark: BookmarkData) => {
    scrollToReaderRef.current = true;
    const readerPanels = panels.filter((p) => p.type === "reader");
    if (readerPanels.length === 0) {
      addPanel("reader", { bookmarkId: bookmark.id });
      setReaderBookmarks((prev) => {
        const next = new Map(prev);
        next.set(bookmark.id, bookmark);
        return next;
      });
    } else {
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
    if (panels.some((p) => p.type === "reader" && p.bookmarkId === bookmark.id)) return;
    scrollToReaderRef.current = true;
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

  // Browser panel management
  const scrollToBrowserRef = useRef(false);
  const browserPanelIds = panels.filter((p) => p.type === "browser").map((p) => p.id).join(",");
  useEffect(() => {
    if (!scrollToBrowserRef.current) return;
    scrollToBrowserRef.current = false;
    const browserPanels = panels.filter((p) => p.type === "browser");
    const last = browserPanels[browserPanels.length - 1];
    if (last) {
      requestAnimationFrame(() => {
        const el = document.getElementById(`panel-${last.id}`);
        el?.scrollIntoView({ behavior: "smooth", inline: "nearest" });
      });
    }
  }, [browserPanelIds, panels]);

  const handleOpenBrowser = useCallback((url: string) => {
    if (panels.some((p) => p.type === "browser" && p.url === url)) return;
    scrollToBrowserRef.current = true;
    addPanel("browser", { url });
  }, [panels, addPanel]);

  const handleCloseBrowser = useCallback((panelId: string) => {
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

  // Seed directory from opencode session for all chat panels
  useEffect(() => {
    if (!sessions.length) return;
    panels.forEach((p) => {
      if (p.type === "chat" && p.conversationId) {
        const session = sessions.find((s) => s.id === p.conversationId);
        if (session?.directory && !conversationDirs.has(p.conversationId)) {
          setConversationDirs((prev) => {
            const next = new Map(prev);
            next.set(p.conversationId!, session.directory);
            return next;
          });
        }
      }
    });
  }, [panels, sessions, conversationDirs]);

  // New chat panel from tab bar / ⌘N
  const handleNewChatPanel = useCallback(() => {
    scrollToChatRef.current = true;
    addPanel("chat", { widthPreset: "medium" });
  }, [addPanel]);

  // Keyboard shortcuts: ⌘N new chat, ⌥S sidebar, ⌥B library, ⌥E chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘N — new chat panel
      if ((e.metaKey || e.ctrlKey) && e.code === "KeyN" && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        handleNewChatPanel();
        return;
      }

      if (!e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;

      if (e.code === "KeyS") {
        e.preventDefault();
        setUserCollapsedOverride((prev) => !prev);
      } else if (e.code === "KeyB") {
        e.preventDefault();
        if (!hasPanel("library")) scrollToLibraryRef.current = true;
        togglePanel("library");
      } else if (e.code === "KeyE") {
        e.preventDefault();
        togglePanel("chat");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePanel, handleNewChatPanel]);

  // Handle new conversation creation from a chat panel
  const handleConversationCreated = useCallback((panelId: string, newConversationId: string) => {
    updatePanel(panelId, { conversationId: newConversationId });
    router.replace(`/app?id=${newConversationId}`);
  }, [updatePanel, router]);

  // New conversation from sidebar
  const handleNewConversation = useCallback(() => {
    setSelectedBookmarks([]);
    const chatPanels = panels.filter((p) => p.type === "chat");
    if (chatPanels.length <= 1) {
      // Single or no chat panel: reset to new conversation
      if (chatPanels.length === 1) {
        updatePanel(chatPanels[0].id, { conversationId: undefined });
        requestAnimationFrame(() => {
          document.getElementById(`panel-${chatPanels[0].id}`)?.scrollIntoView({ behavior: "smooth", inline: "nearest" });
        });
      } else {
        scrollToChatRef.current = true;
        addPanel("chat", { widthPreset: "wide" });
      }
      router.replace("/app");
    } else {
      // Multiple chat panels: add a new panel
      scrollToChatRef.current = true;
      addPanel("chat", { widthPreset: "medium" });
    }
  }, [panels, router, addPanel, updatePanel]);

  // Select conversation from sidebar
  const handleConversationSelect = useCallback(
    (id: string) => {
      setSelectedBookmarks([]);
      // If a panel already shows this conversation, scroll to it
      const existing = panels.find((p) => p.type === "chat" && p.conversationId === id);
      if (existing) {
        requestAnimationFrame(() => {
          document.getElementById(`panel-${existing.id}`)?.scrollIntoView({ behavior: "smooth", inline: "nearest" });
        });
        router.replace(`/app?id=${id}`);
        return;
      }
      // Otherwise load into the first chat panel
      const firstChat = panels.find((p) => p.type === "chat");
      if (firstChat) {
        updatePanel(firstChat.id, { conversationId: id });
      }
      router.replace(`/app?id=${id}`);
    },
    [panels, router, updatePanel],
  );

  // Open conversation in new panel (from sidebar context menu)
  const handleOpenConversationInPanel = useCallback((sessionId: string) => {
    if (panels.some((p) => p.type === "chat" && p.conversationId === sessionId)) return;
    scrollToChatRef.current = true;
    addPanel("chat", { widthPreset: "medium", conversationId: sessionId });
  }, [panels, addPanel]);

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
    if (panelType === "reader" || panelType === "browser") return "shrink-0 w-[480px] min-w-[480px]";
    return "shrink-0 w-[640px] min-w-[640px]";
  };

  // ChatPanelProvider value
  const chatPanelCtx = useMemo(() => ({
    connected,
    connecting,
    connectionError,
    isTauri,
    localMessages,
    setLocalMessages,
    conversationDirs,
    setConversationDirs,
    sendMessage,
    abort,
    getState,
    markSendComplete,
    loadTokens,
    createSession,
    refetchSessions,
    providers,
    defaultModel,
    onOpenBrowser: handleOpenBrowser,
    onOpenReader: handleOpenReader,
    onOpenInNewPanel: handleOpenInNewPanel,
    selectedBookmarks,
    onClearSelectedBookmarks: () => setSelectedBookmarks([]),
    onRemoveSelectedBookmark: (id: string) => setSelectedBookmarks((prev) => prev.filter((b) => b.id !== id)),
  }), [
    connected, connecting, connectionError, isTauri,
    localMessages, conversationDirs,
    sendMessage, abort, getState, markSendComplete, loadTokens,
    createSession, refetchSessions,
    providers, defaultModel,
    handleOpenBrowser, handleOpenReader, handleOpenInNewPanel,
    selectedBookmarks,
  ]);

  const renderPanel = (panel: PanelConfig) => {
    if (panel.type === "chat") {
      return (
        <ChatPanel
          key={panel.id}
          panelId={panel.id}
          conversationId={panel.conversationId ?? null}
          widthClass={widthClasses(panel.widthPreset, "chat")}
          onConversationCreated={handleConversationCreated}
        />
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

    if (panel.type === "browser" && panel.url) {
      return (
        <div key={panel.id} id={`panel-${panel.id}`} className={`${widthClasses(panel.widthPreset, "browser")} h-full mr-2`}>
          <BrowserPanel
            url={panel.url}
            panelId={panel.id}
            onClose={() => handleCloseBrowser(panel.id)}
            onSave={() => handlePasteUrl(panel.url!)}
          />
        </div>
      );
    }

    return null;
  };

  // Derive active conversation ID for sidebar highlighting
  const activeConversationId = urlConversationId
    ?? panels.find((p) => p.type === "chat")?.conversationId
    ?? null;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <WorkspaceTabBar
        panels={panels}
        sessions={sessions}
        readerBookmarks={readerBookmarks}
        onTogglePanel={(type) => {
          if (type === "library" && !hasPanel("library")) scrollToLibraryRef.current = true;
          togglePanel(type);
        }}
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
        onNewChatPanel={handleNewChatPanel}
      />
      <div data-panel-scroll className="flex flex-1 min-h-0 pb-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        <Sidebar
          activeGroupId={null}
          onGroupSelect={() => {}}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setUserCollapsedOverride}
          sidebarTab="ask"
          onSidebarTabChange={(tab) => {
            if (tab === "library") {
              if (!hasPanel("library")) scrollToLibraryRef.current = true;
              togglePanel("library");
            }
          }}
          activeConversationId={activeConversationId}
          onConversationSelect={handleConversationSelect}
          onNewConversation={handleNewConversation}
          opencodeSessions={sessions}
          opencodeConnected={connected}
          onDeleteSession={handleDeleteSession}
          onOpenInPanel={handleOpenConversationInPanel}
        />
        <ChatPanelProvider value={chatPanelCtx}>
          {panels.map(renderPanel)}
        </ChatPanelProvider>
      </div>
    </div>
  );
}

// ── Tab helpers ───────────────────────────────────────────────────

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
  if (panel.type === "browser" && panel.url) {
    const favicon = faviconUrl(panel.url);
    if (favicon) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={favicon} alt="" className="size-3.5 shrink-0 rounded-sm" />
      );
    }
    return <Globe size={13} className="shrink-0 text-zinc-600" />;
  }
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

// ── WorkspaceTabBar ──────────────────────────────────────────────

function WorkspaceTabBar({
  panels,
  sessions,
  readerBookmarks,
  onTogglePanel,
  onRemovePanel,
  onReorderPanels,
  onCycleWidth,
  hasPanel,
  sidebarCollapsed,
  onToggleSidebar,
  onTabClick,
  onNewChatPanel,
}: {
  panels: PanelConfig[];
  sessions: Session[];
  readerBookmarks: Map<string, BookmarkData>;
  onTogglePanel: (type: "chat" | "library" | "reader") => void;
  onRemovePanel: (id: string) => void;
  onReorderPanels: (from: number, to: number) => void;
  onCycleWidth: (id: string) => void;
  hasPanel: (type: "chat" | "library" | "reader") => boolean;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onTabClick: (panelId: string) => void;
  onNewChatPanel: () => void;
}) {
  const handleDrag = useTauriDrag();
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
    if (panel.type === "chat") {
      if (panel.conversationId) {
        const session = sessions.find((s) => s.id === panel.conversationId);
        return session?.title ?? "Chat";
      }
      return "New Chat";
    }
    if (panel.type === "library") return "Library";
    if (panel.type === "browser" && panel.url) {
      try { return new URL(panel.url).hostname.replace("www.", ""); } catch { return "Browser"; }
    }
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
      onMouseDown={handleDrag}
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
        <button
          type="button"
          onClick={onNewChatPanel}
          className="flex items-center justify-center rounded-full px-2 py-1.5 text-zinc-500 hover:text-zinc-700 transition-colors"
          title="New chat panel"
        >
          <MessageSquarePlus size={14} />
        </button>
        {!hasPanel("library") && (
          <button
            type="button"
            onClick={() => onTogglePanel("library")}
            className="flex items-center justify-center rounded-full px-2 py-1.5 text-zinc-500 hover:text-zinc-700 transition-colors"
            title="Open library (⌥B)"
          >
            <BookOpen size={14} />
          </button>
        )}
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
              if (panel.type === "library") {
                onTogglePanel(panel.type);
              } else {
                onRemovePanel(panel.id);
              }
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded p-0.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200/60 transition-colors"
            title={panel.type === "library" ? `Hide ${panel.type}` : "Close"}
          >
            <X size={11} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Browser Panel ─────────────────────────────────────────────────

function invokeTauri(cmd: string, args: Record<string, unknown>) {
  const tauri = (window as unknown as { __TAURI_INTERNALS__: { invoke: (cmd: string, args: Record<string, unknown>) => void } }).__TAURI_INTERNALS__;
  if (tauri) tauri.invoke(cmd, args);
}

function BrowserWebViewFrame({ url, panelId }: { url: string; panelId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const label = `browser-${panelId}`;

  useEffect(() => {
    if (!containerRef.current) return;

    const el = containerRef.current;

    function sync() {
      const r = el.getBoundingClientRect();
      invokeTauri("resize_webview", { label, x: r.left, y: r.top, width: r.width, height: r.height });
    }

    const rect = el.getBoundingClientRect();
    invokeTauri("open_webview", { url, label, x: rect.left, y: rect.top, width: rect.width, height: rect.height });

    const observer = new ResizeObserver(sync);
    observer.observe(el);
    window.addEventListener("resize", sync);
    const scrollParent = el.closest("[data-panel-scroll]");
    if (scrollParent) scrollParent.addEventListener("scroll", sync);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
      if (scrollParent) scrollParent.removeEventListener("scroll", sync);
      invokeTauri("close_webview", { label });
    };
  }, [url, label]);

  return <div ref={containerRef} className="flex-1 w-full rounded-b-xl" />;
}

function useFaviconColor(url: string): { color: string | null; isLight: boolean } {
  const [result, setResult] = useState<{ color: string | null; isLight: boolean }>({ color: null, isLight: false });

  useEffect(() => {
    const favicon = faviconUrl(url);
    if (!favicon) return;
    let cancelled = false;

    import("@tauri-apps/plugin-http").then(({ fetch: tauriFetch }) => {
      return tauriFetch(favicon, { method: "GET" });
    }).then((resp) => {
      if (!resp.ok || cancelled) return;
      return resp.blob();
    }).then((blob) => {
      if (!blob || cancelled) return;
      const blobUrl = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) { URL.revokeObjectURL(blobUrl); return; }
          ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let r = 0, g = 0, b = 0, count = 0;
          for (let i = 0; i < data.length; i += 4) {
            const pr = data[i], pg = data[i + 1], pb = data[i + 2], pa = data[i + 3];
            if (pa < 128) continue;
            if (pr > 240 && pg > 240 && pb > 240) continue;
            if (pr < 15 && pg < 15 && pb < 15) continue;
            r += pr; g += pg; b += pb; count++;
          }
          if (count > 0 && !cancelled) {
            const avgR = Math.round(r / count), avgG = Math.round(g / count), avgB = Math.round(b / count);
            const luminance = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB;
            setResult({ color: `rgb(${avgR}, ${avgG}, ${avgB})`, isLight: luminance > 186 });
          }
        } catch {
          // canvas error, ignore
        }
        URL.revokeObjectURL(blobUrl);
      };
      img.onerror = () => { URL.revokeObjectURL(blobUrl); };
      img.src = blobUrl;
    }).catch(() => {
      // fetch failed, fall back to default styling
    });

    return () => { cancelled = true; };
  }, [url]);

  return result;
}

function BrowserPanel({ url, panelId, onClose, onSave }: { url: string; panelId: string; onClose: () => void; onSave: () => void }) {
  const domain = (() => {
    try { return new URL(url).hostname.replace("www.", ""); } catch { return url; }
  })();

  const { data: isSaved = false } = useBookmarkExists(url);
  const { color: siteColor, isLight } = useFaviconColor(url);
  const textMain = siteColor ? (isLight ? "text-zinc-800/90" : "text-white/90") : "text-zinc-500";
  const textMuted = siteColor ? (isLight ? "text-zinc-700/70" : "text-white/70") : "text-zinc-400";
  const btnStyle = siteColor
    ? isLight ? "text-zinc-700/60 hover:bg-black/10 hover:text-zinc-900" : "text-white/60 hover:bg-white/15 hover:text-white"
    : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600";

  const handleOpenExternal = useCallback(() => {
    import("@tauri-apps/plugin-shell").then(({ open }) => open(url)).catch(console.error);
  }, [url]);

  return (
    <div className="group/browser shrink-0 shadow-card rounded-xl overflow-hidden bg-white h-full flex flex-col">
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-100 transition-colors duration-300"
        style={siteColor ? { backgroundColor: siteColor, borderColor: "transparent" } : undefined}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Globe size={13} className={`shrink-0 ${textMuted}`} />
          <span className={`text-xs truncate ${textMain}`} title={url}>
            {domain}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onSave}
            disabled={isSaved}
            className={`rounded-lg p-1.5 transition-colors ${isSaved ? `cursor-not-allowed ${siteColor ? (isLight ? "text-zinc-700/40" : "text-white/40") : "text-zinc-300"}` : btnStyle}`}
            title={isSaved ? "Already saved" : "Save to bookmarks"}
          >
            {isSaved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
          </button>
          <button
            onClick={handleOpenExternal}
            className={`rounded-lg p-1.5 transition-colors ${btnStyle}`}
            title="Open in external browser"
          >
            <ExternalLink size={13} />
          </button>
          <button
            onClick={onClose}
            className={`rounded-lg p-1.5 transition-colors ${btnStyle}`}
          >
            <X size={14} />
          </button>
        </div>
      </div>
      <BrowserWebViewFrame url={url} panelId={panelId} />
    </div>
  );
}
