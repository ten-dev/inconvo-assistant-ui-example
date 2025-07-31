import Inconvo from "inconvo";
import { NextResponse } from "next/server";

export const runtime = "edge";

const inconvo = new Inconvo({
  apiKey: process.env.INCONVO_API_KEY,
  baseURL: process.env.INCONVO_API_BASE_URL,
});

// Create a new conversation
export async function POST(req: Request) {
  try {
    const { context } = await req.json();

    // Ensure organisationId is provided
    const conversationContext = {
      organisationId: 1,
    };

    console.log(
      "Creating Inconvo conversation with context:",
      conversationContext
    );

    const conversation = await inconvo.conversations.create({
      context: conversationContext,
    });

    console.log("Inconvo conversation created:", conversation);

    if (!conversation.id) {
      throw new Error("No conversation ID returned from Inconvo");
    }

    return NextResponse.json({
      conversationId: conversation.id,
    });
  } catch (error) {
    console.error("Failed to create conversation:", error);
    return NextResponse.json(
      {
        error: "Failed to create conversation",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Get conversation details or list
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("id");

  try {
    if (conversationId) {
      // Get specific conversation
      const conversation = await inconvo.conversations.retrieve(conversationId);
      return NextResponse.json(conversation);
    } else {
      // List all conversations
      const conversations = await inconvo.conversations.list({
        limit: 50,
        context: {
          organisationId: 1,
        },
      });

      // Transform to match thread list format
      const threads = conversations.items.map((conv) => ({
        threadId: conv.id,
        title: conv.title || "Untitled Conversation",
        lastMessage:
          conv.messages && conv.messages.length > 0
            ? conv.messages[conv.messages.length - 1].message
            : "",
        createdAt:
          conv.messages && conv.messages.length > 0
            ? new Date().toISOString() // Inconvo doesn't provide timestamps
            : new Date().toISOString(),
      }));

      return NextResponse.json({ threads });
    }
  } catch (error) {
    console.error("Failed to retrieve conversations:", error);
    return NextResponse.json(
      { error: "Failed to retrieve conversations" },
      { status: 500 }
    );
  }
}
