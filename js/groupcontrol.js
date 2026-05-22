// ==================== 群控投屏 ====================

let gcAllDevices = [];       // 所有设备
let gcCurrentGroup = '未分组';  // 当前选中分组
let gcGroups = [];           // 分组列表
let gcSelectedDevices = new Set(); // 当前选中的设备ID
let gcScriptModules = [];    // 脚本模块列表
let gcActiveScriptCard = null; // 当前选中的脚本卡片

// 多屏幕共享状态
let gcScreenShareDevices = new Map(); // deviceId -> { connected: boolean, imgData: string }

// 右键菜单相关
let gcContextDeviceId = null; // 当前右键点击的设备ID

// ==================== 设备右键菜单 ====================

// 初始化右键菜单事件
function initGcContextMenu() {
  const menu = document.getElementById('gcDeviceContextMenu');
  if (!menu) return;
  
  // 点击其他地方关闭菜单
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.gc-context-menu')) {
      hideGcContextMenu();
    }
  });
  
  // 阻止默认右键菜单
  document.addEventListener('contextmenu', function(e) {
    const card = e.target.closest('.gc-screen-card');
    if (card) {
      e.preventDefault();
    }
  });
}

// 显示右键菜单
function showGcContextMenu(e, deviceId) {
  const menu = document.getElementById('gcDeviceContextMenu');
  if (!menu) return;
  
  gcContextDeviceId = deviceId;
  
  // 计算菜单位置，确保不超出屏幕
  let x = e.clientX;
  let y = e.clientY;
  
  // 显示菜单
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  menu.classList.add('show');
  
  // 检查是否超出右边界
  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) {
    menu.style.left = (x - rect.width) + 'px';
  }
  // 检查是否超出下边界
  if (rect.bottom > window.innerHeight) {
    menu.style.top = (y - rect.height) + 'px';
  }
}

// 隐藏右键菜单
function hideGcContextMenu() {
  const menu = document.getElementById('gcDeviceContextMenu');
  if (menu) {
    menu.classList.remove('show');
  }
  gcContextDeviceId = null;
}

// 右键菜单动作处理
function gcContextAction(action) {
  // 保存设备ID（防止被其他事件清除）
  const deviceId = gcContextDeviceId;
  
  // 隐藏菜单（不使用hideGcContextMenu，因为它会清空gcContextDeviceId）
  const menu = document.getElementById('gcDeviceContextMenu');
  if (menu) {
    menu.classList.remove('show');
  }
  gcContextDeviceId = null;
  
  if (!deviceId) {
    console.error('[右键菜单] deviceId为空');
    return;
  }
  
  console.log('[右键菜单] 执行动作:', action, '设备:', deviceId);
  
  switch(action) {
    case 'connect':
      gcRemoteActionSingle(deviceId, 'connect');
      break;
    case 'screenShare':
      gcRemoteActionSingle(deviceId, 'requestScreen');
      gcStartMultiScreenShare([deviceId]);
      break;
    case 'frontCam':
      gcRemoteActionSingle(deviceId, 'frontCam');
      break;
    case 'backCam':
      gcRemoteActionSingle(deviceId, 'backCam');
      break;
    case 'micAudio':
      gcRemoteActionSingle(deviceId, 'micAudio');
      break;
    case 'restartConnection':
      gcRemoteActionSingle(deviceId, 'restartConnection');
      break;
    case 'endCurrent':
      gcRemoteActionSingle(deviceId, 'endCurrent');
      break;
    case 'endAll':
      gcRemoteActionSingle(deviceId, 'endAll');
      break;
    case 'disconnect':
      gcRemoteActionSingle(deviceId, 'disconnect');
      gcStopScreenShare(deviceId);
      break;
    case 'requestScreen':
      gcRemoteActionSingle(deviceId, 'requestScreen');
      break;
    case 'restartScreenShare':
      gcStopScreenShare(deviceId);
      setTimeout(() => gcStartMultiScreenShare([deviceId]), 500);
      break;
    case 'updateStatus':
      gcRemoteActionSingle(deviceId, 'updateStatus');
      break;
    case 'viewLog':
      openDeviceLog(deviceId);
      break;
    case 'layoutAnalysis':
      startLayoutAnalysis(deviceId);
      break;
    case 'layoutReport':
      showLayoutReport(deviceId);
      break;
  }
}

// 单设备远程动作
function gcRemoteActionSingle(deviceId, type, value) {
  if (webWsConnected) {
    sendRemoteCommand(deviceId, type, value);
  } else {
    const task = { action: 'remote', type: type };
    if (value !== undefined) task.value = value;
    fetch('/api/task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser, targetDevices: [deviceId], task })
    }).then(r => r.json()).then(d => {
      if (d.msg) console.log(d.msg);
    });
  }
}

// 打开设备日志
function openDeviceLog(deviceId) {
  console.log('[日志] 尝试打开设备日志:', deviceId);
  
  // 确保DOM就绪
  function showLogModal() {
    currentLogDeviceId = deviceId;
    const modal = document.getElementById('deviceLogModal');
    const title = document.getElementById('deviceLogTitle');
    
    if (!modal) {
      console.error('[日志] 模态框元素未找到');
      console.log('日志功能暂不可用');
      return;
    }
    
    if (title) {
      title.textContent = '设备日志 - ' + deviceId;
    }
    
    // 更新实时日志面板
    if (typeof updateRealtimeLogPanel === 'function') {
      updateRealtimeLogPanel(deviceId);
    }
    
    // 更新日志显示
    if (typeof updateLogDisplay === 'function') {
      updateLogDisplay(deviceId);
    }
    
    modal.style.display = 'flex';
    console.log('[日志] 日志窗口已打开, 设备:', deviceId);
  }
  
  // 如果DOM还没准备好，延迟执行
  if (!document.getElementById('deviceLogModal')) {
    setTimeout(showLogModal, 100);
  } else {
    showLogModal();
  }
}

// 开始布局分析
function startLayoutAnalysis(deviceId) {
  console.log('设备 ' + deviceId + ' 布局分析开始...');
  
  // 发送获取布局指令到设备
  fetch('/api/task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      username: currentUser, 
      targetDevices: [deviceId], 
      task: { action: 'getLayout' }
    })
  }).then(r => r.json()).then(d => {
    console.log('布局分析请求已发送:', d.msg || '');
  }).catch(e => {
    console.error('布局分析请求失败:', e);
  });
}

// 显示布局报告（可扩展）
function showLayoutReport(deviceId) {
  console.log('设备 ' + deviceId + ' 布局报告功能开发中...');
  // TODO: 实现布局报告功能
}

// 进入群控投屏时加载数据
function loadGroupControl() {
  if (!currentUser) return;
  
  fetch(`/api/devices?username=${encodeURIComponent(currentUser)}`)
    .then(r => r.json())
    .then(data => {
      if (data.status === 'success') {
        gcAllDevices = data.devices;
        buildGroupTree();
        filterDevicesByGroup();
        // 加载设备后立即显示所有设备的投屏卡片
        gcUpdateScreenCards();
      }
    })
    .catch(err => console.error('群控加载设备失败:', err));

  loadGcScriptModules();
}

function buildGroupTree() {
  const groupSet = new Set();
  gcAllDevices.forEach(d => {
    const g = d.group || '未分组';
    groupSet.add(g);
  });

  if (!groupSet.has('未分组')) groupSet.add('未分组');
  if (!groupSet.has('群控投屏-A')) groupSet.add('群控投屏-A');
  if (!groupSet.has('群控投屏-B')) groupSet.add('群控投屏-B');
  if (!groupSet.has('群控投屏-C')) groupSet.add('群控投屏-C');

  gcGroups = Array.from(groupSet);
  renderGroupTree();
}

