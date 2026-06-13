import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

const defaultNodes = [
  { id: '函数', label: '函数', type: 'concept', description: '描述两个变量之间依赖关系的基本概念，是高等数学的研究对象' },
  { id: '极限', label: '极限', type: 'concept', description: '描述函数在无限接近过程中变化趋势的重要概念，是微积分的理论基础' },
  { id: '导数', label: '导数', type: 'concept', description: '描述函数变化率的工具，反映函数在某一点的瞬时变化速度' },
  { id: '微分', label: '微分', type: 'concept', description: '描述函数增量线性主部的概念，与导数密切相关' },
  { id: '积分', label: '积分', type: 'concept', description: '求和的极限，包括不定积分和定积分，是微积分的核心内容' },
  { id: '级数', label: '级数', type: 'concept', description: '无穷项求和的概念，包括数项级数和幂级数' },
  { id: '向量', label: '向量', type: 'concept', description: '具有大小和方向的量，是空间解析几何的基础工具' },
  { id: '空间解析几何', label: '空间解析几何', type: 'concept', description: '用代数方法研究空间几何问题的学科' },
  { id: '极限存在准则', label: '极限存在准则', type: 'theorem', description: '判断极限是否存在的理论依据，包括夹逼准则和单调有界准则' },
  { id: '罗尔定理', label: '罗尔定理', type: 'theorem', description: '闭区间上连续、开区间内可导且端点值相等的函数，必存在导数为零的点' },
  { id: '拉格朗日中值定理', label: '拉格朗日中值定理', type: 'theorem', description: '闭区间上连续、开区间内可导的函数，必存在切线平行于割线的点' },
  { id: '牛顿-莱布尼茨公式', label: '牛顿-莱布尼茨公式', type: 'theorem', description: '定积分等于被积函数原函数在上下限处的差值，连接了微分与积分' },
  { id: '正项级数的比较判别法', label: '正项级数的比较判别法', type: 'theorem', description: '通过与已知敛散性的级数比较来判断正项级数敛散性的方法' },
  { id: '比值判别法', label: '比值判别法', type: 'theorem', description: '通过相邻项之比的极限来判断级数敛散性的方法，也称达朗贝尔判别法' },
  { id: '求极限方法', label: '求极限方法', type: 'method', description: '包括洛必达法则、等价无穷小替换、夹逼准则等多种求极限的技巧' },
  { id: '求导方法', label: '求导方法', type: 'method', description: '包括基本求导公式、复合函数求导法则、隐函数求导等方法' },
  { id: '积分方法', label: '积分方法', type: 'method', description: '包括换元积分法、分部积分法等计算不定积分和定积分的技巧' },
  { id: '判断级数敛散性方法', label: '判断级数敛散性方法', type: 'method', description: '包括比较判别法、比值判别法、根值判别法等判断级数收敛或发散的方法' },
  { id: '物理应用', label: '物理应用', type: 'application', description: '微积分在物理学中的应用，如运动学、功、质心等问题的求解' },
  { id: '几何应用', label: '几何应用', type: 'application', description: '微积分在几何学中的应用，如面积、体积、弧长、曲率等问题的求解' },
];

const defaultEdges = [
  { sourceId: '导数', targetId: '极限', relation: '基于' },
  { sourceId: '微分', targetId: '导数', relation: '基于' },
  { sourceId: '积分', targetId: '导数', relation: '互逆' },
  { sourceId: '级数', targetId: '极限', relation: '基于' },
  { sourceId: '函数', targetId: '极限', relation: '研究' },
  { sourceId: '函数', targetId: '导数', relation: '研究' },
  { sourceId: '函数', targetId: '积分', relation: '研究' },
  { sourceId: '函数', targetId: '级数', relation: '研究' },
  { sourceId: '函数', targetId: '空间解析几何', relation: '研究' },
  { sourceId: '向量', targetId: '空间解析几何', relation: '研究' },
  { sourceId: '极限', targetId: '极限存在准则', relation: '定理' },
  { sourceId: '导数', targetId: '罗尔定理', relation: '定理' },
  { sourceId: '导数', targetId: '拉格朗日中值定理', relation: '定理' },
  { sourceId: '积分', targetId: '牛顿-莱布尼茨公式', relation: '定理' },
  { sourceId: '级数', targetId: '正项级数的比较判别法', relation: '定理' },
  { sourceId: '级数', targetId: '比值判别法', relation: '定理' },
  { sourceId: '极限', targetId: '求极限方法', relation: '方法' },
  { sourceId: '导数', targetId: '求导方法', relation: '方法' },
  { sourceId: '积分', targetId: '积分方法', relation: '方法' },
  { sourceId: '级数', targetId: '判断级数敛散性方法', relation: '方法' },
  { sourceId: '导数', targetId: '物理应用', relation: '应用' },
  { sourceId: '导数', targetId: '几何应用', relation: '应用' },
  { sourceId: '积分', targetId: '物理应用', relation: '应用' },
  { sourceId: '积分', targetId: '几何应用', relation: '应用' },
  { sourceId: '极限存在准则', targetId: '求极限方法', relation: '支撑' },
  { sourceId: '罗尔定理', targetId: '求导方法', relation: '支撑' },
  { sourceId: '拉格朗日中值定理', targetId: '求导方法', relation: '支撑' },
  { sourceId: '牛顿-莱布尼茨公式', targetId: '积分方法', relation: '支撑' },
  { sourceId: '正项级数的比较判别法', targetId: '判断级数敛散性方法', relation: '支撑' },
  { sourceId: '比值判别法', targetId: '判断级数敛散性方法', relation: '支撑' },
  { sourceId: '求极限方法', targetId: '物理应用', relation: '实现' },
  { sourceId: '求极限方法', targetId: '几何应用', relation: '实现' },
  { sourceId: '求导方法', targetId: '物理应用', relation: '实现' },
  { sourceId: '求导方法', targetId: '几何应用', relation: '实现' },
  { sourceId: '积分方法', targetId: '物理应用', relation: '实现' },
  { sourceId: '积分方法', targetId: '几何应用', relation: '实现' },
  { sourceId: '判断级数敛散性方法', targetId: '物理应用', relation: '实现' },
  { sourceId: '判断级数敛散性方法', targetId: '几何应用', relation: '实现' },
];

export async function POST() {
  try {
    // Delete all edges first (foreign key constraint)
    await db.kGEdge.deleteMany();
    // Delete all nodes
    await db.kGNode.deleteMany();

    // Re-seed default nodes
    for (const node of defaultNodes) {
      await db.kGNode.create({ data: node });
    }

    // Re-seed default edges
    for (const edge of defaultEdges) {
      await db.kGEdge.create({ data: edge });
    }

    return NextResponse.json({
      success: true,
      message: '数据已重置为默认值',
      nodesCount: defaultNodes.length,
      edgesCount: defaultEdges.length,
    });
  } catch (error) {
    console.error('Reset failed:', error);
    return NextResponse.json({ error: '重置失败' }, { status: 500 });
  }
}
