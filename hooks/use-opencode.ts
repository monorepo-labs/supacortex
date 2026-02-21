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

export const useSendMessage = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async (sessionId: string, text: string) => {
    setIsStreaming(true);
    setStreamedText("");

    const client = getClient();
    const abortController = new AbortController();
    abortRef.current = abortController;

    let fullText = "";

    // Subscribe to SSE events FIRST
    let streamRef: AsyncIterable<unknown> | null = null;
    try {
      const result = await client.event.subscribe();
      streamRef = result.stream;
      console.log("[opencode] SSE stream connected");
    } catch (err) {
      console.error("[opencode] Failed to subscribe to events:", err);
    }

    // Start consuming the stream in the background (don't await yet)
    const streamPromise = (async () => {
      if (!streamRef) return;
      try {
        for await (const event of streamRef) {
          if (abortController.signal.aborted) break;

          const evt = event as {
            type: string;
            properties: Record<string, unknown>;
          };
          console.log("[opencode] Event:", evt.type);

          if (evt.type === "message.part.updated") {
            const props = evt.properties as {
              part: { type: string };
              delta?: string;
            };
            if (props.part.type === "text" && props.delta) {
              fullText += props.delta;
              setStreamedText(fullText);
            }
          }

          if (evt.type === "session.idle") {
            console.log("[opencode] Session idle");
            break;
          }
          if (evt.type === "message.updated") {
            const props = evt.properties as {
              info?: { role?: string; time?: { completed?: number } };
            };
            if (
              props.info?.role === "assistant" &&
              props.info?.time?.completed
            ) {
              console.log("[opencode] Assistant message completed");
              break;
            }
          }
        }
      } catch (err) {
        console.error("[opencode] Stream error:", err);
      }
    })();

    // Send the prompt (stream is already being consumed above)
    try {
      console.log("[opencode] Sending prompt to session:", sessionId);
      await client.session.prompt({
        path: { id: sessionId },
        body: {
          parts: [{ type: "text", text }],
        },
      });
      console.log("[opencode] Prompt sent successfully");
    } catch (err) {
      console.error("[opencode] Failed to send prompt:", err);
      abortController.abort();
      setIsStreaming(false);
      abortRef.current = null;
      return "";
    }

    // Wait for streaming to finish
    await streamPromise;

    // If we got no text from streaming, fetch messages directly as fallback
    if (!fullText) {
      console.log("[opencode] No streamed text, fetching messages as fallback");
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

    setIsStreaming(false);
    abortRef.current = null;
    return fullText;
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return { send, abort, isStreaming, streamedText };
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
