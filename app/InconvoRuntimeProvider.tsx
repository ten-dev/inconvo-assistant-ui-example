"use client";

import {
  AssistantRuntimeProvider,
  ThreadUserMessage,
} from "@assistant-ui/react";
import { useExternalStoreRuntime } from "@assistant-ui/react";
import { ExternalStoreAdapter } from "@assistant-ui/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  createContext,
  useContext,
} from "react";
import { usePathname } from "next/navigation";
import type {
  ConversationCreateResponse,
  InconvoConversation,
  ResponseCreateResponse,
} from "@inconvoai/node/resources/conversations";
import type { ConversationListResponsesConversationsCursor } from "@inconvoai/node/resources/conversations";

type ResponseCreateResponseOptionalId = Omit<
  ResponseCreateResponse,
  "id" | "conversationId"
> & {
  id?: string;
};

type InconvoMessage = {
  id: string;
  role: "user" | "assistant";
  content: ResponseCreateResponseOptionalId;
};

export const InconvoStateContext = createContext<{
  isLoading: boolean;
  conversationId: string | null;
  clearConversation?: () => void;
}>({ isLoading: false, conversationId: null });

export const useInconvoState = () => useContext(InconvoStateContext);

export function InconvoRuntimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const urlConversationId = pathname.startsWith("/c/")
    ? pathname.split("/c/")[1]
    : undefined;
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<InconvoMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [threads, setThreads] = useState<
    Array<{ threadId: string; title: string }>
  >([]);
  const conversationIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch conversation list
  const fetchThreads = useCallback(async () => {
    try {
      const response = await fetch("/api/inconvo/conversations");
      if (response.ok) {
        const data =
          (await response.json()) as ConversationListResponsesConversationsCursor;
        const threads = data.items.map((conv) => ({
          threadId: conv.id,
          title: conv.title || "Untitled Conversation",
          createdAt: conv.createdAt,
        }));
        setThreads(threads);
      }
    } catch (error) {
      console.error("Failed to fetch threads:", error);
    }
  }, []);

  // Switch to a thread
  const switchToThread = useCallback(async (threadId: string) => {
    setIsLoading(true);
    setMessages([]);
    try {
      const response = await fetch(`/api/inconvo/conversations?id=${threadId}`);
      if (response.ok) {
        const conversation = (await response.json()) as InconvoConversation;
        conversationIdRef.current = threadId;
        setConversationId(threadId);
        if (conversation.messages?.length > 0) {
          setMessages(
            conversation.messages.map((msg) => ({
              id: msg.id || Math.random().toString(36).substring(7),
              role: msg.id ? "assistant" : "user",
              content: msg,
            }))
          );
        }
      }
    } catch (error) {
      console.error("Failed to switch thread:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize
  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // Handle URL-based conversation changes
  useEffect(() => {
    if (urlConversationId) {
      switchToThread(urlConversationId);
    } else {
      setIsLoading(false);
      setMessages([]);
      conversationIdRef.current = null;
      setConversationId(null);
    }
  }, [urlConversationId, switchToThread]);

  const streamResponse = async (
    message: string,
    assistantMessageId: string
  ) => {
    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const response = await fetch("/api/inconvo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        conversationId: conversationIdRef.current,
      }),
      signal: abortController.signal,
    });

    if (!response.ok) throw new Error("Failed to get response");

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) throw new Error("No response body");

    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process each line in the buffer
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.trim()) {
            try {
              const event = JSON.parse(line);
              if (event.type === "response.agent_step" && event.message) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? {
                          ...msg,
                          content: { type: "text", message: event.message },
                        }
                      : msg
                  )
                );
              } else if (event.type === "response.completed") {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: event.response }
                      : msg
                  )
                );
              }
            } catch (e) {
              console.error("Failed to parse event:", e);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Request aborted");
      } else {
        throw error;
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  const onNew = useCallback(
    async (message: ThreadUserMessage) => {
      setIsRunning(true);
      // Create conversation if needed
      if (!conversationIdRef.current) {
        try {
          const response = await fetch("/api/inconvo/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });

          if (response.ok) {
            const data = (await response.json()) as ConversationCreateResponse;
            if (!data || !data.id) {
              throw new Error("Invalid conversation response");
            }
            conversationIdRef.current = data.id;
            setConversationId(data.id);
          } else {
            return;
          }
        } catch (error) {
          console.error("Error creating conversation:", error);
          return;
        }
      }

      const userMessage: InconvoMessage = {
        id: Math.random().toString(36).substring(7),
        role: message.role,
        content: {
          type: "text",
          message: message.content[0].text,
        },
      };

      const assistantMessage: InconvoMessage = {
        id: Math.random().toString(36).substring(7),
        role: "assistant",
        content: {
          type: "text",
          message: "Loading...",
        },
      };
      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      try {
        await streamResponse(userMessage.content.message, assistantMessage.id);
      } catch (error) {
        console.error("Inconvo error:", error);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessage.id
              ? {
                  ...msg,
                  content: {
                    type: "text",
                    message: "Sorry, I encountered an error. Please try again.",
                  },
                }
              : msg
          )
        );
      } finally {
        setIsRunning(false);
        setTimeout(fetchThreads, 1000);
      }
    },
    [fetchThreads]
  );

  const onCancel = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsRunning(false);
    }
  }, []);

  const clearConversation = useCallback(() => {
    setMessages([]);
    conversationIdRef.current = null;
    setConversationId(null);
    setIsLoading(false);
  }, []);

  const adapter: ExternalStoreAdapter<InconvoMessage> = {
    isRunning,
    messages,
    setMessages,
    convertMessage: (message: InconvoMessage) => ({
      id: message.id,
      role: message.role,
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(message.content),
        },
      ],
    }),
    onNew,
    onEdit: onNew,
    onCancel,
    adapters: {
      threadList: {
        threadId: conversationId ?? undefined,
        threads: threads.map((t) => ({
          threadId: t.threadId,
          title: t.title,
          status: "regular" as const,
        })),
        onSwitchToNewThread: () => {
          setMessages([]);
          conversationIdRef.current = null;
          setConversationId(null);
        },
        onSwitchToThread: () => {},
      },
    },
  };

  const runtime = useExternalStoreRuntime(adapter);

  return (
    <InconvoStateContext.Provider
      value={{
        isLoading,
        conversationId,
        clearConversation,
      }}
    >
      <AssistantRuntimeProvider runtime={runtime}>
        {children}
      </AssistantRuntimeProvider>
    </InconvoStateContext.Provider>
  );
}
