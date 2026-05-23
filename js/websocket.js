// ==================== Web管理端WebSocket ====================

let webWs = null;
let webWsConnected = false;
let screenShareDeviceId = null;
let screenShareTimer = null;
let localLogs = [];
const MAX_LOCAL_LOGS = 100;

// ==================== 设备日志存储 ====================
let deviceLogs = {};  // 格式: { deviceId: [{ msg, level, timestamp }] }
const MAX_DEVICE_LOGS = 1000;  // 每个设备最多保存的日志数

function connectWebWs() {
  if (webWs && webWsConnected) return;
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = protocol + '//' + location.host;
  try {
    webWs = new WebSocket(wsUrl);
    webWs.onopen = function() {
      webWsConnected = true;
      webWs.send(JSON.stringify({
        action: 'login',
        role: 'web',
        username: currentUser
      }));
      console.log('Web管理端WebSocket已连接');
    };
    webWs.onmessage = function(evt) {
      handleWebWsMessage(evt.data);
    };
    webWs.onclose = function() {
      webWsConnected = false;
      console.log('Web管理端WebSocket已断开，3秒后重连');
      setTimeout(connectWebWs, 3000);
    };
    webWs.onerror = function() {
      webWsConnected = false;
    };
  } catch (e) {
    console.error('Web WebSocket连接失败:', e);
    setTimeout(connectWebWs, 3000);
  }
}

function handleWebWsMessage(data) {
  try {
    const msg = JSON.parse(data);
    console.log('收到WebSocket消息:', msg.action);
    addLog(`收到消息: ${msg.action}`);
    
    if (msg.action === 'screenFrame') {
      updateScreenFrame(msg);
    } else if (msg.action === 'remoteAck') {
      console.log('远程指令反馈:', msg);
      addLog(`远程指令反馈: ${msg.status}`);
      if (msg.status === 'error') {
        alert('指令执行失败: ' + (msg.msg || ''));
      }
    } else if (msg.action === 'deviceMessage') {
      console.log('收到设备消息:', msg.deviceId, msg.deviceName, msg.content);
      addLog(`收到设备消息: 设备[${msg.deviceId}-${msg.deviceName}] 内容: ${msg.content}`);
      addDeviceMessage(msg.deviceId, msg.deviceName, msg.content, 'text', msg.timestamp);
      // 同时添加到双向消息列表
      handleDeviceMessage(msg);
    } else if (msg.action === 'clientMessage') {
      console.log('收到客户端消息:', msg.deviceId, msg.deviceName, msg.content);
      addLog(`收到客户端消息: 设备[${msg.deviceId}-${msg.deviceName}] 内容: ${msg.content}`);
      addDeviceMessage(msg.deviceId, msg.deviceName, msg.content, 'text', msg.timestamp);
      // 同时添加到双向消息列表
      handleDeviceMessage(msg);
    } else if (msg.action === 'deviceImage') {
      const hasData = msg.imageData ? `有图片数据，长度: ${msg.imageData.length}` : '无图片数据';
      console.log('收到设备图片:', msg.deviceId, msg.deviceName, hasData, '格式:', msg.imageFormat);
      addLog(`收到设备图片: 设备[${msg.deviceId}-${msg.deviceName}] ${hasData} 格式: ${msg.imageFormat}`);
      addDeviceMessage(msg.deviceId, msg.deviceName, msg.imageData, 'image', msg.timestamp, msg.imageFormat);
      // 同时添加到双向消息列表
      handleDeviceMessage(msg);
    } else if (msg.action === 'deviceLog') {
      // 处理设备日志
      handleDeviceLog(msg.deviceId, msg.logs);
    } else if (msg.action === 'realtimeLog') {
      // 处理实时日志（控制台缓存 + 应用日志）
      handleRealtimeLog(msg.deviceId, msg.logs);
    } else if (msg.action === 'logFileContent') {
      // 处理设备日志文件内容
      handleLogFileResponse(msg.deviceId, msg.content);
    } else if (msg.action === 'layoutData') {
      // 处理布局数据
      handleLayoutData(msg.deviceId, msg.deviceName, msg.layout, msg.error);
    } else {
      console.log('未知消息类型:', msg.action);
      addLog(`未知消息类型: ${msg.action}`);
    }
  } catch (e) {
    console.error('Web端消息解析失败:', e);
    addLog(`消息解析失败: ${e.message}`);
  }
}

