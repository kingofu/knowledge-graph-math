import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, label, type, description } = body;

    if (!id || !label || !type) {
      return NextResponse.json({ error: 'id, label, type are required' }, { status: 400 });
    }

    const validTypes = ['concept', 'theorem', 'method', 'application'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: `type must be one of: ${validTypes.join(', ')}` }, { status: 400 });
    }

    // Check if node already exists
    const existing = await db.kGNode.findUnique({ where: { id } });
    if (existing) {
      return NextResponse.json({ error: `节点「${id}」已存在` }, { status: 409 });
    }

    const node = await db.kGNode.create({
      data: {
        id,
        label,
        type,
        description: description || '',
      },
    });

    return NextResponse.json({
      id: node.id,
      label: node.label,
      type: node.type,
      description: node.description,
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to add node:', error);
    return NextResponse.json({ error: 'Failed to add node' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, label, type, description } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Validate type if provided
    if (type) {
      const validTypes = ['concept', 'theorem', 'method', 'application'];
      if (!validTypes.includes(type)) {
        return NextResponse.json({ error: `type must be one of: ${validTypes.join(', ')}` }, { status: 400 });
      }
    }

    // Check if node exists
    const existing = await db.kGNode.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: `节点「${id}」不存在` }, { status: 404 });
    }

    // Build update data with only provided fields
    const updateData: Record<string, string> = {};
    if (label !== undefined) updateData.label = label;
    if (type !== undefined) updateData.type = type;
    if (description !== undefined) updateData.description = description;

    const node = await db.kGNode.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      id: node.id,
      label: node.label,
      type: node.type,
      description: node.description,
    });
  } catch (error) {
    console.error('Failed to update node:', error);
    return NextResponse.json({ error: 'Failed to update node' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 });
    }

    // Check if node exists
    const existing = await db.kGNode.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: `节点「${id}」不存在` }, { status: 404 });
    }

    // Delete the node (cascade will delete related edges)
    await db.kGNode.delete({ where: { id } });

    return NextResponse.json({ success: true, message: `节点「${id}」已删除` });
  } catch (error) {
    console.error('Failed to delete node:', error);
    return NextResponse.json({ error: 'Failed to delete node' }, { status: 500 });
  }
}
