"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getClient, isRunning, startServer, getHomeDir } from "@/services/opencode";
import type { Session } from "@opencode-ai/sdk/client";

export const useOpenCode = () => {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !(window as unknown as { __TAURI_INTERNALS__: unknown })
        .__TAURI_INTERNALS__
    )
      return;

    let cancelled = false;

    const connect = async () => {
      setConnecting(true);
      setError(null);
      try {
        console.log("[opencode] Checking if server is running...");
        const running = await isRunning();
        console.log("[opencode] Server running:", running);
        if (!running) {
          console.log("[opencode] Starting server...");
          await startServer();
          console.log("[opencode] Server started successfully");
        }
        if (!cancelled) setConnected(true);
      } catch (err) {
        console.error("[opencode] Connection failed:", err);
        if (!cancelled)
          setError(
            err instanceof Error
              ? err.message
              : "Failed to connect to OpenCode",
          );
      } finally {
        if (!cancelled) setConnecting(false);
      }
    };

    connect();
    return () => {
      cancelled = true;
    };
  }, []);

  return { connected, connecting, error };
};

export const useOpenCodeSessions = (connected: boolean) => {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    if (!connected) return;

    const fetchSessions = async () => {
      try {
        const client = getClient();
        const { data } = await client.session.list();
        if (data) setSessions(Object.values(data));
      } catch {
        // silently fail
      }
    };

    fetchSessions();
  }, [connected]);

  return sessions;
};

export interface TokenUsage {
  input: number;
  output: number;
  reasoning: number;
  cacheRead: number;
  cacheWrite: number;
  cost: number;
}

interface StreamState {
  isSending: boolean;
  isStreaming: boolean;
  streamedText: string;
  sessionId: string | null;
  resolve: ((text: string) => void) | null;
  idleTimeout: ReturnType<typeof setTimeout> | null;
  tokens: TokenUsage;
}

const emptyTokens: TokenUsage = { input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0, cost: 0 };

const defaultStreamState = {
  isSending: false,
  isStreaming: false,
  streamedText: "",
  tokens: emptyTokens,
};

