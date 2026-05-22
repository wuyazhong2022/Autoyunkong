// ==================== 设备管理 ====================

// 用于设备管理表格的选中设备ID（使用模块级变量，更可靠）
let deviceTableSelectedIds = [];

function loadDevices() {
  if (!currentUser) return;
  fetch(`/api/devices?username=${encodeURIComponent(currentUser)}`)
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success') {
        updateDeviceTable(data.devices);
        updateMessageDeviceList();
      }
    })
    .catch(err => console.error('加载设备失败:', err));
}

function refreshDevices() { 
  loadDevices(); 
}

// 保存当前选中的设备ID（从设备管理表格）
function saveSelectedDeviceIds() {
  const checkboxes = document.querySelectorAll('#deviceTableBody .device-checkbox:checked');
  deviceTableSelectedIds = Array.from(checkboxes).map(cb => cb.value);
  console.log('[设备管理] 保存选中设备:', deviceTableSelectedIds);
  return deviceTableSelectedIds;
}

// 恢复设备选中状态
function restoreSelectedDeviceIds(savedIds) {
  console.log('[设备管理] 恢复选中状态, IDs:', savedIds);
  document.querySelectorAll('#deviceTableBody .device-checkbox').forEach(cb => {
    cb.checked = savedIds.includes(cb.value);
  });
  // 更新全选状态
  updateSelectAllState();
}

// 更新全选复选框状态
function updateSelectAllState() {
  const allCheckboxes = document.querySelectorAll('#deviceTableBody .device-checkbox');
  const checkedCheckboxes = document.querySelectorAll('#deviceTableBody .device-checkbox:checked');
  const selectAllCheckbox = document.getElementById('selectAllDevices');
  if (selectAllCheckbox) {
    selectAllCheckbox.checked = allCheckboxes.length > 0 && allCheckboxes.length === checkedCheckboxes.length;
  }
}

