// 高等数学知识图谱数据

export type EntityType = 'concept' | 'theorem' | 'method' | 'application';

export interface GraphNode {
  id: string;
  label: string;
  type: EntityType;
  description: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// 概念类实体
const conceptEntities: GraphNode[] = [
  { id: '函数', label: '函数', type: 'concept', description: '描述两个变量之间依赖关系的基本概念，是高等数学的研究对象' },
  { id: '极限', label: '极限', type: 'concept', description: '描述函数在无限接近过程中变化趋势的重要概念，是微积分的理论基础' },
  { id: '导数', label: '导数', type: 'concept', description: '描述函数变化率的工具，反映函数在某一点的瞬时变化速度' },
  { id: '微分', label: '微分', type: 'concept', description: '描述函数增量线性主部的概念，与导数密切相关' },
  { id: '积分', label: '积分', type: 'concept', description: '求和的极限，包括不定积分和定积分，是微积分的核心内容' },
  { id: '级数', label: '级数', type: 'concept', description: '无穷项求和的概念，包括数项级数和幂级数' },
  { id: '向量', label: '向量', type: 'concept', description: '具有大小和方向的量，是空间解析几何的基础工具' },
  { id: '空间解析几何', label: '空间解析几何', type: 'concept', description: '用代数方法研究空间几何问题的学科' },
];

// 定理类实体
const theoremEntities: GraphNode[] = [
  { id: '极限存在准则', label: '极限存在准则', type: 'theorem', description: '判断极限是否存在的理论依据，包括夹逼准则和单调有界准则' },
  { id: '罗尔定理', label: '罗尔定理', type: 'theorem', description: '闭区间上连续、开区间内可导且端点值相等的函数，必存在导数为零的点' },
  { id: '拉格朗日中值定理', label: '拉格朗日中值定理', type: 'theorem', description: '闭区间上连续、开区间内可导的函数，必存在切线平行于割线的点' },
  { id: '牛顿-莱布尼茨公式', label: '牛顿-莱布尼茨公式', type: 'theorem', description: '定积分等于被积函数原函数在上下限处的差值，连接了微分与积分' },
  { id: '正项级数的比较判别法', label: '正项级数的比较判别法', type: 'theorem', description: '通过与已知敛散性的级数比较来判断正项级数敛散性的方法' },
  { id: '比值判别法', label: '比值判别法', type: 'theorem', description: '通过相邻项之比的极限来判断级数敛散性的方法，也称达朗贝尔判别法' },
];

// 方法类实体
const methodEntities: GraphNode[] = [
  { id: '求极限方法', label: '求极限方法', type: 'method', description: '包括洛必达法则、等价无穷小替换、夹逼准则等多种求极限的技巧' },
  { id: '求导方法', label: '求导方法', type: 'method', description: '包括基本求导公式、复合函数求导法则、隐函数求导等方法' },
  { id: '积分方法', label: '积分方法', type: 'method', description: '包括换元积分法、分部积分法等计算不定积分和定积分的技巧' },
  { id: '判断级数敛散性方法', label: '判断级数敛散性方法', type: 'method', description: '包括比较判别法、比值判别法、根值判别法等判断级数收敛或发散的方法' },
];

// 应用类实体
const applicationEntities: GraphNode[] = [
  { id: '物理应用', label: '物理应用', type: 'application', description: '微积分在物理学中的应用，如运动学、功、质心等问题的求解' },
  { id: '几何应用', label: '几何应用', type: 'application', description: '微积分在几何学中的应用，如面积、体积、弧长、曲率等问题的求解' },
];

// 概念之间的关系
const conceptRelations: GraphEdge[] = [
  { source: '导数', target: '极限', relation: '基于' },
  { source: '微分', target: '导数', relation: '基于' },
  { source: '积分', target: '导数', relation: '互逆' },
  { source: '级数', target: '极限', relation: '基于' },
  { source: '函数', target: '极限', relation: '研究' },
  { source: '函数', target: '导数', relation: '研究' },
  { source: '函数', target: '积分', relation: '研究' },
  { source: '函数', target: '级数', relation: '研究' },
  { source: '函数', target: '空间解析几何', relation: '研究' },
  { source: '向量', target: '空间解析几何', relation: '研究' },
];

// 概念与定理的关系
const conceptTheoremRelations: GraphEdge[] = [
  { source: '极限', target: '极限存在准则', relation: '定理' },
  { source: '导数', target: '罗尔定理', relation: '定理' },
  { source: '导数', target: '拉格朗日中值定理', relation: '定理' },
  { source: '积分', target: '牛顿-莱布尼茨公式', relation: '定理' },
  { source: '级数', target: '正项级数的比较判别法', relation: '定理' },
  { source: '级数', target: '比值判别法', relation: '定理' },
];

// 概念与方法的关系
const conceptMethodRelations: GraphEdge[] = [
  { source: '极限', target: '求极限方法', relation: '方法' },
  { source: '导数', target: '求导方法', relation: '方法' },
  { source: '积分', target: '积分方法', relation: '方法' },
  { source: '级数', target: '判断级数敛散性方法', relation: '方法' },
];

// 概念与应用的关系
const conceptApplicationRelations: GraphEdge[] = [
  { source: '导数', target: '物理应用', relation: '应用' },
  { source: '导数', target: '几何应用', relation: '应用' },
  { source: '积分', target: '物理应用', relation: '应用' },
  { source: '积分', target: '几何应用', relation: '应用' },
];

// 定理与方法的关系
const theoremMethodRelations: GraphEdge[] = [
  { source: '极限存在准则', target: '求极限方法', relation: '支撑' },
  { source: '罗尔定理', target: '求导方法', relation: '支撑' },
  { source: '拉格朗日中值定理', target: '求导方法', relation: '支撑' },
  { source: '牛顿-莱布尼茨公式', target: '积分方法', relation: '支撑' },
  { source: '正项级数的比较判别法', target: '判断级数敛散性方法', relation: '支撑' },
  { source: '比值判别法', target: '判断级数敛散性方法', relation: '支撑' },
];

// 方法与应用的关系
const methodApplicationRelations: GraphEdge[] = [
  { source: '求极限方法', target: '物理应用', relation: '实现' },
  { source: '求极限方法', target: '几何应用', relation: '实现' },
  { source: '求导方法', target: '物理应用', relation: '实现' },
  { source: '求导方法', target: '几何应用', relation: '实现' },
  { source: '积分方法', target: '物理应用', relation: '实现' },
  { source: '积分方法', target: '几何应用', relation: '实现' },
  { source: '判断级数敛散性方法', target: '物理应用', relation: '实现' },
  { source: '判断级数敛散性方法', target: '几何应用', relation: '实现' },
];

export const knowledgeGraphData: GraphData = {
  nodes: [...conceptEntities, ...theoremEntities, ...methodEntities, ...applicationEntities],
  edges: [
    ...conceptRelations,
    ...conceptTheoremRelations,
    ...conceptMethodRelations,
    ...conceptApplicationRelations,
    ...theoremMethodRelations,
    ...methodApplicationRelations,
  ],
};

// 实体类型配置
export const entityTypeConfig: Record<EntityType, { label: string; color: string; bgColor: string; borderColor: string; icon: string }> = {
  concept: {
    label: '概念',
    color: '#3b82f6',
    bgColor: '#dbeafe',
    borderColor: '#93c5fd',
    icon: '💡',
  },
  theorem: {
    label: '定理',
    color: '#10b981',
    bgColor: '#d1fae5',
    borderColor: '#6ee7b7',
    icon: '📜',
  },
  method: {
    label: '方法',
    color: '#f59e0b',
    bgColor: '#fef3c7',
    borderColor: '#fcd34d',
    icon: '🔧',
  },
  application: {
    label: '应用',
    color: '#ef4444',
    bgColor: '#fee2e2',
    borderColor: '#fca5a5',
    icon: '🎯',
  },
};

// 关系类型配置
export const relationTypeConfig: Record<string, { label: string; color: string; dashArray?: string }> = {
  '基于': { label: '基于', color: '#6366f1' },
  '互逆': { label: '互逆', color: '#8b5cf6', dashArray: '5,5' },
  '研究': { label: '研究', color: '#3b82f6' },
  '定理': { label: '定理', color: '#10b981' },
  '方法': { label: '方法', color: '#f59e0b' },
  '应用': { label: '应用', color: '#ef4444' },
  '支撑': { label: '支撑', color: '#10b981', dashArray: '3,3' },
  '实现': { label: '实现', color: '#f97316', dashArray: '3,3' },
};