export const useSendMessage = () => {
  // Per-conversation state keyed by conversationId
  const streamsRef = useRef<Map<string, StreamState>>(new Map());
  // Reverse lookup: sessionId → conversationId (for routing SSE events)
  const sessionToConvRef = useRef<Map<string, string>>(new Map());
  // Single shared SSE listener
  const listenerRef = useRef<{ active: boolean; stop: () => void } | null>(
    null,
  );
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick((t) => t + 1), []);

  const getState = useCallback(
    (conversationId: string | null) => {
      if (!conversationId) return defaultStreamState;
      const state = streamsRef.current.get(conversationId);
      if (!state) return defaultStreamState;
      return {
        isSending: state.isSending,
        isStreaming: state.isStreaming,
        streamedText: state.streamedText,
        tokens: state.tokens,
      };
    },
    [],
  );

  // Start the shared SSE listener (idempotent — only one runs at a time)
  const ensureListener = useCallback(() => {
    if (listenerRef.current?.active) return;

    let stopped = false;
    const listener = {
      active: true,
      stop: () => {
        stopped = true;
        listener.active = false;
      },
    };
    listenerRef.current = listener;

    (async () => {
      while (!stopped) {
        try {
          const client = getClient();
          const { stream } = await client.event.subscribe();

          for await (const event of stream) {
            if (stopped) break;

            const evt = event as {
              type: string;
              properties: Record<string, unknown>;
            };

            if (evt.type === "message.part.delta") {
              const props = evt.properties as {
                sessionID: string;
                delta: string;
                field: string;
              };
              if (props.field !== "text") continue;

              const convId = sessionToConvRef.current.get(props.sessionID);
              if (!convId) continue;

              const state = streamsRef.current.get(convId);
              if (!state || !state.isSending) continue;

              state.isStreaming = true;
              state.streamedText += props.delta;
              rerender();
            }

            // Track token usage from assistant message updates
            if (evt.type === "message.updated") {
              const props = evt.properties as {
                info: {
                  role: string;
                  sessionID: string;
                  tokens?: { input: number; output: number; reasoning: number; cache: { read: number; write: number } };
                  cost?: number;
                };
              };
              if (props.info.role === "assistant" && props.info.tokens) {
                const convId = sessionToConvRef.current.get(props.info.sessionID);
                if (convId) {
                  const state = streamsRef.current.get(convId);
                  if (state) {
                    state.tokens = {
                      input: props.info.tokens.input,
                      output: props.info.tokens.output,
                      reasoning: props.info.tokens.reasoning,
                      cacheRead: props.info.tokens.cache.read,
                      cacheWrite: props.info.tokens.cache.write,
                      cost: props.info.cost ?? 0,
                    };
                    rerender();
                  }
                }
              }
            }

            // session.status busy → cancel any pending idle timeout
            if (evt.type === "session.status") {
              const props = evt.properties as {
                sessionID: string;
                status: { type: string };
              };
              const convId = sessionToConvRef.current.get(props.sessionID);
              if (!convId) continue;
              const state = streamsRef.current.get(convId);
              if (!state) continue;

              if (props.status.type === "busy") {
                // Session became busy again (e.g. tool call) — cancel idle timeout
                if (state.idleTimeout) {
                  clearTimeout(state.idleTimeout);
                  state.idleTimeout = null;
                }
              }
            }

            // session.idle — debounce: only resolve if no busy follows within 500ms
            if (evt.type === "session.idle") {
              const props = evt.properties as { sessionID: string };
              const convId = sessionToConvRef.current.get(props.sessionID);
              if (!convId) continue;

              const state = streamsRef.current.get(convId);
              if (!state) continue;

              // Clear any existing timeout
              if (state.idleTimeout) {
                clearTimeout(state.idleTimeout);
              }

              state.idleTimeout = setTimeout(() => {
                state.idleTimeout = null;
                state.isStreaming = false;
                state.resolve?.(state.streamedText);
                state.resolve = null;
                rerender();
              }, 500);
            }
          }
        } catch (err) {
          console.error("[opencode] SSE listener error, reconnecting:", err);
          if (!stopped) {
            // Brief pause before reconnecting
            await new Promise((r) => setTimeout(r, 1000));
          }
        }
      }
    })();
  }, [rerender]);

  const send = useCallback(
    async (
      conversationId: string,
      sessionId: string,
      text: string,
      options?: {
        model?: { providerID: string; modelID: string };
        system?: string;
        agent?: string;
        files?: Array<{ url: string; mime: string; filename?: string }>;
        directory?: string;
      },
    ) => {
      // Create a promise that resolves when session.idle fires
      let resolveStream: (text: string) => void;
      const streamDone = new Promise<string>((resolve) => {
        resolveStream = resolve;
      });

      // Register state
      streamsRef.current.set(conversationId, {
        isSending: true,
        isStreaming: true,
        streamedText: "",
        sessionId,
        resolve: resolveStream!,
        idleTimeout: null,
        tokens: emptyTokens,
      });
      sessionToConvRef.current.set(sessionId, conversationId);
      rerender();

      // Ensure shared SSE listener is running
      ensureListener();

      // Send prompt (non-blocking)
      const client = getClient();
      try {
        const parts: Array<{ type: "text"; text: string } | { type: "file"; url: string; mime: string; filename?: string }> = [
          { type: "text", text },
        ];
        if (options?.files?.length) {
          for (const f of options.files) {
            parts.push({ type: "file", url: f.url, mime: f.mime, filename: f.filename });
          }
        }

        // Build system prompt with directory instruction if needed
        let system = options?.system;
        if (options?.directory) {
          const dirInstruction = `IMPORTANT: Your working directory for this conversation is ${options.directory}. Always \`cd ${options.directory}\` before running any shell commands.`;
          system = system ? `${system}\n\n${dirInstruction}` : dirInstruction;
        }

        await client.session.promptAsync({
          path: { id: sessionId },
          body: {
            parts: parts as Array<{ type: "text"; text: string }>,
            ...(options?.model ? { model: options.model } : {}),
            ...(system ? { system } : {}),
            ...(options?.agent ? { agent: options.agent } : {}),
          },
        });
      } catch (err) {
        console.error("[opencode] Failed to send prompt:", err);
        const state = streamsRef.current.get(conversationId);
        if (state) {
          state.isSending = false;
          state.isStreaming = false;
          state.resolve = null;
        }
        rerender();
        return "";
      }

      // Wait for streaming to complete (resolved by SSE listener on session.idle)
      // Timeout after 5 minutes to prevent hanging forever
      const timeout = new Promise<string>((resolve) =>
        setTimeout(() => resolve(""), 5 * 60 * 1000),
      );
      let fullText = await Promise.race([streamDone, timeout]);

      // Fallback: fetch messages if streaming captured nothing
      if (!fullText) {
        try {
          const { data: messages } = await client.session.messages({
            path: { id: sessionId },
          });
          if (messages && Array.isArray(messages)) {
            for (let i = messages.length - 1; i >= 0; i--) {
              const msg = messages[i] as {
                info: { role: string };
                parts: Array<{ type: string; text?: string }>;
              };
              if (msg.info.role === "assistant") {
                const textParts = msg.parts
                  .filter((p) => p.type === "text" && p.text)
                  .map((p) => p.text!);
                fullText = textParts.join("\n");
                break;
              }
            }
          }
        } catch (err) {
          console.error("[opencode] Failed to fetch messages:", err);
        }
      }

      return fullText;
    },
    [rerender, ensureListener],
  );

  const markSendComplete = useCallback(
    (conversationId: string) => {
      const state = streamsRef.current.get(conversationId);
      if (state) {
        state.isSending = false;
        rerender();
      }
    },
    [rerender],
  );

  const abort = useCallback(
    async (conversationId: string) => {
      const state = streamsRef.current.get(conversationId);
      if (!state) return;

      state.isSending = false;
      state.isStreaming = false;
      if (state.idleTimeout) {
        clearTimeout(state.idleTimeout);
        state.idleTimeout = null;
      }
      // Resolve the pending promise so send() doesn't hang
      state.resolve?.("");
      state.resolve = null;
      rerender();

      if (state.sessionId) {
        try {
          const client = getClient();
          await client.session.abort({ path: { id: state.sessionId } });
        } catch {
          // ignore
        }
      }
    },
    [rerender],
  );

  // Load token usage from existing session messages (for page reload)
  const loadTokens = useCallback(
    async (conversationId: string, sessionId: string) => {
      try {
        const client = getClient();
        const { data: messages } = await client.session.messages({
          path: { id: sessionId },
        });
        if (!messages || !Array.isArray(messages)) return;

        let totalInput = 0, totalOutput = 0, totalReasoning = 0, totalCacheRead = 0, totalCacheWrite = 0, totalCost = 0;
        for (const msg of messages) {
          const m = msg as { info: { role: string; tokens?: { input: number; output: number; reasoning: number; cache: { read: number; write: number } }; cost?: number } };
          if (m.info.role === "assistant" && m.info.tokens) {
            totalInput += m.info.tokens.input;
            totalOutput += m.info.tokens.output;
            totalReasoning += m.info.tokens.reasoning;
            totalCacheRead += m.info.tokens.cache.read;
            totalCacheWrite += m.info.tokens.cache.write;
            totalCost += m.info.cost ?? 0;
          }
        }

        if (totalInput + totalOutput > 0) {
          const existing = streamsRef.current.get(conversationId);
          if (existing) {
            existing.tokens = { input: totalInput, output: totalOutput, reasoning: totalReasoning, cacheRead: totalCacheRead, cacheWrite: totalCacheWrite, cost: totalCost };
          } else {
            streamsRef.current.set(conversationId, {
              isSending: false,
              isStreaming: false,
              streamedText: "",
              sessionId,
              resolve: null,
              idleTimeout: null,
              tokens: { input: totalInput, output: totalOutput, reasoning: totalReasoning, cacheRead: totalCacheRead, cacheWrite: totalCacheWrite, cost: totalCost },
            });
          }
          rerender();
        }
      } catch {
        // silently fail
      }
    },
    [rerender],
  );

  return { send, abort, getState, markSendComplete, loadTokens };
};

