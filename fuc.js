function normalizeGraphIds(data) {
    if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) return;
    data.nodes.forEach((node, idx) => {
        if (!node.id) node.id = `node_${idx}`;
    });
    data.edges.forEach((edge, idx) => {
        if (!edge.id) edge.id = `edge_${edge.source || 's'}_${edge.target || 't'}_${idx}`;
    });
}

// 初始化图谱
function initGraph() {
    const container = document.getElementById('graph-container');
    graph = new G6.Graph({
        container: 'graph-container',
        autoResize: true,
        width: container.clientWidth,
        height: container.clientHeight,
        data: graphData,
        node: {
            type: 'image',
            style: {
                src: (d) => d.src || 'https://gw.alipayobjects.com/mdn/rms_6ae20b/afts/img/A*N4ZMS7gHsUIAAAAAAAAAAABkARQnAQ',
                keepAspectRatio: true, // 保持图片原始宽高比
            }
        },
        edge: {
            style: {
                stroke: (d) => d.style?.stroke || '#999',
                lineWidth: 2,
                labelText: (d) => d.style?.labelText || '',
                labelFontSize: 10,
                labelFill: '#666',
                labelBackgroundFill: 'rgba(255,255,255,0.8)',
                endArrow: true
            }
        },
        behaviors: [
            'drag-canvas',
            'zoom-canvas',
            {
                type: 'click-select',
                enable: (event) => ['node'].includes(event.targetType),
                onClick: (e) => {//e.target
                    showInfo(e.target.id);
                }
            },
            {
                type: 'hover-activate',
                key: 'hover-activate-1',
                degree: 1, // 选中扩散范围
                state: 'highlight', // 选中的状态
                inactiveState: 'inactive', // 未选中节点状态
            }
        ],
    });
    graph.render();
}

function findNodeById(targetId) {
    // 检查参数
    console.log('targetId:', targetId);

    if (!graphData || !graphData.nodes || !Array.isArray(graphData.nodes)) {
        console.error('graphData.nodes必须是一个数组');
        return null;
    }

    if (!targetId || typeof targetId !== 'string') {
        console.error('targetId必须是字符串');
        return null;
    }

    // 不区分大小写搜索
    const lowerTargetId = targetId.toLowerCase();

    // 在nodes数组中查找
    const foundNode = graphData.nodes.find(node => {
        if (node && node.id) {
            // 精确匹配ID
            if (node.id === targetId) return true;

            // 不区分大小写匹配
            if (node.id.toLowerCase() === lowerTargetId) return true;

            // 匹配data中的name
            if (node.data?.name && node.data.name.toLowerCase() === lowerTargetId) return true;

            // 匹配data中的title
            if (node.data?.title && node.data.title.toLowerCase().includes(lowerTargetId)) return true;
        }
        return false;
    });

    if (foundNode) {
        console.log('找到节点:', foundNode);
    } else {
        console.log('未找到匹配的节点，可用节点:', graphData.nodes.map(n => n.id));
    }

    return foundNode || null;
}

function searchNode() {
    const searchInput = document.getElementById('searchNode');
    const searchText = searchInput.value.trim();

    if (searchText === '') {
        alert('请输入搜索内容');
        searchInput.focus();
        return;
    }
    let target = findNodeById(searchText)
    
    showInfo(target.id)
    // const target = findNodeById(searchText);
    // if (!target) {
    //     alert(`未找到人物："${searchText}"`);
    //     return;
    // }
    // const node = graph.getNodeData(target.id);
    // if (node) {
    //     // 使用 focusElement 正确定位节点，避免坐标偏移问题
    //     graph.focusElement(target.id, true);
    //     // 设置选中状态
    //     graph.setElementState(target.id, 'selected', true);
    // } else {
    //     alert('未找到节点: ' + target.id);
    // }

}

function clearPathStates() {
    if (!graph) return;
    const setStateById = (id, state, value) => {
        if (typeof graph.setElementState === 'function') {
            graph.setElementState(id, state, value);
            return;
        }
        if (typeof graph.setItemState === 'function') {
            graph.setItemState(id, state, value);
        }
    };

    const hasAutoPaint = typeof graph.setAutoPaint === 'function';
    if (hasAutoPaint) graph.setAutoPaint(false);

    lastPathNodeIds.forEach((id) => setStateById(id, 'pathHighlight', false));
    lastPathEdgeIds.forEach((id) => setStateById(id, 'pathHighlight', false));
    lastPathNodeIds.clear();
    lastPathEdgeIds.clear();

    if (typeof graph.paint === 'function') graph.paint();
    if (hasAutoPaint) graph.setAutoPaint(true);
}

