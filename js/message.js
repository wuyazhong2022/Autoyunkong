// ========== 双向消息功能 ==========

const MESSAGE_STORAGE_KEY = 'cloud_control_messages';
const MESSAGE_RETENTION_DAYS = 20;

function getAllMessages() {
  try {
    const data = localStorage.getItem(MESSAGE_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('读取消息失败:', e);
    return [];
  }
}

function saveMessage(message) {
  const messages = getAllMessages();
  messages.push(message);
  localStorage.setItem(MESSAGE_STORAGE_KEY, JSON.stringify(messages));
  updateMessageStats();
  cleanupOldMessages();
}

function clearAllMessages() {
  if (!confirm('确定要清空所有消息记录吗？')) {
    return;
  }
  localStorage.removeItem(MESSAGE_STORAGE_KEY);
  document.getElementById('broadcastMessagesContainer').innerHTML = 
    '<div class="no-messages" style="text-align: center; color: #999; padding: 40px;">暂无消息记录</div>';
  updateMessageStats();
}

function cleanupOldMessages() {
  const messages = getAllMessages();
  const cutoffTime = Date.now() - (MESSAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const filtered = messages.filter(msg => new Date(msg.timestamp).getTime() > cutoffTime);
  localStorage.setItem(MESSAGE_STORAGE_KEY, JSON.stringify(filtered));
  updateMessageStats();
}

function updateMessageStats() {
  const messages = getAllMessages();
  const deviceMessages = messages.filter(m => m.fromType === 'device');
  const serverMessages = messages.filter(m => m.fromType === 'server');
  const unreadMessages = messages.filter(m => !m.read);
  
  document.getElementById('totalMessageCount').textContent = messages.length;
  document.getElementById('unreadMessageCount').textContent = unreadMessages.length;
  document.getElementById('deviceMessageCount').textContent = deviceMessages.length;
  document.getElementById('serverMessageCount').textContent = serverMessages.length;
  
  const badge = document.getElementById('messageBadge');
  if (badge) {
    if (unreadMessages.length > 0) {
      badge.textContent = unreadMessages.length;
      badge.style.display = 'inline';
    } else {
      badge.style.display = 'none';
    }
  }
}

function addMessageToList(message) {
  const container = document.getElementById('broadcastMessagesContainer');
  if (!container) return;
  
  const noMsgDiv = container.querySelector('.no-messages');
  if (noMsgDiv) {
    noMsgDiv.remove();
  }
  
  const messageDiv = document.createElement('div');
  messageDiv.style.cssText = `
    margin-bottom: 15px;
    padding: 12px;
    border-radius: 8px;
    background: ${message.fromType === 'server' ? '#e8f4fd' : '#f0f8f0'};
    border-left: 4px solid ${message.fromType === 'server' ? '#3498db' : '#27ae60'};
    cursor: pointer;
  `;
  messageDiv.onclick = function() {
    if (message.fromType === 'device') {
      openDeviceChat(message.fromName, message.deviceName);
    }
  };
  
  const headerDiv = document.createElement('div');
  headerDiv.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-size: 12px;
    color: #666;
  `;
  headerDiv.innerHTML = `
    <span><strong>${message.fromType === 'server' ? '服务端' : '设备'}</strong> - ${message.fromName}</span>
    <span>${formatTimestamp(message.timestamp)}</span>
  `;
  
  let contentElement;
  
  if (message.contentType === 'image') {
    contentElement = document.createElement('img');
    const imgSrc = message.content.startsWith('data:image/') ? message.content : `data:image/${message.imageFormat || 'jpg'};base64,${message.content}`;
    contentElement.src = imgSrc;
    contentElement.style.cssText = `
      max-width: 100%;
      max-height: 400px;
      border-radius: 4px;
      display: block;
    `;
  } else if (message.contentType === 'json') {
    contentElement = document.createElement('div');
    contentElement.style.cssText = `
      font-size: 14px;
      color: #333;
      word-break: break-all;
      white-space: pre-wrap;
      font-family: monospace;
    `;
    try {
      const jsonObj = JSON.parse(message.content);
      contentElement.textContent = JSON.stringify(jsonObj, null, 2);
    } catch (e) {
      contentElement.textContent = message.content;
    }
  } else {
    contentElement = document.createElement('div');
    contentElement.style.cssText = `
      font-size: 14px;
      color: #333;
      word-break: break-all;
      white-space: pre-wrap;
    `;
    contentElement.textContent = message.content;
  }
  
  messageDiv.appendChild(headerDiv);
  messageDiv.appendChild(contentElement);
  
  container.insertBefore(messageDiv, container.firstChild);
  
  markMessageAsRead(message.id);
}

function markMessageAsRead(messageId) {
  const messages = getAllMessages();
  const updated = messages.map(msg => {
    if (msg.id === messageId) {
      return { ...msg, read: true };
    }
    return msg;
  });
  localStorage.setItem(MESSAGE_STORAGE_KEY, JSON.stringify(updated));
  updateMessageStats();
}

function sendBroadcastMessage() {
  const content = document.getElementById('broadcastMessageInput').value.trim();
  if (!content) {
    alert('请输入消息内容');
    return;
  }
  
  const targetDevices = getSelectedMessageDevices();
  if (targetDevices.length === 0) {
    alert('请先选择目标设备');
    return;
  }
  
  sendMessageToMultipleDevices(targetDevices, content);
  
  const message = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    fromType: 'server',
    fromName: '服务端',
    targetDevices: targetDevices,
    content: content,
    contentType: 'text',
    timestamp: new Date().toISOString(),
    read: true
  };
  saveMessage(message);
  addMessageToList(message);
  
  document.getElementById('broadcastMessageInput').value = '';
}

function getSelectedMessageDevices() {
  const checkboxes = document.querySelectorAll('#messageDeviceCheckboxes input[type="checkbox"]');
  const selected = [];
  checkboxes.forEach(cb => {
    if (cb.checked) {
      selected.push(cb.value);
    }
  });
  return selected;
}

function sendCommandMessage() {
  const content = document.getElementById('broadcastMessageInput').value.trim();
  if (!content) {
    alert('请输入命令内容');
    return;
  }
  
  const targetDevices = getSelectedMessageDevices();
  if (targetDevices.length === 0) {
    alert('请先选择目标设备');
    return;
  }
  
  sendMessageToMultipleDevices(targetDevices, '[命令] ' + content);
  
  const message = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    fromType: 'server',
    fromName: '服务端(命令)',
    targetDevices: targetDevices,
    content: content,
    contentType: 'command',
    timestamp: new Date().toISOString(),
    read: true
  };
  saveMessage(message);
  addMessageToList(message);
  
  document.getElementById('broadcastMessageInput').value = '';
}

function sendPingMessage() {
  const targetDevices = getSelectedMessageDevices();
  if (targetDevices.length === 0) {
    alert('请先选择目标设备');
    return;
  }
  
  sendMessageToMultipleDevices(targetDevices, '[心跳测试] PING');
  
  const message = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    fromType: 'server',
    fromName: '服务端(心跳)',
    targetDevices: targetDevices,
    content: 'PING测试',
    contentType: 'ping',
    timestamp: new Date().toISOString(),
    read: true
  };
  saveMessage(message);
  addMessageToList(message);
}

function sendMessageToMultipleDevices(deviceIds, content) {
  if (!webWsConnected) {
    alert('Web连接未建立，请刷新页面');
    return;
  }
  
  deviceIds.forEach(deviceId => {
    webWs.send(JSON.stringify({
      action: 'sendToDevice',
      targetDevice: deviceId,
      content: content
    }));
  });
}

function showMessageSettings() {
  alert('消息设置功能即将上线！\n\n当前设置：\n- 消息保留期限：20天\n- 自动清理：每天凌晨自动清理过期消息');
}

// 保存消息模块的设备选中状态
let messageSelectedIds = [];

function saveMessageDeviceSelection() {
  const checkboxes = document.querySelectorAll('#messageDeviceCheckboxes input[type="checkbox"]:checked:not(#selectAllMessageDevices)');
  messageSelectedIds = Array.from(checkboxes).map(cb => cb.value);
  console.log('[消息模块] 保存选中设备:', messageSelectedIds);
  return messageSelectedIds;
}

function updateMessageDeviceList() {
  const container = document.getElementById('messageDeviceCheckboxes');
  if (!container) return;
  
  if (!currentUser) {
    container.innerHTML = '<div style="color: #999;">请先登录并刷新设备列表</div>';
    return;
  }
  
  // 保存当前选中状态
  const selectedDevices = saveMessageDeviceSelection();
  console.log('[消息模块] 开始加载设备, 当前选中:', selectedDevices);
  
  fetch(`/api/devices?username=${encodeURIComponent(currentUser)}`)
    .then(response => response.json())
    .then(data => {
      if (data.status === 'success' && data.devices) {
        let html = '<label style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">';
        html += '<input type="checkbox" id="selectAllMessageDevices" onchange="toggleSelectAllMessageDevices()">';
        html += '<strong>全选</strong>';
        html += '</label>';
        
        data.devices.forEach(device => {
          const isChecked = selectedDevices.includes(device.deviceId) ? 'checked' : '';
          const isOnline = device.info.status === 'online';
          const statusClass = isOnline ? 'status-online' : 'status-offline';
          const statusText = isOnline ? '在线' : '离线';
          html += `<label style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">`;
          html += `<input type="checkbox" value="${device.deviceId}" ${isChecked} ${!isOnline ? 'disabled' : ''} onchange="updateMessageSelectAllState()">`;
          html += `<span>${device.deviceId} (${device.info.deviceName || '未知设备'})</span>`;
          html += `<span class="status-badge ${statusClass}" style="font-size:10px;padding:1px 6px;">${statusText}</span>`;
          html += `</label>`;
        });
        
        container.innerHTML = html;
        
        // 更新全选复选框状态
        updateMessageSelectAllState();
        console.log('[消息模块] 设备加载完成, 已恢复选中:', selectedDevices);
      } else {
        container.innerHTML = '<div style="color: #999;">暂无设备</div>';
      }
    })
    .catch(error => {
      console.error('获取设备列表失败:', error);
      container.innerHTML = '<div style="color: #999;">加载设备列表失败</div>';
    });
}

