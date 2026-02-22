"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function ListerPerformanceChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ListerRevenuePieChart({
  data,
  formatCurrency,
}: {
  data: any[];
  formatCurrency: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, value }) =>
            `${name}: ${formatCurrency(value as number)}`
          }
          outerRadius={90}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip formatter={(value: any) => formatCurrency(value)} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ListerMetricsComparisonChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis type="number" tick={{ fontSize: 12 }} />
        <YAxis
          dataKey="metric"
          type="category"
          width={120}
          tick={{ fontSize: 12 }}
        />
        <Tooltip />
        <Bar dataKey="value" fill="#EAB308" radius={[0, 8, 8, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ListerAttendanceGauge({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadialBarChart
        cx="50%"
        cy="50%"
        innerRadius="60%"
        outerRadius="90%"
        data={data}
        startAngle={180}
        endAngle={0}
      >
        {/* @ts-ignore Recharts types are incomplete for RadialBar */}
        <RadialBar minAngle={15} background clockWise dataKey="value" />
        <Legend
          iconSize={10}
          layout="vertical"
          verticalAlign="middle"
          align="right"
        />
        <Tooltip />
      </RadialBarChart>
    </ResponsiveContainer>
  );
}