function renderGroupTree() {
  const treeEl = document.getElementById('gcTreeList');
  treeEl.innerHTML = gcGroups.map(g => {
    const count = g === '未分组'
      ? gcAllDevices.filter(d => !d.group || d.group === '未分组').length
      : gcAllDevices.filter(d => d.group === g).length;
    const active = g === gcCurrentGroup ? 'active' : '';
    return `<div class="gc-tree-item ${active}" onclick="gcSelectGroup('${g}')">
      <span>${g}</span>
      <span class="gc-tree-count">${count}</span>
    </div>`;
  }).join('');
}

function gcSelectGroup(group) {
  gcCurrentGroup = group;
  gcSelectedDevices.clear();
  renderGroupTree();
  filterDevicesByGroup();
  updateGcSelectedBar();
}

function filterDevicesByGroup() {
  let devices;
  if (gcCurrentGroup === '未分组') {
    devices = gcAllDevices.filter(d => !d.group || d.group === '未分组');
  } else {
    devices = gcAllDevices.filter(d => d.group === gcCurrentGroup);
  }
  renderGcDeviceTable(devices);
}

function renderGcDeviceTable(deviceList) {
  const tbody = document.getElementById('gcDeviceBody');
  if (deviceList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#999;padding:20px;">该分组暂无设备</td></tr>';
    return;
  }
  tbody.innerHTML = deviceList.map(d => {
    const checked = gcSelectedDevices.has(d.deviceId) ? 'checked' : '';
    const name = d.info?.deviceName || '-';
    const isOnline = d.info?.status === 'online';
    const statusClass = isOnline ? 'status-online' : 'status-offline';
    const statusText = isOnline ? '在线' : '离线';
    return `<tr>
      <td><input type="checkbox" class="gc-dev-cb" value="${d.deviceId}" ${checked} ${!isOnline && !checked ? 'disabled' : ''} onchange="gcToggleDevice('${d.deviceId}', this.checked)" style="cursor: pointer;"></td>
      <td>${name}</td>
      <td>${d.deviceId}</td>
      <td><span class="status-badge ${statusClass}">${statusText}</span></td>
    </tr>`;
  }).join('');
}

// 设备选择
function gcToggleDevice(deviceId, checked) {
  if (checked) gcSelectedDevices.add(deviceId);
  else gcSelectedDevices.delete(deviceId);
  updateGcSelectedBar();
  
  const allVisible = document.querySelectorAll('.gc-dev-cb');
  const allChecked = document.querySelectorAll('.gc-dev-cb:checked');
  document.getElementById('gcSelectAllCb').checked = allVisible.length > 0 && allVisible.length === allChecked.length;
}

function gcToggleSelectAll() {
  const checked = document.getElementById('gcSelectAllCb').checked;
  document.querySelectorAll('.gc-dev-cb').forEach(cb => {
    // 只对可用的复选框（在线设备或已选中的离线设备）进行操作
    if (!cb.disabled || cb.checked) {
      cb.checked = checked;
      if (checked) gcSelectedDevices.add(cb.value);
      else gcSelectedDevices.delete(cb.value);
    }
  });
  updateGcSelectedBar();
}

function gcSelectAll() {
  document.querySelectorAll('.gc-dev-cb').forEach(cb => {
    cb.checked = true;
    gcSelectedDevices.add(cb.value);
  });
  document.getElementById('gcSelectAllCb').checked = true;
  updateGcSelectedBar();
}

function gcClearAll() {
  document.querySelectorAll('.gc-dev-cb').forEach(cb => {
    cb.checked = false;
    gcSelectedDevices.delete(cb.value);
  });
  document.getElementById('gcSelectAllCb').checked = false;
  updateGcSelectedBar();
}

function gcInvertSelect() {
  document.querySelectorAll('.gc-dev-cb').forEach(cb => {
    cb.checked = !cb.checked;
    if (cb.checked) gcSelectedDevices.add(cb.value);
    else gcSelectedDevices.delete(cb.value);
  });
  updateGcSelectedBar();
}

function gcExpandAll() {
  gcCurrentGroup = '__all__';
  renderGroupTree();
  const tbody = document.getElementById('gcDeviceBody');
  tbody.innerHTML = gcAllDevices.map(d => {
    const checked = gcSelectedDevices.has(d.deviceId) ? 'checked' : '';
    const name = d.info?.deviceName || '-';
    const isOnline = d.info?.status === 'online';
    const statusClass = isOnline ? 'status-online' : 'status-offline';
    const statusText = isOnline ? '在线' : '离线';
    return `<tr>
      <td><input type="checkbox" class="gc-dev-cb" value="${d.deviceId}" ${checked} ${!isOnline && !checked ? 'disabled' : ''} onchange="gcToggleDevice('${d.deviceId}', this.checked)" style="cursor: pointer;"></td>
      <td>${name}</td>
      <td>${d.deviceId}</td>
      <td><span class="status-badge ${statusClass}">${statusText}</span></td>
    </tr>`;
  }).join('');
  updateGcSelectedBar();
}

function gcCollapseAll() {
  if (gcCurrentGroup === '__all__') gcCurrentGroup = '未分组';
  filterDevicesByGroup();
  updateGcSelectedBar();
}

function updateGcSelectedBar() {
  const bar = document.getElementById('gcSelectedBar');
  const count = gcSelectedDevices.size;
  document.getElementById('gcSelectedCount').textContent = count;
  if (count > 0) {
    bar.style.display = 'flex';
    const names = Array.from(gcSelectedDevices).slice(0, 3).join(', ');
    document.getElementById('gcSelectedNames').textContent = names + (count > 3 ? '...' : '');
    
    // 检查是否有离线设备被选中
    let hasOfflineSelected = false;
    document.querySelectorAll('.gc-dev-cb:checked').forEach(cb => {
      const row = cb.closest('tr');
      if (row && row.querySelector('.status-offline')) {
        hasOfflineSelected = true;
      }
    });
    // 显示/隐藏清除离线设备按钮
    document.getElementById('gcClearOfflineBtn').style.display = hasOfflineSelected ? 'inline-block' : 'none';
  } else {
    bar.style.display = 'none';
  }
}

function gcClearOfflineSelection() {
  document.querySelectorAll('.gc-dev-cb:checked').forEach(cb => {
    const row = cb.closest('tr');
    if (row && row.querySelector('.status-offline')) {
      cb.checked = false;
      gcSelectedDevices.delete(cb.value);
    }
  });
  updateGcSelectedBar();
}

// 工具栏操作
function getGcSelectedIds() {
  return Array.from(gcSelectedDevices);
}

function gcPublishScript() {
  const ids = getGcSelectedIds();
  if (ids.length === 0) { 
    alert('请先选择设备'); 
    return; 
  }
  openGcScriptSelectModal(ids);
}

function gcStopScript() {
  const ids = getGcSelectedIds();
  if (ids.length === 0) { 
    alert('请先选择设备'); 
    return; 
  }
  if (!confirm('确定终止选中设备的脚本？')) return;
  const task = { action: 'stopScript' };
  fetch('/api/task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: currentUser, targetDevices: ids, task })
  }).then(r=>r.json()).then(d=>alert(d.msg));
}

