import { memo } from "react";
import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

export interface ConnectionEdgeData {
  active?: boolean;
  label?: string;
  mesh?: boolean;
  [key: string]: unknown;
}

function ConnectionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const d = (data ?? {}) as ConnectionEdgeData;
  const active = d.active ?? true;
  const mesh = d.mesh ?? false;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
  });

  const color = active ? "#10b981" : "#ef4444";

  return (
    <>
      {/* Glow layer (primary only) */}
      {!mesh && (
        <BaseEdge
          id={`${id}-glow`}
          path={edgePath}
          style={{
            stroke: active ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.12)",
            strokeWidth: mesh ? 1 : 6,
            filter: "blur(4px)",
          }}
        />
      )}

      {/* Main line */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: mesh
            ? active
              ? "rgba(16,185,129,0.15)"
              : "rgba(239,68,68,0.08)"
            : active
            ? "rgba(16,185,129,0.5)"
            : "rgba(239,68,68,0.25)",
          strokeWidth: mesh ? 1 : 2,
          strokeDasharray: mesh ? "3 6" : undefined,
        }}
      />

      {/* Animated dashed flow (primary only) */}
      {!mesh && (
        <path
          d={edgePath}
          fill="none"
          stroke={active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)"}
          strokeWidth={1.5}
          strokeDasharray="6 10"
          className="react-flow__edge-animated-dash"
          style={{
            animation: "dash-flow 1.8s linear infinite",
          }}
        />
      )}

      {/* Moving packet dot */}
      {active && !mesh && (
        <circle r="4" fill={color} filter="url(#packet-glow)">
          <animateMotion dur="2.5s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}

      {/* Label capsule */}
      {d.label && (
        <foreignObject
          x={labelX - 60}
          y={labelY - 14}
          width={120}
          height={28}
          className="pointer-events-none"
        >
          <div className="flex items-center justify-center">
            <div
              className={`rounded-full border px-2.5 py-0.5 text-[8px] font-mono uppercase tracking-wider backdrop-blur-md ${
                active
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-red-500/20 bg-red-500/8 text-red-300"
              }`}
            >
              {d.label}
            </div>
          </div>
        </foreignObject>
      )}
    </>
  );
}

export default memo(ConnectionEdge);
