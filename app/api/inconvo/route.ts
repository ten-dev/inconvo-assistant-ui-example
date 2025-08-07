import Inconvo from "@inconvoai/node";
import { NextResponse } from "next/server";

export const runtime = "edge";
export const maxDuration = 30;

const inconvo = new Inconvo({
  apiKey: process.env.INCONVO_API_KEY,
});

export async function POST(req: Request) {
  const { message, conversationId } = await req.json();
  if (!conversationId) {
    return NextResponse.json(
      { error: "Conversation ID is required" },
      { status: 400 }
    );
  }

  try {
    const sseStream = inconvo.conversations.response.create(conversationId, {
      message: message,
      stream: true,
    });

    // Create a ReadableStream that just passes through the events
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of sseStream) {
            // Pass through all events as JSON with newline delimiter
            controller.enqueue(
              new TextEncoder().encode(JSON.stringify(event) + "\n")
            );

            if (event.type === "response.completed") {
              controller.close();
              return;
            }
          }
          controller.close();
        } catch (error) {
          console.error("Error in SSE stream:", error);
          controller.error(error);
        }
      },
    });

    // Return the stream
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Inconvo API error:", error);
    return NextResponse.json(
      { error: "Error processing request" },
      { status: 500 }
    );
  }
}