function addDeviceMessage(deviceId, deviceName, content, type, timestamp, format, isServer = false) {
  const container = document.getElementById('messagesContainer');
  if (!container) {
    console.log('消息容器不存在，跳过消息显示');
    return;
  }
  
  if (container.querySelector('.no-messages')) {
    container.innerHTML = '';
  }
  
  const timeStr = timestamp ? new Date(timestamp).toLocaleString() : new Date().toLocaleString();
  
  let contentHtml;
  if (type === 'image') {
    const imgSrc = content.startsWith('data:image/') ? content : `data:image/${format || 'jpg'};base64,${content}`;
    contentHtml = `<img src="${imgSrc}" class="message-image" alt="设备图片">`;
  } else {
    contentHtml = `<div class="message-content">${escapeHtml(content)}</div>`;
  }
  
  const messageItem = document.createElement('div');
  messageItem.className = `message-item ${isServer ? 'server-message' : ''}`;
  messageItem.innerHTML = `
    <div class="message-header">
      <div class="message-device">
        <span class="device-badge ${isServer ? 'server' : ''}">${isServer ? '服务端' : escapeHtml(deviceId)}</span>
        <span class="device-name">${isServer ? '服务端' : escapeHtml(deviceName || '未知设备')}</span>
        <span class="message-type ${type}">${type === 'image' ? '图片' : '消息'}</span>
      </div>
      <span class="message-time">${timeStr}</span>
    </div>
    ${contentHtml}
  `;
  
  container.appendChild(messageItem);

  const messagesDiv = document.getElementById('messageList');
  if (messagesDiv) {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  if (currentDeviceChatId === deviceId) {
    refreshDeviceChatMessages(deviceId);
  }
}

function clearDeviceMessages() {
  const container = document.getElementById('messagesContainer');
  container.innerHTML = '<div class="no-messages">暂无消息</div>';
}

function addLog(message) {
  const timestamp = new Date().toISOString();
  localLogs.unshift({ timestamp, message });
  if (localLogs.length > MAX_LOCAL_LOGS) {
    localLogs.pop();
  }
}

function viewServerLogs() {
  const container = document.getElementById('messagesContainer');
  
  let logsHtml = '<div style="background:#1a1a1a;color:#fff;padding:15px;border-radius:6px;font-family:monospace;font-size:12px;max-height:400px;overflow-y:auto;">';
  logsHtml += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1px solid #333;padding-bottom:10px;">';
  logsHtml += '<span style="font-weight:bold;">WebSocket通信日志</span>';
  logsHtml += '<button onclick="clearDeviceMessages()" style="background:#444;color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;">返回消息</button>';
  logsHtml += '</div>';
  
  if (localLogs.length === 0) {
    logsHtml += '<div style="color:#888;padding:10px;">暂无日志记录</div>';
  } else {
    localLogs.forEach(log => {
      const time = new Date(log.timestamp).toLocaleString();
      logsHtml += `<div style="margin:5px 0;padding:5px;border-bottom:1px solid #222;">`;
      logsHtml += `<span style="color:#888;">[${time}]</span> `;
      logsHtml += `<span style="color:#00ff00;">${escapeHtml(log.message)}</span>`;
      logsHtml += `</div>`;
    });
  }
  
  logsHtml += '</div>';
  container.innerHTML = logsHtml;
}

function sendMessageToDevices() {
  const content = document.getElementById('messageInput').value.trim();
  if (!content) {
    alert('请输入消息内容');
    return;
  }
  
  const ids = getGcSelectedIds();
  if (ids.length === 0) {
    alert('请先选择设备');
    return;
  }
  
  if (!webWsConnected) {
    alert('Web连接未建立，请刷新页面');
    return;
  }
  
  ids.forEach(deviceId => {
    webWs.send(JSON.stringify({
      action: 'sendToDevice',
      targetDevice: deviceId,
      content: content
    }));
  });
  
  addDeviceMessage('SERVER', '服务端', content, 'text', new Date().toISOString(), null, true);
  
  document.getElementById('messageInput').value = '';
}

function sendTestMessage() {
  document.getElementById('messageInput').value = '这是一条测试消息';
  sendMessageToDevices();
}

function sendRemoteCommand(deviceId, type) {
  if (!webWsConnected) {
    alert('Web连接未建立，请刷新页面');
    return;
  }
  webWs.send(JSON.stringify({
    action: 'remote',
    targetDevice: deviceId,
    type: type
  }));
}

function openScreenShareModal(deviceId) {
  screenShareDeviceId = deviceId;
  swipeMode = null;  // 重置滑动模式
  document.getElementById('screenShareModal').style.display = 'flex';
  document.getElementById('screenShareTitle').textContent = '屏幕共享 - ' + deviceId;
  document.getElementById('remoteStatus').textContent = '点击画面即可操作手机';
  document.getElementById('screenShareLoading').style.display = 'block';
  
  // 重置按钮样式
  const buttons = document.querySelectorAll('#remoteControlBar button');
  buttons.forEach(btn => btn.style.background = '');
  
  sendRemoteCommand(deviceId, 'screenShare');
  initScreenControl();  // 重新初始化屏幕控制
}

function closeScreenShareModal() {
  if (screenShareDeviceId) {
    sendRemoteCommand(screenShareDeviceId, 'stopScreenShare');
    screenShareDeviceId = null;
  }
  document.getElementById('screenShareModal').style.display = 'none';
  const img = document.getElementById('screenShareImg');
  img.src = '';
}

function updateScreenFrame(msg) {
  // 更新单屏幕共享画面（原有功能）
  if (msg.deviceId === screenShareDeviceId) {
    const img = document.getElementById('screenShareImg');
    if (img) img.src = msg.content;
    const loading = document.getElementById('screenShareLoading');
    if (loading) loading.style.display = 'none';
    if (msg.deviceWidth && msg.deviceHeight) {
      if (!img.dataset.deviceWidth || parseInt(img.dataset.deviceWidth) !== msg.deviceWidth) {
        img.dataset.deviceWidth = msg.deviceWidth;
        img.dataset.deviceHeight = msg.deviceHeight;
        adjustScreenShareAspect();
      }
    }
  }
  
  // 更新群控多屏幕共享画面（新增功能）
  if (typeof gcUpdateScreenFrame === 'function') {
    gcUpdateScreenFrame(msg.deviceId, msg.content, msg.deviceWidth, msg.deviceHeight);
  }
}

function adjustScreenShareAspect() {
  const img = document.getElementById('screenShareImg');
  if (!img || !img.dataset.deviceWidth) return;
  const container = document.getElementById('screenShareContainer');
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  const deviceWidth = parseInt(img.dataset.deviceWidth);
  const deviceHeight = parseInt(img.dataset.deviceHeight);
  const deviceRatio = deviceWidth / deviceHeight;
  const containerRatio = containerWidth / containerHeight;
  
  if (deviceRatio > containerRatio) {
    img.style.width = '100%';
    img.style.height = 'auto';
  } else {
    img.style.height = '100%';
    img.style.width = 'auto';
  }
}

// ==================== 屏幕远程控制 ====================

let swipeMode = null;  // 当前滑动模式：'left', 'right', 'up', 'down'
let touchStartX = 0;
let touchStartY = 0;
let isTouching = false;

// 定义命名事件处理函数（用于正确移除监听器）
let screenControlHandlers = {
  click: null,
  touchstart: null,
  touchmove: null,
  touchend: null,
  mousedown: null,
  mouseup: null
};

// 移除屏幕控制事件监听器
function removeScreenControl() {
  const overlay = document.getElementById('screenOverlay');
  if (!overlay) return;
  
  // 移除所有已绑定的事件
  if (screenControlHandlers.click) {
    overlay.removeEventListener('click', screenControlHandlers.click);
  }
  if (screenControlHandlers.touchstart) {
    overlay.removeEventListener('touchstart', screenControlHandlers.touchstart);
  }
  if (screenControlHandlers.touchmove) {
    overlay.removeEventListener('touchmove', screenControlHandlers.touchmove);
  }
  if (screenControlHandlers.touchend) {
    overlay.removeEventListener('touchend', screenControlHandlers.touchend);
  }
  if (screenControlHandlers.mousedown) {
    overlay.removeEventListener('mousedown', screenControlHandlers.mousedown);
  }
  if (screenControlHandlers.mouseup) {
    overlay.removeEventListener('mouseup', screenControlHandlers.mouseup);
  }
  
  // 重置处理函数引用
  screenControlHandlers = {
    click: null,
    touchstart: null,
    touchmove: null,
    touchend: null,
    mousedown: null,
    mouseup: null
  };
}

// 初始化屏幕控制事件
function initScreenControl() {
  const overlay = document.getElementById('screenOverlay');
  if (!overlay) return;
  
  // 先移除之前的事件监听器，防止重复绑定
  removeScreenControl();
  
  // 点击事件
  screenControlHandlers.click = function(e) {
    e.preventDefault();
    e.stopPropagation();
    handleScreenClick(e);
  };
  overlay.addEventListener('click', screenControlHandlers.click);
  
  // 触摸开始
  screenControlHandlers.touchstart = function(e) {
    e.preventDefault();
    e.stopPropagation();
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isTouching = true;
  };
  overlay.addEventListener('touchstart', screenControlHandlers.touchstart, { passive: false });
  
  // 触摸移动
  screenControlHandlers.touchmove = function(e) {
    e.preventDefault();
    e.stopPropagation();
  };
  overlay.addEventListener('touchmove', screenControlHandlers.touchmove, { passive: false });
  
  // 触摸结束
  screenControlHandlers.touchend = function(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!isTouching) return;
    isTouching = false;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    
    // 判断是滑动还是点击（滑动距离 > 20px）
    if (absX > 30 || absY > 30) {
      // 滑动
      if (swipeMode) {
        // 使用预设的滑动模式
        executeSwipeCommand(swipeMode);
      } else {
        // 自动判断滑动方向
        if (absX > absY) {
          // 水平滑动
          if (deltaX > 0) {
            executeSwipeCommand('right');
          } else {
            executeSwipeCommand('left');
          }
        } else {
          // 垂直滑动
          if (deltaY > 0) {
            executeSwipeCommand('down');
          } else {
            executeSwipeCommand('up');
          }
        }
      }
    }
  };
  overlay.addEventListener('touchend', screenControlHandlers.touchend, { passive: false });
  
  // 鼠标事件（桌面端支持）
  screenControlHandlers.mousedown = function(e) {
    touchStartX = e.clientX;
    touchStartY = e.clientY;
    isTouching = true;
  };
  overlay.addEventListener('mousedown', screenControlHandlers.mousedown);
  
  screenControlHandlers.mouseup = function(e) {
    if (!isTouching) return;
    isTouching = false;
    
    const deltaX = e.clientX - touchStartX;
    const deltaY = e.clientY - touchStartY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    
    if (absX > 30 || absY > 30) {
      // 滑动
      if (swipeMode) {
        executeSwipeCommand(swipeMode);
      } else {
        if (absX > absY) {
          if (deltaX > 0) executeSwipeCommand('right');
          else executeSwipeCommand('left');
        } else {
          if (deltaY > 0) executeSwipeCommand('down');
          else executeSwipeCommand('up');
        }
      }
    }
  };
  overlay.addEventListener('mouseup', screenControlHandlers.mouseup);
}

