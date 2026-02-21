"use client";

import { Suspense, useState, useCallback, useRef, useEffect } from "react";
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
  useProviders,
  type ProviderModel,
} from "@/hooks/use-opencode";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import { Monitor, ChevronDown, Check, X } from "lucide-react";
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
  } = useSendMessage();
  const { providers, defaultModel } = useProviders(connected);

  const { data: conversations } = useConversations();
  const { data: dbMessages } = useMessages(conversationId);
  const { mutateAsync: createConversation } = useCreateConversation();
  const { mutate: updateConversation } = useUpdateConversation();
  const { mutateAsync: saveMessage } = useSaveMessage();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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

  // Local flag for instant "Thinking..." before conversationId exists
  const [pendingSend, setPendingSend] = useState(false);

  // Per-conversation streaming state
  const { isSending: hookSending, isStreaming, streamedText } = getState(conversationId);
  const isSending = hookSending || pendingSend;

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

  // Messages for the active conversation
  const localKey = conversationId ?? "new";
  const messages = localMessages.get(localKey) ?? [];

  // ChatStatus for PromptInputSubmit
  const chatStatus: ChatStatus = isStreaming
    ? "streaming"
    : isSending
      ? "submitted"
      : "ready";

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

  // Queue for messages sent while streaming is active
  const queueRef = useRef<string[]>([]);
  const sendingRef = useRef(false);
  const [queueLength, setQueueLength] = useState(0);

  // Core send logic — sends one message and processes queue after
  const doSend = useCallback(
    async (text: string) => {
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
        seededRef.current.add(currentConversationId);

        router.replace(`/app/chat?id=${currentConversationId}`);
      } else {
        const conv = conversations?.find(
          (c) => c.id === currentConversationId,
        );
        sessionId = conv?.sessionId ?? undefined;

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

      // Save user message to DB in background
      saveMessage({
        conversationId: currentConversationId,
        role: "user",
        content: text,
      });

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
      }

      markSendComplete(currentConversationId);
    },
    [
      conversationId,
      conversations,
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
    async (text: string) => {
      sendingRef.current = true;
      setPendingSend(true);

      await doSend(text);

      // Drain queued messages
      while (queueRef.current.length > 0) {
        const next = queueRef.current.shift()!;
        setQueueLength(queueRef.current.length);
        // Show queued user message now that it's being sent
        if (conversationId) {
          addLocalMessage(conversationId, {
            id: `temp-user-${Date.now()}`,
            conversationId,
            role: "user",
            content: next,
            createdAt: new Date().toISOString(),
          });
        }
        setPendingSend(true);
        await doSend(next);
      }

      sendingRef.current = false;
      setPendingSend(false);
      setQueueLength(0);
    },
    [doSend, conversationId, addLocalMessage],
  );

  const handleSend = useCallback(
    (text: string) => {
      if (!text.trim() || !connected) return;

      if (sendingRef.current) {
        // Currently streaming — queue the message (don't show in chat yet)
        queueRef.current.push(text);
        setQueueLength(queueRef.current.length);
      } else {
        // No active stream — show user message and send immediately
        const tempKey = conversationId ?? "new";
        addLocalMessage(tempKey, {
          id: `temp-user-${Date.now()}`,
          conversationId: tempKey,
          role: "user",
          content: text,
          createdAt: new Date().toISOString(),
        });
        processQueue(text);
      }
    },
    [connected, conversationId, addLocalMessage, processQueue],
  );

  const handleSubmit = useCallback(
    (message: { text: string }) => {
      handleSend(message.text);
    },
    [handleSend],
  );

  const handleNewConversation = useCallback(() => {
    router.replace("/app/chat");
  }, [router]);

  const handleConversationSelect = useCallback(
    (id: string) => {
      if (id === conversationId) return;
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
    queueRef.current = [];
    setQueueLength(0);
  }, []);

  const handleModelSelect = useCallback((model: ProviderModel) => {
    setSelectedModel(model);
    setModelSelectorOpen(false);
    try {
      localStorage.setItem("opencode-selected-model", JSON.stringify(model));
    } catch {
      // ignore
    }
  }, []);

  const showThinking = isSending && !streamedText;
  const showStreaming = streamedText && isSending;
  // Show thinking below streamed text during tool calls (has text, sending, but not actively streaming)
  const showToolCallThinking = isSending && !!streamedText && !isStreaming;

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