function gcStopCode() {
  const ids = getGcSelectedIds();
  if (ids.length === 0) { 
    alert('请先选择设备'); 
    return; 
  }
  if (!confirm('确定终止选中设备的代码？')) return;
  const task = { action: 'stopScript' };
  fetch('/api/task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: currentUser, targetDevices: ids, task })
  }).then(r=>r.json()).then(d=>alert(d.msg));
}

// 远程控制下拉菜单
function gcToggleRemoteMenu(e) {
  e.stopPropagation();
  const menu = document.getElementById('gcRemoteMenu');
  menu.classList.toggle('show');
  document.querySelectorAll('.gc-dropdown-menu').forEach(m => {
    if (m !== menu) m.classList.remove('show');
  });
}

document.addEventListener('click', function() {
  document.querySelectorAll('.gc-dropdown-menu').forEach(m => m.classList.remove('show'));
});

function gcRemoteAction(action) {
  document.getElementById('gcRemoteMenu').classList.remove('show');
  const ids = getGcSelectedIds();
  if (ids.length === 0) { 
    alert('请先选择设备'); 
    return; 
  }

  if (action === 'screenShare') {
    gcStartMultiScreenShare(ids);
    return;
  }

  if (webWsConnected) {
    ids.forEach(deviceId => {
      sendRemoteCommand(deviceId, action);
    });
  } else {
    const actionMap = {
      'connect':       { action: 'remote', type: 'connect' },
      'frontCam':      { action: 'remote', type: 'frontCam' },
      'backCam':       { action: 'remote', type: 'backCam' },
      'micAudio':      { action: 'remote', type: 'micAudio' },
      'endCurrent':    { action: 'remote', type: 'endCurrent' },
      'endAll':        { action: 'remote', type: 'endAll' },
      'disconnect':    { action: 'remote', type: 'disconnect' },
      'requestScreen': { action: 'remote', type: 'requestScreen' },
      'startApp':      { action: 'remote', type: 'startApp' },
      'restartApp':    { action: 'remote', type: 'restartApp' },
      'restartConnection': { action: 'remote', type: 'restartConnection' },
      'updateStatus':  { action: 'remote', type: 'updateStatus' }
    };
    const task = actionMap[action] || { action: 'remote', type: action };
    fetch('/api/task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser, targetDevices: ids, task })
    }).then(r=>r.json()).then(d=>alert(d.msg || '指令已发送'));
  }
}

// 多屏幕共享相关函数
function gcStartMultiScreenShare(deviceIds) {
  // 初始化屏幕共享设备状态
  deviceIds.forEach(deviceId => {
    gcScreenShareDevices.set(deviceId, { connected: false, imgData: '' });
  });
  
  // 更新屏幕显示区域
  gcUpdateScreenCards();
  
  // 发送屏幕共享命令
  if (webWsConnected) {
    deviceIds.forEach(deviceId => {
      sendRemoteCommand(deviceId, 'screenShare');
    });
  }
}

