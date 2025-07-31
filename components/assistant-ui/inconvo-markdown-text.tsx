"use client";

import { FC, memo } from "react";
import { InconvoMessageRenderer } from "@/components/inconvo/message-renderer";
import { MarkdownText } from "./markdown-text";

interface InconvoMarkdownTextProps {
  text: string;
}

const InconvoMarkdownTextImpl: FC<InconvoMarkdownTextProps> = ({ text }) => {
  // Try to parse as JSON to check if it's a structured message
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && (parsed.type === 'chart' || parsed.type === 'table')) {
      // Use the InconvoMessageRenderer for special content types
      return <InconvoMessageRenderer content={text} role="assistant" />;
    }
  } catch (e) {
    // Not JSON or not a special type
  }
  
  // For regular text, use the standard MarkdownText component
  return <MarkdownText />;
};

export const InconvoMarkdownText = memo(InconvoMarkdownTextImpl);