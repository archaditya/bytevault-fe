"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ProviderComparisonPoint } from "@/types";

export function ProviderComparisonChart({ data }: { data: ProviderComparisonPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#241F1B" vertical={false} />
        <XAxis dataKey="provider" stroke="#857C72" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="#857C72" fontSize={11} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          contentStyle={{ background: "#1A1714", border: "1px solid #382F28", borderRadius: 8, fontSize: 12 }}
          formatter={(value: number) => [`${value}ms`, "Avg latency"]}
        />
        <Bar dataKey="avgLatencyMs" radius={[4, 4, 0, 0]} fill="#FF6A00" />
      </BarChart>
    </ResponsiveContainer>
  );
}