function gcUpdateScreenCards() {
  const container = document.getElementById('gcScreensContainer');
  if (!container) return;
  
  // 获取宫格尺寸配置
  const gridSize = gcGlobalConfigData?.screen?.gridSize || '180x320';
  const [gridW, gridH] = gridSize.split('x').map(Number);
  
  // 设置容器的CSS变量来控制卡片大小
  container.style.setProperty('--gc-card-width', gridW + 'px');
  
  // 显示所有已添加的设备（不管是否在线）
  if (gcAllDevices.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; color: #999; padding: 50px;">
        暂无已添加的设备
      </div>
    `;
    return;
  }
  
  // 获取适配模式配置
  const fitMode = gcGlobalConfigData?.screen?.fitMode || 'contain';
  
  // 按设备在线状态和屏幕共享连接状态排序
  // 优先级：1. 设备在线且屏幕共享已连接  2. 设备在线但屏幕共享未连接  3. 设备离线且屏幕共享未连接
  const sortedDevices = [...gcAllDevices].sort((a, b) => {
    const deviceIdA = a.deviceId;
    const deviceIdB = b.deviceId;
    const isOnlineA = a.info?.status === 'online';
    const isOnlineB = b.info?.status === 'online';
    const statusA = gcScreenShareDevices.get(deviceIdA);
    const statusB = gcScreenShareDevices.get(deviceIdB);
    const isConnectedA = statusA && statusA.connected;
    const isConnectedB = statusB && statusB.connected;
    
    // 设备在线状态优先排序
    if (isOnlineA && !isOnlineB) return -1;
    if (!isOnlineA && isOnlineB) return 1;
    
    // 设备都在线时，按屏幕共享连接状态排序
    if (isConnectedA && !isConnectedB) return -1;
    if (!isConnectedA && isConnectedB) return 1;
    
    return 0;
  });
  
  // 统计在线和离线设备数量
  let onlineCount = 0;
  let offlineCount = 0;
  sortedDevices.forEach(device => {
    const isOnline = device.info?.status === 'online';
    if (isOnline) {
      onlineCount++;
    } else {
      offlineCount++;
    }
  });
  
  let html = `
    <div class="gc-screens-header" style="grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; margin-bottom: 10px; background: #f8f9fa; border-radius: 6px;">
      <div style="font-size: 14px; color: #333;">
        <span style="font-weight: bold;">设备列表</span>
      </div>
      <div style="display: flex; gap: 15px; font-size: 13px;">
        <span style="color: #27ae60;">
          <span style="display: inline-block; width: 8px; height: 8px; background: #27ae60; border-radius: 50%; margin-right: 5px;"></span>
          在线: ${onlineCount}
        </span>
        <span style="color: #95a5a6;">
          <span style="display: inline-block; width: 8px; height: 8px; background: #95a5a6; border-radius: 50%; margin-right: 5px;"></span>
          离线: ${offlineCount}
        </span>
        <span style="color: #666;">
          总计: ${sortedDevices.length}
        </span>
      </div>
    </div>
  `;
  
  sortedDevices.forEach(device => {
    const deviceId = device.deviceId;
    const name = device.deviceName || deviceId;
    const screenStatus = gcScreenShareDevices.get(deviceId);
    const isConnected = screenStatus && screenStatus.connected;
    const hasImage = screenStatus && screenStatus.imgData;
    
    html += `
      <div class="gc-screen-card" id="gcScreenCard-${deviceId}" oncontextmenu="showGcContextMenu(event, '${deviceId}'); return false;">
        <div class="gc-screen-header">
          <span class="gc-screen-name">${name}</span>
          <span class="gc-screen-status">
            <span class="gc-status-dot ${isConnected ? 'connected' : ''}"></span>
            <span style="font-size:11px;">${isConnected ? '已连接' : '未连接'}</span>
          </span>
        </div>
        <div class="gc-screen-display" id="gcScreenDisplay-${deviceId}" data-device-id="${deviceId}" style="aspect-ratio:${gridW}/${gridH};">
          ${isConnected && hasImage ?
            `<img src="${screenStatus.imgData}" class="gc-screen-img" id="gcScreenImg-${deviceId}" data-device-width="${gridW}" data-device-height="${gridH}" style="object-fit:${fitMode};" />` :
            `<div class="gc-screen-loading" style="background:#1a1a1a;color:#666;">
              <div style="font-size:48px;margin-bottom:8px;opacity:0.3;">📱</div>
              <div style="font-size:13px;">${isConnected ? '获取画面中...' : '设备未连接'}</div>
            </div>`
          }
        </div>
        <div class="gc-screen-footer">
          <button class="gc-screen-btn" onclick="gcRemoteActionSingle('${deviceId}', 'back')">返回</button>
          <button class="gc-screen-btn" onclick="gcRemoteActionSingle('${deviceId}', 'home')">主页</button>
          <button class="gc-screen-btn" onclick="gcRemoteActionSingle('${deviceId}', 'key', 187)">任务</button>
          <button class="gc-screen-btn" onclick="gcRemoteActionSingle('${deviceId}', 'power')">电源</button>
          <button class="gc-screen-btn" onclick="gcRemoteActionSingle('${deviceId}', 'key', 24)">音量+</button>
          <button class="gc-screen-btn" onclick="gcRemoteActionSingle('${deviceId}', 'key', 25)">音量-</button>
          <button class="gc-screen-btn" onclick="gcRemoteActionSingle('${deviceId}', 'key', 66)">回车</button>
          <button class="gc-screen-btn swipe" onclick="gcRemoteActionSingle('${deviceId}', 'swipe', 'left')">左滑</button>
          <button class="gc-screen-btn swipe" onclick="gcRemoteActionSingle('${deviceId}', 'swipe', 'right')">右滑</button>
          <button class="gc-screen-btn swipe" onclick="gcRemoteActionSingle('${deviceId}', 'swipe', 'up')">上滑</button>
          <button class="gc-screen-btn swipe" onclick="gcRemoteActionSingle('${deviceId}', 'swipe', 'down')">下滑</button>
          <button class="gc-screen-btn stop" onclick="gcStopScreenShare('${deviceId}')">${isConnected ? '停止' : '连接'}</button>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
  
  // 初始化画面点击和滑动事件
  setTimeout(gcInitScreenEvents, 50);
}

// 初始化画面点击和滑动事件
function gcInitScreenEvents() {
  gcScreenShareDevices.forEach((status, deviceId) => {
    const display = document.getElementById(`gcScreenDisplay-${deviceId}`);
    if (!display) return;
    
    // 点击事件（坐标点击）
    display.addEventListener('click', function(e) {
      // 如果点击的是底部按钮，不处理
      if (e.target.closest('.gc-screen-footer') || e.target.closest('button')) return;
      
      // 退出点击或滑动模式
      if (gcTapModeDeviceId || gcSwipeModeDeviceId) {
        gcTapModeDeviceId = null;
        gcSwipeModeDeviceId = null;
        return;
      }
      
      // 左键点击直接执行坐标点击（不需要进入点击模式）
      gcHandleScreenClick(e, deviceId);
    });
    
    // 触摸开始
    display.addEventListener('touchstart', function(e) {
      if (gcSwipeModeDeviceId === deviceId) {
        e.preventDefault();
        const touch = e.touches[0];
        gcTouchStartX = touch.clientX;
        gcTouchStartY = touch.clientY;
        gcIsTouching = true;
      }
    }, { passive: false });
    
    // 触摸移动
    display.addEventListener('touchmove', function(e) {
      if (gcSwipeModeDeviceId === deviceId && gcIsTouching) {
        e.preventDefault();
      }
    }, { passive: false });
    
    // 触摸结束
    display.addEventListener('touchend', function(e) {
      if (gcSwipeModeDeviceId === deviceId && gcIsTouching) {
        e.preventDefault();
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - gcTouchStartX;
        const deltaY = touch.clientY - gcTouchStartY;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        
        gcIsTouching = false;
        
        if (absX > 30 || absY > 30) {
          let direction;
          if (absX > absY) {
            direction = deltaX > 0 ? 'right' : 'left';
          } else {
            direction = deltaY > 0 ? 'down' : 'up';
          }
          gcExecuteSwipe(deviceId, direction);
        }
      }
    }, { passive: false });
    
    // 鼠标事件（桌面端滑动支持）
    display.addEventListener('mousedown', function(e) {
      if (gcSwipeModeDeviceId === deviceId && e.button === 0) {
        gcTouchStartX = e.clientX;
        gcTouchStartY = e.clientY;
        gcIsTouching = true;
      }
    });
    
    display.addEventListener('mouseup', function(e) {
      if (gcSwipeModeDeviceId === deviceId && gcIsTouching && e.button === 0) {
        const deltaX = e.clientX - gcTouchStartX;
        const deltaY = e.clientY - gcTouchStartY;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        
        gcIsTouching = false;
        
        if (absX > 30 || absY > 30) {
          let direction;
          if (absX > absY) {
            direction = deltaX > 0 ? 'right' : 'left';
          } else {
            direction = deltaY > 0 ? 'down' : 'up';
          }
          gcExecuteSwipe(deviceId, direction);
        }
      }
    });
  });
}

// 点击操作相关变量
let gcTapModeDeviceId = null;
let gcSwipeModeDeviceId = null;
let gcTouchStartX = 0;
let gcTouchStartY = 0;
let gcIsTouching = false;

// 点击画面坐标处理
function gcHandleScreenClick(e, deviceId) {
  const display = document.getElementById(`gcScreenDisplay-${deviceId}`);
  const img = document.getElementById(`gcScreenImg-${deviceId}`);
  if (!display || !img) return;
  
  // 获取点击位置相对于图片的比例
  const rect = img.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;
  
  // 计算相对于图片的百分比
  const percentX = clickX / rect.width;
  const percentY = clickY / rect.height;
  
  // 获取设备分辨率（如果有的话）
  const deviceWidth = parseInt(img.dataset.deviceWidth) || 1080;
  const deviceHeight = parseInt(img.dataset.deviceHeight) || 1920;
  
  // 转换为设备坐标
  const tapX = Math.round(percentX * deviceWidth);
  const tapY = Math.round(percentY * deviceHeight);
  
  // 发送点击指令
  if (webWsConnected) {
    webWs.send(JSON.stringify({
      action: 'sendToDevice',
      targetDevice: deviceId,
      content: JSON.stringify({ action: 'tap', x: tapX, y: tapY })
    }));
    console.log(`[点击] 设备${deviceId}: (${tapX}, ${tapY})`);
  }
}

// 滑动操作处理
function gcHandleScreenSwipe(e, deviceId, isMouseUp) {
  if (isMouseUp && gcIsTouching) {
    const deltaX = e.clientX - gcTouchStartX;
    const deltaY = e.clientY - gcTouchStartY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    
    gcIsTouching = false;
    
    // 判断滑动距离
    if (absX > 30 || absY > 30) {
      let direction;
      if (absX > absY) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }
      gcExecuteSwipe(deviceId, direction);
    }
  } else {
    gcTouchStartX = e.clientX;
    gcTouchStartY = e.clientY;
    gcIsTouching = true;
  }
}

// 执行滑动
function gcExecuteSwipe(deviceId, direction) {
  const img = document.getElementById(`gcScreenImg-${deviceId}`);
  if (!img) return;
  
  const deviceWidth = parseInt(img.dataset.deviceWidth) || 1080;
  const deviceHeight = parseInt(img.dataset.deviceHeight) || 1920;
  
  let x1, y1, x2, y2;
  const step = 200;
  
  switch (direction) {
    case 'left':
      x1 = deviceWidth * 0.85;
      y1 = deviceHeight * 0.5;
      x2 = deviceWidth * 0.15;
      y2 = deviceHeight * 0.5;
      break;
    case 'right':
      x1 = deviceWidth * 0.15;
      y1 = deviceHeight * 0.5;
      x2 = deviceWidth * 0.85;
      y2 = deviceHeight * 0.5;
      break;
    case 'up':
      x1 = deviceWidth * 0.5;
      y1 = deviceHeight * 0.75;
      x2 = deviceWidth * 0.5;
      y2 = deviceHeight * 0.25;
      break;
    case 'down':
      x1 = deviceWidth * 0.5;
      y1 = deviceHeight * 0.25;
      x2 = deviceWidth * 0.5;
      y2 = deviceHeight * 0.75;
      break;
    default:
      return;
  }
  
  if (webWsConnected) {
    webWs.send(JSON.stringify({
      action: 'sendToDevice',
      targetDevice: deviceId,
      content: JSON.stringify({ action: 'swipe', x1: Math.round(x1), y1: Math.round(y1), x2: Math.round(x2), y2: Math.round(y2), duration: 300 })
    }));
    console.log(`[滑动] 设备${deviceId}: ${direction}`);
  }
}

