"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { SpeedSample } from "@/types";
import { formatSpeed } from "@/lib/utils";

export function SpeedGraph({ data }: { data: SpeedSample[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="speedFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFC53D" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#FFC53D" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#241F1B" vertical={false} />
        <XAxis
          dataKey="t"
          tickFormatter={(t) => `${t}s`}
          stroke="#857C72"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(v) => formatSpeed(v)}
          stroke="#857C72"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={70}
        />
        <Tooltip
          contentStyle={{
            background: "#1A1714",
            border: "1px solid #382F28",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelFormatter={(t) => `${t}s elapsed`}
          formatter={(value: number) => [formatSpeed(value), "Speed"]}
        />
        <Area type="monotone" dataKey="bytesPerSecond" stroke="#FFC53D" strokeWidth={2} fill="url(#speedFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
