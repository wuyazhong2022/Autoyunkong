// ==================== 超级管理员功能 ====================

function showAdminTab(tabName) {
  document.querySelectorAll('.admin-tab').forEach(tab => tab.style.display = 'none');
  document.getElementById('admin' + tabName.charAt(0).toUpperCase() + tabName.slice(1) + 'Tab').style.display = 'block';
  
  if (tabName === 'users') loadAdminUsers();
  else if (tabName === 'devices') loadAdminDevices();
  else if (tabName === 'scripts') loadAdminScripts();
}

function loadAdminUsers() {
  fetch(`/api/admin/users?username=${encodeURIComponent(currentUser)}`)
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success') {
        const list = document.getElementById('adminUserList');
        if (data.users.length === 0) {
          list.innerHTML = '<div style="text-align: center; color: #999; padding: 40px;">暂无用户</div>';
        } else {
          list.innerHTML = `
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="background:#f8f9fa;">
                  <th style="padding:12px;text-align:left;border-bottom:1px solid #ddd;">用户名</th>
                  <th style="padding:12px;text-align:left;border-bottom:1px solid #ddd;">角色</th>
                  <th style="padding:12px;text-align:left;border-bottom:1px solid #ddd;">创建时间</th>
                  <th style="padding:12px;text-align:left;border-bottom:1px solid #ddd;">操作</th>
                </tr>
              </thead>
              <tbody>
                ${data.users.map(user => `
                  <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:12px;">${user.username}</td>
                    <td style="padding:12px;">
                      ${user.isAdmin ? '<span style="background:#e74c3c;color:white;padding:2px 8px;border-radius:4px;font-size:12px;">超级管理员</span>' : '<span style="background:#95a5a6;color:white;padding:2px 8px;border-radius:4px;font-size:12px;">普通用户</span>'}
                    </td>
                    <td style="padding:12px;">${formatTimestamp(user.createTime)}</td>
                    <td style="padding:12px;">
                      ${user.username !== currentUser ? `
                        <button onclick="toggleAdminRole('${user.username}', ${!user.isAdmin})" style="padding:6px 12px;font-size:12px;margin-right:8px;">
                          ${user.isAdmin ? '取消管理员' : '设为管理员'}
                        </button>
                        <button onclick="deleteAdminUser('${user.username}')" style="padding:6px 12px;font-size:12px;background:#e74c3c;color:white;border:none;border-radius:4px;">删除</button>
                      ` : '<span style="color:#999;font-size:12px;">当前用户</span>'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `;
        }
      } else {
        document.getElementById('adminUserList').innerHTML = `<div style="text-align: center; color: #e74c3c; padding: 40px;">${data.msg || '加载失败'}</div>`;
      }
    })
    .catch(err => {
      console.error('加载用户列表失败:', err);
      document.getElementById('adminUserList').innerHTML = '<div style="text-align: center; color: #e74c3c; padding: 40px;">加载失败</div>';
    });
}

function loadAdminDevices() {
  fetch(`/api/admin/devices?username=${encodeURIComponent(currentUser)}`)
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success') {
        const list = document.getElementById('adminDeviceList');
        if (data.devices.length === 0) {
          list.innerHTML = '<div style="text-align: center; color: #999; padding: 40px;">暂无设备</div>';
        } else {
          list.innerHTML = `
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="background:#f8f9fa;">
                  <th style="padding:12px;text-align:left;border-bottom:1px solid #ddd;">设备ID</th>
                  <th style="padding:12px;text-align:left;border-bottom:1px solid #ddd;">设备名称</th>
                  <th style="padding:12px;text-align:left;border-bottom:1px solid #ddd;">所属用户</th>
                  <th style="padding:12px;text-align:left;border-bottom:1px solid #ddd;">系统版本</th>
                  <th style="padding:12px;text-align:left;border-bottom:1px solid #ddd;">最后活跃</th>
                </tr>
              </thead>
              <tbody>
                ${data.devices.map(device => `
                  <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:12px;">${device.deviceId}</td>
                    <td style="padding:12px;">${device.deviceName || '未命名'}</td>
                    <td style="padding:12px;">${device.username}</td>
                    <td style="padding:12px;">${device.osVersion || '未知'}</td>
                    <td style="padding:12px;">${formatTimestamp(device.lastActive)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `;
        }
      } else {
        document.getElementById('adminDeviceList').innerHTML = `<div style="text-align: center; color: #e74c3c; padding: 40px;">${data.msg || '加载失败'}</div>`;
      }
    })
    .catch(err => {
      console.error('加载设备列表失败:', err);
      document.getElementById('adminDeviceList').innerHTML = '<div style="text-align: center; color: #e74c3c; padding: 40px;">加载失败</div>';
    });
}