function gcRemoteActionSingle(deviceId, action, param) {
  // 按键操作
  if (action === 'key') {
    if (webWsConnected) {
      webWs.send(JSON.stringify({
        action: 'sendToDevice',
        targetDevice: deviceId,
        content: JSON.stringify({ action: 'keyCode', keyCode: param, keyName: gcGetKeyName(param) })
      }));
      console.log(`[按键] 设备${deviceId}: ${gcGetKeyName(param)}(${param})`);
    }
    return;
  }
  
  // 滑动操作
  if (action === 'swipe') {
    gcExecuteSwipe(deviceId, param);
    return;
  }
  
  // 输入文字
  if (action === 'input') {
    const text = prompt('请输入要输入的文字:');
    if (text && webWsConnected) {
      webWs.send(JSON.stringify({
        action: 'sendToDevice',
        targetDevice: deviceId,
        content: JSON.stringify({ action: 'input', text: text })
      }));
    }
    return;
  }
  
  // 返回、主页、电源 - 使用 keyCode 发送，不需要 root
  const keyCodeMap = {
    'back': 4,
    'home': 3,
    'power': 26
  };
  
  if (keyCodeMap[action] && webWsConnected) {
    const keyCode = keyCodeMap[action];
    webWs.send(JSON.stringify({
      action: 'sendToDevice',
      targetDevice: deviceId,
      content: JSON.stringify({ action: 'keyCode', keyCode: keyCode, keyName: gcGetKeyName(keyCode) })
    }));
    console.log(`[按键] 设备${deviceId}: ${gcGetKeyName(keyCode)}(${keyCode})`);
  }
}

function gcGetKeyName(keyCode) {
  const names = {
    3: 'HOME',
    4: 'BACK',
    26: 'POWER',
    24: 'VOLUME_UP',
    25: 'VOLUME_DOWN',
    66: 'ENTER',
    187: 'RECENT_TASKS'
  };
  return names[keyCode] || 'KEY_' + keyCode;
}

function gcStopScreenShare(deviceId) {
  const status = gcScreenShareDevices.get(deviceId);
  const isConnected = status && status.connected;
  
  if (isConnected) {
    // 停止共享
    if (webWsConnected) {
      sendRemoteCommand(deviceId, 'stopScreenShare');
    }
    gcScreenShareDevices.delete(deviceId);
  } else {
    // 开始连接
    gcScreenShareDevices.set(deviceId, { connected: false, imgData: '' });
    if (webWsConnected) {
      sendRemoteCommand(deviceId, 'screenShare');
    }
  }
  
  // 更新显示
  gcUpdateScreenCards();
}

// 更新屏幕画面
function gcUpdateScreenFrame(deviceId, imgData, deviceWidth, deviceHeight) {
  const status = gcScreenShareDevices.get(deviceId);
  if (status) {
    const wasConnected = status.connected;
    status.connected = true;
    status.imgData = imgData;
    gcScreenShareDevices.set(deviceId, status);
    
    // 首次收到画面时，重新渲染卡片以更新连接状态显示
    if (!wasConnected) {
      gcUpdateScreenCards();
    }
    
    // 更新单个画面
    const img = document.getElementById(`gcScreenImg-${deviceId}`);
    if (img) {
      img.src = imgData;
      // 更新设备分辨率
      if (deviceWidth && deviceHeight) {
        img.dataset.deviceWidth = deviceWidth;
        img.dataset.deviceHeight = deviceHeight;
      }
    }
  }
}

function gcTempCode() {
  const ids = getGcSelectedIds();
  if (ids.length === 0) { 
    alert('请先选择设备'); 
    return; 
  }
  const code = prompt('请输入临时代码:');
  if (!code) return;
  const task = { action: 'script', code };
  fetch('/api/task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: currentUser, targetDevices: ids, task })
  }).then(r=>r.json()).then(d=>alert(d.msg));
}

function sendKeyCode(keyCode) {
  const ids = getGcSelectedIds();
  if (ids.length === 0) { 
    alert('请先选择设备'); 
    return; 
  }
  
  const keyCodeMap = {
    3: 'HOME',
    4: 'BACK',
    26: 'POWER',
    24: 'VOLUME_UP',
    25: 'VOLUME_DOWN',
    66: 'ENTER',
    187: 'RECENT_TASKS'
  };
  
  const task = { action: 'keyCode', keyCode: keyCode, keyName: keyCodeMap[keyCode] || 'UNKNOWN' };
  
  if (webWsConnected) {
    ids.forEach(deviceId => {
      webWs.send(JSON.stringify({
        action: 'sendToDevice',
        targetDevice: deviceId,
        content: JSON.stringify(task)
      }));
    });
  } else {
    fetch('/api/task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser, targetDevices: ids, task })
    }).then(r=>r.json()).then(d=>alert(d.msg || '按键指令已发送'));
  }
}

function gcFloatingMenu() { 
  alert('悬浮菜单功能开发中'); 
}

// ==================== 全局配置 ====================

let gcGlobalConfigData = {
  screen: {
    minBitrate: 0,
    maxBitrate: 0,
    gridSize: '180x320',
    fitMode: 'stretch',
    gridResolution: '180x320',
    gridFps: 15,
    floatSize: '360x640',
    floatEnterAction: 'disconnect',
    floatExitAction: 'disconnect',
    floatResolution: '360x640',
    floatFps: 25,
    fullEnterAction: 'disconnect',
    fullExitAction: 'disconnect',
    fullSize: '420x750',
    fullFps: 25,
    showInput: true,
    showActionMenu: true,
    showNavKeys: true,
    showMediaRecord: false,
    showScreenshot: false,
    defaultOrientation: 'auto',
    renderMode: 'canvas',
    loadMode: 'lazy',
    screenOrCamera: 'screen',
    maxLogCount: 100,
    unreadCount: 2,
    floatPosition: 'bottom-right',
    floatMsg: true,
    floatVideoInfo: false,
    floatLog: false,
    floatFileProgress: false,
    floatPopup: true,
    autoCheckStatus: true,
    autoCheckTask: true,
    networkProtocol: 'websocket',
    fileTransfer: 'websocket',
    mediaLib: 'local',
    rightScriptList: true,
    leftGroupList: true,
    showFilter: true,
    cacheDeviceList: true,
    cacheScriptList: true,
    showNotify: true,
    msgDebounce: true,
    notifyType: 'toast',
    notifyPosition: 'bottom-left',
    debounceInterval: 2000,
    notifyDuration: 2500,
    shortcutKey1: 'Ctrl',
    shortcutKey2: 'Shift',
    shortcutKey3: 'x'
  },
  script: {
    showDeviceTree: true,
    shareScriptConfig: true,
    checkOnline: true,
    showTempCode: false
  },
  common: {
    gestureSync: false,
    showRented: false
  },
  unlock: []
};

