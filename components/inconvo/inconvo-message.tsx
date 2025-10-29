"use client";

import { FC, useMemo } from "react";
import { ChartMessage } from "./chart-message";
import { TableMessage } from "./table-message";

interface InconvoMessageProps {
  text: string;
  isStreaming?: boolean;
}

export const InconvoMessage: FC<InconvoMessageProps> = ({
  text,
  isStreaming = false,
}) => {
  const content = useMemo(() => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }, [text]);

  const streamingClassName = isStreaming
    ? "text-muted-foreground/60 italic text-xs animate-pulse"
    : "";

  // If it's a structured Inconvo message with chart or table
  if (content && typeof content === "object") {
    if (content.type === "chart" && content.chart) {
      return <ChartMessage chart={content.chart} message={content.message} />;
    }

    if (content.type === "table" && content.table) {
      return <TableMessage table={content.table} message={content.message} />;
    }

    if (content.type === "text" && content.message) {
      return <span className={streamingClassName}>{content.message}</span>;
    }
  }

  // Otherwise render as plain text (the default assistant-ui handling will take care of markdown)
  return <span className={streamingClassName}>{text}</span>;
};
