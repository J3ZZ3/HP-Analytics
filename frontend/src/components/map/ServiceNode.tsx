import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type NodeStatus = "healthy" | "degraded" | "down" | "loading";

export interface ServiceNodeData {
  label: string;
  icon: LucideIcon;
  status: NodeStatus;
  detail?: string;
  isCore?: boolean;
  handles?: {
    sources?: Position[];
    targets?: Position[];
  };
  [key: string]: unknown;
}

const statusStyles: Record<
  NodeStatus,
  { border: string; icon: string; dot: string; label: string; frame: string }
> = {
  healthy: {
    border: "border-emerald-500/55",
    icon: "text-emerald-300",
    dot: "bg-emerald-400",
    label: "Operational",
    frame: "bg-emerald-500/6",
  },
  degraded: {
    border: "border-amber-500/55",
    icon: "text-amber-300",
    dot: "bg-amber-400",
    label: "Degraded",
    frame: "bg-amber-500/6",
  },
  down: {
    border: "border-red-500/55",
    icon: "text-red-300",
    dot: "bg-red-400",
    label: "Offline",
    frame: "bg-red-500/6",
  },
  loading: {
    border: "border-slate-600/55",
    icon: "text-slate-300",
    dot: "bg-slate-400",
    label: "Checking\u2026",
    frame: "bg-slate-500/6",
  },
};

const handleStyle = {
  width: 8,
  height: 8,
  background: "rgba(16,185,129,0.5)",
  border: "1.5px solid rgba(16,185,129,0.8)",
  borderRadius: "50%",
};

function ServiceNodeComponent({ data }: NodeProps) {
  const d = data as ServiceNodeData;
  const [hovered, setHovered] = useState(false);
  const s = statusStyles[d.status];
  const Icon = d.icon;
  const size = d.isCore ? 100 : 84;
  const iconSize = d.isCore ? 36 : 28;

  const sources = d.handles?.sources ?? [Position.Right];
  const targets = d.handles?.targets ?? [Position.Left];

  return (
    <div
      className="flex flex-col items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Warning scan ring */}
      {d.status !== "healthy" && d.status !== "loading" && (
        <motion.div
          className="absolute rounded-full border border-red-500/20"
          style={{
            width: size + 36,
            height: size + 36,
            left: -(size + 36 - size) / 2,
            top: -(size + 36 - size) / 2,
          }}
          animate={{ scale: [0.8, 1.3], opacity: [0.5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
        />
      )}

      {/* Module frame */}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-2xl border backdrop-blur-xl transition-all",
          "shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_18px_40px_rgba(0,0,0,0.35)]",
          s.border,
          s.frame,
        )}
        style={{ width: size, height: size }}
      >
        {/* inner bevel */}
        <div className="absolute inset-1 rounded-xl border border-white/5 bg-black/30" />

        {/* corner ticks */}
        <div className="absolute left-2 top-2 h-2 w-2 border-l border-t border-white/10" />
        <div className="absolute right-2 top-2 h-2 w-2 border-r border-t border-white/10" />
        <div className="absolute left-2 bottom-2 h-2 w-2 border-l border-b border-white/10" />
        <div className="absolute right-2 bottom-2 h-2 w-2 border-r border-b border-white/10" />

        <Icon className={cn("relative", s.icon)} size={iconSize} strokeWidth={1.6} />

        {/* status dot */}
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-[#060a14] bg-black/80">
          <span
            className={cn(
              "h-3 w-3 rounded-full",
              s.dot,
              (d.status === "healthy" || d.status === "loading") && "animate-pulse",
            )}
          />
        </span>

        {/* hover bloom */}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-200",
            "bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_60%)]",
            hovered && "opacity-100",
          )}
        />
      </div>

      {/* nameplate */}
      <div className="mt-3 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/90">
          {d.label}
        </div>
        <div className="mt-1 text-[10px] text-muted-foreground">
          {d.detail ?? "--"}
        </div>
      </div>

      {/* Handles — React Flow connects edges to these */}
      {sources.map((pos) => (
        <Handle
          key={`source-${pos}`}
          type="source"
          position={pos}
          id={`source-${pos}`}
          style={handleStyle}
        />
      ))}
      {targets.map((pos) => (
        <Handle
          key={`target-${pos}`}
          type="target"
          position={pos}
          id={`target-${pos}`}
          style={handleStyle}
        />
      ))}

      {/* Tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            className="absolute -top-4 left-1/2 z-50 w-52 -translate-x-1/2 -translate-y-full rounded-2xl border border-border/40 bg-[#0c1325]/95 px-4 py-3 text-[11px] backdrop-blur-xl"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.14 }}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">{d.label}</span>
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-[10px] font-bold",
                  d.status === "healthy" && "bg-emerald-500/12 text-emerald-300",
                  d.status === "degraded" && "bg-amber-500/12 text-amber-300",
                  d.status === "down" && "bg-red-500/12 text-red-300",
                  d.status === "loading" && "bg-slate-500/12 text-slate-300",
                )}
              >
                {s.label}
              </span>
            </div>
            <div className="mt-2 flex justify-between text-muted-foreground">
              <span>Status</span>
              <span className="text-foreground/85">{d.detail ?? "--"}</span>
            </div>
            <div className="absolute -bottom-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-border/40 bg-[#0c1325]/95" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(ServiceNodeComponent);