// 加载全局配置
function loadGlobalConfig() {
  try {
    const saved = localStorage.getItem('gcGlobalConfig');
    if (saved) {
      const parsed = JSON.parse(saved);
      gcGlobalConfigData = { ...gcGlobalConfigData, ...parsed };
    }
  } catch (e) {
    console.error('加载全局配置失败:', e);
  }
}

// 保存全局配置到localStorage
function saveGlobalConfigToStorage() {
  localStorage.setItem('gcGlobalConfig', JSON.stringify(gcGlobalConfigData));
}

// 打开全局配置弹窗
function gcGlobalConfig() {
  loadGlobalConfig();
  applyConfigToUI();
  applyGridSizeToContainer();
  document.getElementById('globalConfigModal').style.display = 'flex';
  switchConfigTab('screen');
}

// 关闭全局配置弹窗
function closeGlobalConfig() {
  document.getElementById('globalConfigModal').style.display = 'none';
}

// 切换配置标签页
function switchConfigTab(tabName) {
  document.querySelectorAll('.gc-config-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  document.querySelectorAll('.gc-config-panel').forEach(panel => {
    panel.style.display = panel.id === 'configTab-' + tabName ? 'block' : 'none';
  });
}

// 将配置数据应用到UI
function applyConfigToUI() {
  const cfg = gcGlobalConfigData;
  const s = cfg.screen;
  
  // 投屏配置
  setVal('cfgMinBitrate', s.minBitrate);
  setVal('cfgMinBitrateVal', s.minBitrate);
  setVal('cfgMaxBitrate', s.maxBitrate);
  setVal('cfgMaxBitrateVal', s.maxBitrate);
  setVal('cfgGridSize', s.gridSize);
  setVal('cfgFitMode', s.fitMode);
  setVal('cfgGridResolution', s.gridResolution);
  setVal('cfgGridFps', s.gridFps);
  setVal('cfgGridFpsVal', s.gridFps);
  setVal('cfgFloatSize', s.floatSize);
  setVal('cfgFloatEnterAction', s.floatEnterAction);
  setVal('cfgFloatExitAction', s.floatExitAction);
  setVal('cfgFloatResolution', s.floatResolution);
  setVal('cfgFloatFps', s.floatFps);
  setVal('cfgFloatFpsVal', s.floatFps);
  setVal('cfgFullEnterAction', s.fullEnterAction);
  setVal('cfgFullExitAction', s.fullExitAction);
  setVal('cfgFullSize', s.fullSize);
  setVal('cfgFullFps', s.fullFps);
  setVal('cfgFullFpsVal', s.fullFps);
  setCheck('cfgShowInput', s.showInput);
  setCheck('cfgShowActionMenu', s.showActionMenu);
  setCheck('cfgShowNavKeys', s.showNavKeys);
  setCheck('cfgShowMediaRecord', s.showMediaRecord);
  setCheck('cfgShowScreenshot', s.showScreenshot);
  setVal('cfgDefaultOrientation', s.defaultOrientation);
  setVal('cfgRenderMode', s.renderMode);
  setVal('cfgLoadMode', s.loadMode);
  setVal('cfgScreenOrCamera', s.screenOrCamera);
  setVal('cfgMaxLogCount', s.maxLogCount);
  setVal('cfgUnreadCount', s.unreadCount);
  setVal('cfgFloatPosition', s.floatPosition);
  setCheck('cfgFloatMsg', s.floatMsg);
  setCheck('cfgFloatVideoInfo', s.floatVideoInfo);
  setCheck('cfgFloatLog', s.floatLog);
  setCheck('cfgFloatFileProgress', s.floatFileProgress);
  setCheck('cfgFloatPopup', s.floatPopup);
  setCheck('cfgAutoCheckStatus', s.autoCheckStatus);
  setCheck('cfgAutoCheckTask', s.autoCheckTask);
  setVal('cfgNetworkProtocol', s.networkProtocol);
  setVal('cfgFileTransfer', s.fileTransfer);
  setVal('cfgMediaLib', s.mediaLib);
  setCheck('cfgRightScriptList', s.rightScriptList);
  setCheck('cfgLeftGroupList', s.leftGroupList);
  setCheck('cfgShowFilter', s.showFilter);
  setCheck('cfgCacheDeviceList', s.cacheDeviceList);
  setCheck('cfgCacheScriptList', s.cacheScriptList);
  setCheck('cfgShowNotify', s.showNotify);
  setCheck('cfgMsgDebounce', s.msgDebounce);
  setVal('cfgNotifyType', s.notifyType);
  setVal('cfgNotifyPosition', s.notifyPosition);
  setVal('cfgDebounceInterval', s.debounceInterval);
  setVal('cfgNotifyDuration', s.notifyDuration);
  setVal('cfgShortcutKey1', s.shortcutKey1);
  setVal('cfgShortcutKey2', s.shortcutKey2);
  setVal('cfgShortcutKey3', s.shortcutKey3);
  
  // 脚本配置
  setCheck('cfgShowDeviceTree', cfg.script.showDeviceTree);
  setCheck('cfgShareScriptConfig', cfg.script.shareScriptConfig);
  setCheck('cfgCheckOnline', cfg.script.checkOnline);
  setCheck('cfgShowTempCode', cfg.script.showTempCode);
  
  // 常用配置
  setCheck('cfgGestureSync', cfg.common.gestureSync);
  setCheck('cfgShowRented', cfg.common.showRented);
  
  // 解锁配置
  renderUnlockConfigList();
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}
function setCheck(id, checked) {
  const el = document.getElementById(id);
  if (el) el.checked = checked;
}