export const useCreateSession = () => {
  const [creating, setCreating] = useState(false);

  const create = useCallback(async (title?: string, directory?: string) => {
    setCreating(true);
    try {
      const client = getClient();
      // Default to home directory so sessions don't inherit the server's CWD
      const dir = directory || await getHomeDir();
      const { data } = await client.session.create({
        body: { title: title || "New conversation" },
        query: { directory: dir },
      });
      return data;
    } finally {
      setCreating(false);
    }
  }, []);

  return { create, creating };
};

export interface ProviderModel {
  id: string;
  name: string;
  providerId: string;
  providerName: string;
  contextLimit: number;
  outputLimit: number;
}

export interface ProviderInfo {
  id: string;
  name: string;
  models: ProviderModel[];
}

export const useProviders = (connected: boolean) => {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [defaultModel, setDefaultModel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!connected) return;

    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      try {
        const client = getClient();
        const { data } = await client.config.providers();
        if (cancelled || !data) return;

        const result = data as unknown as {
          providers: Array<{
            id: string;
            name: string;
            models: Record<
              string,
              {
                id: string;
                name: string;
                limit: { context: number; output: number };
              }
            >;
          }>;
          default: Record<string, string>;
        };

        const providerList: ProviderInfo[] = result.providers.map((p) => ({
          id: p.id,
          name: p.name,
          models: Object.values(p.models).map((m) => ({
            id: m.id,
            name: m.name,
            providerId: p.id,
            providerName: p.name,
            contextLimit: m.limit?.context ?? 0,
            outputLimit: m.limit?.output ?? 0,
          })),
        }));

        setProviders(providerList);
        // default might be keyed as "default", "chat", or similar
        const defModel =
          result.default?.default ?? Object.values(result.default ?? {})[0];
        if (defModel) {
          setDefaultModel(defModel);
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetch();
    return () => {
      cancelled = true;
    };
  }, [connected]);

  return { providers, defaultModel, loading };
};
