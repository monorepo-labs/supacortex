"use client";

import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import { useIsTauri } from "@/hooks/use-tauri";
import {
  useConversations,
  useMessages,
  useCreateConversation,
  useUpdateConversation,
  useSaveMessage,
  type ChatMessage,
} from "@/hooks/use-chat";
import {
  useOpenCode,
  useCreateSession,
  useSendMessage,
} from "@/hooks/use-opencode";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Loader2, Monitor } from "lucide-react";

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
  const { create: createSession, creating: creatingSession } =
    useCreateSession();
  const {
    send: sendMessage,
    abort,
    isStreaming,
    streamedText,
  } = useSendMessage();

  const { data: conversations } = useConversations();
  const { data: dbMessages } = useMessages(conversationId);
  const { mutateAsync: createConversation } = useCreateConversation();
  const { mutate: updateConversation } = useUpdateConversation();
  const { mutateAsync: saveMessage } = useSaveMessage();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Merge DB messages with local state
  // Use local messages as long as we have them (avoids flicker during DB save race)
  const messages = localMessages.length > 0 ? localMessages : (dbMessages ?? []);

  // Sync DB messages into local state when they load (for existing conversations)
  useEffect(() => {
    if (dbMessages && dbMessages.length > 0 && localMessages.length === 0) {
      setLocalMessages(dbMessages);
    }
  }, [dbMessages, localMessages.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedText]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming || !connected) return;

    setInput("");

    let currentConversationId = conversationId;
    let sessionId: string | undefined;

    // If no conversation, create one
    if (!currentConversationId) {
      const session = await createSession(text.slice(0, 50));
      if (!session) return;
      sessionId = session.id;

      const conversation = await createConversation({
        title: text.slice(0, 50) + (text.length > 50 ? "..." : ""),
        sessionId: session.id,
      });
      currentConversationId = conversation.id;
      router.replace(`/app/chat?id=${conversation.id}`);
    } else {
      // Get the session ID from the conversation
      const conv = conversations?.find((c) => c.id === currentConversationId);
      sessionId = conv?.sessionId ?? undefined;

      // If no session yet, create one
      if (!sessionId) {
        const session = await createSession(text.slice(0, 50));
        if (!session) return;
        sessionId = session.id;
        updateConversation({
          id: currentConversationId,
          sessionId: session.id,
        });
      }
    }

    // Add user message to local state immediately
    const userMsg: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      conversationId: currentConversationId,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setLocalMessages((prev) => [...prev, userMsg]);

    // Save user message to DB
    await saveMessage({
      conversationId: currentConversationId,
      role: "user",
      content: text,
    });

    // Send to opencode and stream response
    const responseText = await sendMessage(sessionId, text);

    if (responseText) {
      // Save assistant message to DB
      await saveMessage({
        conversationId: currentConversationId,
        role: "assistant",
        content: responseText,
      });

      const assistantMsg: ChatMessage = {
        id: `temp-assistant-${Date.now()}`,
        conversationId: currentConversationId,
        role: "assistant",
        content: responseText,
        createdAt: new Date().toISOString(),
      };
      setLocalMessages((prev) => [...prev, assistantMsg]);
    }
  }, [
    input,
    isStreaming,
    connected,
    conversationId,
    conversations,
    createSession,
    createConversation,
    updateConversation,
    saveMessage,
    sendMessage,
    router,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewConversation = () => {
    setLocalMessages([]);
    router.push("/app/chat");
  };

  const handleConversationSelect = (id: string) => {
    setLocalMessages([]);
    router.push(`/app/chat?id=${id}`);
  };

  return (
    <div className="flex h-screen">
      <Sidebar
        activeGroupId={null}
        onGroupSelect={() => {}}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        sidebarTab="ask"
        onSidebarTabChange={(tab) => {
          if (tab === "library") router.push("/app/library");
        }}
        activeConversationId={conversationId}
        onConversationSelect={handleConversationSelect}
        onNewConversation={handleNewConversation}
      />
      <main className="relative flex-1 shadow-card rounded-xl m-2 overflow-hidden flex flex-col">
        {!isTauri && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-100 text-amber-800 text-sm">
            <Monitor size={14} />
            <span>
              AI chat requires the desktop app. Download it to chat with AI.
            </span>
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 && !isStreaming ? (
            <EmptyState />
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {isStreaming && streamedText && (
                <MessageBubble
                  message={{
                    id: "streaming",
                    conversationId: conversationId ?? "",
                    role: "assistant",
                    content: streamedText,
                    createdAt: new Date().toISOString(),
                  }}
                  isStreaming
                />
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        {isTauri && (
          <div className="border-t border-zinc-100 px-4 py-3">
            <div className="max-w-3xl mx-auto">
              {connecting ? (
                <div className="flex items-center gap-2 text-sm text-zinc-400 py-2">
                  <Loader2 size={14} className="animate-spin" />
                  Connecting to OpenCode...
                </div>
              ) : connectionError ? (
                <div className="text-sm text-red-500 py-2">
                  Failed to connect: {connectionError}
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything... (⌘+Enter to send)"
                    rows={1}
                    disabled={!connected || isStreaming}
                    className="flex-1 resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 transition-colors disabled:opacity-50 bg-transparent"
                  />
                  <button
                    onClick={isStreaming ? abort : handleSend}
                    disabled={!connected || (!input.trim() && !isStreaming)}
                    className="shrink-0 rounded-lg bg-zinc-900 p-2 text-white transition-colors hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {isStreaming ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Read-only message view for web (show DB messages) */}
        {!isTauri && conversationId && messages.length > 0 && (
          <div className="border-t border-zinc-100 px-4 py-3">
            <p className="text-center text-xs text-zinc-400">
              Viewing conversation history (read-only)
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center h-full">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-medium text-zinc-900">
          Start a conversation
        </h2>
        <p className="text-sm text-zinc-500 max-w-sm">
          Ask questions about your bookmarks, get summaries, or explore
          connections in your saved content.
        </p>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  isStreaming = false,
}: {
  message: ChatMessage;
  isStreaming?: boolean;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-zinc-100 px-4 py-2.5 text-sm text-zinc-900">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] text-sm text-zinc-800">
        <div className="prose prose-sm prose-zinc max-w-none">
          <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
        </div>
        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-zinc-400 animate-pulse ml-0.5" />
        )}
      </div>
    </div>
  );
}
