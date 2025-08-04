"use client";

import { FC, useMemo } from "react";
import { ChartMessage } from "./chart-message";
import { TableMessage } from "./table-message";

interface InconvoMessageProps {
  text: string;
}

export const InconvoMessage: FC<InconvoMessageProps> = ({ text }) => {
  const content = useMemo(() => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }, [text]);

  // If it's a structured Inconvo message with chart or table
  if (content && typeof content === "object") {
    if (content.type === "chart" && content.chart) {
      return <ChartMessage chart={content.chart} message={content.message} />;
    }

    if (content.type === "table" && content.table) {
      return <TableMessage table={content.table} message={content.message} />;
    }

    if (content.type === "text" && content.message) {
      return <>{content.message}</>;
    }
  }

  // Otherwise render as plain text (the default assistant-ui handling will take care of markdown)
  return <>{text}</>;
};
