"use client";

import {
  Background,
  Connection,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AwsResourceNode, type AwsNodeData } from "@/components/AwsResourceNode";
import ResourcePalette from "@/components/ResourcePalette";
import { ResourceConfigForm, mergeDefaults, validateResourceConfig } from "@/components/ResourceConfigForm";
import WorkflowLoader from "@/components/WorkflowLoader";
import { removeDraft } from "@/lib/project-cache";
import { DiagramHistory } from "@/lib/diagram-history";
import { useSearchParams } from "next/navigation";
import { copyToClipboard } from "@/lib/copy-to-clipboard";
import { createSession } from "@/lib/api";
import { connectionErrorMessage, inferEdgeKind, normalizeConnection } from "@/lib/edges";
import type { AwsResourceType, Topology, TopologyEdge, TopologyNode } from "@/lib/types";

const nodeTypes = { awsResource: AwsResourceNode };
const PALETTE_DRAG = "application/cloudify-aws-type";

let nodeSeq = 1;

function maxNodeSeq(nodes: { id: string }[]): number {
  let max = 0;
  for (const n of nodes) {
    const m = /^n-(\d+)$/.exec(n.id);
    if (m) max = Math.max(max, Number.parseInt(m[1], 10));
  }
  return max;
}

function syncNodeSeqFromCanvas(nodes: { id: string }[]) {
  nodeSeq = maxNodeSeq(nodes) + 1;
}

/** Drafts from older builds may contain duplicate n-* ids; fix before render/send. */
function ensureUniqueNodeIds(nodes: Node<AwsNodeData>[]): Node<AwsNodeData>[] {
  const seen = new Set<string>();
  const out: Node<AwsNodeData>[] = [];
  for (const n of nodes) {
    let id = n.id;
    if (seen.has(id)) {
      id = `n-${nodeSeq++}`;
    }
    seen.add(id);
    out.push(id === n.id ? n : { ...n, id });
  }
  syncNodeSeqFromCanvas(out);
  return out;
}

function DiagramEditorInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialProject = searchParams.get("project");
  const { screenToFlowPosition } = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<AwsNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [projectName, setProjectName] = useState(initialProject ?? "infraforge");
  const [terraformVersion, setTerraformVersion] = useState("1.5.0");
  const [awsProviderVersion, setAwsProviderVersion] = useState("5.0");
  const [pendingDrop, setPendingDrop] = useState<{ type: AwsResourceType; x: number; y: number } | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [configValues, setConfigValues] = useState<Record<string, string | number | boolean>>({});
  const [editNodeId, setEditNodeId] = useState<string | null>(null);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const historyRef = useRef(new DiagramHistory());
  const [canUndo, setCanUndo] = useState(false);
  const [copyOk, setCopyOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  const syncUndo = useCallback(() => {
    setCanUndo(historyRef.current.canUndo());
  }, []);

  const pushHistory = useCallback(() => {
    historyRef.current.push(nodesRef.current, edgesRef.current);
    syncUndo();
  }, [syncUndo]);

  const undoLast = useCallback(() => {
    const snap = historyRef.current.pop();
    if (!snap) return;
    const fixed = ensureUniqueNodeIds(snap.nodes);
    setNodes(fixed);
    setEdges(snap.edges);
    syncUndo();
  }, [setNodes, setEdges, syncUndo]);

  const resetCanvas = useCallback(() => {
    if (nodesRef.current.length === 0 && edgesRef.current.length === 0) return;
    if (!window.confirm("Reset the canvas? Undo restores the previous diagram.")) return;
    pushHistory();
    nodeSeq = 1;
    setNodes([]);
    setEdges([]);
    removeDraft(projectName);
    syncUndo();
  }, [pushHistory, projectName, setNodes, setEdges, syncUndo]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const src = nodes.find((n) => n.id === connection.source);
      const tgt = nodes.find((n) => n.id === connection.target);
      if (!src?.data || !tgt?.data) return;
      const normalized = normalizeConnection(
        connection.source,
        connection.target,
        src.data.resourceType,
        tgt.data.resourceType,
      );
      if (!normalized) {
        setError(connectionErrorMessage(src.data.resourceType, tgt.data.resourceType));
        return;
      }
      setError(null);
      pushHistory();
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            source: normalized.source,
            target: normalized.target,
            sourceHandle: "out",
            targetHandle: "in",
            id: `e-${normalized.source}-${normalized.target}`,
            type: "smoothstep",
            animated: true,
            style: { stroke: "#dc2626", strokeWidth: 2, strokeDasharray: "6 4" },
            data: { kind: normalized.kind },
          },
          eds,
        ),
      );
    },
    [nodes, setEdges, pushHistory],
  );

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      if (!connection.source || !connection.target) return false;
      const src = nodes.find((n) => n.id === connection.source);
      const tgt = nodes.find((n) => n.id === connection.target);
      if (!src?.data || !tgt?.data) return false;
      return (
        normalizeConnection(
          connection.source,
          connection.target,
          src.data.resourceType,
          tgt.data.resourceType,
        ) !== null
      );
    },
    [nodes],
  );

  const onDragStart = (event: React.DragEvent, type: AwsResourceType) => {
    event.dataTransfer.setData(PALETTE_DRAG, type);
    event.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData(PALETTE_DRAG) as AwsResourceType;
      if (!type) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setPendingDrop({ type, x: position.x, y: position.y });
      setNameInput("");
      setConfigValues(mergeDefaults(type, {}));
    },
    [screenToFlowPosition],
  );

  const commitConfig = () => {
    const type = editNodeId
      ? nodes.find((n) => n.id === editNodeId)?.data?.resourceType
      : pendingDrop?.type;
    if (!type) return;
    const resourceName = nameInput.trim() || String(configValues.name ?? "").trim();
    const err = validateResourceConfig(type, resourceName, configValues);
    if (err) {
      setError(err);
      return;
    }
    pushHistory();
    const cfg = mergeDefaults(type, { ...configValues, name: resourceName });
    for (const key of Object.keys(cfg)) {
      if (cfg[key] === "") delete cfg[key];
    }
    const data: AwsNodeData = { label: resourceName, resourceType: type, config: cfg };
    if (editNodeId) {
      setNodes((nds) => nds.map((n) => (n.id === editNodeId ? { ...n, data } : n)));
      setEditNodeId(null);
    } else if (pendingDrop) {
      const id = `n-${nodeSeq++}`;
      setNodes((nds) => [
        ...nds,
        {
          id,
          type: "awsResource",
          position: { x: pendingDrop.x, y: pendingDrop.y },
          data,
        },
      ]);
      setPendingDrop(null);
    }
    setNameInput("");
    setConfigValues({});
    setError(null);
  };

  const buildTopology = (): Topology => {
    const uniqueNodes = ensureUniqueNodeIds(nodes);
    if (uniqueNodes.some((n, i) => n.id !== nodes[i]?.id)) {
      setNodes(uniqueNodes);
    }
    const topoNodes: TopologyNode[] = uniqueNodes.map((n) => ({
      id: n.id,
      type: n.data!.resourceType,
      name: n.data!.label,
      positionX: n.position.x,
      positionY: n.position.y,
      config: n.data!.config ? { ...n.data!.config } : undefined,
    }));
    const topoEdges: TopologyEdge[] = edges.map((e) => {
      const src = uniqueNodes.find((n) => n.id === e.source);
      const tgt = uniqueNodes.find((n) => n.id === e.target);
      const fromData = (e.data as { kind?: TopologyEdge["kind"] } | undefined)?.kind;
      const kind =
        fromData ??
        (src?.data && tgt?.data ? inferEdgeKind(src.data.resourceType, tgt.data.resourceType) : "generic");
      return { id: e.id, source: e.source, target: e.target, kind };
    });
    return {
      projectName,
      terraformCoreVersion: terraformVersion,
      awsProviderVersion,
      nodes: topoNodes,
      edges: topoEdges,
    };
  };

  const continueToWizard = async () => {
    setBusy(true);
    setError(null);
    try {
      const topology = buildTopology();
      const { sessionId } = await createSession("create", topology);
      router.push(`/workflow?mode=create&sessionId=${sessionId}&step=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create session");
    } finally {
      setBusy(false);
    }
  };


  const openConfig = useCallback(
    (nodeId: string) => {
      const n = nodes.find((x) => x.id === nodeId);
      if (!n?.data) return;
      setEditNodeId(nodeId);
      setPendingDrop(null);
      const resourceName = n.data.label?.trim() || String(n.data.config?.name ?? "").trim();
      setNameInput(resourceName);
      setConfigValues(mergeDefaults(n.data.resourceType, { ...(n.data.config ?? {}), name: resourceName }));
    },
    [nodes],
  );

  const onNodeDragStart = useCallback(() => pushHistory(), [pushHistory]);

  const onBeforeDelete = useCallback(
    async ({ nodes: toDelete, edges: edgesToDelete }: { nodes: Node<AwsNodeData>[]; edges: Edge[] }) => {
      if (toDelete.length === 0 && edgesToDelete.length === 0) return true;
      pushHistory();
      return true;
    },
    [pushHistory],
  );

  const onNodeDoubleClick = useCallback(
    (_: unknown, node: Node<AwsNodeData>) => openConfig(node.id),
    [openConfig],
  );

  useEffect(() => {
    historyRef.current.clear();
    nodeSeq = 1;
    setCanUndo(false);
  }, []);

  useEffect(() => {
    if (initialProject) setProjectName(initialProject);
  }, [initialProject]);

  const copyDiagram = async () => {
    const text = JSON.stringify({ nodes, edges, projectName }, null, 2);
    const ok = await copyToClipboard(text);
    setCopyOk(ok);
    setError(ok ? null : "Copy failed — select text manually or allow clipboard access.");
    if (ok) setTimeout(() => setCopyOk(false), 2500);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-100">
      <div className="flex flex-wrap items-end gap-4 border-b-2 border-slate-300 bg-white px-4 py-3">
        <label className="text-sm font-semibold text-slate-800">
          Project
          <input
            className="cloudify-input mt-1 block w-44 rounded-md px-3 py-2 text-sm"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
        </label>
        <label className="text-sm font-semibold text-slate-800">
          Terraform
          <input
            className="cloudify-input mt-1 block w-24 rounded-md px-3 py-2 text-sm"
            value={terraformVersion}
            onChange={(e) => setTerraformVersion(e.target.value)}
          />
        </label>
        <label className="text-sm font-semibold text-slate-800">
          AWS provider
          <input
            className="cloudify-input mt-1 block w-20 rounded-md px-3 py-2 text-sm"
            value={awsProviderVersion}
            onChange={(e) => setAwsProviderVersion(e.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={() => void copyDiagram()}
          className={`rounded-lg border-2 px-3 py-2 text-xs font-bold ${copyOk ? "border-green-600 bg-green-50 text-green-800" : "border-slate-400 text-slate-900"}`}
        >
          {copyOk ? "Copied ✓" : "Copy diagram JSON"}
        </button>
        <button
          type="button"
          disabled={!canUndo}
          onClick={undoLast}
          title="Undo last change"
          aria-label="Undo last change"
          className="rounded-lg border-2 border-amber-600 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 disabled:opacity-40"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={resetCanvas}
          className="rounded-lg border-2 border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-800"
        >
          Reset
        </button>
        <button
          type="button"
          disabled={busy || nodes.length === 0}
          onClick={continueToWizard}
          className="ml-auto rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-bold text-white shadow disabled:opacity-40"
        >
          {busy ? "Creating session…" : "Continue to wizard"}
        </button>
      </div>
      <div className="flex min-h-0 flex-1">
        <ResourcePalette onDragStart={onDragStart} />
        <div ref={reactFlowWrapper} className="min-h-0 flex-1" onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            onNodeDoubleClick={onNodeDoubleClick}
            onNodeDragStart={onNodeDragStart}
            onBeforeDelete={onBeforeDelete}
            connectionMode={ConnectionMode.Loose}
            defaultEdgeOptions={{ type: "smoothstep" }}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} color="#94a3b8" />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      </div>
      {(pendingDrop || editNodeId) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border-2 border-slate-300 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              {editNodeId ? "Edit resource" : "Configure resource"}
            </h3>
            <p className="mt-1 text-xs text-slate-600">* required · (Suggested) uses compliance-style defaults in Terraform</p>
            <ResourceConfigForm
              resourceType={(editNodeId ? nodes.find((n) => n.id === editNodeId)?.data?.resourceType : pendingDrop?.type)!}
              nameValue={nameInput}
              onNameChange={setNameInput}
              values={configValues}
              onChange={setConfigValues}
            />
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-800"
                onClick={() => {
                  setPendingDrop(null);
                  setEditNodeId(null);
                }}
              >
                Cancel
              </button>
              <button type="button" className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white" onClick={commitConfig}>
                {editNodeId ? "Save" : "Place on canvas"}
              </button>
            </div>
          </div>
        </div>
      )}
      {error && <p className="border-t border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-800">{error}</p>}
      {busy && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/20 p-6 backdrop-blur-[2px]">
          <WorkflowLoader variant="session" />
        </div>
      )}
    </div>
  );
}

export default function DiagramEditor() {
  return (
    <ReactFlowProvider>
      <Suspense fallback={<p className="p-4 text-slate-600">Loading editor…</p>}>
        <DiagramEditorInner />
      </Suspense>
    </ReactFlowProvider>
  );
}
