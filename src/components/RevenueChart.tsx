"use client";

import { formatRupiah } from "@/lib/utils";

interface DayData {
  date: string;
  revenue: number;
}

export default function RevenueChart({ data }: { data: DayData[] }) {
  if (data.length === 0) return null;

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1 h-32">
        {data.map((day) => {
          const pct = (day.revenue / maxRevenue) * 100;
          return (
            <div
              key={day.date}
              className="flex-1 flex flex-col items-center gap-0.5 group relative"
            >
              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10 dark:bg-gray-200 dark:text-gray-900">
                {formatRupiah(day.revenue)}
              </div>
              <div
                className="w-full rounded-t bg-blue-500 hover:bg-blue-600 transition-colors cursor-pointer"
                style={{ height: `${Math.max(pct, 1)}%` }}
              />
              <span className="text-[9px] text-gray-400 dark:text-gray-500 rotate-45 origin-left whitespace-nowrap mt-1">
                {new Date(day.date + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
