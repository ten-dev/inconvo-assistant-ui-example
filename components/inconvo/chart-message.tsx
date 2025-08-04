"use client";

// @ts-expect-error - no types for chartkick
import { LineChart, ColumnChart } from "react-chartkick";
import "chartkick/chart.js";
import type { Chart as ChartType } from "@inconvoai/node/resources/conversations/response";

interface ChartMessageProps {
  message: string;
  chart: ChartType;
}

export function ChartMessage({ chart, message }: ChartMessageProps) {
  // Convert data array to object format for React-Chartkick
  const chartData =
    chart?.data?.reduce((acc, item) => {
      if (item.label && item.value !== undefined) {
        acc[item.label] = item.value;
      }
      return acc;
    }, {} as Record<string, number>) || {};

  const hasData = chart?.type && Object.keys(chartData).length > 0;

  return (
    <div className="space-y-3">
      {message && (
        <div className="text-sm text-muted-foreground leading-relaxed">
          {message}
        </div>
      )}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        {!hasData ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            {chart?.type
              ? "No data to display"
              : `Unsupported chart type: ${chart?.type}`}
          </div>
        ) : chart.type === "bar" ? (
          <ColumnChart
            xtitle={chart.xLabel}
            ytitle={chart.yLabel}
            title={chart.title}
            data={chartData}
            height="400px"
          />
        ) : chart.type === "line" ? (
          <LineChart
            xtitle={chart.xLabel}
            ytitle={chart.yLabel}
            title={chart.title}
            data={chartData}
            height="400px"
          />
        ) : (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            Unsupported chart type: {chart.type}
          </div>
        )}
      </div>
    </div>
  );
}
