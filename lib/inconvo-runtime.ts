import { useExternalStoreRuntime } from "@assistant-ui/react";
import { ExternalStoreAdapter } from "@assistant-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";

export type InconvoMessageContent = 
  | string
  | {
      text: string;
      type?: "chart" | "table";
      chart?: any;
      table?: any;
    };

export type InconvoMessage = {
  id: string;
  role: "user" | "assistant";
  content: InconvoMessageContent;
  createdAt: Date;
};

export const useInconvoRuntime = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<InconvoMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [threads, setThreads] = useState<
    Array<{ threadId: string; title: string }>
  >([]);
  const conversationIdRef = useRef<string | null>(null);

  // Fetch conversation list
  const fetchThreads = useCallback(async () => {
    try {
      const response = await fetch("/api/inconvo/conversations");
      if (response.ok) {
        const data = await response.json();
        setThreads(data.threads || []);
      }
    } catch (error) {
      console.error("Failed to fetch threads:", error);
    }
  }, []);

  // Create a conversation on mount and fetch existing threads
  useEffect(() => {
    const initialize = async () => {
      console.log("Initializing...");

      // Fetch existing threads first
      await fetchThreads();

      // Create a new conversation
      try {
        const response = await fetch("/api/inconvo/conversations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            context: {}, // The API will add organisationId from env
          }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log("Conversation created:", data);
          conversationIdRef.current = data.conversationId;
          setConversationId(data.conversationId);

          // Refresh thread list to include new conversation
          fetchThreads();
        } else {
          console.error(
            "Failed to create conversation:",
            response.status,
            await response.text()
          );
        }
      } catch (error) {
        console.error("Failed to create conversation:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [fetchThreads]);

  // Function to switch to a thread
  const switchToThread = useCallback(async (threadId: string) => {
    console.log("Switching to thread:", threadId);
    setIsLoading(true);
    setMessages([]);

    try {
      // Get conversation details
      const response = await fetch(`/api/inconvo/conversations?id=${threadId}`);
      if (response.ok) {
        const conversation = await response.json();
        conversationIdRef.current = threadId;
        setConversationId(threadId);

        // Convert conversation messages to our format
        if (conversation.messages && conversation.messages.length > 0) {
          const convertedMessages: InconvoMessage[] = conversation.messages.map(
            (msg: any, idx: number) => {
              let content = msg.message;
              
              // For chart/table messages, create a structured content object
              if (msg.type === 'chart' && msg.chart) {
                content = {
                  text: msg.message,
                  type: 'chart',
                  chart: msg.chart
                };
              } else if (msg.type === 'table' && msg.table) {
                content = {
                  text: msg.message,
                  type: 'table',
                  table: msg.table
                };
              }
              
              
              return {
                id: msg.id || `msg-${idx}`,
                role: msg.id ? "assistant" : "user", // Messages with IDs are from Inconvo (assistant)
                content: content,
                createdAt: new Date(),
              };
            }
          );
          setMessages(convertedMessages);
        }
      }
    } catch (error) {
      console.error("Failed to switch thread:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Function to create a new conversation
  const createNewConversation = useCallback(async () => {
    setIsLoading(true);
    setMessages([]);

    try {
      const response = await fetch("/api/inconvo/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          context: {}, // The API will add organisationId from env
        }),
      });

      if (response.ok) {
        const data = await response.json();
        conversationIdRef.current = data.conversationId;
        setConversationId(data.conversationId);

        // Refresh thread list
        fetchThreads();
      }
    } catch (error) {
      console.error("Failed to create conversation:", error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchThreads]);

  const adapter: ExternalStoreAdapter<InconvoMessage> = {
    isRunning,
    isLoading,
    messages,
    setMessages,

    // Convert Inconvo messages to assistant-ui format
    convertMessage: (message: InconvoMessage) => ({
      id: message.id,
      role: message.role,
      content: [{ 
        type: "text" as const, 
        text: typeof message.content === 'string' 
          ? message.content 
          : JSON.stringify(message.content)
      }],
      createdAt: message.createdAt,
    }),

    // Handle new messages
    onNew: useCallback(
      async (message) => {
        // If no conversation exists, try to create one
        if (!conversationIdRef.current) {
          console.log("No conversation ID, creating one now...");

          try {
            const response = await fetch("/api/inconvo/conversations", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                context: {},
              }),
            });

            if (response.ok) {
              const data = await response.json();
              conversationIdRef.current = data.conversationId;
              setConversationId(data.conversationId);
              console.log(
                "Conversation created on demand:",
                data.conversationId
              );
            } else {
              console.error("Failed to create conversation on demand");
              return;
            }
          } catch (error) {
            console.error("Error creating conversation on demand:", error);
            return;
          }
        }

        const userMessage: InconvoMessage = {
          id: Math.random().toString(36).substring(7),
          role: "user",
          content:
            message.content[0]?.type === "text" ? message.content[0].text : "",
          createdAt: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setIsRunning(true);

        try {
          // Call the API endpoint with just the current message
          const response = await fetch("/api/inconvo", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: userMessage.content,
              conversationId: conversationIdRef.current,
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to get response");
          }

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (!reader) {
            throw new Error("No response body");
          }

          const assistantMessage: InconvoMessage = {
            id: Math.random().toString(36).substring(7),
            role: "assistant",
            content: "",
            createdAt: new Date(),
          };

          // Add initial assistant message
          setMessages((prev) => [...prev, assistantMessage]);

          let buffer = "";
          let finalResponse: any = null;

          // Process the stream
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            
            // Process complete JSON objects from buffer
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer
            
            for (const line of lines) {
              if (!line.trim()) continue;
              
              try {
                const event = JSON.parse(line);
                
                if (event.type === 'agent_step' && event.message) {
                  // Show agent steps as part of the message
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessage.id
                        ? { ...msg, content: event.message }
                        : msg
                    )
                  );
                } else if (event.type === 'completed' && event.response) {
                  finalResponse = event.response;
                }
              } catch (e) {
                console.error('Failed to parse event:', e);
              }
            }
          }

          // Update with final response
          if (finalResponse) {
            // Handle different response types
            let content: InconvoMessageContent;
            if (finalResponse.type === 'chart' && finalResponse.chart) {
              content = {
                text: finalResponse.message,
                type: 'chart',
                chart: finalResponse.chart
              };
            } else if (finalResponse.type === 'table' && finalResponse.table) {
              content = {
                text: finalResponse.message,
                type: 'table',
                table: finalResponse.table
              };
            } else {
              content = finalResponse.message || "No response received.";
            }
            
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessage.id
                  ? { ...msg, content }
                  : msg
              )
            );
          } else {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessage.id
                  ? { ...msg, content: "No response received from Inconvo." }
                  : msg
              )
            );
          }
        } catch (error) {
          console.error("Inconvo error:", error);
          const errorMessage: InconvoMessage = {
            id: Math.random().toString(36).substring(7),
            role: "assistant",
            content: "Sorry, I encountered an error. Please try again.",
            createdAt: new Date(),
          };
          setMessages((prev) => [...prev.slice(0, -1), errorMessage]);
        } finally {
          console.log("Setting isRunning to false");
          setIsRunning(false);

          // Refresh thread list after a delay
          setTimeout(fetchThreads, 1000);
        }
      },
      [fetchThreads]
    ),

    // Handle message editing
    onEdit: useCallback(async (message) => {
      // For now, we'll treat edits as new messages
      // You could implement proper edit functionality if needed
      await adapter.onNew(message);
    }, []),

    // Handle reload - resend the message to regenerate response
    onReload: useCallback(
      async (parentId) => {
        if (!conversationIdRef.current) {
          console.error("No conversation ID available");
          return;
        }

        const parentIndex = messages.findIndex((m) => m.id === parentId);
        if (parentIndex >= 0) {
          // Find the user message to resend
          let userMessageIndex = parentIndex;
          if (messages[parentIndex].role === "assistant") {
            // If reloading from assistant message, find the preceding user message
            userMessageIndex = parentIndex - 1;
          }

          const userMessage = messages[userMessageIndex];
          if (userMessage && userMessage.role === "user") {
            // Remove messages after the user message
            setMessages((prev) => prev.slice(0, userMessageIndex + 1));

            setIsRunning(true);

            try {
              // Resend to API
              const response = await fetch("/api/inconvo", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  message: typeof userMessage.content === 'string' 
                    ? userMessage.content 
                    : userMessage.content.text,
                  conversationId: conversationIdRef.current,
                }),
              });

              if (!response.ok) {
                throw new Error("Failed to get response");
              }

              const reader = response.body?.getReader();
              const decoder = new TextDecoder();

              if (!reader) {
                throw new Error("No response body");
              }

              const assistantMessage: InconvoMessage = {
                id: Math.random().toString(36).substring(7),
                role: "assistant",
                content: "",
                createdAt: new Date(),
              };

              setMessages((prev) => [...prev, assistantMessage]);

              let buffer = "";
              let finalResponse: any = null;

              // Process the stream (same as onNew)
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;
                
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                  if (!line.trim()) continue;
                  
                  try {
                    const event = JSON.parse(line);
                    
                    if (event.type === 'agent_step' && event.message) {
                      setMessages((prev) =>
                        prev.map((msg) =>
                          msg.id === assistantMessage.id
                            ? { ...msg, content: event.message }
                            : msg
                        )
                      );
                    } else if (event.type === 'completed' && event.response) {
                      finalResponse = event.response;
                    }
                  } catch (e) {
                    console.error('Failed to parse event:', e);
                  }
                }
              }

              // Update with final response
              if (finalResponse) {
                let content: InconvoMessageContent;
                if (finalResponse.type === 'chart' && finalResponse.chart) {
                  content = {
                    text: finalResponse.message,
                    type: 'chart',
                    chart: finalResponse.chart
                  };
                } else if (finalResponse.type === 'table' && finalResponse.table) {
                  content = {
                    text: finalResponse.message,
                    type: 'table',
                    table: finalResponse.table
                  };
                } else {
                  content = finalResponse.message || "No response received.";
                }
                
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessage.id
                      ? { ...msg, content }
                      : msg
                  )
                );
              } else {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessage.id
                      ? { ...msg, content: "No response received from Inconvo." }
                      : msg
                  )
                );
              }
            } catch (error) {
              console.error("Reload error:", error);
            } finally {
              console.log("Reload: Setting isRunning to false");
              setIsRunning(false);
            }
          }
        }
      },
      [messages, conversationIdRef]
    ),

    // Add suggestions
    suggestions: [
      { prompt: "What are my top products?" },
      { prompt: "Show me revenue trends" },
      { prompt: "Compare this month to last month" },
      { prompt: "What were my sales yesterday?" },
    ],

    // Add thread list adapter support
    adapters: {
      threadList: {
        threadId: conversationId ?? undefined,
        threads: threads.map((t) => ({
          threadId: t.threadId,
          title: t.title,
          status: "regular" as const,
        })),
        onSwitchToNewThread: createNewConversation,
        onSwitchToThread: switchToThread,
      },
    },
  };

  return useExternalStoreRuntime(adapter);
};
