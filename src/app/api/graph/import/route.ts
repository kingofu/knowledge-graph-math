import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// Chinese & English heading to entity type mapping
const HEADING_TYPE_MAP: Record<string, string> = {
  '概念': 'concept',
  '定理': 'theorem',
  '方法': 'method',
  '应用': 'application',
  'concept': 'concept',
  'theorem': 'theorem',
  'method': 'method',
  'application': 'application',
  'relationships': 'edge',
  'edges': 'edge',
  'relations': 'edge',
  '关系': 'edge',
};

const VALID_TYPES = ['concept', 'theorem', 'method', 'application'];

interface ParsedNode {
  id: string;
  label: string;
  type: string;
  description: string;
}

interface ParsedEdge {
  sourceId: string;
  targetId: string;
  relation: string;
}

interface ParseResult {
  nodes: ParsedNode[];
  edges: ParsedEdge[];
  errors: string[];
}

function parseMarkdown(markdown: string): ParseResult {
  const nodes: ParsedNode[] = [];
  const edges: ParsedEdge[] = [];
  const errors: string[] = [];
  const seenNodeIds = new Set<string>();

  let currentType = 'concept'; // default type
  let inEdgeSection = false;

  const lines = markdown.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) continue;

    // Check for headings
    const headingMatch = line.match(/^#\s+(.+)$/);
    if (headingMatch) {
      const headingText = headingMatch[1].trim();

      // Check if this is a type or edge-section heading
      const mappedType = HEADING_TYPE_MAP[headingText];
      if (mappedType === 'edge') {
        inEdgeSection = true;
        continue;
      }
      if (mappedType) {
        currentType = mappedType;
        inEdgeSection = false;
        continue;
      }

      // Unknown heading, try to use as concept type or skip
      errors.push(`第 ${i + 1} 行: 未识别的标题「${headingText}」`);
      continue;
    }

    // Parse list items
    const listMatch = line.match(/^-\s+(.+)$/);
    if (!listMatch) continue;

    const content = listMatch[1].trim();

    if (inEdgeSection) {
      // Parse edge: 源节点 --关系名--> 目标节点
      const edgeMatch = content.match(/^(.+?)\s*--(.+?)-->\s*(.+)$/);
      if (edgeMatch) {
        const sourceLabel = edgeMatch[1].trim();
        const relation = edgeMatch[2].trim();
        const targetLabel = edgeMatch[3].trim();

        if (!sourceLabel || !targetLabel || !relation) {
          errors.push(`第 ${i + 1} 行: 关系格式不正确「${content}」`);
          continue;
        }

        edges.push({
          sourceId: sourceLabel,
          targetId: targetLabel,
          relation,
        });
      } else {
        errors.push(`第 ${i + 1} 行: 无法解析关系「${content}」`);
      }
    } else {
      // Parse node: 名称: 描述  or  名称  (support both ASCII : and full-width ：)
      const colonPositions = [content.indexOf(':'), content.indexOf('：')].filter(i => i !== -1);
      const firstColon = colonPositions.length > 0 ? Math.min(...colonPositions) : -1;
      let label: string;
      let description = '';

      if (firstColon !== -1) {
        label = content.substring(0, firstColon).trim();
        description = content.substring(firstColon + 1).trim();
      } else {
        label = content.trim();
      }

      if (!label) {
        errors.push(`第 ${i + 1} 行: 节点名称为空`);
        continue;
      }

      const nodeId = label;

      if (seenNodeIds.has(nodeId)) {
        errors.push(`第 ${i + 1} 行: 重复的节点「${label}」`);
        continue;
      }

      seenNodeIds.add(nodeId);

      const nodeType = VALID_TYPES.includes(currentType) ? currentType : 'concept';

      nodes.push({
        id: nodeId,
        label,
        type: nodeType,
        description,
      });
    }
  }

  return { nodes, edges, errors };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { markdown } = body;

    if (!markdown || typeof markdown !== 'string') {
      return NextResponse.json(
        { success: false, error: 'markdown 字段为必填字符串' },
        { status: 400 }
      );
    }

    const { nodes, edges, errors: parseErrors } = parseMarkdown(markdown);

    let nodesAdded = 0;
    let nodesSkipped = 0;
    let edgesAdded = 0;
    let edgesSkipped = 0;
    const errors: string[] = [...parseErrors];

    // Collect all node IDs referenced in edges
    const edgeNodeIds = new Set<string>();
    for (const edge of edges) {
      edgeNodeIds.add(edge.sourceId);
      edgeNodeIds.add(edge.targetId);
    }

    // Auto-create nodes from edges that weren't defined in headings
    const definedNodeIds = new Set(nodes.map((n) => n.id));
    const autoNodes: ParsedNode[] = [];
    for (const nodeId of edgeNodeIds) {
      if (!definedNodeIds.has(nodeId)) {
        autoNodes.push({
          id: nodeId,
          label: nodeId,
          type: 'concept',
          description: '',
        });
      }
    }

    // Combine all nodes: explicitly defined first, then auto-created
    const allNodes = [...nodes, ...autoNodes];

    // Create nodes one by one (skip existing)
    for (const node of allNodes) {
      try {
        const existing = await db.kGNode.findUnique({ where: { id: node.id } });
        if (existing) {
          nodesSkipped++;
        } else {
          await db.kGNode.create({
            data: {
              id: node.id,
              label: node.label,
              type: node.type,
              description: node.description,
            },
          });
          nodesAdded++;
        }
      } catch (error) {
        errors.push(`创建节点「${node.label}」失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }

    // Create edges one by one (skip existing)
    for (const edge of edges) {
      try {
        // Verify both nodes exist
        const [sourceNode, targetNode] = await Promise.all([
          db.kGNode.findUnique({ where: { id: edge.sourceId } }),
          db.kGNode.findUnique({ where: { id: edge.targetId } }),
        ]);

        if (!sourceNode) {
          errors.push(`关系跳过: 源节点「${edge.sourceId}」不存在`);
          edgesSkipped++;
          continue;
        }
        if (!targetNode) {
          errors.push(`关系跳过: 目标节点「${edge.targetId}」不存在`);
          edgesSkipped++;
          continue;
        }

        // Check for duplicate edge
        const existingEdge = await db.kGEdge.findFirst({
          where: {
            sourceId: edge.sourceId,
            targetId: edge.targetId,
            relation: edge.relation,
          },
        });

        if (existingEdge) {
          edgesSkipped++;
        } else {
          await db.kGEdge.create({
            data: {
              sourceId: edge.sourceId,
              targetId: edge.targetId,
              relation: edge.relation,
            },
          });
          edgesAdded++;
        }
      } catch (error) {
        errors.push(`创建关系「${edge.sourceId} --${edge.relation}--> ${edge.targetId}」失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }

    return NextResponse.json({
      success: true,
      nodesAdded,
      edgesAdded,
      nodesSkipped,
      edgesSkipped,
      errors,
    });
  } catch (error) {
    console.error('Batch import failed:', error);
    return NextResponse.json(
      {
        success: false,
        nodesAdded: 0,
        edgesAdded: 0,
        nodesSkipped: 0,
        edgesSkipped: 0,
        errors: [`导入失败: ${error instanceof Error ? error.message : '未知错误'}`],
      },
      { status: 500 }
    );
  }
}