// 处理屏幕点击
function handleScreenClick(e) {
  console.log('[DEBUG] handleScreenClick 被调用');
  console.log('[DEBUG] screenShareDeviceId:', screenShareDeviceId);
  console.log('[DEBUG] webWsConnected:', webWsConnected);
  
  if (!screenShareDeviceId || !webWsConnected) {
    console.log('[DEBUG] 未连接设备或WebSocket未连接');
    return;
  }
  
  const overlay = document.getElementById('screenOverlay');
  const img = document.getElementById('screenShareImg');
  if (!overlay || !img) {
    console.log('[DEBUG] overlay或img不存在');
    return;
  }
  
  // 获取点击位置相对于图片的比例
  const rect = img.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;
  
  console.log('[DEBUG] 点击位置: (' + clickX + ', ' + clickY + '), 图片尺寸: (' + rect.width + ', ' + rect.height + ')');
  
  // 计算相对于图片的百分比
  const percentX = clickX / rect.width;
  const percentY = clickY / rect.height;
  
  // 获取设备分辨率
  const deviceWidth = parseInt(img.dataset.deviceWidth) || 1080;
  const deviceHeight = parseInt(img.dataset.deviceHeight) || 1920;
  
  console.log('[DEBUG] 设备分辨率:', deviceWidth + 'x' + deviceHeight);
  
  // 转换为设备坐标
  const tapX = Math.round(percentX * deviceWidth);
  const tapY = Math.round(percentY * deviceHeight);
  
  // 发送点击指令
  webWs.send(JSON.stringify({
    action: 'sendToDevice',
    targetDevice: screenShareDeviceId,
    content: JSON.stringify({ action: 'tap', x: tapX, y: tapY })
  }));
  
  // 记录日志
  document.getElementById('remoteStatus').textContent = `点击: (${tapX}, ${tapY})`;
  console.log('[DEBUG] 发送点击: (' + tapX + ', ' + tapY + ')');
}

// 设置滑动模式并执行滑动
function setSwipeMode(direction) {
  const statusEl = document.getElementById('remoteStatus');
  
  // 更新按钮样式
  const buttons = document.querySelectorAll('#remoteControlBar button');
  buttons.forEach(btn => {
    btn.style.background = '';  // 重置样式
  });
  
  if (direction) {
    statusEl.textContent = '滑动模式: ' + getSwipeModeName(direction);
    // 高亮当前选中的按钮
    const btnText = direction === 'left' ? '左滑' : 
                    direction === 'right' ? '右滑' : 
                    direction === 'up' ? '上滑' : '下滑';
    buttons.forEach(btn => {
      if (btn.textContent === btnText) {
        btn.style.background = '#e74c3c';  // 高亮
      }
    });
    // 立即执行滑动
    executeSwipeCommand(direction);
  } else {
    statusEl.textContent = '点击画面即可操作手机';
  }
}

function getSwipeModeName(direction) {
  const names = { 'left': '左滑', 'right': '右滑', 'up': '上滑', 'down': '下滑' };
  return names[direction] || direction;
}

// 执行滑动命令
function executeSwipeCommand(direction) {
  if (!screenShareDeviceId || !webWsConnected) return;
  
  const img = document.getElementById('screenShareImg');
  if (!img) return;
  
  const deviceWidth = parseInt(img.dataset.deviceWidth) || 1080;
  const deviceHeight = parseInt(img.dataset.deviceHeight) || 1920;
  
  console.log('[DEBUG] 执行滑动: 设备分辨率=' + deviceWidth + 'x' + deviceHeight + ', 方向=' + direction);
  
  let x1, y1, x2, y2;
  const step = 200;  // 滑动距离
  
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
  
  // 发送滑动指令
  webWs.send(JSON.stringify({
    action: 'sendToDevice',
    targetDevice: screenShareDeviceId,
    content: JSON.stringify({ action: 'swipe', x1: Math.round(x1), y1: Math.round(y1), x2: Math.round(x2), y2: Math.round(y2), duration: 300 })
  }));
  
  document.getElementById('remoteStatus').textContent = getSwipeModeName(direction) + '执行中...';
  console.log('发送滑动: ' + direction + ' (' + Math.round(x1) + ',' + Math.round(y1) + ') -> (' + Math.round(x2) + ',' + Math.round(y2) + ')');
  
  // 2秒后恢复状态
  setTimeout(() => {
    if (swipeMode) {
      document.getElementById('remoteStatus').textContent = '滑动模式: ' + getSwipeModeName(swipeMode);
    } else {
      document.getElementById('remoteStatus').textContent = '点击画面即可操作手机';
    }
  }, 500);
}

// 页面加载时初始化屏幕控制
window.addEventListener('load', function() {
  setTimeout(initScreenControl, 500);
});

// ==================== 设备日志功能 ====================

