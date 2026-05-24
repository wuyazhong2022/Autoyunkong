// 布局分析工具 - 核心版
auto.waitFor();

// ==================== 核心函数 ====================

/**
 * 安全获取节点属性值（兼容方法和属性）
 */
function getVal(node, prop, defaultValue) {
    try {
        let value = node[prop];
        if (typeof value === 'function') {
            return value.call(node);
        }
        return value != null ? value : defaultValue;
    } catch (e) {
        return defaultValue;
    }
}

/**
 * 获取bounds坐标
 */
function getBounds(node, type) {
    try {
        let b = node[type];
        if (typeof b === 'function') {
            b = b.call(node);
        }
        if (b && typeof b === 'object') {
            return {
                left: b.left || 0,
                top: b.top || 0,
                right: b.right || 0,
                bottom: b.bottom || 0
            };
        }
        return null;
    } catch (e) {
        return null;
    }
}

/**
 * 解析单个节点
 */
function parseNode(node, depth) {
    if (!node) return null;
    
    let info = {
        className: getVal(node, 'className', ''),
        packageName: getVal(node, 'packageName', ''),
        text: getVal(node, 'text', ''),
        desc: getVal(node, 'desc', ''),
        id: getVal(node, 'id', ''),
        fullId: getVal(node, 'fullId', ''),
        depth: getVal(node, 'depth', depth),
        indexInParent: getVal(node, 'indexInParent', -1),
        childCount: getVal(node, 'childCount', 0),
        boundsInParent: getBounds(node, 'boundsInParent'),
        boundsInScreen: getBounds(node, 'bounds'),
        clickable: getVal(node, 'clickable', false),
        longClickable: getVal(node, 'longClickable', false),
        checkable: getVal(node, 'checkable', false),
        checked: getVal(node, 'checked', false),
        focusable: getVal(node, 'focusable', false),
        focused: getVal(node, 'focused', false),
        scrollable: getVal(node, 'scrollable', false),
        selected: getVal(node, 'selected', false),
        editable: getVal(node, 'editable', false),
        enabled: getVal(node, 'enabled', true),
        visibleToUser: getVal(node, 'visibleToUser', true),
        accessibilityFocused: getVal(node, 'accessibilityFocused', false),
        drawingOrder: getVal(node, 'drawingOrder', -1),
        row: getVal(node, 'row', -1),
        column: getVal(node, 'column', -1),
        rowSpan: getVal(node, 'rowSpan', -1),
        columnSpan: getVal(node, 'columnSpan', -1),
        rowCount: getVal(node, 'rowCount', 0),
        columnCount: getVal(node, 'columnCount', 0),
        dismissable: getVal(node, 'dismissable', false),
        contextClickable: getVal(node, 'contextClickable', false)
    };
    
    // 递归解析子节点
    if (info.childCount > 0) {
        info.children = [];
        for (let i = 0; i < info.childCount; i++) {
            try {
                let child = node.child(i);
                let childInfo = parseNode(child, depth + 1);
                if (childInfo) {
                    info.children.push(childInfo);
                }
            } catch (e) {
                // 跳过无法访问的子节点
            }
        }
    }
    
    return info;
}

/**
 * 获取当前页面布局JSON
 */
function getLayout() {
    let root = auto.root;
    if (!root) {
        throw new Error("无法获取根节点，请确保无障碍服务已开启");
    }
    
    let startTime = Date.now();
    
    let layout = parseNode(root, 0);
    
    let endTime = Date.now();
    
    // 统计节点总数
    let nodeCount = 0;
    function countNodes(node) {
        if (!node) return;
        nodeCount++;
        if (node.children) {
            node.children.forEach(c => countNodes(c));
        }
    }
    countNodes(layout);
    
    return {
        meta: {
            captureTime: new Date().toISOString(),
            captureTimeCN: new Date().toLocaleString('zh-CN'),
            packageName: getVal(root, 'packageName', ''),
            nodeCount: nodeCount,
            captureDuration: endTime - startTime
        },
        hierarchy: layout
    };
}

/**
 * 保存布局到文件
 */
function saveLayout(fileName) {
    try {
        // 获取布局
        toast("正在分析布局...");
        let layout = getLayout();
        
        // 生成文件名
        if (!fileName) {
            let timestamp = new Date().toISOString()
                .replace(/[:.]/g, '-')
                .replace('T', '_')
                .substring(0, 19);
            fileName = "布局_" + timestamp;
        }
        
        // 保存路径
        let dir = "/sdcard/布局分析/";
        files.ensureDir(dir);
        let filePath = files.join(dir, fileName + ".json");
        
        // 写入文件
        let jsonStr = JSON.stringify(layout, null, 2);
        files.write(filePath, jsonStr);
        
        // 输出信息
        let msg = util.format(
            "✅ 布局分析完成\n" +
            "节点总数: %d\n" +
            "耗时: %dms\n" +
            "保存位置: %s",
            layout.meta.nodeCount,
            layout.meta.captureDuration,
            filePath
        );
        
        console.log("========== 布局分析结果 ==========");
        console.log("包名:", layout.meta.packageName);
        console.log("节点总数:", layout.meta.nodeCount);
        console.log("分析耗时:", layout.meta.captureDuration + "ms");
        console.log("保存路径:", filePath);
        console.log("==================================");
        
        toast(msg);
        
        return {
            success: true,
            path: filePath,
            layout: layout
        };
        
    } catch (e) {
        let msg = "❌ 布局分析失败: " + e.message;
        console.error(msg);
        toast(msg);
        
        return {
            success: false,
            error: e.message
        };
    }
}

// ==================== 执行 ====================

// 方式1：直接保存（使用默认文件名）
saveLayout();

// 方式2：自定义文件名
// saveLayout("抖音首页");

// 方式3：只获取JSON不保存
// let layout = getLayout();
// console.log(JSON.stringify(layout, null, 2));

// 方式4：关闭脚本前延迟一下，确保Toast显示
sleep(2000);