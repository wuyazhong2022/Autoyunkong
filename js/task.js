// ==================== 任务下发 ====================

function switchTaskMode() {
  const mode = document.getElementById('taskMode').value;
  document.getElementById('scriptListMode').style.display = mode === 'script' ? 'block' : 'none';
  document.getElementById('customCodeMode').style.display = mode === 'custom' ? 'block' : 'none';
}

// 显示发送消息输入框
function showSendMessageInput() {
  document.getElementById('sendMessageGroup').style.display = 'block';
  document.getElementById('openAppGroup').style.display = 'none';
  document.getElementById('messageContent').focus();
}

// 隐藏发送消息输入框
function hideSendMessageInput() {
  document.getElementById('sendMessageGroup').style.display = 'none';
  document.getElementById('messageContent').value = '';
}

// 显示打开应用输入框
function showOpenAppInput() {
  document.getElementById('openAppGroup').style.display = 'block';
  document.getElementById('sendMessageGroup').style.display = 'none';
  document.getElementById('appPackage').focus();
}

// 隐藏打开应用输入框
function hideOpenAppInput() {
  document.getElementById('openAppGroup').style.display = 'none';
  document.getElementById('appPackage').value = '';
}

// 执行快速操作
function executeQuickAction(actionType) {
  const targetDevices = getSelectedDevices();
  
  if (targetDevices.length === 0) { 
    showMessage('taskMessage', '请选择目标设备', 'error'); 
    return; 
  }
  
  const task = { action: actionType };
  
  fetch('/api/task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: currentUser, targetDevices, task })
  })
  .then(res => res.json())
  .then(data => showMessage('taskMessage', data.msg, data.status === 'success' ? 'success' : 'error'))
  .catch(err => showMessage('taskMessage', '执行失败: ' + err.message, 'error'));
}

// 执行发送消息
function executeSendMessage() {
  const content = document.getElementById('messageContent').value.trim();
  const targetDevices = getSelectedDevices();
  
  if (!content) { 
    showMessage('taskMessage', '请输入消息内容', 'error'); 
    return; 
  }
  if (targetDevices.length === 0) { 
    showMessage('taskMessage', '请选择目标设备', 'error'); 
    return; 
  }
  
  const task = { action: 'sendMessage', content: content };
  
  fetch('/api/task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: currentUser, targetDevices, task })
  })
  .then(res => res.json())
  .then(data => {
    showMessage('taskMessage', data.msg, data.status === 'success' ? 'success' : 'error');
    if (data.status === 'success') {
      hideSendMessageInput();
    }
  })
  .catch(err => showMessage('taskMessage', '执行失败: ' + err.message, 'error'));
}

// 执行打开应用
function executeOpenApp() {
  const packageName = document.getElementById('appPackage').value.trim();
  const targetDevices = getSelectedDevices();
  
  if (!packageName) { 
    showMessage('taskMessage', '请输入应用包名', 'error'); 
    return; 
  }
  if (targetDevices.length === 0) { 
    showMessage('taskMessage', '请选择目标设备', 'error'); 
    return; 
  }
  
  const task = { action: 'openApp', packageName: packageName };
  
  fetch('/api/task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: currentUser, targetDevices, task })
  })
  .then(res => res.json())
  .then(data => {
    showMessage('taskMessage', data.msg, data.status === 'success' ? 'success' : 'error');
    if (data.status === 'success') {
      hideOpenAppInput();
    }
  })
  .catch(err => showMessage('taskMessage', '执行失败: ' + err.message, 'error'));
}

function getSelectedDevices() {
  const checkboxes = document.querySelectorAll('.device-checkbox:checked');
  return Array.from(checkboxes).map(cb => cb.value);
}

// 保存任务下发模块的设备选中状态
let taskSelectedIds = [];

function saveTaskDeviceSelection() {
  const checkboxes = document.querySelectorAll('#deviceCheckboxes input[type="checkbox"]:checked');
  taskSelectedIds = Array.from(checkboxes).map(cb => cb.value);
  console.log('[任务下发] 保存选中设备:', taskSelectedIds);
  return taskSelectedIds;
}

function loadDevicesForTask() {
  if (!currentUser) return;
  
  // 保存当前选中状态
  const savedIds = saveTaskDeviceSelection();
  console.log('[任务下发] 开始加载设备, 当前选中:', savedIds);
  
  fetch(`/api/devices?username=${encodeURIComponent(currentUser)}`)
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success') {
        const container = document.getElementById('deviceCheckboxes');
        if (data.devices.length === 0) {
          container.innerHTML = '<div style="color: #999;">暂无设备</div>';
        } else {
          container.innerHTML = data.devices.map(device => {
            const isOnline = device.info.status === 'online';
            const statusClass = isOnline ? 'status-online' : 'status-offline';
            const statusText = isOnline ? '在线' : '离线';
            return `
              <label>
                <input type="checkbox" class="device-checkbox" value="${device.deviceId}" ${savedIds.includes(device.deviceId) ? 'checked' : ''} ${!isOnline ? 'disabled' : ''}>
                ${device.info.deviceName || device.deviceId}
                <span class="status-badge ${statusClass}">${statusText}</span>
              </label>
            `;
          }).join('');
          console.log('[任务下发] 设备加载完成, 已恢复选中:', savedIds);
        }
      }
    })
    .catch(err => console.error('加载设备失败:', err));
}

function executeSelectedScript() {
  const scriptId = document.getElementById('scriptSelect').value;
  const targetDevices = getSelectedDevices();
  
  if (!scriptId) { 
    showMessage('taskMessage', '请选择脚本', 'error'); 
    return; 
  }
  if (targetDevices.length === 0) { 
    showMessage('taskMessage', '请选择目标设备', 'error'); 
    return; 
  }
  
  fetch('/api/scripts/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scriptId: parseInt(scriptId), targetDevices, username: currentUser })
  })
  .then(res => res.json())
  .then(data => {
    showMessage('taskMessage', data.msg, data.status === 'success' ? 'success' : 'error');
  })
  .catch(err => showMessage('taskMessage', '执行失败: ' + err.message, 'error'));
}

function executeCustomCode() {
  const code = document.getElementById('customCode').value.trim();
  const targetDevices = getSelectedDevices();
  
  if (!code) { 
    showMessage('taskMessage', '请输入脚本代码', 'error'); 
    return; 
  }
  if (targetDevices.length === 0) { 
    showMessage('taskMessage', '请选择目标设备', 'error'); 
    return; 
  }
  
  const task = { action: 'script', code: code };
  
  fetch('/api/task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: currentUser, targetDevices, task })
  })
  .then(res => res.json())
  .then(data => showMessage('taskMessage', data.msg, data.status === 'success' ? 'success' : 'error'))
  .catch(err => showMessage('taskMessage', '执行失败: ' + err.message, 'error'));
}
