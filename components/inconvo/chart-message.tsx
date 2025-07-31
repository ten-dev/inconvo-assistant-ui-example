"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ChartMessageProps {
  chart: {
    type: "bar" | "line" | "pie";
    data: Array<Record<string, any>>;
  };
  message?: string;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export function ChartMessage({ chart, message }: ChartMessageProps) {
  const chartData = useMemo(() => {
    if (!chart?.data || !Array.isArray(chart.data)) return [];
    return chart.data;
  }, [chart?.data]);

  const dataKeys = useMemo(() => {
    if (chartData.length === 0) return [];
    const firstItem = chartData[0];
    return Object.keys(firstItem).filter(
      (key) => typeof firstItem[key] === "number"
    );
  }, [chartData]);

  const xAxisKey = useMemo(() => {
    if (chartData.length === 0) return "";
    const firstItem = chartData[0];
    const nonNumericKeys = Object.keys(firstItem).filter(
      (key) => typeof firstItem[key] !== "number"
    );
    return nonNumericKeys[0] || "";
  }, [chartData]);

  const renderChart = () => {
    if (!chart?.type || chartData.length === 0) {
      return <div className="text-sm text-muted-foreground">No data to display</div>;
    }

    switch (chart.type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {dataKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {dataKeys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[index % COLORS.length]}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case "pie":
        const pieData = chartData.map((item, index) => ({
          name: item[xAxisKey] || `Item ${index + 1}`,
          value: item[dataKeys[0]] || 0,
        }));

        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return <div className="text-sm text-muted-foreground">Unsupported chart type: {chart.type}</div>;
    }
  };

  return (
    <div className="space-y-3">
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
      <div className="rounded-lg border bg-card p-4">
        {renderChart()}
      </div>
    </div>
  );
}