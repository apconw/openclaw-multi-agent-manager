import { useState, useMemo } from 'react';
import type { AgentTemplate, CollaborationEdge } from '../types';

interface TopologyGraphProps {
  agents: AgentTemplate[];
  edges: CollaborationEdge[];
  width?: number;
  height?: number;
  onNodeClick?: (agentId: string) => void;
}

interface NodeLayout {
  id: string;
  x: number;
  y: number;
  agent: AgentTemplate;
}

const NODE_RADIUS = 36;
const ARROW_SIZE = 6;

export function TopologyGraph({
  agents,
  edges,
  width = 520,
  height = 420,
  onNodeClick,
}: TopologyGraphProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const nodes = useMemo<NodeLayout[]>(() => {
    if (agents.length === 0) return [];
    const cx = width / 2;
    const cy = height / 2;
    if (agents.length === 1) {
      return [{ id: agents[0].id, x: cx, y: cy, agent: agents[0] }];
    }
    const layoutRadius = Math.min(cx, cy) - NODE_RADIUS - 30;
    return agents.map((agent, i) => {
      const angle = (2 * Math.PI * i) / agents.length - Math.PI / 2;
      return {
        id: agent.id,
        x: cx + layoutRadius * Math.cos(angle),
        y: cy + layoutRadius * Math.sin(angle),
        agent,
      };
    });
  }, [agents, width, height]);

  const nodeMap = useMemo(() => {
    const m = new Map<string, NodeLayout>();
    nodes.forEach(n => m.set(n.id, n));
    return m;
  }, [nodes]);

  const hoveredEdges = useMemo(() => {
    if (!hovered) return new Set<number>();
    const s = new Set<number>();
    edges.forEach((e, i) => {
      if (e.fromAgentId === hovered || e.toAgentId === hovered) s.add(i);
    });
    return s;
  }, [hovered, edges]);

  if (agents.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-400" style={{ width, height }}>
        请先选择 Agent 角色
      </div>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="select-none"
    >
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth={ARROW_SIZE}
          markerHeight={ARROW_SIZE}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" className="fill-gray-400" />
        </marker>
        <marker
          id="arrow-active"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth={ARROW_SIZE}
          markerHeight={ARROW_SIZE}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" className="fill-brand-500" />
        </marker>
      </defs>

      {/* Edges */}
      {edges.map((edge, i) => {
        const from = nodeMap.get(edge.fromAgentId);
        const to = nodeMap.get(edge.toAgentId);
        if (!from || !to) return null;

        const isActive = hoveredEdges.has(i);
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return null;

        const ux = dx / dist;
        const uy = dy / dist;

        const startX = from.x + ux * (NODE_RADIUS + 2);
        const startY = from.y + uy * (NODE_RADIUS + 2);
        const endX = to.x - ux * (NODE_RADIUS + ARROW_SIZE + 2);
        const endY = to.y - uy * (NODE_RADIUS + ARROW_SIZE + 2);

        const perpX = -uy;
        const perpY = ux;
        const curvature = 25;
        const midX = (startX + endX) / 2 + perpX * curvature;
        const midY = (startY + endY) / 2 + perpY * curvature;

        const pathD = `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`;

        return (
          <g key={`edge-${i}`}>
            <path
              d={pathD}
              fill="none"
              stroke={isActive ? '#6366f1' : '#d1d5db'}
              strokeWidth={isActive ? 2 : 1.5}
              markerEnd={isActive ? 'url(#arrow-active)' : 'url(#arrow)'}
              className="transition-all duration-150"
            />
            {isActive && (
              <text
                x={midX}
                y={midY - 6}
                textAnchor="middle"
                className="fill-brand-600 text-[10px] font-medium pointer-events-none"
              >
                {edge.label}
              </text>
            )}
          </g>
        );
      })}

      {/* Nodes */}
      {nodes.map(node => {
        const isHovered = hovered === node.id;
        return (
          <g
            key={node.id}
            transform={`translate(${node.x}, ${node.y})`}
            onMouseEnter={() => setHovered(node.id)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onNodeClick?.(node.id)}
            className="cursor-pointer"
          >
            <circle
              r={NODE_RADIUS}
              fill="white"
              stroke={isHovered ? '#6366f1' : '#e5e7eb'}
              strokeWidth={isHovered ? 2.5 : 1.5}
              className="transition-all duration-150"
            />
            <text
              y={-4}
              textAnchor="middle"
              className="text-xl pointer-events-none"
              dominantBaseline="central"
            >
              {node.agent.emoji}
            </text>
            <text
              y={20}
              textAnchor="middle"
              className={`text-[10px] font-semibold pointer-events-none ${
                isHovered ? 'fill-brand-700' : 'fill-gray-700'
              }`}
            >
              {node.agent.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
