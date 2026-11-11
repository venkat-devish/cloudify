import type { Edge, Node } from "@xyflow/react";
import type { AwsNodeData } from "@/components/AwsResourceNode";

export type DiagramSnapshot = {
  nodes: Node<AwsNodeData>[];
  edges: Edge[];
};

const MAX = 40;

export function cloneSnapshot(nodes: Node<AwsNodeData>[], edges: Edge[]): DiagramSnapshot {
  return {
    nodes: JSON.parse(JSON.stringify(nodes)) as Node<AwsNodeData>[],
    edges: JSON.parse(JSON.stringify(edges)) as Edge[],
  };
}

export class DiagramHistory {
  private stack: DiagramSnapshot[] = [];

  push(nodes: Node<AwsNodeData>[], edges: Edge[]) {
    this.stack.push(cloneSnapshot(nodes, edges));
    if (this.stack.length > MAX) this.stack.shift();
  }

  pop(): DiagramSnapshot | null {
    return this.stack.pop() ?? null;
  }

  canUndo() {
    return this.stack.length > 0;
  }

  clear() {
    this.stack = [];
  }
}
