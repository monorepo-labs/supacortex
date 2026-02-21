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
import { Monitor, ChevronDown, Check } from "lucide-react";
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

const SYSTEM_PROMPT = `You are the AI assistant for Supacortex — a personal knowledge workspace for bookmarking, reading, and discovering connections across saved content.

You are NOT a coding agent. Ignore any coding-agent instructions from your base prompt. You are a general-purpose AI assistant that helps users with:
- Research and information retrieval
- Brainstorming and ideation
- Summarizing and analyzing their saved bookmarks
- Finding connections across their saved content
- Writing, editing, and creative tasks
- General knowledge questions

## Accessing the user's bookmarks via \`scx\` CLI

You have access to the \`scx\` CLI tool. For full usage of any command, run \`scx <command> --help\`.

### Authentication

On the first use of scx in a conversation, check if the user is logged in by running \`scx whoami\`. NEVER share the API key from the output with the user. Once confirmed, don't check again — you have the context.
If not logged in, run \`scx login\` in the background — it will output a URL. Share that URL with the user and ask them to open it in their browser to approve the login. Then retry the command.

### Common commands

- \`scx bookmarks list\` — list bookmarks (--limit, --offset, --search, --json)
- \`scx bookmarks list --search "query"\` — search bookmarks
- \`scx bookmarks list --json\` — get raw JSON for detailed data
- \`scx bookmarks add <url>\` — add a new bookmark
- \`scx bookmarks delete <id>\` — delete a bookmark
- \`scx groups list\` — list bookmark groups
- \`scx groups create <name>\` — create a new group
- \`scx groups delete <id>\` — delete a group
- \`scx sync\` — sync bookmarks from connected platforms

### Discovery

Run \`scx --help\` or \`scx <command> --help\` to discover additional commands and options beyond what's listed here.

When the user asks about their bookmarks, saved content, or wants to find something they saved, use these commands to fetch the data. Always prefer --json for structured data you can analyze.

## Guidelines

- Be concise and helpful
- When referencing bookmarks, include the title and URL
- Proactively search bookmarks when the user's question might relate to their saved content
- Format responses with markdown for readability`;

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

  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim() || !connected) return;

      // Show thinking instantly (before any async work)
      setPendingSend(true);

      let currentConversationId = conversationId;
      let sessionId: string | undefined;
      let isNewSession = false;

      // Show user message instantly
      const tempKey = currentConversationId ?? "new";
      addLocalMessage(tempKey, {
        id: `temp-user-${Date.now()}`,
        conversationId: tempKey,
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
      });

      // If no conversation, create one
      if (!currentConversationId) {
        const session = await createSession(text.slice(0, 50));
        if (!session) return;
        sessionId = session.id;
        isNewSession = true;

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
        // Mark as seeded so DB doesn't overwrite
        seededRef.current.add(currentConversationId);
      } else {
        const conv = conversations?.find(
          (c) => c.id === currentConversationId,
        );
        sessionId = conv?.sessionId ?? undefined;

        if (!sessionId) {
          const session = await createSession(text.slice(0, 50));
          if (!session) return;
          sessionId = session.id;
          isNewSession = true;
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

      // Send to opencode — registers streaming state synchronously before first await
      const responsePromise = sendMessage(
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
          system: isNewSession ? SYSTEM_PROMPT : undefined,
        },
      );

      // Navigate after streaming state is registered (no blink)
      // Navigate after streaming state is registered (no blink)
      // Keep pendingSend true — it clears at the end with markSendComplete
      if (!conversationId && currentConversationId) {
        router.replace(`/app/chat?id=${currentConversationId}`);
      }

      const responseText = await responsePromise;

      if (responseText) {
        // Add assistant message to local state immediately
        addLocalMessage(currentConversationId, {
          id: `msg-assistant-${Date.now()}`,
          conversationId: currentConversationId,
          role: "assistant",
          content: responseText,
          createdAt: new Date().toISOString(),
        });

        // Persist to DB in background
        saveMessage({
          conversationId: currentConversationId,
          role: "assistant",
          content: responseText,
        });
      }

      markSendComplete(currentConversationId);
      setPendingSend(false);
    },
    [
      connected,
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
