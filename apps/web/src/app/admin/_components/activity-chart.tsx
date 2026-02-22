"use client";

import {
  Area,
  AreaChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

function ActivityChartContent({
  title,
  data,
  dataKey = "value",
  color = "#f6d100",
}: {
  title: string;
  data: any[];
  dataKey?: string;
  color?: string;
}) {
  return (
    <div className="bg-[var(--color-neutral-light)] border border-gray-100 rounded-3xl shadow-sm p-6">
      <p className="text-base font-extrabold text-[var(--color-neutral-dark2)] mb-6">
        {title}
      </p>
      <div className="h-[250px] w-full">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400 font-medium">
            Not enough data to display
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id={`gradient-${dataKey}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
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
                width={40}
              />
              <RechartsTooltip
                contentStyle={{
                  borderRadius: "16px",
                  border: "none",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                  fontWeight: 600,
                  fontSize: "13px",
                }}
                itemStyle={{ color: "#1f2937" }}
              />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={3}
                fillOpacity={1}
                fill={`url(#gradient-${dataKey})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default ActivityChartContent;
