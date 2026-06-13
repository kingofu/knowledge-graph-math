import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    // Fetch current data from database
    const nodes = await db.kGNode.findMany({ orderBy: { createdAt: 'asc' } });
    const edges = await db.kGEdge.findMany({ orderBy: { createdAt: 'asc' } });

    // Get unique relation types from current data
    const relationTypes = [...new Set(edges.map((e) => e.relation))];

    // Default relation config colors
    const defaultRelationColors: Record<string, { color: string; dash?: string }> = {
      '基于': { color: '#6366f1' },
      '互逆': { color: '#8b5cf6', dash: '5,5' },
      '研究': { color: '#3b82f6' },
      '定理': { color: '#10b981' },
      '方法': { color: '#f59e0b' },
      '应用': { color: '#ef4444' },
      '支撑': { color: '#10b981', dash: '3,3' },
      '实现': { color: '#f97316', dash: '3,3' },
    };

    // Generate dynamic relation config
    const paletteColors = ['#6366f1', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#f97316', '#ec4899', '#14b8a6', '#6b7280'];
    const relationConfig: Record<string, { color: string; dash?: string }> = {};
    relationTypes.forEach((rel, i) => {
      if (defaultRelationColors[rel]) {
        relationConfig[rel] = defaultRelationColors[rel];
      } else {
        relationConfig[rel] = { color: paletteColors[i % paletteColors.length] };
      }
    });

    // Read the template HTML file
    const templatePath = join(process.cwd(), 'public', 'knowledge-graph.html');
    let html: string;
    try {
      html = await readFile(templatePath, 'utf-8');
    } catch {
      return NextResponse.json({ error: '模板文件不存在，请确保 public/knowledge-graph.html 文件存在' }, { status: 500 });
    }

    // Generate the data section
    const nodesStr = nodes
      .map((n) => `  { id:'${escapeJS(n.id)}', label:'${escapeJS(n.label)}', type:'${n.type}', desc:'${escapeJS(n.description)}' }`)
      .join(',\n');

    const edgesStr = edges
      .map((e) => `  {source:'${escapeJS(e.sourceId)}',target:'${escapeJS(e.targetId)}',relation:'${escapeJS(e.relation)}'}`)
      .join(',\n');

    const relationConfigStr = Object.entries(relationConfig)
      .map(([key, cfg]) => `  '${escapeJS(key)}': { color: '${cfg.color}'${cfg.dash ? `, dash: '${cfg.dash}'` : ''} }`)
      .join(',\n');

    // Replace the data section in the HTML
    const dataSectionPattern = /\/\/ ===== DATA =====[\s\S]*?\/\/ ===== STATE =====/;
    const newDataSection = `// ===== DATA =====
const entityConfig = {
  concept:   { label: '概念', icon: '💡', color: '#3b82f6', bg: '#dbeafe', border: '#93c5fd' },
  theorem:   { label: '定理', icon: '📜', color: '#10b981', bg: '#d1fae5', border: '#6ee7b7' },
  method:    { label: '方法', icon: '🔧', color: '#f59e0b', bg: '#fef3c7', border: '#fcd34d' },
  application:{ label: '应用', icon: '🎯', color: '#ef4444', bg: '#fee2e2', border: '#fca5a5' },
};

const relationConfig = {
${relationConfigStr}
};

const nodes = [
${nodesStr}
];

const edges = [
${edgesStr}
];

// ===== STATE =====`;

    html = html.replace(dataSectionPattern, newDataSection);

    // Update badge counts in header
    html = html.replace(
      /(<span class="badge">)[^]*?(<\/span>\s*<span class="badge">)[^]*?(<\/span>)/,
      `$1📄 ${nodes.length} 节点$2🔗 ${edges.length} 关系$3`
    );

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': 'attachment; filename="knowledge-graph.html"',
      },
    });
  } catch (error) {
    console.error('Failed to export HTML:', error);
    return NextResponse.json({ error: 'Failed to export HTML' }, { status: 500 });
  }
}

function escapeJS(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '');
}