// 处理收到的设备日志
function handleDeviceLog(deviceId, logs) {
  if (!logs || !Array.isArray(logs)) return;
  
  // 初始化该设备的日志数组
  if (!deviceLogs[deviceId]) {
    deviceLogs[deviceId] = [];
  }
  
  // 添加日志到存储
  logs.forEach(logEntry => {
    deviceLogs[deviceId].push({
      msg: logEntry.msg,
      level: logEntry.level || 'info',
      timestamp: logEntry.timestamp || Date.now()
    });
    
    // 同时添加到实时日志（兼容deviceLog消息）
    if (!realtimeLogs[deviceId]) {
      realtimeLogs[deviceId] = [];
    }
    realtimeLogs[deviceId].push({
      msg: logEntry.msg || '',
      source: 'consoleLog',  // deviceLog来源于控制台日志
      timestamp: logEntry.timestamp || Date.now()
    });
    
    // 限制实时日志数量
    if (realtimeLogs[deviceId].length > MAX_REALTIME_LOGS) {
      realtimeLogs[deviceId] = realtimeLogs[deviceId].slice(-MAX_REALTIME_LOGS);
    }
  });
  
  // 限制每个设备的日志数量
  if (deviceLogs[deviceId].length > MAX_DEVICE_LOGS) {
    deviceLogs[deviceId] = deviceLogs[deviceId].slice(-MAX_DEVICE_LOGS);
  }
  
  // 更新日志面板（如果当前显示的是该设备的日志）
  if (typeof updateDeviceLogPanel === 'function') {
    updateDeviceLogPanel(deviceId);
  }
  
  // 更新实时日志面板（如果当前显示的是该设备的日志）
  if (typeof updateRealtimeLogPanel === 'function') {
    updateRealtimeLogPanel(deviceId);
  }
  
  console.log('收到设备日志:', deviceId, '数量:', logs.length);
}

// ==================== 实时日志功能 ====================
let realtimeLogs = {};  // 格式: { deviceId: [{ msg, source, timestamp }] }
const MAX_REALTIME_LOGS = 500;  // 每个设备实时日志最大数

// 处理实时日志（控制台 + 应用日志）
function handleRealtimeLog(deviceId, logs) {
  if (!logs || !Array.isArray(logs)) return;

  // 初始化该设备的实时日志数组
  if (!realtimeLogs[deviceId]) {
    realtimeLogs[deviceId] = [];
  }

  // 添加日志到存储
  logs.forEach(logEntry => {
    realtimeLogs[deviceId].push({
      msg: logEntry.msg || '',
      source: logEntry.source || 'unknown',
      timestamp: logEntry.timestamp || Date.now()
    });
  });

  // 限制每个设备的实时日志数量
  if (realtimeLogs[deviceId].length > MAX_REALTIME_LOGS) {
    realtimeLogs[deviceId] = realtimeLogs[deviceId].slice(-MAX_REALTIME_LOGS);
  }

  // 更新实时日志面板（如果当前显示的是该设备的日志）
  if (typeof updateRealtimeLogPanel === 'function') {
    updateRealtimeLogPanel(deviceId);
  }

  console.log('收到实时日志:', deviceId, '数量:', logs.length, '来源:', logs[0]?.source);
}

// 更新实时日志面板
function updateRealtimeLogPanel(deviceId) {
  const content = document.getElementById('realtimeLogContent');
  const count = document.getElementById('realtimeLogCount');
  if (!content) return;

  const logs = realtimeLogs[deviceId] || [];
  if (logs.length === 0) return;

  // 检查是否已经有内容
  const emptyMsg = content.querySelector('div[style*="text-align:center"]');
  if (emptyMsg || content.children.length === 0) {
    // 首次显示，渲染全部
    let html = '';
    logs.forEach(function(log) {
      const time = new Date(log.timestamp).toLocaleTimeString();
      const color = log.source === 'appLog' ? '#8bc34a' : '#03a9f4';
      const sourceTag = log.source === 'appLog' ? '[APP]' : '[CON]';
      html += '<div style="margin:2px 0;padding:2px 5px;line-height:1.4;" class="log-entry">';
      html += '<span style="color:#666;">' + sourceTag + time + '</span> ';
      html += '<span style="color:' + color + ';">' + escapeHtml(log.msg) + '</span>';
      html += '</div>';
    });
    content.innerHTML = html;
  } else {
    // 追加最新日志
    const lastLog = logs[logs.length - 1];
    const time = new Date(lastLog.timestamp).toLocaleTimeString();
    const color = lastLog.source === 'appLog' ? '#8bc34a' : '#03a9f4';
    const sourceTag = lastLog.source === 'appLog' ? '[APP]' : '[CON]';

    let logHtml = '<div style="margin:2px 0;padding:2px 5px;line-height:1.4;" class="log-entry">';
    logHtml += '<span style="color:#666;">' + sourceTag + time + '</span> ';
    logHtml += '<span style="color:' + color + ';">' + escapeHtml(lastLog.msg) + '</span>';
    logHtml += '</div>';

    content.insertAdjacentHTML('beforeend', logHtml);
  }

  // 更新计数
  if (count) count.textContent = '共 ' + logs.length + ' 条';

  // 自动滚动
  content.scrollTop = content.scrollHeight;
}

// 获取实时日志内容（用于显示）
function getRealtimeLogContent(deviceId) {
  return realtimeLogs[deviceId] || [];
}

// ==================== 布局分析模态框功能 ====================
let currentLayoutDeviceId = null;

function handleLayoutData(deviceId, deviceName, layout, error) {
  console.log('[布局] 收到布局数据, 设备:', deviceId, '节点数:', layout?.meta?.nodeCount || 0);
  
  if (error) {
    console.error('[布局] 获取布局失败:', error);
    alert('获取布局失败: ' + error);
    return;
  }
  
  if (!layout) {
    console.error('[布局] 布局数据为空');
    alert('布局数据为空');
    return;
  }
  
  // 打开布局显示窗口
  showLayoutModal(deviceId, deviceName, layout);
}