// 从UI读取配置数据
function readConfigFromUI() {
  const getInt = (id, def) => parseInt(document.getElementById(id)?.value) || def;
  const getStr = (id, def) => document.getElementById(id)?.value || def;
  const getBool = (id) => document.getElementById(id)?.checked || false;
  
  return {
    screen: {
      minBitrate: getInt('cfgMinBitrate', 0),
      maxBitrate: getInt('cfgMaxBitrate', 0),
      gridSize: getStr('cfgGridSize', '180x320'),
      fitMode: getStr('cfgFitMode', 'stretch'),
      gridResolution: getStr('cfgGridResolution', '180x320'),
      gridFps: getInt('cfgGridFps', 15),
      floatSize: getStr('cfgFloatSize', '360x640'),
      floatEnterAction: getStr('cfgFloatEnterAction', 'disconnect'),
      floatExitAction: getStr('cfgFloatExitAction', 'disconnect'),
      floatResolution: getStr('cfgFloatResolution', '360x640'),
      floatFps: getInt('cfgFloatFps', 25),
      fullEnterAction: getStr('cfgFullEnterAction', 'disconnect'),
      fullExitAction: getStr('cfgFullExitAction', 'disconnect'),
      fullSize: getStr('cfgFullSize', '420x750'),
      fullFps: getInt('cfgFullFps', 25),
      showInput: getBool('cfgShowInput'),
      showActionMenu: getBool('cfgShowActionMenu'),
      showNavKeys: getBool('cfgShowNavKeys'),
      showMediaRecord: getBool('cfgShowMediaRecord'),
      showScreenshot: getBool('cfgShowScreenshot'),
      defaultOrientation: getStr('cfgDefaultOrientation', 'auto'),
      renderMode: getStr('cfgRenderMode', 'canvas'),
      loadMode: getStr('cfgLoadMode', 'lazy'),
      screenOrCamera: getStr('cfgScreenOrCamera', 'screen'),
      maxLogCount: getInt('cfgMaxLogCount', 100),
      unreadCount: getInt('cfgUnreadCount', 2),
      floatPosition: getStr('cfgFloatPosition', 'bottom-right'),
      floatMsg: getBool('cfgFloatMsg'),
      floatVideoInfo: getBool('cfgFloatVideoInfo'),
      floatLog: getBool('cfgFloatLog'),
      floatFileProgress: getBool('cfgFloatFileProgress'),
      floatPopup: getBool('cfgFloatPopup'),
      autoCheckStatus: getBool('cfgAutoCheckStatus'),
      autoCheckTask: getBool('cfgAutoCheckTask'),
      networkProtocol: getStr('cfgNetworkProtocol', 'websocket'),
      fileTransfer: getStr('cfgFileTransfer', 'websocket'),
      mediaLib: getStr('cfgMediaLib', 'local'),
      rightScriptList: getBool('cfgRightScriptList'),
      leftGroupList: getBool('cfgLeftGroupList'),
      showFilter: getBool('cfgShowFilter'),
      cacheDeviceList: getBool('cfgCacheDeviceList'),
      cacheScriptList: getBool('cfgCacheScriptList'),
      showNotify: getBool('cfgShowNotify'),
      msgDebounce: getBool('cfgMsgDebounce'),
      notifyType: getStr('cfgNotifyType', 'toast'),
      notifyPosition: getStr('cfgNotifyPosition', 'bottom-left'),
      debounceInterval: getInt('cfgDebounceInterval', 2000),
      notifyDuration: getInt('cfgNotifyDuration', 2500),
      shortcutKey1: getStr('cfgShortcutKey1', 'Ctrl'),
      shortcutKey2: getStr('cfgShortcutKey2', 'Shift'),
      shortcutKey3: getStr('cfgShortcutKey3', 'x')
    },
    script: {
      showDeviceTree: getBool('cfgShowDeviceTree'),
      shareScriptConfig: getBool('cfgShareScriptConfig'),
      checkOnline: getBool('cfgCheckOnline'),
      showTempCode: getBool('cfgShowTempCode')
    },
    common: {
      gestureSync: getBool('cfgGestureSync'),
      showRented: getBool('cfgShowRented')
    },
    unlock: gcGlobalConfigData.unlock
  };
}

// 保存全局配置
function saveGlobalConfig() {
  gcGlobalConfigData = readConfigFromUI();
  saveGlobalConfigToStorage();
  
  // 应用配置
  applyGlobalConfig();
  
  // 刷新宫格显示（应用尺寸配置）
  gcUpdateScreenCards();
  
  const toast = document.createElement('div');
  toast.textContent = '配置已保存';
  toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#4CAF50;color:white;padding:12px 24px;border-radius:6px;z-index:9999;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
  
  closeGlobalConfig();
}

// 恢复默认配置
function resetGlobalConfig() {
  if (!confirm('确定要恢复默认配置吗？')) return;
  
  gcGlobalConfigData = {
    screen: {
      minBitrate: 0,
      maxBitrate: 0,
      gridSize: '180x320',
      fitMode: 'stretch',
      gridResolution: '180x320',
      gridFps: 15,
      floatSize: '360x640',
      floatEnterAction: 'disconnect',
      floatExitAction: 'disconnect',
      floatResolution: '360x640',
      floatFps: 25,
      fullEnterAction: 'disconnect',
      fullExitAction: 'disconnect',
      fullSize: '420x750',
      fullFps: 25,
      showInput: true,
      showActionMenu: true,
      showNavKeys: true,
      showMediaRecord: false,
      showScreenshot: false,
      defaultOrientation: 'auto',
      renderMode: 'canvas',
      loadMode: 'lazy',
      screenOrCamera: 'screen',
      maxLogCount: 100,
      unreadCount: 2,
      floatPosition: 'bottom-right',
      floatMsg: true,
      floatVideoInfo: false,
      floatLog: false,
      floatFileProgress: false,
      floatPopup: true,
      autoCheckStatus: true,
      autoCheckTask: true,
      networkProtocol: 'websocket',
      fileTransfer: 'websocket',
      mediaLib: 'local',
      rightScriptList: true,
      leftGroupList: true,
      showFilter: true,
      cacheDeviceList: true,
      cacheScriptList: true,
      showNotify: true,
      msgDebounce: true,
      notifyType: 'toast',
      notifyPosition: 'bottom-left',
      debounceInterval: 2000,
      notifyDuration: 2500,
      shortcutKey1: 'Ctrl',
      shortcutKey2: 'Shift',
      shortcutKey3: 'x'
    },
    script: {
      showDeviceTree: true,
      shareScriptConfig: true,
      checkOnline: true,
      showTempCode: false
    },
    common: {
      gestureSync: false,
      showRented: false
    },
    unlock: []
  };
  
  applyConfigToUI();
  saveGlobalConfigToStorage();
  gcUpdateScreenCards();
  
  const toast = document.createElement('div');
  toast.textContent = '已恢复默认配置';
  toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#e67e22;color:white;padding:12px 24px;border-radius:6px;z-index:9999;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

// 应用全局配置到页面
function applyGlobalConfig() {
  const cfg = gcGlobalConfigData;
  
  // 应用脚本配置
  const deviceTreeEl = document.getElementById('gcGroupTree');
  if (deviceTreeEl) {
    deviceTreeEl.style.display = cfg.script.showDeviceTree ? 'block' : 'none';
  }
  
  // 临时代码按钮显示/隐藏
  const tempCodeBtn = document.querySelector('button[onclick="gcTempCode()"]');
  if (tempCodeBtn) {
    tempCodeBtn.style.display = cfg.script.showTempCode ? 'inline-block' : 'none';
  }
}

// 初始化全局配置
function initGlobalConfig() {
  loadGlobalConfig();
  applyGlobalConfig();
  
  // 应用宫格尺寸到容器
  applyGridSizeToContainer();
  
  // 绑定滑块联动
  ['MinBitrate', 'MaxBitrate', 'GridFps', 'FloatFps', 'FullFps'].forEach(name => {
    const slider = document.getElementById('cfg' + name);
    const input = document.getElementById('cfg' + name + 'Val');
    if (slider && input) {
      slider.addEventListener('input', () => input.value = slider.value);
      input.addEventListener('change', () => slider.value = input.value);
    }
  });
}

// 应用宫格尺寸到容器
function applyGridSizeToContainer() {
  const container = document.getElementById('gcScreensContainer');
  if (!container) return;
  
  const gridSize = gcGlobalConfigData?.screen?.gridSize || '180x320';
  const [gridW] = gridSize.split('x').map(Number);
  container.style.setProperty('--gc-card-width', gridW + 'px');
}

// ==================== 解锁配置管理 ====================

// 渲染解锁配置列表
function renderUnlockConfigList() {
  const tbody = document.getElementById('unlockConfigTableBody');
  if (!tbody) return;
  
  const configs = gcGlobalConfigData.unlock || [];
  if (configs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="padding:20px;text-align:center;color:#999;">暂无数据</td></tr>';
    return;
  }
  
  tbody.innerHTML = configs.map((cfg, index) => `
    <tr>
      <td style="padding:8px;border:1px solid #eee;">${cfg.name || '-'}</td>
      <td style="padding:8px;border:1px solid #eee;">${cfg.brand || '-'}</td>
      <td style="padding:8px;border:1px solid #eee;">${cfg.model || '-'}</td>
      <td style="padding:8px;border:1px solid #eee;text-align:center;">
        <button onclick="editUnlockConfig(${index})" style="padding:4px 10px;font-size:11px;margin-right:4px;">编辑</button>
        <button onclick="deleteUnlockConfig(${index})" style="padding:4px 10px;font-size:11px;background:#e74c3c;">删除</button>
      </td>
    </tr>
  `).join('');
}

// 新增解锁配置
function addUnlockConfig() {
  document.getElementById('unlockEditId').value = '';
  document.getElementById('unlockEditTitle').textContent = '新增解锁配置';
  document.getElementById('unlockEditName').value = '';
  document.getElementById('unlockEditBrand').value = '';
  document.getElementById('unlockEditModel').value = '';
  document.getElementById('unlockEditSwipe').value = 'none';
  document.getElementById('unlockEditDelay').value = '500';
  document.getElementById('unlockEditLocked').checked = false;
  document.getElementById('unlockEditCoords').value = '';
  document.getElementById('unlockEditTimed').checked = false;
  document.getElementById('unlockEditInterval').value = '30';
  document.getElementById('unlockEditTime').value = '08:00';
  document.getElementById('unlockEditModal').style.display = 'flex';
}

// 编辑解锁配置
function editUnlockConfig(index) {
  const cfg = gcGlobalConfigData.unlock[index];
  if (!cfg) return;
  
  document.getElementById('unlockEditId').value = index;
  document.getElementById('unlockEditTitle').textContent = '编辑解锁配置';
  document.getElementById('unlockEditName').value = cfg.name || '';
  document.getElementById('unlockEditBrand').value = cfg.brand || '';
  document.getElementById('unlockEditModel').value = cfg.model || '';
  document.getElementById('unlockEditSwipe').value = cfg.swipe || 'none';
  document.getElementById('unlockEditDelay').value = cfg.delay || '500';
  document.getElementById('unlockEditLocked').checked = cfg.locked || false;
  document.getElementById('unlockEditCoords').value = cfg.coords || '';
  document.getElementById('unlockEditTimed').checked = cfg.timed || false;
  document.getElementById('unlockEditInterval').value = cfg.interval || '30';
  document.getElementById('unlockEditTime').value = cfg.time || '08:00';
  document.getElementById('unlockEditModal').style.display = 'flex';
}

// 保存解锁配置
function saveUnlockConfig() {
  const index = document.getElementById('unlockEditId').value;
  const cfg = {
    name: document.getElementById('unlockEditName').value,
    brand: document.getElementById('unlockEditBrand').value,
    model: document.getElementById('unlockEditModel').value,
    swipe: document.getElementById('unlockEditSwipe').value,
    delay: parseInt(document.getElementById('cfgMinBitrate').value) || 500,
    locked: document.getElementById('unlockEditLocked').checked,
    coords: document.getElementById('unlockEditCoords').value,
    timed: document.getElementById('unlockEditTimed').checked,
    interval: parseInt(document.getElementById('unlockEditInterval').value) || 30,
    time: document.getElementById('unlockEditTime').value
  };
  
  if (!cfg.name) {
    alert('请输入配置名称');
    return;
  }
  
  if (!gcGlobalConfigData.unlock) gcGlobalConfigData.unlock = [];
  
  if (index === '') {
    gcGlobalConfigData.unlock.push(cfg);
  } else {
    gcGlobalConfigData.unlock[parseInt(index)] = cfg;
  }
  
  renderUnlockConfigList();
  closeUnlockEdit();
}

// 删除解锁配置
function deleteUnlockConfig(index) {
  if (!confirm('确定要删除该解锁配置吗？')) return;
  gcGlobalConfigData.unlock.splice(index, 1);
  renderUnlockConfigList();
}

// 关闭解锁编辑弹窗
function closeUnlockEdit() {
  document.getElementById('unlockEditModal').style.display = 'none';
}

function gcSendInput() {
  const ids = getGcSelectedIds();
  if (ids.length === 0) { 
    alert('请先选择设备'); 
    return; 
  }
  const content = document.getElementById('gcInputContent').value.trim();
  if (!content) { 
    alert('请输入内容'); 
    return; 
  }
  const task = { action: 'script', code: content };
  fetch('/api/task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: currentUser, targetDevices: ids, task })
  }).then(r=>r.json()).then(d=>alert(d.msg));
}

