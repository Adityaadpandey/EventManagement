"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "#fff",
    border: "1px solid #f3f4f6",
    borderRadius: 12,
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
  },
  labelStyle: { color: "var(--color-neutral-dark2)", fontWeight: 600 },
  itemStyle: { color: "var(--color-neutral-dark3)" },
};

export function AnalyticsLineChart({
  data,
  dataKey,
  stroke,
  yAxisTickFormatter,
  tooltipFormatter,
}: {
  data: any[];
  dataKey: string;
  stroke: string;
  yAxisTickFormatter?: (v: number) => string;
  tooltipFormatter?: (v: number) => string[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="#f3f4f6"
        />
        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "#9ca3af" }}
          dy={10}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "#9ca3af" }}
          tickFormatter={yAxisTickFormatter}
        />
        <Tooltip {...TOOLTIP_STYLE} formatter={tooltipFormatter} />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={stroke}
          strokeWidth={3}
          dot={false}
          activeDot={{ r: 6, strokeWidth: 0, fill: stroke }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function AnalyticsBarChart({
  data,
  dataKey,
  fill,
}: {
  data: any[];
  dataKey: string;
  fill: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="#f3f4f6"
        />
        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "#9ca3af" }}
          dy={10}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "#9ca3af" }}
        />
        <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "#f3f4f6" }} />
        <Bar dataKey={dataKey} fill={fill} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