function showLayoutModal(deviceId, deviceName, layout) {
  currentLayoutDeviceId = deviceId;
  
  let modal = document.getElementById('layoutModal');
  let isMaximized = false;
  let savedSize = null;
  
  if (!modal) {
    // 创建模态框
    modal = document.createElement('div');
    modal.id = 'layoutModal';
    modal.style.cssText = 'position:fixed;top:50px;left:100px;z-index:1000;';
    modal.innerHTML = `
      <div class="modal-content" id="layoutContent" style="width: 1400px; height: 80vh; display: flex; flex-direction: column; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
        <div id="layoutHeader" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 10px 15px; cursor: move; display: flex; justify-content: space-between; align-items: center; user-select: none;">
          <h3 style="margin: 0; font-size: 16px;">📊 布局分析 - <span id="layoutDeviceName"></span></h3>
          <div style="display: flex; gap: 8px;">
            <button onclick="toggleLayoutMinimize()" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 4px; cursor: pointer; font-size: 14px;" title="最小化">─</button>
            <button onclick="toggleLayoutMaximize(this)" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 4px; cursor: pointer; font-size: 14px;" title="最大化">□</button>
            <button onclick="closeLayoutModal()" style="background: rgba(255,100,100,0.8); border: none; color: white; width: 28px; height: 28px; border-radius: 4px; cursor: pointer; font-size: 16px;" title="关闭">×</button>
          </div>
        </div>
        <div id="layoutToolbar" style="padding: 10px; background: #f8f9fa; border-bottom: 1px solid #ddd;">
          <input id="layoutSearch" type="text" placeholder="🔍 搜索 className/text/id/desc..." 
            style="width: 300px; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;"
            oninput="searchLayoutTree(this.value)">
          <span id="layoutSearchCount" style="margin-left: 10px; font-size: 12px; color: #666;"></span>
        </div>
        <div id="layoutBody" style="display: flex; flex: 1; overflow: hidden;">
          <div style="width: 40%; overflow-y: auto; border-right: 1px solid #ddd; padding: 10px;">
            <div id="layoutStats" style="margin-bottom: 10px; padding: 10px; background: #e8f4f8; border-radius: 5px; font-size: 12px;"></div>
            <div id="layoutTree" style="font-size: 12px;"></div>
          </div>
          <div style="width: 60%; padding: 10px; overflow: auto;">
            <pre id="layoutJson" style="margin: 0; font-size: 11px; white-space: pre-wrap; word-break: break-all;"></pre>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    // 拖动功能
    makeDraggable(modal, document.getElementById('layoutHeader'));
  }
  
  // 最小化功能
  window.toggleLayoutMinimize = function() {
    const body = document.getElementById('layoutBody');
    const toolbar = document.getElementById('layoutToolbar');
    const content = document.getElementById('layoutContent');
    if (body.style.display === 'none') {
      body.style.display = 'flex';
      toolbar.style.display = 'block';
      content.style.height = '80vh';
    } else {
      body.style.display = 'none';
      toolbar.style.display = 'none';
      content.style.height = 'auto';
    }
  };
  
  // 最大化功能
  window.toggleLayoutMaximize = function(btn) {
    const content = document.getElementById('layoutContent');
    if (!isMaximized) {
      savedSize = {
        width: content.style.width,
        height: content.style.height,
        top: content.style.top,
        left: content.style.left
      };
      content.style.width = '100vw';
      content.style.height = '100vh';
      content.style.top = '0';
      content.style.left = '0';
      content.style.borderRadius = '0';
      btn.textContent = '❐';
      btn.title = '还原';
      isMaximized = true;
    } else {
      content.style.width = savedSize.width;
      content.style.height = savedSize.height;
      content.style.top = savedSize.top;
      content.style.left = savedSize.left;
      content.style.borderRadius = '';
      btn.textContent = '□';
      btn.title = '最大化';
      isMaximized = false;
    }
  };
  
  // 拖动函数
  function makeDraggable(element, handle) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    handle.onmousedown = function(e) {
      if (e.target.tagName === 'BUTTON') return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = element.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      handle.style.cursor = 'grabbing';
    };
    
    document.onmousemove = function(e) {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      element.style.left = (startLeft + dx) + 'px';
      element.style.top = (startTop + dy) + 'px';
    };
    
    document.onmouseup = function() {
      isDragging = false;
      handle.style.cursor = 'move';
    };
  }
  
  // 更新内容
  document.getElementById('layoutDeviceName').textContent = deviceName + ' (' + deviceId + ')';
  
  // 显示统计信息
  const stats = layout.meta;
  document.getElementById('layoutStats').innerHTML = `
    <b>📊 ${stats.packageName}</b><br>
    节点: ${stats.nodeCount} | 耗时: ${stats.captureDuration}ms
  `;
  
  // 显示JSON
  document.getElementById('layoutJson').textContent = JSON.stringify(layout, null, 2);
  
  // 构建树形结构
  buildLayoutTree(layout.hierarchy);
  
  modal.style.display = 'block';
}

function buildLayoutTree(node, container, depth = 0) {
  if (!container) {
    container = document.getElementById('layoutTree');
    container.innerHTML = '';
  }
  
  if (!node) return;
  
  const hasChildren = node.children && node.children.length > 0;
  
  const item = document.createElement('div');
  item.style.padding = '1px 0';
  item.style.lineHeight = '1.6';
  
  // 创建行容器
  const row = document.createElement('span');
  row.style.cursor = 'pointer';
  row.style.whiteSpace = 'nowrap';
  row.style.display = 'inline-block';
  row.style.minHeight = '20px';
  row.style.borderRadius = '3px';
  row.style.padding = '1px 3px';
  row.onmouseover = () => row.style.background = '#e3f2fd';
  row.onmouseout = () => row.style.background = '';
  
  // 缩进
  const indent = '\u00A0\u00A0'.repeat(depth);
  row.innerHTML = indent;
  
  // 展开/折叠图标
  const toggleIcon = document.createElement('span');
  toggleIcon.className = 'tree-toggle';
  toggleIcon.style.color = '#2196F3';
  toggleIcon.style.fontWeight = 'bold';
  toggleIcon.style.marginRight = '3px';
  
  // 默认全部展开
  const isExpanded = true;
  let expanded = isExpanded;
  
  if (hasChildren) {
    toggleIcon.textContent = expanded ? '−' : '+';
    toggleIcon.style.color = '#E91E63';
    toggleIcon.title = expanded ? '点击收起' : '点击展开';
  } else {
    toggleIcon.textContent = '';
    toggleIcon.style.width = '10px';
    toggleIcon.style.display = 'inline-block';
  }
  row.appendChild(toggleIcon);
  
  // 图标
  let icon = '📄';
  if (node.clickable) icon = '🖱️';
  else if (node.scrollable) icon = '📜';
  else if (node.checkable) icon = '☑️';
  
  const iconSpan = document.createElement('span');
  iconSpan.textContent = icon;
  iconSpan.style.marginRight = '3px';
  row.appendChild(iconSpan);
  
  // 节点名称
  const nameSpan = document.createElement('span');
  nameSpan.innerHTML = '<b style="color:#1565C0;">' + node.className + '</b>';
  row.appendChild(nameSpan);
  
  // 显示文本
  let text = node.text || node.desc || node.id || '';
  if (text) {
    const textSpan = document.createElement('span');
    textSpan.style.color = '#666';
    textSpan.style.marginLeft = '5px';
    let displayText = text;
    if (displayText.length > 25) displayText = displayText.substring(0, 25) + '...';
    textSpan.textContent = '"' + displayText + '"';
    row.appendChild(textSpan);
  }
  
  // 坐标信息
  if (node.boundsInScreen) {
    const boundsSpan = document.createElement('span');
    boundsSpan.style.color = '#999';
    boundsSpan.style.fontSize = '11px';
    boundsSpan.style.marginLeft = '5px';
    const b = node.boundsInScreen;
    boundsSpan.textContent = '[' + b.left + ',' + b.top + '-' + b.right + ',' + b.bottom + ']';
    row.appendChild(boundsSpan);
  }
  
  item.appendChild(row);
  container.appendChild(item);
  
  // 折叠状态存储
  if (hasChildren) {
    // 子节点容器
    const childContainer = document.createElement('div');
    childContainer.className = 'tree-children';
    childContainer.style.display = expanded ? 'block' : 'none';
    item.appendChild(childContainer);
    
    // 点击图标切换
    toggleIcon.onclick = (e) => {
      e.stopPropagation();
      expanded = !expanded;
      toggleIcon.textContent = expanded ? '−' : '+';
      toggleIcon.title = expanded ? '点击收起' : '点击展开';
      childContainer.style.display = expanded ? 'block' : 'none';
      
      // 如果展开且子节点还没有渲染过，则渲染
      if (expanded && childContainer.children.length === 0) {
        node.children.forEach(child => buildLayoutTree(child, childContainer, depth + 1));
      }
    };
    
    // 如果默认展开，渲染子节点
    if (expanded) {
      node.children.forEach(child => buildLayoutTree(child, childContainer, depth + 1));
    }
  }
  
  // 点击行显示详情
  row.onclick = (e) => {
    if (e.target === toggleIcon) return;
    const jsonDiv = document.getElementById('layoutJson');
    if (jsonDiv) {
      jsonDiv.textContent = JSON.stringify(node, null, 2);
    }
  };
}

function closeLayoutModal() {
  const modal = document.getElementById('layoutModal');
  if (modal) modal.style.display = 'none';
}

// ==================== 布局树搜索功能 ====================
let currentLayoutData = null;

function searchLayoutTree(keyword) {
  const countDiv = document.getElementById('layoutSearchCount');
  const treeContainer = document.getElementById('layoutTree');
  
  if (!keyword || !treeContainer) {
    countDiv.textContent = '';
    // 清除所有高亮
    treeContainer.querySelectorAll('.search-highlight').forEach(el => {
      el.classList.remove('search-highlight');
      el.style.background = '';
    });
    return;
  }
  
  keyword = keyword.toLowerCase();
  const rows = treeContainer.querySelectorAll('span[style*="white-space: nowrap"]');
  let matchCount = 0;
  let firstMatch = null;
  
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    const isMatch = text.includes(keyword);
    
    if (isMatch) {
      matchCount++;
      row.style.background = '#ffeb3b';
      row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      if (!firstMatch) firstMatch = row;
    } else {
      row.style.background = '';
    }
  });
  
  countDiv.textContent = `找到 ${matchCount} 个匹配`;
  
  // 滚动到第一个匹配
  if (firstMatch) {
    setTimeout(() => {
      firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }
}

// ==================== 设备日志模态框功能 ====================
let currentLogDeviceId = null;
let logAutoScrollEnabled = true;

function viewDeviceLogs(deviceId) {
  console.log('[日志] viewDeviceLogs 被调用, 设备:', deviceId);
  
  function showModal() {
    currentLogDeviceId = deviceId;
    const modal = document.getElementById('deviceLogModal');
    const title = document.getElementById('deviceLogTitle');

    if (!modal) {
      console.error('日志模态框元素未找到');
      return;
    }

    title.textContent = '设备日志 - ' + deviceId;

    // 显示实时日志（如果已有数据）
    if (typeof updateRealtimeLogPanel === 'function') {
      updateRealtimeLogPanel(deviceId);
    }

    // 显示日志文件内容
    if (typeof updateLogDisplay === 'function') {
      updateLogDisplay(deviceId);
    }

    modal.style.display = 'flex';
  }
  
  // 如果DOM还没准备好，延迟执行
  if (!document.getElementById('deviceLogModal')) {
    setTimeout(showModal, 100);
  } else {
    showModal();
  }
}

function updateLogDisplay(deviceId) {
  const content = document.getElementById('deviceLogContent');
  const count = document.getElementById('deviceLogCount');
  if (!content) return;
  
  const logs = deviceLogs[deviceId] || [];
  count.textContent = '共 ' + logs.length + ' 条';
  
  if (logs.length === 0) {
    content.innerHTML = '<div style="color:#888;padding:20px;text-align:center;">暂无日志记录，等待设备发送...</div>';
    return;
  }
  
  let html = '';
  logs.forEach(log => {
    const time = new Date(log.timestamp).toLocaleTimeString();
    let color = '#00ff00';
    if (log.level === 'error') color = '#ff4444';
    else if (log.level === 'warn') color = '#ffaa00';
    html += '<div style="margin:2px 0;padding:2px 5px;line-height:1.4;" class="log-entry">';
    html += '<span style="color:#666;">[' + time + ']</span> ';
    html += '<span style="color:' + color + ';">' + escapeHtml(log.msg) + '</span>';
    html += '</div>';
  });
  
  content.innerHTML = html;
  
  if (logAutoScrollEnabled) {
    content.scrollTop = content.scrollHeight;
  }
}

function updateDeviceLogPanel(deviceId) {
  // 如果当前显示的不是这个设备的日志，不更新
  if (currentLogDeviceId !== deviceId) return;
  
  const content = document.getElementById('deviceLogContent');
  if (!content) return;
  
  const logs = deviceLogs[deviceId] || [];
  if (logs.length === 0) return;
  
  // 检查是否已经有内容
  const emptyMsg = content.querySelector('div[style*="text-align:center"]');
  if (emptyMsg) {
    updateLogDisplay(deviceId);
    return;
  }
  
  // 只追加最新的日志
  const lastLog = logs[logs.length - 1];
  const time = new Date(lastLog.timestamp).toLocaleTimeString();
  let color = '#00ff00';
  if (lastLog.level === 'error') color = '#ff4444';
  else if (lastLog.level === 'warn') color = '#ffaa00';
  
  const logHtml = '<div style="margin:2px 0;padding:2px 5px;line-height:1.4;" class="log-entry">';
  logHtml += '<span style="color:#666;">[' + time + ']</span> ';
  logHtml += '<span style="color:' + color + ';">' + escapeHtml(lastLog.msg) + '</span>';
  logHtml += '</div>';
  
  content.insertAdjacentHTML('beforeend', logHtml);
  
  // 更新计数
  const count = document.getElementById('deviceLogCount');
  if (count) count.textContent = '共 ' + logs.length + ' 条';
  
  if (logAutoScrollEnabled) {
    content.scrollTop = content.scrollHeight;
  }
}

function closeDeviceLogModal() {
  const modal = document.getElementById('deviceLogModal');
  if (modal) modal.style.display = 'none';
  currentLogDeviceId = null;
}

// 日志窗口最小化/还原功能
let isDeviceLogMinimized = false;
function toggleMinimizeDeviceLog() {
  const body = document.getElementById('deviceLogBody');
  const btn = document.getElementById('minimizeDeviceLog');
  const window = document.getElementById('deviceLogWindow');
  
  if (!body || !btn) return;
  
  isDeviceLogMinimized = !isDeviceLogMinimized;
  
  if (isDeviceLogMinimized) {
    body.style.display = 'none';
    btn.textContent = '+';
    window.style.maxHeight = '60px';
  } else {
    body.style.display = 'flex';
    btn.textContent = '-';
    window.style.maxHeight = '85vh';
  }
}

// 日志窗口拖动功能
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let windowStartX = 0;
let windowStartY = 0;
let isClickPrevented = false;

function initDeviceLogDrag() {
  const header = document.getElementById('deviceLogHeader');
  const window = document.getElementById('deviceLogWindow');
  
  if (!header || !window) return;
  
  header.addEventListener('mousedown', function(e) {
    // 检查是否点击的是按钮
    const isButton = e.target.closest('button');
    if (isButton) {
      // 记录开始拖动的位置
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      windowStartX = window.offsetLeft;
      windowStartY = window.offsetTop;
      header.style.cursor = 'grabbing';
      isClickPrevented = false;
    } else {
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      windowStartX = window.offsetLeft;
      windowStartY = window.offsetTop;
      header.style.cursor = 'grabbing';
    }
  });
  
  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    
    // 如果移动超过5像素，阻止按钮点击
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      isClickPrevented = true;
    }
    
    const newX = Math.max(0, Math.min(windowStartX + dx, window.innerWidth - window.offsetWidth));
    const newY = Math.max(0, Math.min(windowStartY + dy, window.innerHeight - window.offsetHeight));
    
    window.style.left = newX + 'px';
    window.style.top = newY + 'px';
  });
  
  document.addEventListener('mouseup', function() {
    isDragging = false;
    if (header) header.style.cursor = 'move';
  });
}

// 拦截按钮点击事件，在拖动时阻止
document.addEventListener('DOMContentLoaded', function() {
  const header = document.getElementById('deviceLogHeader');
  if (!header) return;
  
  const buttons = header.querySelectorAll('button');
  buttons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      if (isClickPrevented) {
        e.preventDefault();
        e.stopPropagation();
        isClickPrevented = false;
      }
    });
  });
});

// 页面加载完成后初始化拖动功能
document.addEventListener('DOMContentLoaded', initDeviceLogDrag);

function clearCurrentDeviceLog() {
  if (currentLogDeviceId) {
    if (deviceLogs[currentLogDeviceId]) {
      deviceLogs[currentLogDeviceId] = [];
    }
    if (realtimeLogs[currentLogDeviceId]) {
      realtimeLogs[currentLogDeviceId] = [];
    }
  }
  updateLogDisplay(currentLogDeviceId);
  // 清空实时日志显示
  const realtimeContent = document.getElementById('realtimeLogContent');
  if (realtimeContent) {
    realtimeContent.innerHTML = '<div style="color:#888;padding:20px;text-align:center;">实时日志已清空</div>';
  }
}

function clearDeviceLogs(deviceId) {
  if (deviceLogs[deviceId]) {
    deviceLogs[deviceId] = [];
  }
  if (currentLogDeviceId === deviceId) {
    updateLogDisplay(deviceId);
  }
}

function toggleLogAutoScroll() {
  logAutoScrollEnabled = !logAutoScrollEnabled;
  const btn = document.getElementById('toggleAutoScroll');
  if (btn) btn.textContent = '自动滚动: ' + (logAutoScrollEnabled ? '开' : '关');
}

// ==================== 打开设备日志文件（新窗口） ====================
let isLoadingLogFile = false;
let logFileWindow = null;

function openDeviceLogFile() {
  if (!currentLogDeviceId) {
    alert('请先选择设备');
    return;
  }
  if (!webWsConnected) {
    alert('Web连接未建立，请刷新页面');
    return;
  }
  if (isLoadingLogFile) {
    alert('正在加载日志文件，请稍候...');
    return;
  }

  isLoadingLogFile = true;

  // 打开新窗口显示日志
  logFileWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
  if (!logFileWindow) {
    alert('无法打开新窗口，请检查浏览器设置允许弹出窗口');
    isLoadingLogFile = false;
    return;
  }

  // 在新窗口中显示加载状态
  logFileWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>设备日志 - ${currentLogDeviceId}</title>
      <style>
        body { background: #1e1e1e; color: #d4d4d4; font-family: 'Consolas', 'Courier New', monospace; font-size: 13px; margin: 0; padding: 10px; }
        .loading { color: #888; text-align: center; padding: 50px; }
        .log-line { margin: 2px 0; padding: 2px 5px; white-space: pre-wrap; word-break: break-all; line-height: 1.4; }
        .section-title { color: #888; padding: 10px 5px 5px; border-bottom: 1px solid #444; margin-top: 15px; font-weight: bold; }
        .header { position: sticky; top: 0; background: #2d2d2d; padding: 10px; border-bottom: 1px solid #444; display: flex; justify-content: space-between; align-items: center; }
        .header button { padding: 6px 12px; cursor: pointer; border: none; border-radius: 4px; font-size: 12px; }
        .btn-copy { background: #27ae60; color: white; }
        .btn-save { background: #3498db; color: white; margin-left: 5px; }
        .btn-clear { background: #e74c3c; color: white; margin-left: 5px; }
      </style>
    </head>
    <body>
      <div class="header">
        <span>设备日志 - ${currentLogDeviceId}</span>
        <div>
          <button class="btn-copy" onclick="copyLog()">复制</button>
          <button class="btn-save" onclick="saveLog()">保存</button>
          <button class="btn-clear" onclick="clearLog()">清空</button>
        </div>
      </div>
      <div id="logContent"><div class="loading">正在请求设备日志文件...</div></div>
      <script>
        var logData = '';
        function copyLog() {
          navigator.clipboard.writeText(document.getElementById('logContent').innerText).then(() => alert('已复制到剪贴板'));
        }
        function saveLog() {
          var blob = new Blob([document.getElementById('logContent').innerText], {type: 'text/plain'});
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'device_log_' + new Date().toISOString().slice(0,10) + '.txt';
          a.click();
        }
        function clearLog() {
          document.getElementById('logContent').innerHTML = '';
        }
        function scrollToBottom() {
          var el = document.getElementById('logContent');
          if (el) el.scrollTop = el.scrollHeight;
        }
      </script>
    </body>
    </html>
  `);
  logFileWindow.document.close();

  // 发送请求到设备
  webWs.send(JSON.stringify({
    action: 'sendToDevice',
    targetDevice: currentLogDeviceId,
    content: JSON.stringify({ action: 'getLogFile' })
  }));

  // 设置超时
  setTimeout(function() {
    if (isLoadingLogFile && logFileWindow) {
      isLoadingLogFile = false;
      try {
        logFileWindow.document.getElementById('logContent').innerHTML = '<div class="loading" style="color:#ff4444;">请求超时，设备未响应</div>';
      } catch(e) {}
    }
  }, 15000);
}

