"use client";

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo } from "react";
import { AwsResourceNode, type AwsNodeData } from "@/components/AwsResourceNode";
import { inferEdgeKind } from "@/lib/edges";
import type { Topology } from "@/lib/types";

const nodeTypes = { awsResource: AwsResourceNode };

export default function TopologyCanvas({
  topology,
  validationStatus,
  interactive = false,
}: {
  topology: Topology;
  validationStatus?: Record<string, string>;
  interactive?: boolean;
}) {
  const initialNodes: Node<AwsNodeData>[] = useMemo(
    () =>
      topology.nodes.map((n, i) => ({
        id: n.id,
        type: "awsResource",
        position: {
          x: n.positionX ?? 80 + i * 220,
          y: n.positionY ?? 120 + (i % 2) * 100,
        },
        data: {
          label: n.name,
          resourceType: n.type,
          runtime: n.config?.runtime as string | undefined,
          status: validationStatus?.[n.id],
        },
        draggable: interactive,
        selectable: interactive,
      })),
    [topology.nodes, validationStatus, interactive],
  );

  const initialEdges: Edge[] = useMemo(
    () =>
      topology.edges.map((e) => {
        const src = topology.nodes.find((n) => n.id === e.source);
        const tgt = topology.nodes.find((n) => n.id === e.target);
        const kind = e.kind ?? (src && tgt ? inferEdgeKind(src.type, tgt.type) : "generic");
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: "out",
          targetHandle: "in",
          animated: true,
          style: { stroke: "#dc2626", strokeWidth: 2, strokeDasharray: "6 4" },
          label: kind?.replace(/_/g, " "),
          labelStyle: { fill: "#0f172a", fontSize: 10, fontWeight: 600 },
        };
      }),
    [topology.edges, topology.nodes],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  return (
    <div className="h-full min-h-[320px] w-full rounded-xl border-2 border-slate-300 bg-slate-100">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={interactive ? onNodesChange : undefined}
        onEdgesChange={interactive ? onEdgesChange : undefined}
        nodesDraggable={interactive}
        nodesConnectable={interactive}
        elementsSelectable={interactive}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} color="#94a3b8" />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
