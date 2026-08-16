'use client'

import React, { useState } from 'react'

interface DataPoint {
  name: string;
  value: number;
}

export default function SalesChart({ 
  data = [], 
  title = "Revenue Timeline",
  subtitle = "Daily volume for selected period"
}: { 
  data: DataPoint[];
  title?: string;
  subtitle?: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="w-full card-anthropic p-10 flex flex-col items-center justify-center min-h-[260px] text-center">
        <div className="w-10 h-10 rounded-full bg-[var(--card-border)]/50 flex items-center justify-center mb-3 opacity-50">
          <span className="font-mono text-xs">AED</span>
        </div>
        <p className="font-serif text-sm opacity-60">No transaction records in this period.</p>
        <p className="font-mono text-[11px] opacity-40 mt-1">Try selecting a broader date range above.</p>
      </div>
    );
  }

  const values = data.map(d => d.value);
  const max = Math.max(...values, 100);
  const totalVolume = values.reduce((sum, v) => sum + v, 0);

  const height = 240;
  const width = 800;
  const paddingX = 40;
  const paddingY = 40;

  const points = data.map((d, i) => {
    const x = paddingX + (i * ((width - paddingX * 2) / (Math.max(data.length - 1, 1))));
    const y = height - paddingY - ((d.value / max) * (height - paddingY * 2));
    return { x, y, ...d };
  });

  // Smooth Cubic Bezier Path
  const getPath = () => {
    if (points.length < 2) return `M ${points[0]?.x || paddingX} ${points[0]?.y || height / 2}`;
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) / 2;
      const cp2x = cp1x;
      d += ` C ${cp1x} ${p0.y}, ${cp2x} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const pathContent = getPath();

  return (
    <div className="w-full">
      {/* Chart Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-4 border-b border-[var(--card-border)] gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D97757]" />
            <h3 className="text-base font-serif font-normal text-[#222222] dark:text-[#F5F4EF]">{title}</h3>
          </div>
          <p className="text-xs opacity-50 font-mono mt-1">{subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-[var(--sidebar-bg)] border border-[var(--card-border)] flex items-center gap-2 text-xs">
            <span className="opacity-50 text-[10px] uppercase font-mono tracking-wider">Period Total:</span>
            <span className="font-mono font-semibold text-[#D97757]">{totalVolume.toLocaleString()} AED</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[var(--sidebar-bg)] border border-[var(--card-border)] flex items-center gap-2 text-xs">
            <span className="opacity-50 text-[10px] uppercase font-mono tracking-wider">Peak:</span>
            <span className="font-mono font-semibold">{max.toLocaleString()} AED</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas with Interactive Hover */}
      <div className="relative w-full h-[220px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="terracottaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D97757" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#D97757" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {[0, 0.33, 0.66, 1].map((p, i) => {
            const y = height - paddingY - p * (height - paddingY * 2);
            return (
              <React.Fragment key={i}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  className="opacity-10 text-[var(--card-border)]"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] font-mono fill-current opacity-40"
                >
                  {Math.round(p * max).toLocaleString()}
                </text>
              </React.Fragment>
            );
          })}

          {/* Area Fill */}
          {points.length > 1 && (
            <path
              d={`${pathContent} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`}
              fill="url(#terracottaGradient)"
            />
          )}

          {/* Main Curve */}
          <path
            d={pathContent}
            fill="none"
            stroke="#D97757"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points & Tooltips */}
          {points.map((p, i) => {
            const isHovered = hoveredIdx === i;
            return (
              <g
                key={i}
                className="cursor-pointer transition-all"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Hit area */}
                <circle cx={p.x} cy={p.y} r="14" fill="transparent" />
                
                {/* Visual Dot */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? "6" : points.length < 20 ? "3.5" : "2"}
                  className="fill-[#D97757] transition-all"
                />

                {isHovered && (
                  <>
                    <circle cx={p.x} cy={p.y} r="8" fill="#D97757" opacity="0.2" />
                    {/* Vertical guideline */}
                    <line
                      x1={p.x}
                      y1={paddingY}
                      x2={p.x}
                      y2={height - paddingY}
                      stroke="#D97757"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                      opacity="0.4"
                    />
                  </>
                )}
              </g>
            );
          })}

          {/* X-Axis Dates */}
          {points.map((p, i) => {
            const step = Math.max(1, Math.floor(points.length / 7));
            const isKeyPoint = i === 0 || i === points.length - 1 || i % step === 0;
            if (!isKeyPoint) return null;

            return (
              <text
                key={i}
                x={p.x}
                y={height - 12}
                textAnchor="middle"
                className="text-[10px] font-mono fill-current opacity-50"
              >
                {p.name}
              </text>
            );
          })}
        </svg>

        {/* Floating Tooltip Box */}
        {hoveredIdx !== null && points[hoveredIdx] && (
          <div
            className="absolute -top-3 z-20 pointer-events-none transform -translate-x-1/2 bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-3 py-1.5 shadow-lg text-xs"
            style={{
              left: `${(points[hoveredIdx].x / width) * 100}%`,
            }}
          >
            <div className="font-mono text-[10px] opacity-60">{points[hoveredIdx].name}</div>
            <div className="font-mono font-bold text-[#D97757]">{points[hoveredIdx].value.toLocaleString()} AED</div>
          </div>
        )}
      </div>
    </div>
  );
}
