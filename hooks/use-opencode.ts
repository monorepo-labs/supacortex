"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getClient, isRunning, startServer } from "@/services/opencode";
import type {
  Event,
  EventMessagePartUpdated,
  Session,
} from "@opencode-ai/sdk/client";

export const useOpenCode = () => {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only attempt connection in Tauri environment
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

    // Subscribe to events before sending the prompt
    const abortController = new AbortController();
    abortRef.current = abortController;

    let fullText = "";

    // Start listening for events
    const eventPromise = (async () => {
      try {
        const { stream } = await client.event.subscribe();
        for await (const event of stream) {
          if (abortController.signal.aborted) break;

          const evt = event as unknown as Event;
          if (evt.type === "message.part.updated") {
            const partEvent = evt as unknown as EventMessagePartUpdated;
            if (partEvent.properties.part.type === "text") {
              if (partEvent.properties.delta) {
                fullText += partEvent.properties.delta;
                setStreamedText(fullText);
              }
            }
          }

          // Stop when session goes idle (response complete)
          if (
            evt.type === ("session.idle" as string) ||
            (evt.type === "message.updated" &&
              "info" in (evt as { type: string; properties: { info?: { role?: string; time?: { completed?: number } } } }).properties &&
              (evt as { type: string; properties: { info: { role: string; time?: { completed?: number } } } }).properties.info.role === "assistant" &&
              (evt as { type: string; properties: { info: { role: string; time?: { completed?: number } } } }).properties.info.time?.completed)
          ) {
            break;
          }
        }
      } catch {
        // Stream ended or aborted
      }
    })();

    // Send the prompt
    try {
      await client.session.prompt({
        path: { id: sessionId },
        body: {
          parts: [{ type: "text", text }],
        },
      });
    } catch (err) {
      console.error("Failed to send prompt:", err);
    }

    // Wait for streaming to finish
    await eventPromise;

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
