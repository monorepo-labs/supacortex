"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getClient, isRunning, startServer } from "@/services/opencode";
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
        const running = await isRunning();
        if (!running) {
          await startServer();
        }
        if (!cancelled) setConnected(true);
      } catch (err) {
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

interface StreamState {
  isSending: boolean;
  isStreaming: boolean;
  streamedText: string;
  sessionId: string | null;
  resolve: ((text: string) => void) | null;
}

const defaultStreamState = {
  isSending: false,
  isStreaming: false,
  streamedText: "",
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
              if (!state || !state.isStreaming) continue;

              state.streamedText += props.delta;
              rerender();
            }

            if (evt.type === "session.idle") {
              const props = evt.properties as { sessionID: string };
              const convId = sessionToConvRef.current.get(props.sessionID);
              if (!convId) continue;

              const state = streamsRef.current.get(convId);
              if (!state) continue;

              state.isStreaming = false;
              // Resolve the send promise with accumulated text
              state.resolve?.(state.streamedText);
              state.resolve = null;
              rerender();
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
    async (conversationId: string, sessionId: string, text: string) => {
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
      });
      sessionToConvRef.current.set(sessionId, conversationId);
      rerender();

      // Ensure shared SSE listener is running
      ensureListener();

      // Send prompt (non-blocking)
      const client = getClient();
      try {
        await client.session.promptAsync({
          path: { id: sessionId },
          body: { parts: [{ type: "text", text }] },
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

  return { send, abort, getState, markSendComplete };
};

export const useCreateSession = () => {
  const [creating, setCreating] = useState(false);

  const create = useCallback(async (title?: string) => {
    setCreating(true);
    try {
      const client = getClient();
      const { data } = await client.session.create({
        body: { title: title || "New conversation" },
      });
      return data;
    } finally {
      setCreating(false);
    }
  }, []);

  return { create, creating };
};