function handleLogFileResponse(deviceId, logContent) {
  isLoadingLogFile = false;
  // 宽松检查：允许设备ID部分匹配（处理设备ID格式不一致的问题）
  const idMatch = !currentLogDeviceId || currentLogDeviceId === deviceId || 
                  deviceId.indexOf(currentLogDeviceId) !== -1 || 
                  currentLogDeviceId.indexOf(deviceId) !== -1;
  if (!idMatch) {
    console.log('日志设备ID不匹配: currentLogDeviceId=' + currentLogDeviceId + ', deviceId=' + deviceId);
    return;
  }

  // 检查是否在新窗口中显示
  if (logFileWindow && !logFileWindow.closed) {
    try {
      const logContentEl = logFileWindow.document.getElementById('logContent');
      if (logContentEl) {
        let html = '';
        
        // 显示日志内容
        if (logContent && logContent.length > 0) {
          const lines = logContent.split('\n').filter(function(line) { return line.trim() !== ''; });
          
          if (lines.length > 0) {
            html += '<div class="section-title">【控制台日志 - ' + lines.length + ' 条】</div>';
            
            lines.forEach(function(line) {
              let color = '#00ff00';
              if (line.indexOf('[ERR]') !== -1 || line.indexOf('ERROR') !== -1 || line.indexOf('错误') !== -1 || line.indexOf('失败') !== -1) {
                color = '#ff4444';
              } else if (line.indexOf('[WRN]') !== -1 || line.indexOf('WARN') !== -1 || line.indexOf('警告') !== -1) {
                color = '#ffaa00';
              } else if (line.indexOf('DEBUG') !== -1) {
                color = '#3498db';
              }
              html += '<div class="log-line"><span style="color:' + color + ';">' + escapeHtml(line) + '</span></div>';
            });
          }
        } else {
          html += '<div class="log-line" style="color:#888;">未找到控制台日志</div>';
        }
        
        logContentEl.innerHTML = html;
        logFileWindow.focus();
        // 延迟滚动到底部，确保DOM渲染完成
        try {
          setTimeout(function() {
            logContentEl.scrollTop = logContentEl.scrollHeight;
          }, 100);
        } catch(e) {
          console.log('滚动失败:', e);
        }
        return;
      }
    } catch(e) {
      console.log('新窗口显示日志失败:', e);
    }
  }

  // 回退到当前页面显示
  const content = document.getElementById('deviceLogContent');
  if (!content) return;

  let html = '';

  // 1. 首先显示控制台缓存的日志（如果存在）
  if (logContent && logContent.length > 0) {
    const lines = logContent.split('\n').filter(function(line) { return line.trim() !== ''; });
    
    if (lines.length > 0) {
      html += '<div style="color:#888;padding:5px 10px;border-bottom:1px solid #333;">【控制台日志】</div>';
      
      lines.forEach(function(line) {
        let color = '#00ff00';
        if (line.indexOf('[ERR]') !== -1 || line.indexOf('ERROR') !== -1 || line.indexOf('错误') !== -1 || line.indexOf('失败') !== -1) {
          color = '#ff4444';
        } else if (line.indexOf('[WRN]') !== -1 || line.indexOf('WARN') !== -1 || line.indexOf('警告') !== -1) {
          color = '#ffaa00';
        } else if (line.indexOf('DEBUG') !== -1) {
          color = '#3498db';
        }
        html += '<div style="margin:1px 0;padding:1px 5px;line-height:1.3;white-space:pre-wrap;word-break:break-all;">';
        html += '<span style="color:' + color + ';">' + escapeHtml(line) + '</span>';
        html += '</div>';
      });
    }
  }

  // 2. 添加分隔线和标题
  html += '<div style="color:#888;padding:5px 10px;border-bottom:1px solid #333;margin-top:10px;">【设备消息记录】</div>';

  // 3. 显示双向消息列表中该设备的消息
  const deviceMsgs = getDeviceMessages(deviceId);
  if (deviceMsgs && deviceMsgs.length > 0) {
    deviceMsgs.forEach(function(msg) {
      let color = '#00ff00';
      let prefix = '收到: ';
      if (msg.direction === 'sent') {
        color = '#3498db';
        prefix = '发送: ';
      }
      if (msg.content && (msg.content.indexOf('ERROR') !== -1 || msg.content.indexOf('失败') !== -1)) {
        color = '#ff4444';
      }
      const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '';
      html += '<div style="margin:1px 0;padding:1px 5px;line-height:1.3;white-space:pre-wrap;word-break:break-all;">';
      html += '<span style="color:#666;">[' + timeStr + ']</span> ';
      html += '<span style="color:' + color + ';">' + prefix + escapeHtml(msg.content || '') + '</span>';
      html += '</div>';
    });
  } else {
    html += '<div style="color:#666;padding:10px;text-align:center;">暂无消息记录</div>';
  }

  // 如果什么都没有，显示提示
  if (!logContent && (!deviceMsgs || deviceMsgs.length === 0)) {
    html = '<div style="color:#888;padding:20px;text-align:center;">设备日志为空，请确保脚本已执行并产生日志</div>';
  }

  content.innerHTML = html;

  // 更新计数
  const consoleLines = (logContent && logContent.length > 0) ? logContent.split('\n').filter(function(line) { return line.trim() !== ''; }).length : 0;
  const msgCount = deviceMsgs ? deviceMsgs.length : 0;
  const count = document.getElementById('deviceLogCount');
  if (count) count.textContent = '控制台日志: ' + consoleLines + ' 行, 消息记录: ' + msgCount + ' 条';

  if (logAutoScrollEnabled) {
    content.scrollTop = content.scrollHeight;
  }
}

// 获取设备的消息记录
function getDeviceMessages(deviceId) {
  // 从双向消息列表中获取该设备的消息
  const container = document.getElementById('messagesContainer');
  if (!container) return [];
  
  const msgs = [];
  const msgElements = container.querySelectorAll('.message-item');
  msgElements.forEach(function(el) {
    const elDeviceId = el.getAttribute('data-device-id');
    if (elDeviceId && (elDeviceId === deviceId || elDeviceId.indexOf(deviceId) !== -1 || deviceId.indexOf(elDeviceId) !== -1)) {
      const content = el.querySelector('.message-content');
      const time = el.querySelector('.message-time');
      const direction = el.classList.contains('message-sent') ? 'sent' : 'received';
      if (content) {
        msgs.push({
          content: content.textContent,
          timestamp: time ? time.getAttribute('data-timestamp') : null,
          direction: direction
        });
      }
    }
  });
  return msgs;
}

// 点击模态框外部关闭
document.addEventListener('click', function(e) {
  const modal = document.getElementById('deviceLogModal');
  if (modal && e.target === modal) {
    closeDeviceLogModal();
  }
});