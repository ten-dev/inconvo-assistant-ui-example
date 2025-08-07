import Inconvo from "@inconvoai/node";
import { NextResponse } from "next/server";

export const runtime = "edge";

const inconvo = new Inconvo({
  apiKey: process.env.INCONVO_API_KEY,
});

// Create a new conversation
export async function POST(req: Request) {
  try {
    const conversationContext = {
      // Server side added context i.e organisationId
      organisationId: 1,
    };
    const conversation = await inconvo.conversations.create({
      context: conversationContext,
    });
    return NextResponse.json(conversation);
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
    // Get specific conversation
    if (conversationId) {
      const conversation = await inconvo.conversations.retrieve(conversationId);
      return NextResponse.json(conversation);
    }
    // List all conversations
    else {
      const conversations = await inconvo.conversations.list({
        limit: 50,
        // Server side adding filter based on context field
        context: {
          organisationId: 1,
        },
      });
      return NextResponse.json(conversations);
    }
  } catch (error) {
    console.error("Failed to retrieve conversations:", error);
    return NextResponse.json(
      { error: "Failed to retrieve conversations" },
      { status: 500 }
    );
  }
}