function buildAdjacencyList() {
    const adj = new Map();
    (graphData.nodes || []).forEach((n) => adj.set(n.id, []));
    (graphData.edges || []).forEach((e) => {
        if (!adj.has(e.source)) adj.set(e.source, []);
        if (!adj.has(e.target)) adj.set(e.target, []);
        adj.get(e.source).push(e.target);
        adj.get(e.target).push(e.source);
    });
    return adj;
}

function findShortestPath(startId, endId) {
    if (startId === endId) return [startId];
    const adj = buildAdjacencyList();
    const queue = [startId];
    const visited = new Set([startId]);
    const prev = new Map();

    while (queue.length > 0) {
        const current = queue.shift();
        const neighbors = adj.get(current) || [];
        for (const next of neighbors) {
            if (visited.has(next)) continue;
            visited.add(next);
            prev.set(next, current);
            if (next === endId) {
                queue.length = 0;
                break;
            }
            queue.push(next);
        }
    }

    if (!visited.has(endId)) return null;
    const path = [];
    let cur = endId;
    while (cur) {
        path.unshift(cur);
        cur = prev.get(cur);
    }
    return path;
}

function searchPath() {
    const startInput = document.getElementById('startNode').value.trim();
    const endInput = document.getElementById('endNode').value.trim();

    if (!startInput || !endInput) {
        alert('请输入起点和终点人物姓名');
        return;
    }

    const startNode = findNodeById(startInput);
    const endNode = findNodeById(endInput);

    if (!startNode) {
        alert(`未找到起点人物："${startInput}"`);
        return;
    }
    if (!endNode) {
        alert(`未找到终点人物："${endInput}"`);
        return;
    }

    const path = findShortestPath(startNode.id, endNode.id);
    clearPathStates();

    if (!path) {
        alert(`未找到 ${startNode.id} 到 ${endNode.id} 的关系路径`);
        return;
    }

    const pathNodeSet = new Set(path);
    const pathEdgeSet = new Set();
    for (let i = 0; i < path.length - 1; i++) {
        const a = path[i];
        const b = path[i + 1];
        const edge = (graphData.edges || []).find(
            (e) => (e.source === a && e.target === b) || (e.source === b && e.target === a)
        );
        if (edge) pathEdgeSet.add(edge.id);
    }

    const setStateById = (id, state, value) => {
        if (typeof graph.setElementState === 'function') {
            graph.setElementState(id, state, value);
            return;
        }
        if (typeof graph.setItemState === 'function') {
            graph.setItemState(id, state, value);
        }
    };

    const hasAutoPaint = typeof graph.setAutoPaint === 'function';
    if (hasAutoPaint) graph.setAutoPaint(false);

    // 先清理上一次的高亮
    lastPathNodeIds.forEach((id) => setStateById(id, 'pathHighlight', false));
    lastPathEdgeIds.forEach((id) => setStateById(id, 'pathHighlight', false));
    lastPathNodeIds.clear();
    lastPathEdgeIds.clear();

    // 设置本次路径高亮
    pathNodeSet.forEach((id) => {
        setStateById(id, 'pathHighlight', true);
        lastPathNodeIds.add(id);
    });
    pathEdgeSet.forEach((id) => {
        setStateById(id, 'pathHighlight', true);
        lastPathEdgeIds.add(id);
    });

    applyPathVisibility(pathNodeSet, pathEdgeSet);

    if (typeof graph.paint === 'function') graph.paint();
    if (hasAutoPaint) graph.setAutoPaint(true);
}


