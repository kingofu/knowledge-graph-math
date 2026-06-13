import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceId, targetId, relation } = body;

    if (!sourceId || !targetId || !relation) {
      return NextResponse.json({ error: 'sourceId, targetId, relation are required' }, { status: 400 });
    }

    if (sourceId === targetId) {
      return NextResponse.json({ error: '源节点和目标节点不能相同' }, { status: 400 });
    }

    // Check if both nodes exist
    const [sourceNode, targetNode] = await Promise.all([
      db.kGNode.findUnique({ where: { id: sourceId } }),
      db.kGNode.findUnique({ where: { id: targetId } }),
    ]);

    if (!sourceNode) {
      return NextResponse.json({ error: `源节点「${sourceId}」不存在` }, { status: 404 });
    }
    if (!targetNode) {
      return NextResponse.json({ error: `目标节点「${targetId}」不存在` }, { status: 404 });
    }

    // Check if edge already exists
    const existingEdge = await db.kGEdge.findFirst({
      where: { sourceId, targetId, relation },
    });
    if (existingEdge) {
      return NextResponse.json({ error: '该关系已存在' }, { status: 409 });
    }

    const edge = await db.kGEdge.create({
      data: {
        sourceId,
        targetId,
        relation,
      },
    });

    return NextResponse.json({
      source: edge.sourceId,
      target: edge.targetId,
      relation: edge.relation,
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to add edge:', error);
    return NextResponse.json({ error: 'Failed to add edge' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('sourceId');
    const targetId = searchParams.get('targetId');
    const relation = searchParams.get('relation');

    if (!sourceId || !targetId || !relation) {
      return NextResponse.json({ error: 'sourceId, targetId, relation are required' }, { status: 400 });
    }

    const existing = await db.kGEdge.findFirst({
      where: { sourceId, targetId, relation },
    });

    if (!existing) {
      return NextResponse.json({ error: '该关系不存在' }, { status: 404 });
    }

    await db.kGEdge.delete({ where: { id: existing.id } });

    return NextResponse.json({ success: true, message: '关系已删除' });
  } catch (error) {
    console.error('Failed to delete edge:', error);
    return NextResponse.json({ error: 'Failed to delete edge' }, { status: 500 });
  }
}