function loadAdminScripts() {
  fetch(`/api/admin/scripts?username=${encodeURIComponent(currentUser)}`)
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success') {
        const list = document.getElementById('adminScriptList');
        if (data.scripts.length === 0) {
          list.innerHTML = '<div style="text-align: center; color: #999; padding: 40px;">暂无脚本</div>';
        } else {
          list.innerHTML = `
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="background:#f8f9fa;">
                  <th style="padding:12px;text-align:left;border-bottom:1px solid #ddd;">ID</th>
                  <th style="padding:12px;text-align:left;border-bottom:1px solid #ddd;">脚本名称</th>
                  <th style="padding:12px;text-align:left;border-bottom:1px solid #ddd;">分类</th>
                  <th style="padding:12px;text-align:left;border-bottom:1px solid #ddd;">归属</th>
                  <th style="padding:12px;text-align:left;border-bottom:1px solid #ddd;">更新时间</th>
                </tr>
              </thead>
              <tbody>
                ${data.scripts.map(script => `
                  <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:12px;">${script.id}</td>
                    <td style="padding:12px;">${script.name}</td>
                    <td style="padding:12px;">${script.category}</td>
                    <td style="padding:12px;">
                      ${script.owner === 'system' ? '<span style="background:#3498db;color:white;padding:2px 8px;border-radius:4px;font-size:12px;">系统脚本</span>' : 
                        script.owner === 'unknown' ? '<span style="background:#95a5a6;color:white;padding:2px 8px;border-radius:4px;font-size:12px;">未知</span>' : 
                        '<span style="background:#27ae60;color:white;padding:2px 8px;border-radius:4px;font-size:12px;">用户:' + script.owner + '</span>'}
                    </td>
                    <td style="padding:12px;">${formatTimestamp(script.updateTime)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `;
        }
      } else {
        document.getElementById('adminScriptList').innerHTML = `<div style="text-align: center; color: #e74c3c; padding: 40px;">${data.msg || '加载失败'}</div>`;
      }
    })
    .catch(err => {
      console.error('加载脚本列表失败:', err);
      document.getElementById('adminScriptList').innerHTML = '<div style="text-align: center; color: #e74c3c; padding: 40px;">加载失败</div>';
    });
}

function toggleAdminRole(username, makeAdmin) {
  if (!confirm(`确定要${makeAdmin ? '设置' : '取消'} ${username} 的管理员权限吗？`)) return;
  
  fetch(`/api/admin/users/${username}/role?username=${encodeURIComponent(currentUser)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isAdmin: makeAdmin })
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === 'success') {
      alert('操作成功');
      loadAdminUsers();
    } else {
      alert('操作失败: ' + data.msg);
    }
  })
  .catch(err => {
    console.error('修改角色失败:', err);
    alert('操作失败');
  });
}

function deleteAdminUser(username) {
  if (!confirm(`确定要删除用户 ${username} 吗？此操作将同时断开该用户的所有设备连接！`)) return;
  
  fetch(`/api/admin/users/${username}?username=${encodeURIComponent(currentUser)}`, {
    method: 'DELETE'
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === 'success') {
      alert('删除成功');
      loadAdminUsers();
    } else {
      alert('删除失败: ' + data.msg);
    }
  })
  .catch(err => {
    console.error('删除用户失败:', err);
    alert('删除失败');
  });
}