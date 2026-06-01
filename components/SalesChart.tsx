'use client'

import React from 'react'

export default function SalesChart({ data }: { data: { name: string; value: number }[] }) {
  if (!data || data.length === 0) return (
     <div className="w-full bg-white dark:bg-[#0f172a] rounded-[2rem] p-12 border border-[#e2e8f0] dark:border-[#1e293b] flex flex-col items-center justify-center min-h-[300px]">
        <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No sales data for this period</p>
     </div>
  )

  const max = Math.max(...data.map(d => d.value)) || 1
  const height = 300
  const width = 1000
  const paddingX = 60
  const paddingY = 80

  const points = data.map((d, i) => {
    const x = paddingX + (i * ((width - (paddingX * 2)) / (data.length - 1 || 1)))
    const y = height - paddingY - ((d.value / max) * (height - (paddingY * 2)))
    return { x, y }
  })

  // Smooth Cubic Bezier Path (Facebook Insights style)
  const getPath = () => {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const cp1x = p0.x + (p1.x - p0.x) / 2;
        const cp2x = cp1x;
        d += ` C ${cp1x} ${p0.y}, ${cp2x} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  }

  const pathContent = getPath();

  return (
    <div className="w-full bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-10 border-2 border-[#e2e8f0] dark:border-[#1e293b] shadow-md relative overflow-hidden group">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/5 blur-[100px] -z-10 rounded-full"></div>

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
        <div>
           <div className="flex items-center gap-3 mb-1">
              <div className="h-2 w-8 rounded-full bg-emerald-500"></div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Sales Performance</h3>
           </div>
           <p className="text-slate-500 font-bold text-sm ml-11">Revenue trends & growth tracking</p>
        </div>
        <div className="flex items-center gap-8 px-6 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
           <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Peak Sale</span>
              <span className="text-lg font-black text-emerald-600 tracking-tight">{max.toLocaleString()} AED</span>
           </div>
           <div className="h-8 w-px bg-slate-200 dark:bg-slate-800"></div>
           <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-sm"></div>
              <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Revenue (AED)</span>
           </div>
        </div>
      </div>
      
      <div className="relative w-full h-[300px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible preserve-3d" preserveAspectRatio="none">
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
            <filter id="glow">
               <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
               <feMerge>
                   <feMergeNode in="coloredBlur"/>
                   <feMergeNode in="SourceGraphic"/>
               </feMerge>
            </filter>
          </defs>

          {/* Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
             const y = height - paddingY - (p * (height - (paddingY * 2)))
             return (
               <React.Fragment key={i}>
                 <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="currentColor" strokeWidth="1" className="text-slate-100 dark:text-slate-800/50" />
                 <text x={paddingX - 10} y={y + 4} textAnchor="end" className="text-[10px] font-black fill-slate-400 dark:fill-slate-500 uppercase tracking-tighter">
                   {(p * max).toLocaleString()}
                 </text>
               </React.Fragment>
             )
          })}

          {/* Area under curve */}
          {points.length > 1 && (
            <path 
              d={`${pathContent} L ${points[points.length-1].x} ${height-paddingY} L ${points[0].x} ${height-paddingY} Z`}
              fill="url(#areaGradient)"
            />
          )}

          {/* Main Curve */}
          <path 
            d={pathContent}
            fill="none"
            stroke="#10b981"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
            className="drop-shadow-sm transition-all duration-700"
          />

          {/* Axis Labels */}
          {data.map((d, i) => {
            const x = paddingX + (i * ((width - (paddingX * 2)) / (data.length - 1 || 1)))
            // Only show labels for first, last, and every N points to avoid clutter
            const showLabel = data.length < 15 || i === 0 || i === data.length - 1 || i % Math.floor(data.length / 5) === 0;
            
            return showLabel ? (
              <text 
                key={i} 
                x={x} 
                y={height - 35} 
                textAnchor="middle" 
                className="text-xs font-black fill-slate-800 dark:fill-white uppercase tracking-tighter"
              >
                {d.name}
              </text>
            ) : null
          })}

          {/* Interactive Tooltip points */}
          {points.map((p, i) => (
            <g key={i} className="cursor-pointer group/point">
               <circle cx={p.x} cy={p.y} r="12" fill="transparent" />
               <circle cx={p.x} cy={p.y} r="6" fill="#10b981" className="group-hover/point:r-8 transition-all" />
               <circle cx={p.x} cy={p.y} r="3" fill="white" />
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}