// ========== 脚本模块面板 ==========
function loadGcScriptModules() {
  fetch(`/api/scripts?username=${encodeURIComponent(currentUser)}`)
    .then(r => r.json())
    .then(data => {
      if (data.status === 'success') {
        gcScriptModules = data.scripts;
        renderGcScriptTabs();
        renderGcScriptCards();
      }
    })
    .catch(err => console.error('加载脚本模块失败:', err));
}

function renderGcScriptTabs() {
  const tabsEl = document.getElementById('gcScriptTabs');
  const defaultCats = ['脚本市场','代码市场','白商店','云空间','开发工具','脚本模块'];
  const cats = {};
  gcScriptModules.forEach(s => {
    const c = s.category || '未分类';
    if (!cats[c]) cats[c] = [];
    cats[c].push(s);
  });

  const allCats = [...defaultCats.filter(c => cats[c]), ...Object.keys(cats).filter(c=>!defaultCats.includes(c))];
  if (allCats.length === 0) { 
    tabsEl.innerHTML = ''; 
    return; 
  }
  window._gcScriptCats = cats;
  window._gcActiveCat = allCats[0];
  tabsEl.innerHTML = allCats.map(c => {
    const active = c === allCats[0] ? 'active' : '';
    return `<button class="cat-tab ${active}" onclick="gcSwitchScriptCat('${c}')">${c}</button>`;
  }).join('');
}

function gcSwitchScriptCat(cat) {
  window._gcActiveCat = cat;
  document.querySelectorAll('#gcScriptTabs .cat-tab').forEach(btn => {
    btn.classList.toggle('active', btn.textContent === cat);
  });
  renderGcScriptCards();
}

function renderGcScriptCards() {
  const cardsEl = document.getElementById('gcScriptCards');
  const cats = window._gcScriptCats || {};
  const cat = window._gcActiveCat || Object.keys(cats)[0];
  const scripts = cats[cat] || [];
  if (scripts.length === 0) {
    cardsEl.innerHTML = '<div style="color:#999;font-size:12px;">暂无脚本</div>';
    return;
  }
  cardsEl.innerHTML = scripts.map(s => `
    <div class="gc-script-card" id="gcCard${s.id}" onclick="gcSelectScriptCard(${s.id})">
      ${s.name}
    </div>
  `).join('');
}

function gcSelectScriptCard(id) {
  document.querySelectorAll('.gc-script-card').forEach(c => c.classList.remove('active'));
  const card = document.getElementById('gcCard' + id);
  if (card) card.classList.add('active');
  gcActiveScriptCard = id;
}

function openGcScriptSelectModal(deviceIds) {
  if (gcActiveScriptCard) {
    fetch('/api/scripts/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scriptId: gcActiveScriptCard, targetDevices: deviceIds, username: currentUser })
    }).then(r=>r.json()).then(d=>{
      const toast = document.createElement('div');
      toast.textContent = d.msg;
      toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#4CAF50;color:white;padding:12px 24px;border-radius:6px;z-index:9999;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    });
  } else {
    const toast = document.createElement('div');
    toast.textContent = '请先选择要发布的脚本';
    toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#f44336;color:white;padding:12px 24px;border-radius:6px;z-index:9999;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
}