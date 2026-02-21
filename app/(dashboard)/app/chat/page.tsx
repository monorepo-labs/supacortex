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
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import { Send, Square, Loader2, Monitor } from "lucide-react";

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
  // Optimistic messages not yet in DB (appended on top of dbMessages)
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // DB messages + any pending optimistic messages
  const messages = [
    ...(dbMessages ?? []),
    ...pendingMessages.filter(
      (pm) => !(dbMessages ?? []).some((db) => db.content === pm.content && db.role === pm.role),
    ),
  ];

  // Clear pending messages when switching conversations
  useEffect(() => {
    setPendingMessages([]);
  }, [conversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedText, isSending]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming || isSending || !connected) return;

    setInput("");
    setIsSending(true);

    let currentConversationId = conversationId;
    let sessionId: string | undefined;

    // If no conversation, create one
    if (!currentConversationId) {
      const session = await createSession(text.slice(0, 50));
      if (!session) {
        setIsSending(false);
        return;
      }
      sessionId = session.id;

      const conversation = await createConversation({
        title: text.slice(0, 50) + (text.length > 50 ? "..." : ""),
        sessionId: session.id,
      });
      currentConversationId = conversation.id;
      router.replace(`/app/chat?id=${conversation.id}`);
    } else {
      const conv = conversations?.find((c) => c.id === currentConversationId);
      sessionId = conv?.sessionId ?? undefined;

      if (!sessionId) {
        const session = await createSession(text.slice(0, 50));
        if (!session) {
          setIsSending(false);
          return;
        }
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
    setPendingMessages((prev) => [...prev, userMsg]);

    // Save user message to DB (don't await — keep UI fast)
    saveMessage({
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
      setPendingMessages((prev) => [...prev, assistantMsg]);
    }

    setIsSending(false);
  }, [
    input,
    isStreaming,
    isSending,
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewConversation = useCallback(() => {
    setPendingMessages([]);
    router.replace("/app/chat");
  }, [router]);

  const handleConversationSelect = useCallback(
    (id: string) => {
      if (id === conversationId) return;
      setPendingMessages([]);
      router.replace(`/app/chat?id=${id}`);
    },
    [conversationId, router],
  );

  const showThinking = isSending || (isStreaming && !streamedText);

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
          {messages.length === 0 && !showThinking ? (
            <EmptyState />
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {showThinking && !streamedText && <ThinkingIndicator />}
              {streamedText && isSending && (
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
                    placeholder="Ask anything... (Enter to send)"
                    rows={1}
                    disabled={!connected || isStreaming || isSending}
                    className="flex-1 resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 transition-colors disabled:opacity-50 bg-transparent"
                  />
                  <button
                    onClick={
                      isStreaming || isSending
                        ? () => abort()
                        : handleSend
                    }
                    disabled={
                      !connected ||
                      (!input.trim() && !isStreaming && !isSending)
                    }
                    className="shrink-0 rounded-lg bg-zinc-900 p-2 text-white transition-colors hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {isStreaming || isSending ? (
                      <Square size={16} />
                    ) : (
                      <Send size={16} />
                    )}
                  </button>
                </div>
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

function ThinkingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1.5 text-sm text-zinc-400 py-2">
        <div className="flex gap-1">
          <span
            className="h-1.5 w-1.5 rounded-full bg-zinc-300 animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="h-1.5 w-1.5 rounded-full bg-zinc-300 animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="h-1.5 w-1.5 rounded-full bg-zinc-300 animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
        <span className="ml-1">Thinking...</span>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
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
          <Streamdown>{message.content}</Streamdown>
        </div>
      </div>
    </div>
  );
}
