"use client";

import React, { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Activity, Calendar } from "lucide-react";

const CHART_DATA = [
  { month: "Jun", bookings: 1, wellnessScore: 82 },
  { month: "Jul", bookings: 2, wellnessScore: 85 },
  { month: "Aug", bookings: 1, wellnessScore: 84 },
  { month: "Sep", bookings: 3, wellnessScore: 88 },
  { month: "Oct", bookings: 2, wellnessScore: 91 },
  { month: "Nov", bookings: 4, wellnessScore: 94 },
];

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1">
        <p className="font-semibold text-slate-300">{label} 2026</p>
        <p className="text-blue-400 font-medium">
          Lab Tests: <span className="text-white font-bold">{payload[0]?.value}</span>
        </p>
        {payload[1] && (
          <p className="text-teal-400 font-medium">
            Biomarker Score: <span className="text-white font-bold">{payload[1]?.value}/100</span>
          </p>
        )}
      </div>
    );
  }
  return null;
}

export function ActivityChart() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <span>Health & Diagnostic Activity</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Biomarker health score and scheduled laboratory panels
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>Last 6 Months</span>
        </div>
      </div>

      <div className="h-64 w-full">
        {isMounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={CHART_DATA}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorWellness" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0D9488" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0D9488" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94A3B8", fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94A3B8", fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="bookings"
                name="Tests Booked"
                stroke="#2563EB"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorBookings)"
              />
              <Area
                type="monotone"
                dataKey="wellnessScore"
                name="Wellness Score"
                stroke="#0D9488"
                strokeWidth={2}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#colorWellness)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-50/50 rounded-xl animate-pulse">
            <span className="text-xs text-slate-400">Loading metrics visualizer...</span>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
            <span>Monthly Tests</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-teal-600 inline-block" />
            <span>Wellness Index</span>
          </div>
        </div>
        <span className="font-semibold text-emerald-600">+14% Health Score</span>
      </div>
    </div>
  );
}

export default ActivityChart;

