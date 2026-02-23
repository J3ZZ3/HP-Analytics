import { useMemo, useState, useCallback } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  type Node,
  type Edge,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useQuery } from "@tanstack/react-query";
import { Server, Database, HardDrive, Cpu, Activity, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { systemApi } from "@/api/system";
import { cn } from "@/lib/utils";
import { formatUptime } from "@/lib/utils";
import ServiceNodeComponent, {
  type NodeStatus,
  type ServiceNodeData,
} from "./ServiceNode";
import ConnectionEdge, { type ConnectionEdgeData } from "./ConnectionLine";
import type { ReadyResponse } from "@/types";

function deriveStatus(
  ready: ReadyResponse | undefined,
  field: "db" | "redis",
): NodeStatus {
  if (!ready) return "loading";
  return ready[field] ? "healthy" : "down";
}

const nodeTypes = { service: ServiceNodeComponent };
const edgeTypes = { animated: ConnectionEdge };

type SelectedId = "api" | "db" | "redis" | "worker";

export default function ServiceMap() {
  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: systemApi.health,
    refetchInterval: 10_000,
  });
  const { data: ready } = useQuery({
    queryKey: ["ready"],
    queryFn: systemApi.ready,
    refetchInterval: 10_000,
  });
  const { data: metrics } = useQuery({
    queryKey: ["metrics"],
    queryFn: systemApi.metrics,
    refetchInterval: 10_000,
  });

  const apiStatus: NodeStatus =
    health?.status === "ok" ? "healthy" : health ? "down" : "loading";
  const dbStatus = deriveStatus(ready, "db");
  const redisStatus = deriveStatus(ready, "redis");
  const workerStatus: NodeStatus =
    redisStatus === "healthy" ? "healthy" : redisStatus;

  const allHealthy =
    apiStatus === "healthy" &&
    dbStatus === "healthy" &&
    redisStatus === "healthy" &&
    workerStatus === "healthy";
  const healthyCount = [apiStatus, dbStatus, redisStatus, workerStatus].filter(
    (s) => s === "healthy",
  ).length;

  const [selected, setSelected] = useState<SelectedId | null>(null);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelected(node.id as SelectedId);
    },
    [],
  );

  const nodes = useMemo<Node[]>(() => {
    const apiData: ServiceNodeData = {
      label: "API Server",
      icon: Server,
      status: apiStatus,
      detail: apiStatus === "healthy" ? "Responding" : apiStatus === "loading" ? "Syncing\u2026" : "Unreachable",
      isCore: true,
      handles: {
        sources: [Position.Left, Position.Right, Position.Bottom],
        targets: [Position.Top],
      },
    };
    const dbData: ServiceNodeData = {
      label: "Database",
      icon: Database,
      status: dbStatus,
      detail: dbStatus === "healthy" ? "Connected" : dbStatus === "loading" ? "Syncing\u2026" : "Disconnected",
      handles: {
        sources: [Position.Right],
        targets: [Position.Bottom, Position.Right],
      },
    };
    const redisData: ServiceNodeData = {
      label: "Redis",
      icon: HardDrive,
      status: redisStatus,
      detail: redisStatus === "healthy" ? "Connected" : redisStatus === "loading" ? "Syncing\u2026" : "Disconnected",
      handles: {
        sources: [Position.Bottom, Position.Left],
        targets: [Position.Left],
      },
    };
    const workerData: ServiceNodeData = {
      label: "Worker",
      icon: Cpu,
      status: workerStatus,
      detail: workerStatus === "healthy" ? "Processing" : workerStatus === "loading" ? "Syncing\u2026" : "Offline",
      handles: {
        sources: [Position.Left],
        targets: [Position.Top, Position.Right],
      },
    };

    return [
      { id: "api", type: "service", position: { x: 340, y: 200 }, data: apiData, draggable: true },
      { id: "db", type: "service", position: { x: 60, y: 40 }, data: dbData, draggable: true },
      { id: "redis", type: "service", position: { x: 620, y: 40 }, data: redisData, draggable: true },
      { id: "worker", type: "service", position: { x: 100, y: 400 }, data: workerData, draggable: true },
    ];
  }, [apiStatus, dbStatus, redisStatus, workerStatus]);

  const edges = useMemo<Edge[]>(() => {
    const mkEdge = (
      id: string,
      source: string,
      target: string,
      sourceHandle: string,
      targetHandle: string,
      edgeData: ConnectionEdgeData,
    ): Edge => ({
      id,
      source,
      target,
      sourceHandle,
      targetHandle,
      type: "animated",
      data: edgeData,
    });

    return [
      mkEdge("api-db", "api", "db", "source-left", "target-right", {
        active: apiStatus === "healthy" && dbStatus === "healthy",
        label: "Reads / Writes",
      }),
      mkEdge("api-redis", "api", "redis", "source-right", "target-left", {
        active: apiStatus === "healthy" && redisStatus === "healthy",
        label: "Enqueue",
      }),
      mkEdge("redis-worker", "redis", "worker", "source-bottom", "target-right", {
        active: redisStatus === "healthy" && workerStatus === "healthy",
        label: "Jobs",
      }),
      mkEdge("worker-db", "worker", "db", "source-left", "target-bottom", {
        active: workerStatus === "healthy" && dbStatus === "healthy",
        label: "Persist",
      }),
      mkEdge("db-redis-mesh", "db", "redis", "source-right", "target-left", {
        active: dbStatus === "healthy" && redisStatus === "healthy",
        mesh: true,
      }),
      mkEdge("api-worker-mesh", "api", "worker", "source-bottom", "target-top", {
        active: apiStatus === "healthy" && workerStatus === "healthy",
        mesh: true,
      }),
    ];
  }, [apiStatus, dbStatus, redisStatus, workerStatus]);

  const nodeInfo: Record<SelectedId, { status: NodeStatus; detail: string }> =
    useMemo(
      () => ({
        api: { status: apiStatus, detail: apiStatus === "healthy" ? "Responding" : "Unreachable" },
        db: { status: dbStatus, detail: dbStatus === "healthy" ? "Connected" : "Disconnected" },
        redis: { status: redisStatus, detail: redisStatus === "healthy" ? "Connected" : "Disconnected" },
        worker: { status: workerStatus, detail: workerStatus === "healthy" ? "Processing" : "Offline" },
      }),
      [apiStatus, dbStatus, redisStatus, workerStatus],
    );

  const selectedTitle = selected
    ? selected === "api"
      ? "API Server"
      : selected === "db"
      ? "Database"
      : selected === "redis"
      ? "Redis"
      : "Worker"
    : null;

  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-[#060a14] shadow-2xl">
        {/* Scan pulse when unhealthy */}
        {!allHealthy && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-transparent via-red-500/10 to-transparent"
            animate={{ x: ["-110%", "110%"] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "linear" }}
          />
        )}

        {/* Top HUD */}
        <div className="absolute left-5 top-5 z-20 flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-xl border border-border/40 bg-black/60 px-3 py-1 font-mono text-[11px] text-muted-foreground backdrop-blur-md sm:flex">
            <Activity
              size={14}
              className={allHealthy ? "text-emerald-400" : "text-red-400"}
            />
            <span className={allHealthy ? "text-emerald-400" : "text-red-400"}>
              {healthyCount}/4 ONLINE
            </span>
          </div>
        </div>

        {/* Layout: map + inspector */}
        <div className="grid w-full grid-cols-1 lg:grid-cols-[1fr_340px]">
          {/* React Flow canvas */}
          <div className="h-[560px] w-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodeClick={onNodeClick}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              proOptions={{ hideAttribution: true }}
              minZoom={0.3}
              maxZoom={3}
              panOnDrag
              zoomOnScroll
              nodesDraggable
              nodesConnectable={false}
              elementsSelectable
              className="!bg-transparent"
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={28}
                size={1}
                color="rgba(99,102,241,0.12)"
              />

              {/* SVG filter for packet glow */}
              <svg width="0" height="0">
                <defs>
                  <filter id="packet-glow">
                    <feGaussianBlur stdDeviation="2.5" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
              </svg>
            </ReactFlow>
          </div>

          {/* Inspector panel */}
          <div className="relative border-t border-border/40 bg-black/35 lg:border-l lg:border-t-0">
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div
                  key="panel-open"
                  className="h-full p-5"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.16 }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        Node Inspector
                      </div>
                      <div className="mt-1 text-lg font-semibold text-foreground">
                        {selectedTitle}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelected(null)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/40 bg-black/50 text-muted-foreground transition-all hover:text-foreground"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="mt-4 rounded-2xl border border-border/40 bg-[#0b1120]/70 p-4 backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <span className={cnStatus(nodeInfo[selected].status)}>
                        {nodeInfo[selected].status.toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Detail</span>
                      <span className="text-sm text-foreground/90">
                        {nodeInfo[selected].detail}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <InfoChip label="Health" value={health?.status ?? "--"} />
                      <InfoChip label="Ready" value={ready?.ready ? "true" : ready ? "false" : "--"} />
                      <InfoChip label="DB" value={ready ? String(ready.db) : "--"} />
                      <InfoChip label="Redis" value={ready ? String(ready.redis) : "--"} />
                    </div>

                    <div className="mt-4 font-mono text-[11px] text-muted-foreground">
                      DATAFLOW
                      <div className="mt-2 space-y-1 font-sans text-xs text-foreground/80">
                        <div>API &rarr; DB (reads/writes)</div>
                        <div>API &rarr; Redis (enqueue)</div>
                        <div>Redis &rarr; Worker (jobs)</div>
                        <div>Worker &rarr; DB (persist)</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="panel-empty"
                  className="flex h-full flex-col justify-center p-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="rounded-3xl border border-border/40 bg-black/35 p-6 text-center">
                    <div className="text-sm font-semibold text-foreground">
                      Select a node to inspect
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Click any service module to view status, readiness, and system context.
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom status bar */}
        <div className="flex flex-wrap items-center justify-between border-t border-border/40 bg-black/45 px-6 py-3 text-xs font-mono">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">
              UPTIME{" "}
              <span className="text-emerald-400">
                {metrics ? formatUptime(metrics.uptime_seconds) : "--"}
              </span>
            </span>
            <span className="text-muted-foreground">
              ENV{" "}
              <span className="text-indigo-300">{metrics?.node_env ?? "--"}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={allHealthy ? "text-emerald-400" : "text-red-400"}>
              {healthyCount}/4 SERVICES ONLINE
            </span>
            <span
              className={cn(
                "inline-block h-2 w-2 rounded-full",
                allHealthy ? "bg-emerald-400 animate-pulse" : "bg-red-400",
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function cnStatus(status: NodeStatus) {
  if (status === "healthy") return "text-emerald-300 text-sm font-semibold";
  if (status === "degraded") return "text-amber-300 text-sm font-semibold";
  if (status === "down") return "text-red-300 text-sm font-semibold";
  return "text-slate-300 text-sm font-semibold";
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-black/35 px-3 py-2">
      <div className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm text-foreground/90">{value}</div>
    </div>
  );
}