function updateDeviceTable(deviceList) {
  devices = deviceList;
  const tbody = document.getElementById('deviceTableBody');

  // 保存当前选中状态
  const savedIds = saveSelectedDeviceIds();
  console.log('[设备管理] 开始更新表格, 当前选中:', savedIds);

  if (deviceList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999; padding: 40px;">暂无设备</td></tr>';
  } else {
    tbody.innerHTML = deviceList.map(device => {
      const isOnline = device.info.status === 'online';
      const statusClass = isOnline ? 'status-online' : 'status-offline';
      const statusText = isOnline ? '在线' : '离线';
      const lastActive = device.info.lastActive ? formatTimestamp(device.info.lastActive) : '未知';
      
      return `
        <tr>
          <td><input type="checkbox" class="device-checkbox" value="${device.deviceId}" onchange="updateSelectAllState()" ${!isOnline ? 'disabled' : ''}></td>
          <td>${device.info.deviceName || '-'}</td>
          <td>${device.deviceId}</td>
          <td><span class="status-badge ${statusClass}">${statusText}</span> <span style="font-size:11px;color:#999;">(${lastActive})</span></td>
          <td class="action-buttons">
            <button class="success" onclick="executeScriptForDevice('${device.deviceId}')" ${!isOnline ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>执行脚本</button>
            <button class="danger" onclick="stopScriptForDevice('${device.deviceId}')" ${!isOnline ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>终止脚本</button>
            <button class="danger" onclick="stopCodeForDevice('${device.deviceId}')" ${!isOnline ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>终止代码</button>
            <button onclick="viewDeviceCode('${device.deviceId}')" ${!isOnline ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>查看代码</button>
            <button onclick="openDeviceLog('${device.deviceId}')" ${!isOnline ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>查看日志</button>
            <button onclick="remoteScreen('${device.deviceId}')" ${!isOnline ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>远程投屏</button>
            <button onclick="editDevice('${device.deviceId}')">编辑</button>
            <button class="danger" onclick="deleteDevice('${device.deviceId}')">删除</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // 恢复选中状态
  restoreSelectedDeviceIds(savedIds);

  document.getElementById('refreshInfo').style.display = 'block';
  document.getElementById('lastRefreshTime').textContent = new Date().toLocaleString();
}

// 全选/取消全选
function toggleSelectAll() {
  const checked = document.getElementById('selectAllDevices').checked;
  document.querySelectorAll('.device-checkbox').forEach(cb => cb.checked = checked);
}

// 获取选中的设备ID
function getSelectedDeviceIds() {
  return Array.from(document.querySelectorAll('.device-checkbox:checked')).map(cb => cb.value);
}

// 单个设备操作
function executeScriptForDevice(deviceId) {
  const scriptId = prompt('请输入要执行的脚本ID:');
  if (!scriptId) return;
  fetch('/api/scripts/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scriptId: parseInt(scriptId), targetDevices: [deviceId], username: currentUser })
  }).then(res => res.json()).then(data => alert(data.msg));
}

function stopScriptForDevice(deviceId) {
  if (!confirm('确定要终止该设备的脚本吗？')) return;
  const task = { action: 'stopScript' };
  fetch('/api/task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: currentUser, targetDevices: [deviceId], task })
  }).then(res => res.json()).then(data => alert(data.msg));
}

function stopCodeForDevice(deviceId) {
  if (!confirm('确定要终止该设备的代码吗？')) return;
  const task = { action: 'stopScript' };
  fetch('/api/task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: currentUser, targetDevices: [deviceId], task })
  }).then(res => res.json()).then(data => alert(data.msg));
}

function viewDeviceCode(deviceId) {
  alert('查看设备 ' + deviceId + ' 的代码（功能开发中）');
}

function remoteScreen(deviceId) {
  const task = { action: 'screenCapture' };
  fetch('/api/task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: currentUser, targetDevices: [deviceId], task })
  });
  alert('已向设备 ' + deviceId + ' 发送截图请求');
}

function editDevice(deviceId) {
  const newName = prompt('请输入新的设备名称:', devices.find(d => d.deviceId === deviceId)?.info.deviceName || '');
  if (newName !== null) {
    alert('编辑设备 ' + deviceId + '（功能开发中）');
  }
}

function deleteDevice(deviceId) {
  if (!confirm('确定要删除设备 ' + deviceId + ' 吗？')) return;
  alert('删除设备 ' + deviceId + '（功能开发中）');
}

// 批量操作
function batchStopScript() {
  const ids = getSelectedDeviceIds();
  if (ids.length === 0) { 
    alert('请先选择设备'); 
    return; 
  }
  if (!confirm('确定要终止选中设备的脚本吗？')) return;
  const task = { action: 'stopScript' };
  fetch('/api/task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: currentUser, targetDevices: ids, task })
  }).then(res => res.json()).then(data => alert(data.msg));
}

function batchStopCode() {
  const ids = getSelectedDeviceIds();
  if (ids.length === 0) { 
    alert('请先选择设备'); 
    return; 
  }
  if (!confirm('确定要终止选中设备的代码吗？')) return;
  const task = { action: 'stopScript' };
  fetch('/api/task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: currentUser, targetDevices: ids, task })
  }).then(res => res.json()).then(data => alert(data.msg));
}

function batchDeleteDevices() {
  const ids = getSelectedDeviceIds();
  if (ids.length === 0) { 
    alert('请先选择设备'); 
    return; 
  }
  if (!confirm('确定要删除选中的 ' + ids.length + ' 个设备吗？')) return;
  alert('批量删除功能开发中');
}

// 设备管理其他功能（占位）
function openTempCodeModal() {
  alert('临时代码功能开发中');
}

function openScriptListModal() {
  alert('脚本代码列表功能开发中');
}

function openFloatingMenu() {
  alert('悬浮菜单功能开发中');
}

function openGlobalConfig() {
  alert('全局配置功能开发中');
}

function openBatchGroup() {
  alert('批量分组功能开发中');
}

function openScheduledTask() {
  alert('定时任务功能开发中');
}