// 更新消息模块全选复选框状态
function updateMessageSelectAllState() {
  const selectAll = document.getElementById('selectAllMessageDevices');
  const checkboxes = document.querySelectorAll('#messageDeviceCheckboxes input[type="checkbox"]:not(#selectAllMessageDevices)');
  if (selectAll && checkboxes.length > 0) {
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    selectAll.checked = allChecked;
  }
}

function toggleSelectAllMessageDevices() {
  const selectAll = document.getElementById('selectAllMessageDevices');
  const checkboxes = document.querySelectorAll('#messageDeviceCheckboxes input[type="checkbox"]:not(#selectAllMessageDevices)');
  checkboxes.forEach(cb => {
    cb.checked = selectAll.checked;
  });
}

function handleDeviceMessage(data) {
  try {
    // data 已经是对象，不需要 JSON.parse
    const msg = typeof data === 'string' ? JSON.parse(data) : data;
    
    if (msg.action === 'deviceMessage' || msg.action === 'clientMessage') {
      const message = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        fromType: 'device',
        fromName: msg.deviceId || '未知设备',
        deviceName: msg.deviceName || '',
        content: msg.content || JSON.stringify(msg),
        contentType: msg.contentType || 'text',
        timestamp: msg.timestamp || new Date().toISOString(),
        read: false,
        rawData: msg
      };
      
      saveMessage(message);
      addMessageToList(message);
      updateMessageStats();
    }
    
    if (msg.action === 'deviceImage') {
      const message = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        fromType: 'device',
        fromName: msg.deviceId || '未知设备',
        deviceName: msg.deviceName || '',
        content: msg.imageData || msg.content || '',
        contentType: 'image',
        imageFormat: msg.imageFormat || 'jpg',
        timestamp: msg.timestamp || new Date().toISOString(),
        read: false,
        rawData: msg
      };
      
      saveMessage(message);
      addMessageToList(message);
      updateMessageStats();
    }
    
    if (msg.action === 'messageAck') {
      console.log('收到服务端消息确认:', msg);
      if (msg.status === 'error' || msg.status === 'partial') {
        alert(msg.msg);
      }
    }
  } catch (e) {
    console.error('处理设备消息失败:', e);
  }
}

function initMessageSection() {
  cleanupOldMessages();
  updateMessageStats();
  
  const messages = getAllMessages();
  if (messages.length > 0) {
    const container = document.getElementById('broadcastMessagesContainer');
    if (container) {
      container.innerHTML = '';
      [...messages].reverse().forEach(msg => {
        addMessageToList(msg);
      });
    }
  }
  
  updateNextCleanupTime();
}

function updateNextCleanupTime() {
  const now = new Date();
  const nextDay = new Date(now);
  nextDay.setDate(nextDay.getDate() + 1);
  nextDay.setHours(0, 0, 0, 0);
  
  const timeStr = nextDay.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const el = document.getElementById('nextCleanup');
  if (el) {
    el.textContent = timeStr;
  }
}