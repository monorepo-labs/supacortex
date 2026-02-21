"use client";

import { Suspense, useState, useCallback } from "react";
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
import { Monitor } from "lucide-react";
import type { ChatStatus } from "ai";
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
  PromptInputTools,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionAddAttachments,
} from "@/components/ai-elements/prompt-input";
import { TooltipProvider } from "@/components/ui/tooltip";

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
  // Optimistic messages not yet in DB (appended on top of dbMessages)
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);

  // DB messages + any pending optimistic messages
  const messages = [
    ...(dbMessages ?? []),
    ...pendingMessages.filter(
      (pm) =>
        !(dbMessages ?? []).some(
          (db) => db.content === pm.content && db.role === pm.role,
        ),
    ),
  ];

  // Clear pending messages when switching conversations
  // Using a ref to track previous conversationId to avoid useEffect
  const [prevConvId, setPrevConvId] = useState(conversationId);
  if (prevConvId !== conversationId) {
    setPrevConvId(conversationId);
    setPendingMessages([]);
  }

  // ChatStatus for PromptInputSubmit
  const chatStatus: ChatStatus = isStreaming
    ? "streaming"
    : isSending
      ? "submitted"
      : "ready";

  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming || isSending || !connected) return;

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
        const conv = conversations?.find(
          (c) => c.id === currentConversationId,
        );
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
    },
    [
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
    ],
  );

  const handleSubmit = useCallback(
    (message: { text: string }) => {
      // Don't await — PromptInput waits for the promise to resolve before
      // clearing the textarea. Fire-and-forget so the input clears immediately.
      handleSend(message.text);
    },
    [handleSend],
  );

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

  const showThinking = isSending && !streamedText;
  const showStreaming = streamedText && isSending;

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
      <main className="relative flex-1 bg-white shadow-card rounded-xl m-2 overflow-hidden flex flex-col">
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
          <ConversationContent className="max-w-3xl mx-auto w-full px-4 py-6" scrollClassName="scrollbar-light">
            {messages.length === 0 && !showThinking ? (
              <ConversationEmptyState
                title="Start a conversation"
                description="Ask questions about your bookmarks, get summaries, or explore connections in your saved content."
              />
            ) : (
              <>
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
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
                  <PromptInput onSubmit={handleSubmit}>
                    <PromptInputTextarea placeholder="Ask anything..." />
                    <PromptInputFooter>
                      <PromptInputTools>
                        <PromptInputActionMenu>
                          <PromptInputActionMenuTrigger tooltip="Attach" />
                          <PromptInputActionMenuContent>
                            <PromptInputActionAddAttachments />
                          </PromptInputActionMenuContent>
                        </PromptInputActionMenu>
                      </PromptInputTools>
                      <PromptInputSubmit
                        status={chatStatus}
                        onStop={() => abort()}
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
