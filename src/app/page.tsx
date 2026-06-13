'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ForceGraph from '@/components/force-graph';
import {
  entityTypeConfig,
  relationTypeConfig,
  type GraphNode,
  type GraphData,
  type EntityType,
} from '@/lib/knowledge-graph-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import {
  Search,
  X,
  Network,
  ChevronRight,
  Info,
  Filter,
  BookOpen,
  Plus,
  Download,
  Trash2,
  Link2,
  Loader2,
  FileUp,
  RotateCcw,
  Pencil,
} from 'lucide-react';

export default function Home() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [highlightedTypes, setHighlightedTypes] = useState<Set<EntityType>>(
    new Set(['concept', 'theorem', 'method', 'application'])
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Add Node dialog state
  const [addNodeOpen, setAddNodeOpen] = useState(false);
  const [newNodeId, setNewNodeId] = useState('');
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [newNodeType, setNewNodeType] = useState<EntityType>('concept');
  const [newNodeDesc, setNewNodeDesc] = useState('');
  const [addingNode, setAddingNode] = useState(false);
  const [nodeIdManuallySet, setNodeIdManuallySet] = useState(false);

  // Add Edge dialog state
  const [addEdgeOpen, setAddEdgeOpen] = useState(false);
  const [edgeSource, setEdgeSource] = useState('');
  const [edgeTarget, setEdgeTarget] = useState('');
  const [edgeRelation, setEdgeRelation] = useState('');
  const [addingEdge, setAddingEdge] = useState(false);

  // Edit Node dialog state
  const [editNodeOpen, setEditNodeOpen] = useState(false);
  const [editNodeId, setEditNodeId] = useState('');
  const [editNodeLabel, setEditNodeLabel] = useState('');
  const [editNodeType, setEditNodeType] = useState<EntityType>('concept');
  const [editNodeDesc, setEditNodeDesc] = useState('');
  const [savingNode, setSavingNode] = useState(false);

  // Batch Import dialog state
  const [importOpen, setImportOpen] = useState(false);
  const [importMarkdown, setImportMarkdown] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ nodesAdded: number; edgesAdded: number; nodesSkipped: number; edgesSkipped: number; errors: string[] } | null>(null);

  // Fetch graph data from API
  const fetchGraphData = useCallback(async () => {
    try {
      const res = await fetch('/api/graph');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setGraphData(data);
    } catch (err) {
      console.error('Failed to fetch graph data:', err);
      toast({ title: '加载失败', description: '无法获取图谱数据', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  // Observe container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, []); // only attach once; containerRef is stable

  const toggleType = useCallback((type: EntityType) => {
    setHighlightedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const selectAllTypes = useCallback(() => {
    setHighlightedTypes(new Set(['concept', 'theorem', 'method', 'application']));
  }, []);

  const clearAllTypes = useCallback(() => {
    setHighlightedTypes(new Set());
  }, []);

  const getConnectedInfo = useCallback(
    (node: GraphNode) => {
      const connectedNodeIds = new Set<string>();
      const connectedEdges = graphData.edges.filter((e) => {
        if (e.source === node.id || e.target === node.id) {
          connectedNodeIds.add(e.source === node.id ? e.target : e.source);
          return true;
        }
        return false;
      });
      const connectedNodeObjects = graphData.nodes.filter((n) => connectedNodeIds.has(n.id));
      return { connectedNodes: connectedNodeObjects, connectedEdges };
    },
    [graphData]
  );

  const handleNodeClick = useCallback((node: GraphNode | null) => {
    setSelectedNode(node);
  }, []);

  // Add node
  const handleAddNode = async () => {
    const nodeId = newNodeId.trim() || newNodeLabel.trim();
    if (!nodeId || !newNodeLabel.trim()) {
      toast({ title: '请填写必填项', description: '节点名称不能为空', variant: 'destructive' });
      return;
    }
    setAddingNode(true);
    try {
      const res = await fetch('/api/graph/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: nodeId, label: newNodeLabel.trim(), type: newNodeType, description: newNodeDesc.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '添加失败');
      }
      toast({ title: '添加成功', description: `节点「${newNodeLabel}」已添加` });
      setAddNodeOpen(false);
      setNewNodeId('');
      setNewNodeLabel('');
      setNewNodeType('concept');
      setNewNodeDesc('');
      setNodeIdManuallySet(false);
      fetchGraphData();
    } catch (err: unknown) {
      toast({ title: '添加失败', description: err instanceof Error ? err.message : '未知错误', variant: 'destructive' });
    } finally {
      setAddingNode(false);
    }
  };

  // Edit node
  const openEditDialog = (node: GraphNode) => {
    setEditNodeId(node.id);
    setEditNodeLabel(node.label);
    setEditNodeType(node.type as EntityType);
    setEditNodeDesc(node.description);
    setEditNodeOpen(true);
  };

  const handleEditNode = async () => {
    if (!editNodeLabel.trim()) {
      toast({ title: '请填写必填项', description: '节点名称不能为空', variant: 'destructive' });
      return;
    }
    setSavingNode(true);
    try {
      const res = await fetch('/api/graph/nodes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editNodeId, label: editNodeLabel.trim(), type: editNodeType, description: editNodeDesc.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '保存失败');
      }
      toast({ title: '保存成功', description: `节点「${editNodeLabel}」已更新` });
      setEditNodeOpen(false);
      // Update selectedNode if it's the same one
      if (selectedNode?.id === editNodeId) {
        setSelectedNode({ ...selectedNode, label: editNodeLabel.trim(), type: editNodeType, description: editNodeDesc.trim() });
      }
      fetchGraphData();
    } catch (err: unknown) {
      toast({ title: '保存失败', description: err instanceof Error ? err.message : '未知错误', variant: 'destructive' });
    } finally {
      setSavingNode(false);
    }
  };

  // Add edge
  const handleAddEdge = async () => {
    if (!edgeSource || !edgeTarget || !edgeRelation.trim()) {
      toast({ title: '请填写必填项', description: '源节点、目标节点和关系名称不能为空', variant: 'destructive' });
      return;
    }
    if (edgeSource === edgeTarget) {
      toast({ title: '无效操作', description: '源节点和目标节点不能相同', variant: 'destructive' });
      return;
    }
    setAddingEdge(true);
    try {
      const res = await fetch('/api/graph/edges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: edgeSource, targetId: edgeTarget, relation: edgeRelation.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '添加失败');
      }
      toast({ title: '添加成功', description: `关系「${edgeRelation}」已添加` });
      setAddEdgeOpen(false);
      setEdgeSource('');
      setEdgeTarget('');
      setEdgeRelation('');
      fetchGraphData();
    } catch (err: unknown) {
      toast({ title: '添加失败', description: err instanceof Error ? err.message : '未知错误', variant: 'destructive' });
    } finally {
      setAddingEdge(false);
    }
  };

  // Delete node
  const handleDeleteNode = async (nodeId: string) => {
    if (!confirm(`确定要删除节点「${nodeId}」吗？其关联的所有关系也会被删除。`)) return;
    try {
      const res = await fetch(`/api/graph/nodes?id=${encodeURIComponent(nodeId)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除失败');
      toast({ title: '删除成功', description: `节点「${nodeId}」已删除` });
      setSelectedNode(null);
      fetchGraphData();
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  // Delete edge
  const handleDeleteEdge = async (sourceId: string, targetId: string, relation: string) => {
    if (!confirm(`确定要删除关系「${relation}」吗？`)) return;
    try {
      const params = new URLSearchParams({ sourceId, targetId, relation });
      const res = await fetch(`/api/graph/edges?${params.toString()}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '删除失败');
      }
      toast({ title: '删除成功', description: `关系「${relation}」已删除` });
      fetchGraphData();
    } catch (err: unknown) {
      toast({ title: '删除失败', description: err instanceof Error ? err.message : '未知错误', variant: 'destructive' });
    }
  };

  // Batch Import
  const handleImport = async () => {
    if (!importMarkdown.trim()) {
      toast({ title: '请输入数据', description: 'Markdown 内容不能为空', variant: 'destructive' });
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch('/api/graph/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown: importMarkdown.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '导入失败');
      setImportResult(data);
      if (data.success) {
        toast({ title: '导入成功', description: `添加 ${data.nodesAdded} 个节点，${data.edgesAdded} 个关系` });
        fetchGraphData();
      }
    } catch (err: unknown) {
      toast({ title: '导入失败', description: err instanceof Error ? err.message : '未知错误', variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  // Reset to default data
  const handleReset = async (skipConfirm = false) => {
    if (!skipConfirm && !confirm('确定要重置为默认数据吗？所有自定义修改将丢失。')) return;
    setResetting(true);
    try {
      const res = await fetch('/api/graph/reset', { method: 'POST' });
      if (!res.ok) throw new Error('重置失败');
      const data = await res.json();
      toast({ title: '重置成功', description: `已恢复 ${data.nodesCount} 个节点和 ${data.edgesCount} 个关系` });
      setSelectedNode(null);
      fetchGraphData();
    } catch {
      toast({ title: '重置失败', variant: 'destructive' });
    } finally {
      setResetting(false);
    }
  };

  // Listen for Electron menu events
  useEffect(() => {
    const electronAPI = (window as unknown as { electronAPI?: { onResetData?: (cb: () => void) => void } }).electronAPI;
    if (electronAPI?.onResetData) {
      electronAPI.onResetData(() => handleReset(true));
    }
  }, []);

  // Export HTML
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/graph/export');
      if (!res.ok) throw new Error('导出失败');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'knowledge-graph.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: '导出成功', description: '离线 HTML 文件已下载' });
    } catch {
      toast({ title: '导出失败', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  // Get unique relation types from current data
  const currentRelationTypes = [...new Set(graphData.edges.map((e) => e.relation))];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-200/60 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
              <Network className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">高等数学知识图谱</h1>
              <p className="text-xs text-slate-400 leading-tight">Interactive Knowledge Graph</p>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative max-w-xs w-full hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="搜索节点..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9 bg-slate-50 border-slate-200 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center hover:bg-slate-300 transition-colors"
              >
                <X className="w-3 h-3 text-slate-500" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Add Node */}
            <Dialog open={addNodeOpen} onOpenChange={(open) => { setAddNodeOpen(open); if (open) setNodeIdManuallySet(false); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1 text-xs">
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">添加节点</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>添加新节点</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="node-label">显示名称 *</Label>
                    <Input id="node-label" placeholder="例如：泰勒公式" value={newNodeLabel} onChange={(e) => {
                      setNewNodeLabel(e.target.value);
                      if (!nodeIdManuallySet) setNewNodeId(e.target.value);
                    }} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="node-id" className="text-slate-400 text-xs">节点 ID（留空则与名称相同）</Label>
                    <Input id="node-id" placeholder="自动填充，可手动修改" value={newNodeId} onChange={(e) => { setNewNodeId(e.target.value); setNodeIdManuallySet(true); }} className="text-sm text-slate-500" />
                  </div>
                  <div className="space-y-2">
                    <Label>实体类型 *</Label>
                    <Select value={newNodeType} onValueChange={(v) => setNewNodeType(v as EntityType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.entries(entityTypeConfig) as [EntityType, typeof entityTypeConfig[EntityType]][]).map(([type, cfg]) => (
                          <SelectItem key={type} value={type}>
                            {cfg.icon} {cfg.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="node-desc">描述</Label>
                    <Textarea id="node-desc" placeholder="节点的简要描述..." value={newNodeDesc} onChange={(e) => setNewNodeDesc(e.target.value)} rows={3} />
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <DialogClose asChild>
                    <Button variant="outline" size="sm">取消</Button>
                  </DialogClose>
                  <Button size="sm" onClick={handleAddNode} disabled={addingNode}>
                    {addingNode && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                    添加
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Edit Node */}
            <Dialog open={editNodeOpen} onOpenChange={setEditNodeOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>编辑节点</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-node-id" className="text-slate-400 text-xs">节点 ID</Label>
                    <Input id="edit-node-id" value={editNodeId} disabled className="text-sm text-slate-400 bg-slate-50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-node-label">显示名称 *</Label>
                    <Input id="edit-node-label" placeholder="例如：泰勒公式" value={editNodeLabel} onChange={(e) => setEditNodeLabel(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>实体类型 *</Label>
                    <Select value={editNodeType} onValueChange={(v) => setEditNodeType(v as EntityType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.entries(entityTypeConfig) as [EntityType, typeof entityTypeConfig[EntityType]][]).map(([type, cfg]) => (
                          <SelectItem key={type} value={type}>
                            {cfg.icon} {cfg.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-node-desc">描述</Label>
                    <Textarea id="edit-node-desc" placeholder="节点的简要描述..." value={editNodeDesc} onChange={(e) => setEditNodeDesc(e.target.value)} rows={3} />
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <DialogClose asChild>
                    <Button variant="outline" size="sm">取消</Button>
                  </DialogClose>
                  <Button size="sm" onClick={handleEditNode} disabled={savingNode}>
                    {savingNode && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                    保存
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Add Edge */}
            <Dialog open={addEdgeOpen} onOpenChange={setAddEdgeOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 gap-1 text-xs">
                  <Link2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">添加关系</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>添加新关系</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>源节点 *</Label>
                    <Select value={edgeSource} onValueChange={setEdgeSource}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择源节点..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {graphData.nodes.map((n) => (
                          <SelectItem key={n.id} value={n.id}>
                            {entityTypeConfig[n.type as EntityType]?.icon} {n.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>关系名称 *</Label>
                    <div className="flex gap-2">
                      <Input placeholder="例如：基于" value={edgeRelation} onChange={(e) => setEdgeRelation(e.target.value)} className="flex-1" />
                      <Select value={edgeRelation} onValueChange={setEdgeRelation}>
                        <SelectTrigger className="w-28">
                          <SelectValue placeholder="常用" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(relationTypeConfig).map(([key]) => (
                            <SelectItem key={key} value={key}>{key}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>目标节点 *</Label>
                    <Select value={edgeTarget} onValueChange={setEdgeTarget}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择目标节点..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {graphData.nodes.filter((n) => n.id !== edgeSource).map((n) => (
                          <SelectItem key={n.id} value={n.id}>
                            {entityTypeConfig[n.type as EntityType]?.icon} {n.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <DialogClose asChild>
                    <Button variant="outline" size="sm">取消</Button>
                  </DialogClose>
                  <Button size="sm" onClick={handleAddEdge} disabled={addingEdge}>
                    {addingEdge && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                    添加
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Batch Import */}
            <Dialog open={importOpen} onOpenChange={(open) => { setImportOpen(open); if (!open) { setImportResult(null); } }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 gap-1 text-xs">
                  <FileUp className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">批量导入</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[85vh]">
                <DialogHeader>
                  <DialogTitle>批量导入 (Markdown)</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 space-y-1.5 border border-slate-200/60">
                    <div className="font-semibold text-slate-700 mb-1">格式说明</div>
                    <div>用 <code className="bg-white px-1 py-0.5 rounded border text-slate-700"># 概念 / # 定理 / # 方法 / # 应用</code> 标记节点类型</div>
                    <div>节点格式：<code className="bg-white px-1 py-0.5 rounded border text-slate-700">- 名称: 描述</code>（描述可省略）</div>
                    <div>关系格式：<code className="bg-white px-1 py-0.5 rounded border text-slate-700">- 源节点 --关系名--&gt; 目标节点</code></div>
                    <div className="border-t border-slate-200 pt-1.5 mt-1.5 text-slate-500">示例：</div>
                    <pre className="bg-white rounded p-2 border text-slate-700 overflow-x-auto">{`# 概念\n- 函数: 描述两个变量之间依赖关系的基本概念\n- 极限: 描述函数在无限接近过程中变化趋势\n\n# 定理\n- 罗尔定理: 闭区间上连续开区间内可导...\n\n# 关系\n- 导数 --基于--&gt; 极限\n- 积分 --互逆--&gt; 导数`}</pre>
                  </div>
                  <Textarea
                    placeholder="在此粘贴 Markdown 格式的知识图谱数据..."
                    value={importMarkdown}
                    onChange={(e) => setImportMarkdown(e.target.value)}
                    rows={12}
                    className="font-mono text-sm"
                  />
                  {importResult && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm space-y-1">
                      <div className="font-semibold text-green-700">导入结果</div>
                      <div className="text-green-600">
                        新增 {importResult.nodesAdded} 个节点，{importResult.edgesAdded} 个关系
                        {importResult.nodesSkipped > 0 && `（跳过 ${importResult.nodesSkipped} 个已存在节点）`}
                        {importResult.edgesSkipped > 0 && `（跳过 ${importResult.edgesSkipped} 个已存在关系）`}
                      </div>
                      {importResult.errors.length > 0 && (
                        <div className="text-red-500 text-xs mt-1">
                          {importResult.errors.map((e, i) => <div key={i}>• {e}</div>)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <DialogFooter className="gap-2">
                  <DialogClose asChild>
                    <Button variant="outline" size="sm">关闭</Button>
                  </DialogClose>
                  <Button size="sm" onClick={handleImport} disabled={importing || !importMarkdown.trim()}>
                    {importing && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                    导入
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Export */}
            <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={handleExport} disabled={exporting}>
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">导出HTML</span>
            </Button>

            <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs text-slate-400 hover:text-orange-500" onClick={handleReset} disabled={resetting} title="重置为默认数据">
              {resetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">重置</span>
            </Button>

            <Badge variant="secondary" className="text-xs gap-1">
              <BookOpen className="w-3 h-3" />
              {graphData.nodes.length} 节点
            </Badge>
            <Badge variant="secondary" className="text-xs gap-1">
              <Network className="w-3 h-3" />
              {graphData.edges.length} 关系
            </Badge>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200/60 bg-white/60 backdrop-blur-sm">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* Entity type filter */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5" />
                    实体类型
                  </h3>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={selectAllTypes}>全选</Button>
                    <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={clearAllTypes}>清空</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {(Object.entries(entityTypeConfig) as [EntityType, typeof entityTypeConfig[EntityType]][]).map(
                    ([type, config]) => {
                      const count = graphData.nodes.filter((n) => n.type === type).length;
                      const isActive = highlightedTypes.has(type);
                      return (
                        <motion.button
                          key={type}
                          onClick={() => toggleType(type)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all text-left ${
                            isActive ? 'border-transparent shadow-sm' : 'border-slate-200 opacity-50'
                          }`}
                          style={{
                            backgroundColor: isActive ? config.bgColor : 'white',
                            borderColor: isActive ? config.borderColor : undefined,
                          }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <span className="text-base">{config.icon}</span>
                          <span className="text-sm font-medium flex-1" style={{ color: isActive ? config.color : '#64748b' }}>
                            {config.label}
                          </span>
                          <span
                            className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: isActive ? config.color : '#e2e8f0',
                              color: isActive ? 'white' : '#94a3b8',
                            }}
                          >
                            {count}
                          </span>
                        </motion.button>
                      );
                    }
                  )}
                </div>
              </div>

              <Separator />

              {/* Relation types */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5" />
                  关系类型
                </h3>
                <div className="space-y-1.5">
                  {currentRelationTypes.map((key) => {
                    const config = relationTypeConfig[key];
                    const count = graphData.edges.filter((e) => e.relation === key).length;
                    return (
                      <div key={key} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 transition-colors">
                        <div
                          className="w-5 h-0.5 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: config?.color || '#94a3b8',
                            backgroundImage: config?.dashArray
                              ? `repeating-linear-gradient(90deg, ${config.color}, ${config.color} 2px, transparent 2px, transparent 4px)`
                              : undefined,
                          }}
                        />
                        <span className="text-xs text-slate-600 flex-1">{key}</span>
                        <span className="text-xs text-slate-400">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Stats */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  统计信息
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-blue-50 rounded-lg p-2.5 text-center">
                    <div className="text-lg font-bold text-blue-600">{graphData.nodes.length}</div>
                    <div className="text-xs text-blue-400">节点总数</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-2.5 text-center">
                    <div className="text-lg font-bold text-purple-600">{graphData.edges.length}</div>
                    <div className="text-xs text-purple-400">关系总数</div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </aside>

        {/* Graph area */}
        <div
          className="flex-1 relative overflow-hidden"
          ref={containerRef}
          style={{
            backgroundImage: 'url(/graph-bg.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] pointer-events-none z-0" />

          {/* Mobile search */}
          <div className="sm:hidden absolute top-3 left-3 right-3 z-30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="搜索节点..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-9 bg-white/90 backdrop-blur-sm border-slate-200 text-sm shadow-md"
              />
            </div>
          </div>

          {/* Mobile type pills */}
          <div className="lg:hidden absolute top-14 left-3 right-3 z-30 flex gap-2 overflow-x-auto pb-1">
            {(Object.entries(entityTypeConfig) as [EntityType, typeof entityTypeConfig[EntityType]][]).map(
              ([type, config]) => {
                const isActive = highlightedTypes.has(type);
                return (
                  <motion.button
                    key={type}
                    onClick={() => toggleType(type)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm transition-all ${
                      isActive ? 'opacity-100' : 'opacity-40'
                    }`}
                    style={{
                      backgroundColor: isActive ? config.bgColor : 'white',
                      color: isActive ? config.color : '#64748b',
                      borderColor: isActive ? config.borderColor : '#e2e8f0',
                      borderWidth: '1px',
                    }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span>{config.icon}</span>
                    {config.label}
                  </motion.button>
                );
              }
            )}
          </div>

          {/* Loading indicator */}
          {loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <span className="text-sm text-slate-400">加载知识图谱数据...</span>
              </div>
            </div>
          )}

          {/* Graph */}
          {!loading && dimensions.width > 0 && dimensions.height > 0 && graphData.nodes.length > 0 && (
            <ForceGraph
              data={graphData}
              width={dimensions.width}
              height={dimensions.height}
              selectedNode={selectedNode}
              onNodeClick={handleNodeClick}
              highlightedTypes={highlightedTypes}
              searchQuery={searchQuery}
            />
          )}

          {!loading && graphData.nodes.length === 0 && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center space-y-3">
                <p className="text-slate-400 text-sm">暂无数据</p>
                <Button size="sm" onClick={() => setAddNodeOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" /> 添加第一个节点
                </Button>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-4 left-4 z-20 bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/60 shadow-lg p-3">
            <div className="text-xs font-semibold text-slate-500 mb-2">图例</div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {(Object.entries(entityTypeConfig) as [EntityType, typeof entityTypeConfig[EntityType]][]).map(
                ([type, config]) => (
                  <div key={type} className="flex items-center gap-1">
                    <div
                      className="w-3 h-3 rounded-full border"
                      style={{ backgroundColor: config.bgColor, borderColor: config.borderColor }}
                    />
                    <span className="text-xs text-slate-600">{config.label}</span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Right panel - Node details */}
        <AnimatePresence>
          {selectedNode && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="hidden md:flex flex-col border-l border-slate-200/60 bg-white/80 backdrop-blur-sm overflow-hidden"
            >
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">节点详情</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-slate-400 hover:text-blue-500 hover:bg-blue-50"
                        onClick={() => openEditDialog(selectedNode)}
                        title="编辑节点"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteNode(selectedNode.id)}
                        title="删除节点"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setSelectedNode(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Node info card */}
                  <Card
                    className="border-0 shadow-md overflow-hidden"
                    style={{ borderTop: `3px solid ${entityTypeConfig[selectedNode.type as EntityType]?.color || '#94a3b8'}` }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                          style={{ backgroundColor: entityTypeConfig[selectedNode.type as EntityType]?.bgColor || '#f1f5f9' }}
                        >
                          {entityTypeConfig[selectedNode.type as EntityType]?.icon || '📌'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle
                            className="text-base leading-tight"
                            style={{ color: entityTypeConfig[selectedNode.type as EntityType]?.color || '#475569' }}
                          >
                            {selectedNode.label}
                          </CardTitle>
                          <Badge
                            variant="secondary"
                            className="mt-1 text-xs"
                            style={{
                              backgroundColor: entityTypeConfig[selectedNode.type as EntityType]?.bgColor || '#f1f5f9',
                              color: entityTypeConfig[selectedNode.type as EntityType]?.color || '#64748b',
                            }}
                          >
                            {entityTypeConfig[selectedNode.type as EntityType]?.label || selectedNode.type}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-600 leading-relaxed">{selectedNode.description || '暂无描述'}</p>
                    </CardContent>
                  </Card>

                  {/* Connected nodes */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">关联节点</h4>
                    <div className="space-y-1.5">
                      {getConnectedInfo(selectedNode).connectedNodes.map((node) => (
                        <motion.button
                          key={node.id}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-left group"
                          onClick={() => setSelectedNode(node)}
                          whileHover={{ x: 4 }}
                        >
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                            style={{ backgroundColor: entityTypeConfig[node.type as EntityType]?.bgColor || '#f1f5f9' }}
                          >
                            {entityTypeConfig[node.type as EntityType]?.icon || '📌'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div
                              className="text-sm font-medium truncate"
                              style={{ color: entityTypeConfig[node.type as EntityType]?.color || '#475569' }}
                            >
                              {node.label}
                            </div>
                            <div className="text-xs text-slate-400">{entityTypeConfig[node.type as EntityType]?.label || node.type}</div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Connected edges */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">关联关系</h4>
                    <div className="space-y-1.5">
                      {getConnectedInfo(selectedNode).connectedEdges.map((edge, i) => {
                        const isSource = edge.source === selectedNode.id;
                        const otherNode = graphData.nodes.find((n) => n.id === (isSource ? edge.target : edge.source));
                        const relConfig = relationTypeConfig[edge.relation];
                        return (
                          <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50/50 group">
                            <div
                              className="w-1 h-6 rounded-full flex-shrink-0"
                              style={{ backgroundColor: relConfig?.color || '#94a3b8' }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-slate-500">
                                {isSource ? selectedNode.label : otherNode?.label}
                                <span className="font-medium" style={{ color: relConfig?.color }}>
                                  {' '}→ {edge.relation} →{' '}
                                </span>
                                {isSource ? otherNode?.label : selectedNode.label}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDeleteEdge(edge.source, edge.target, edge.relation)}
                              title="删除关系"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </motion.aside>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile bottom sheet */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[60vh] overflow-y-auto border-t border-slate-200"
          >
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                    style={{ backgroundColor: entityTypeConfig[selectedNode.type as EntityType]?.bgColor || '#f1f5f9' }}
                  >
                    {entityTypeConfig[selectedNode.type as EntityType]?.icon || '📌'}
                  </div>
                  <div>
                    <h3
                      className="text-sm font-bold"
                      style={{ color: entityTypeConfig[selectedNode.type as EntityType]?.color || '#475569' }}
                    >
                      {selectedNode.label}
                    </h3>
                    <Badge
                      variant="secondary"
                      className="text-xs"
                      style={{
                        backgroundColor: entityTypeConfig[selectedNode.type as EntityType]?.bgColor || '#f1f5f9',
                        color: entityTypeConfig[selectedNode.type as EntityType]?.color || '#64748b',
                      }}
                    >
                      {entityTypeConfig[selectedNode.type as EntityType]?.label || selectedNode.type}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-blue-500 hover:bg-blue-50" onClick={() => openEditDialog(selectedNode)} title="编辑节点">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400" onClick={() => handleDeleteNode(selectedNode.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSelectedNode(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{selectedNode.description || '暂无描述'}</p>
              <Separator />
              <div>
                <h4 className="text-xs font-semibold text-slate-500 mb-1.5">关联节点</h4>
                <div className="flex flex-wrap gap-1.5">
                  {getConnectedInfo(selectedNode).connectedNodes.map((node) => (
                    <button
                      key={node.id}
                      className="flex items-center gap-1 px-2 py-1 rounded-full text-xs hover:opacity-80 transition-opacity"
                      style={{
                        backgroundColor: entityTypeConfig[node.type as EntityType]?.bgColor || '#f1f5f9',
                        color: entityTypeConfig[node.type as EntityType]?.color || '#64748b',
                      }}
                      onClick={() => setSelectedNode(node)}
                    >
                      <span>{entityTypeConfig[node.type as EntityType]?.icon || '📌'}</span>
                      {node.label}
                    </button>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="text-xs font-semibold text-slate-500 mb-1.5">关联关系</h4>
                <div className="space-y-1.5">
                  {getConnectedInfo(selectedNode).connectedEdges.map((edge, i) => {
                    const isSource = edge.source === selectedNode.id;
                    const otherNode = graphData.nodes.find((n) => n.id === (isSource ? edge.target : edge.source));
                    const relConfig = relationTypeConfig[edge.relation];
                    return (
                      <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-50/50">
                        <div
                          className="w-1 h-5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: relConfig?.color || '#94a3b8' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-slate-500">
                            {isSource ? selectedNode.label : otherNode?.label}
                            <span className="font-medium" style={{ color: relConfig?.color }}>
                              {' '}→ {edge.relation} →{' '}
                            </span>
                            {isSource ? otherNode?.label : selectedNode.label}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50"
                          onClick={() => handleDeleteEdge(edge.source, edge.target, edge.relation)}
                          title="删除关系"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-auto bg-white/80 backdrop-blur-sm border-t border-slate-200/60 py-2 px-4">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between text-xs text-slate-400">
          <span>高等数学知识图谱 · 可视化系统</span>
          <span className="flex items-center gap-1">
            拖拽节点 · 滚轮缩放 · 点击查看详情
          </span>
        </div>
      </footer>
    </div>
  );
}
