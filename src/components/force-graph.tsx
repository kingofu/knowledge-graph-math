'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import * as d3 from 'd3';
import { Network } from 'lucide-react';
import { type GraphData, type GraphNode, type EntityType, entityTypeConfig, relationTypeConfig } from '@/lib/knowledge-graph-data';

interface ForceGraphProps {
  data: GraphData;
  width: number;
  height: number;
  selectedNode: GraphNode | null;
  onNodeClick: (node: GraphNode | null) => void;
  highlightedTypes: Set<EntityType>;
  searchQuery: string;
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: EntityType;
  description: string;
  connectionCount: number;
}

interface SimEdge extends d3.SimulationLinkDatum<SimNode> {
  relation: string;
}

export default function ForceGraph({
  data,
  width,
  height,
  selectedNode,
  onNodeClick,
  highlightedTypes,
  searchQuery,
}: ForceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<SimNode, SimEdge> | null>(null);
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);

  // Calculate connection count per node
  const getConnectionCount = useCallback(
    (nodeId: string) => {
      return data.edges.filter((e) => e.source === nodeId || e.target === nodeId).length;
    },
    [data.edges]
  );

  const getNodeRadius = useCallback(
    (node: SimNode) => {
      const baseRadius =
        node.type === 'concept' ? 26 : node.type === 'theorem' ? 22 : node.type === 'method' ? 20 : 18;
      // Scale radius by connection count
      const scale = 1 + Math.min(node.connectionCount, 6) * 0.06;
      return baseRadius * scale;
    },
    []
  );

  const isNodeVisible = useCallback(
    (node: SimNode) => {
      if (!highlightedTypes.has(node.type)) return false;
      if (searchQuery && !node.label.includes(searchQuery) && !node.id.includes(searchQuery)) return false;
      return true;
    },
    [highlightedTypes, searchQuery]
  );

  // Ref to always have the latest isNodeVisible in closures (e.g. mouseout handler)
  const isNodeVisibleRef = useRef(isNodeVisible);
  isNodeVisibleRef.current = isNodeVisible;

  useEffect(() => {
    if (!svgRef.current || width === 0 || height === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Defs for filters and gradients
    const defs = svg.append('defs');

    // Drop shadow filter
    const filter = defs
      .append('filter')
      .attr('id', 'drop-shadow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    filter
      .append('feDropShadow')
      .attr('dx', '0')
      .attr('dy', '2')
      .attr('stdDeviation', '3')
      .attr('flood-color', 'rgba(0,0,0,0.12)');

    // Glow filter for selected
    const glowFilter = defs
      .append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    glowFilter.append('feGaussianBlur').attr('stdDeviation', '5').attr('result', 'coloredBlur');
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Node gradient fills
    (Object.entries(entityTypeConfig) as [EntityType, typeof entityTypeConfig[EntityType]][]).forEach(
      ([type, config]) => {
        const gradient = defs
          .append('radialGradient')
          .attr('id', `gradient-${type}`)
          .attr('cx', '35%')
          .attr('cy', '35%')
          .attr('r', '65%');
        gradient.append('stop').attr('offset', '0%').attr('stop-color', '#ffffff').attr('stop-opacity', 0.9);
        gradient
          .append('stop')
          .attr('offset', '100%')
          .attr('stop-color', config.bgColor)
          .attr('stop-opacity', 1);
      }
    );

    // Arrow markers for different relation types
    Object.entries(relationTypeConfig).forEach(([key, config]) => {
      defs
        .append('marker')
        .attr('id', `arrow-${key}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 34)
        .attr('refY', 0)
        .attr('markerWidth', 5)
        .attr('markerHeight', 5)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-3.5L7,0L0,3.5')
        .attr('fill', config.color)
        .attr('fill-opacity', 0.5);
    });

    // Prepare simulation data
    const nodes: SimNode[] = data.nodes.map((n) => ({
      ...n,
      connectionCount: getConnectionCount(n.id),
      x: width / 2 + (Math.random() - 0.5) * 300,
      y: height / 2 + (Math.random() - 0.5) * 300,
    }));

    const edges: SimEdge[] = data.edges.map((e) => ({
      source: e.source,
      target: e.target,
      relation: e.relation,
    }));

    // Create simulation
    const simulation = d3
      .forceSimulation<SimNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<SimNode, SimEdge>(edges)
          .id((d) => d.id)
          .distance((d) => {
            // More distance for nodes with fewer connections
            const sourceR = getNodeRadius(d.source as SimNode);
            const targetR = getNodeRadius(d.target as SimNode);
            return sourceR + targetR + 60;
          })
          .strength(0.4)
      )
      .force('charge', d3.forceManyBody<SimNode>().strength((d) => -350 - d.connectionCount * 20))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<SimNode>().radius((d) => getNodeRadius(d) + 8))
      .force('x', d3.forceX(width / 2).strength(0.04))
      .force('y', d3.forceY(height / 2).strength(0.04));

    simulationRef.current = simulation;

    // Create container group for zoom
    const g = svg.append('g').attr('class', 'graph-container');

    // Zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Initial zoom to fit
    const initialTransform = d3.zoomIdentity.translate(0, 0).scale(1);
    svg.call(zoom.transform, initialTransform);

    // Draw edges with curved paths
    const linkGroup = g.append('g').attr('class', 'links');

    const link = linkGroup
      .selectAll('line')
      .data(edges)
      .join('line')
      .attr('stroke', (d) => relationTypeConfig[d.relation]?.color || '#94a3b8')
      .attr('stroke-width', 1.2)
      .attr('stroke-opacity', 0.3)
      .attr('marker-end', (d) => `url(#arrow-${d.relation})`)
      .attr('stroke-dasharray', (d) => relationTypeConfig[d.relation]?.dashArray || 'none');

    // Draw edge labels
    const edgeLabelGroup = g.append('g').attr('class', 'edge-labels');

    const edgeLabel = edgeLabelGroup
      .selectAll<SVGTextElement, SimEdge>('text')
      .data(edges)
      .join('text')
      .text((d) => relationTypeConfig[d.relation]?.label || d.relation)
      .attr('font-size', '9px')
      .attr('fill', (d) => relationTypeConfig[d.relation]?.color || '#94a3b8')
      .attr('fill-opacity', 0.35)
      .attr('text-anchor', 'middle')
      .attr('dy', -5)
      .style('pointer-events', 'none')
      .style('user-select', 'none')
      .style('font-weight', '500');

    // Draw node groups
    const nodeGroup = g.append('g').attr('class', 'nodes');

    const nodeElements = nodeGroup
      .selectAll<SVGGElement, SimNode>('g')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(
        d3
          .drag<SVGGElement, SimNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Node circles - outer glow ring
    nodeElements
      .append('circle')
      .attr('class', 'node-ring')
      .attr('r', (d) => getNodeRadius(d) + 5)
      .attr('fill', 'none')
      .attr('stroke', (d) => entityTypeConfig[d.type].color)
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.15);

    // Node circles - main body with gradient
    nodeElements
      .append('circle')
      .attr('class', 'node-circle')
      .attr('r', (d) => getNodeRadius(d))
      .attr('fill', (d) => `url(#gradient-${d.type})`)
      .attr('stroke', (d) => entityTypeConfig[d.type].borderColor)
      .attr('stroke-width', 2)
      .attr('filter', 'url(#drop-shadow)');

    // Node icon - centered
    nodeElements
      .append('text')
      .attr('class', 'node-icon')
      .attr('text-anchor', 'middle')
      .attr('dy', '-2')
      .attr('font-size', (d) => (d.type === 'concept' ? '13px' : '11px'))
      .text((d) => entityTypeConfig[d.type].icon)
      .style('pointer-events', 'none');

    // Node label - below icon
    nodeElements
      .append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => {
        const r = getNodeRadius(d);
        return r * 0.55;
      })
      .attr('font-size', (d) => {
        if (d.label.length > 7) return '8px';
        if (d.label.length > 4) return '9px';
        return '10px';
      })
      .attr('font-weight', '600')
      .attr('fill', (d) => entityTypeConfig[d.type].color)
      .text((d) => d.label)
      .style('pointer-events', 'none')
      .style('user-select', 'none')
      .style('text-shadow', '0 1px 2px rgba(255,255,255,0.8)');

    // Entry animation
    nodeElements.style('opacity', 0).transition().duration(600).delay((_d, i) => i * 30).style('opacity', (n) => (isNodeVisible(n) ? 1 : 0.15));

    // Hover and click interactions
    nodeElements
      .on('mouseover', function (_event, d) {
        setHoveredNode(d);

        // Highlight connected
        const connectedIds = new Set<string>();
        connectedIds.add(d.id);
        edges.forEach((e) => {
          const s = typeof e.source === 'object' ? e.source.id : e.source;
          const t = typeof e.target === 'object' ? e.target.id : e.target;
          if (s === d.id) connectedIds.add(t);
          if (t === d.id) connectedIds.add(s);
        });

        // Dim non-connected
        nodeElements.transition().duration(200).style('opacity', (n) => (connectedIds.has(n.id) ? 1 : 0.15));
        link
          .transition()
          .duration(200)
          .attr('stroke-opacity', (e) => {
            const s = typeof e.source === 'object' ? e.source.id : e.source;
            const t = typeof e.target === 'object' ? e.target.id : e.target;
            return s === d.id || t === d.id ? 0.7 : 0.04;
          })
          .attr('stroke-width', (e) => {
            const s = typeof e.source === 'object' ? e.source.id : e.source;
            const t = typeof e.target === 'object' ? e.target.id : e.target;
            return s === d.id || t === d.id ? 2 : 1.2;
          });
        edgeLabel
          .transition()
          .duration(200)
          .attr('fill-opacity', (e) => {
            const s = typeof e.source === 'object' ? e.source.id : e.source;
            const t = typeof e.target === 'object' ? e.target.id : e.target;
            return s === d.id || t === d.id ? 0.85 : 0.04;
          });

        // Highlight this node
        d3.select(this).select('.node-ring').attr('stroke-opacity', 0.5).attr('stroke-width', 2.5);
        d3.select(this).select('.node-circle').attr('filter', 'url(#glow)');
      })
      .on('mouseout', function () {
        setHoveredNode(null);

        // Reset all
        nodeElements.transition().duration(200).style('opacity', (n) => (isNodeVisibleRef.current(n) ? 1 : 0.15));
        link.transition().duration(200).attr('stroke-opacity', 0.3).attr('stroke-width', 1.2);
        edgeLabel.transition().duration(200).attr('fill-opacity', 0.35);

        d3.select(this).select('.node-ring').attr('stroke-opacity', 0.15).attr('stroke-width', 1.5);
        d3.select(this).select('.node-circle').attr('filter', 'url(#drop-shadow)');
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        onNodeClick(d as GraphNode);
      });

    // Click on background to deselect
    svg.on('click', () => {
      onNodeClick(null);
    });

    // Simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as SimNode).x || 0)
        .attr('y1', (d) => (d.source as SimNode).y || 0)
        .attr('x2', (d) => (d.target as SimNode).x || 0)
        .attr('y2', (d) => (d.target as SimNode).y || 0);

      edgeLabel
        .attr('x', (d) => (((d.source as SimNode).x || 0) + ((d.target as SimNode).x || 0)) / 2)
        .attr('y', (d) => (((d.source as SimNode).y || 0) + ((d.target as SimNode).y || 0)) / 2);

      nodeElements.attr('transform', (d) => `translate(${d.x || 0},${d.y || 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [data, width, height]);

  // Lightweight effect: update node visibility on search/filter change without rebuilding SVG
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const nodeElements = svg.selectAll<SVGGElement, SimNode>('.node');

    // Only update if there's no selectedNode (selectedNode effect handles its own opacity)
    if (!selectedNode) {
      nodeElements.transition().duration(200).style('opacity', (n) => {
        const d = n as SimNode;
        if (!highlightedTypes.has(d.type)) return 0.15;
        if (searchQuery && !d.label.includes(searchQuery) && !d.id.includes(searchQuery)) return 0.15;
        return 1;
      });
    }
  }, [highlightedTypes, searchQuery, selectedNode]);

  // Update selected node highlighting
  useEffect(() => {
    if (!svgRef.current || !selectedNode) return;

    const svg = d3.select(svgRef.current);
    const nodeElements = svg.selectAll<SVGGElement, SimNode>('.node');

    const connectedIds = new Set<string>();
    connectedIds.add(selectedNode.id);

    const edges = data.edges;
    edges.forEach((e) => {
      if (e.source === selectedNode.id) connectedIds.add(e.target);
      if (e.target === selectedNode.id) connectedIds.add(e.source);
    });

    nodeElements.transition().duration(300).style('opacity', (n) => (connectedIds.has(n.id) ? 1 : 0.12));
  }, [selectedNode, data.edges]);

  return (
    <div className="relative w-full h-full" style={{ zIndex: 1 }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="block"
        style={{ background: 'transparent' }}
      />
      {/* Hover tooltip */}
      {hoveredNode && (
        <div
          className="absolute pointer-events-none bg-white/95 backdrop-blur-md border border-gray-200/80 rounded-xl shadow-xl px-4 py-3 text-sm z-50 max-w-xs"
          style={{
            left: '16px',
            top: '16px',
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-base">{entityTypeConfig[hoveredNode.type].icon}</span>
            <span className="font-bold text-slate-800">{hoveredNode.label}</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: entityTypeConfig[hoveredNode.type].bgColor,
                color: entityTypeConfig[hoveredNode.type].color,
              }}
            >
              {entityTypeConfig[hoveredNode.type].label}
            </span>
          </div>
          <p className="text-slate-500 text-xs leading-relaxed">{hoveredNode.description}</p>
          <div className="mt-1.5 flex items-center gap-1 text-xs text-slate-400">
            <Network className="w-3 h-3" />
            {hoveredNode.connectionCount} 个关联节点
          </div>
        </div>
      )}
    </div>
  );
}
