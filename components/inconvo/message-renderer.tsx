"use client";

import { useEffect, useState } from "react";
import { ChartMessage } from "./chart-message";
import { TableMessage } from "./table-message";

interface InconvoMessageRendererProps {
  content: string;
  role: "user" | "assistant";
}

interface ParsedContent {
  type: "text" | "chart" | "table";
  text?: string;
  chart?: any;
  table?: any;
}

export function InconvoMessageRenderer({ content, role }: InconvoMessageRendererProps) {
  const [parsedContent, setParsedContent] = useState<ParsedContent>({ type: "text", text: content });

  useEffect(() => {
    if (role === "assistant" && content) {
      // Try to parse as JSON for structured content
      try {
        const jsonContent = JSON.parse(content);
        
        // Check the type field to determine how to render
        if (jsonContent.type === "chart" && jsonContent.chart) {
          setParsedContent({
            type: "chart",
            text: jsonContent.text,
            chart: jsonContent.chart,
          });
          return;
        } else if (jsonContent.type === "table" && jsonContent.table) {
          setParsedContent({
            type: "table",
            text: jsonContent.text,
            table: jsonContent.table,
          });
          return;
        }
      } catch (e) {
        // Not JSON, treat as regular text
      }
    }

    // Default to text content
    setParsedContent({ type: "text", text: content });
  }, [content, role]);

  // For user messages, always render as text
  if (role === "user") {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  // For assistant messages, render based on parsed content type
  switch (parsedContent.type) {
    case "chart":
      return <ChartMessage chart={parsedContent.chart} message={parsedContent.text} />;
    case "table":
      return <TableMessage table={parsedContent.table} message={parsedContent.text} />;
    default:
      // Return null for text content, let the parent handle markdown rendering
      return null;
  }
}