function applyPathVisibility(pathNodeSet, pathEdgeSet) {
    if (!graph) return;
    const hasAutoPaint = typeof graph.setAutoPaint === 'function';
    if (hasAutoPaint) graph.setAutoPaint(false);

    const setVisibleById = (id, visible) => {
        if (typeof graph.showElement === 'function' && typeof graph.hideElement === 'function') {
            visible ? graph.showElement(id) : graph.hideElement(id);
            return;
        }
        if (typeof graph.showItem === 'function' && typeof graph.hideItem === 'function') {
            visible ? graph.showItem(id) : graph.hideItem(id);
            return;
        }
        if (typeof graph.setElementState === 'function') {
            graph.setElementState(id, 'pathHidden', !visible);
            return;
        }
        if (typeof graph.setItemState === 'function') {
            graph.setItemState(id, 'pathHidden', !visible);
        }
    };

    const showAll = !pathNodeSet || !pathEdgeSet;

    (graphData.nodes || []).forEach((node) => {
        const visible = showAll ? true : pathNodeSet.has(node.id);
        setVisibleById(node.id, visible);
    });

    (graphData.edges || []).forEach((edge) => {
        const visible = showAll ? true : pathEdgeSet.has(edge.id);
        setVisibleById(edge.id, visible);
    });

    if (typeof graph.paint === 'function') graph.paint();
    if (hasAutoPaint) graph.setAutoPaint(true);
}

/* 人物信息弹窗显示函数 */

function getIdByEvent(e){
    if (!e.target) {
        return;
    }
    return e.target.id
}

function showInfo(id) {
    const modal = document.getElementById('infoModal');
    const content = document.getElementById('infoContent');

    // 从事件对象获取节点数据
    const target = findNodeById(id);

    // 按照JSON结构提取信息
    const personData = {
        // 从对象直接获取
        id: target.id || '未知ID',
        // 从data对象获取
        name: target.data?.name || '未知人物',
        title: target.data?.title || '未知职位',
        description: target.data?.description || '暂无相关信息',
        birth: target.data?.birth || '未知',
        death: target.data?.death || '未知',
        achievement: target.data?.achievement || '暂无成就信息',

        // 头像：优先用src，没有用默认
        avatar: target.src || 'test.png',

        // 职业/身份：用title
        occupation: target.data?.title || '未知',

    };

    // 创建人物简介HTML
    content.innerHTML = `
    <div class="person-profile">
      <!-- 头部：头像和基本信息 -->
      <div class="person-header">
        <div class="person-avatar">
          <img src="${personData.avatar}" alt="${personData.name}" 
               onerror="this.src='https://via.placeholder.com/150/cccccc/969696?text=No+Image'">
        </div>
        <div class="person-basic">
          <h2>${personData.name}</h2>
          <p class="person-title">${personData.title}</p>
        </div>
      </div>
      
      <hr>
      
      <!-- 详细信息部分 -->
      <div class="person-details">
        <div class="detail-row">
          <span class="detail-label">人物ID：</span>
          <span class="detail-value">${personData.id}</span>
        </div>
        
        ${personData.birth !== '未知' ? `
        <div class="detail-row">
          <span class="detail-label">生卒年份：</span>
          <span class="detail-value">${personData.birth} - ${personData.death}</span>
        </div>` : ''}
      
        
        <div class="detail-row">
          <span class="detail-label">职位/身份：</span>
          <span class="detail-value">${personData.occupation}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">简介：</span>
          <p class="detail-description">${personData.description}</p>
        </div>
        
        ${personData.achievement !== '暂无成就信息' ? `
        <div class="detail-row">
          <span class="detail-label">主要成就：</span>
          <p class="detail-description">${personData.achievement}</p>
        </div>` : ''}
        
      
      <!-- 底部信息 -->
      <div class="person-footer">
        <div class="info-time">
          <small>时间：${new Date().toLocaleString()}</small>
        </div>
        <div class="info-source">
          <small>信息来源自网络</small>
        </div>
      </div>
    </div>
  `;
    let pictureroute = target.id + '.jpg'
    document.getElementById('personPhoto').src = pictureroute;
    console.log(pictureroute);
    modal.style.display = 'block';
    // 确保元素已渲染后再触发过渡
    requestAnimationFrame(() => {
        modal.style.opacity = '1';
    });
    //下面这样子适合用来实现多阶段的动画效果
    setTimeout(() => {
        requestAnimationFrame(() => {
            const panel = document.querySelector('.info-panel');
            panel.style.left = '35%';
            panel.style.width = '40%';

        });
    }, 300);

}

function hideInfo() {
    const modal = document.getElementById('infoModal');
    modal.style.opacity = '0';
    setTimeout(() => {
        requestAnimationFrame(() => {
            modal.style.display = 'none';
            const panel = document.querySelector('.info-panel');
            panel.style.transform = 'translate(-50%, -50%)'; // 恢复到原始位置
            panel.style.left = '50%';
            panel.style.width = '20%';
        });
    }, 300);
}