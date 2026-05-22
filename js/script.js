// ==================== 脚本管理 ====================

function loadScripts() {
  fetch(`/api/scripts?username=${encodeURIComponent(currentUser)}`)
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success') {
        scripts = data.scripts;
        updateScriptTable(data.scripts);
      }
    })
    .catch(err => console.error('加载脚本失败:', err));
}

function updateScriptTable(scriptList) {
  const tbody = document.getElementById('scriptTableBody');
  if (scriptList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">暂无脚本，点击"添加脚本"创建</td></tr>';
  } else {
    tbody.innerHTML = scriptList.map(script => {
      const ownerTag = script.owner === 'system' ? '<span style="background:#3498db;color:white;padding:2px 6px;border-radius:3px;font-size:11px;">系统</span>' : (script.isOwner ? '<span style="background:#27ae60;color:white;padding:2px 6px;border-radius:3px;font-size:11px;">我的</span>' : '<span style="background:#95a5a6;color:white;padding:2px 6px;border-radius:3px;font-size:11px;">其他</span>');
      const actionButtons = script.isOwner ? `
        <button onclick="editScript(${script.id})">编辑</button>
        <button class="danger" onclick="deleteScript(${script.id})">删除</button>
      ` : `
        <button onclick="viewScript(${script.id})">查看</button>
      `;
      return `
        <tr>
          <td>${script.id}</td>
          <td>${script.name}</td>
          <td>${script.category || '未分类'}</td>
          <td>${ownerTag}</td>
          <td class="action-buttons">
            ${actionButtons}
          </td>
        </tr>
      `;
    }).join('');
  }
}

function loadScriptsForSelect() {
  fetch(`/api/scripts?username=${encodeURIComponent(currentUser)}`)
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success') {
        const select = document.getElementById('scriptSelect');
        select.innerHTML = '<option value="">请选择脚本</option>' +
          data.scripts.map(s => `<option value="${s.id}">${s.name} (${s.category || '未分类'})${s.owner === 'system' ? ' [系统]' : ''}</option>`).join('');
      }
    })
    .catch(err => console.error('加载脚本列表失败:', err));
}

function openAddScriptModal() {
  document.getElementById('modalTitle').textContent = '添加脚本';
  document.getElementById('editScriptId').value = '';
  document.getElementById('scriptName').value = '';
  document.getElementById('scriptCategory').value = '';
  document.getElementById('scriptCode').value = '';
  document.getElementById('scriptModal').style.display = 'flex';
}

function editScript(id) {
  fetch(`/api/scripts/${id}`)
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success') {
        document.getElementById('modalTitle').textContent = '编辑脚本';
        document.getElementById('editScriptId').value = data.script.id;
        document.getElementById('scriptName').value = data.script.name;
        document.getElementById('scriptCategory').value = data.script.category || '';
        document.getElementById('scriptCode').value = data.script.code;
        document.getElementById('changeNote').value = '';
        // 更新行号
        updateLineNumbers();
        // 显示历史版本按钮（如果有历史版本）
        if (data.script.history && data.script.history.length > 0) {
          document.getElementById('historyBtn').style.display = 'inline-block';
        } else {
          document.getElementById('historyBtn').style.display = 'none';
        }
        document.getElementById('scriptModal').style.display = 'flex';
      }
    })
    .catch(err => console.error('加载脚本详情失败:', err));
}

function viewScript(id) {
  fetch(`/api/scripts/${id}`)
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success') {
        document.getElementById('modalTitle').textContent = '查看脚本: ' + data.script.name;
        document.getElementById('editScriptId').value = data.script.id;
        document.getElementById('scriptName').value = data.script.name;
        document.getElementById('scriptName').disabled = true;
        document.getElementById('scriptCategory').value = data.script.category || '';
        document.getElementById('scriptCategory').disabled = true;
        document.getElementById('scriptCode').value = data.script.code;
        document.getElementById('scriptCode').disabled = true;
        document.getElementById('scriptModal').style.display = 'flex';
        document.querySelector('.modal-content button.success').style.display = 'none';
      }
    })
    .catch(err => console.error('加载脚本详情失败:', err));
}

function closeModal() {
  document.getElementById('scriptModal').style.display = 'none';
  document.getElementById('scriptName').disabled = false;
  document.getElementById('scriptCategory').disabled = false;
  document.getElementById('scriptCode').disabled = false;
  document.getElementById('changeNote').value = '';
  document.querySelector('.modal-content button.success').style.display = 'inline-block';
  document.getElementById('historyBtn').style.display = 'none';
}

// 代码编辑器功能
function updateLineNumbers() {
  const textarea = document.getElementById('scriptCode');
  const lineNumbers = document.getElementById('lineNumbers');
  if (!textarea || !lineNumbers) return;
  
  const lines = textarea.value.split('\n');
  let lineNumbersHtml = '';
  for (let i = 1; i <= lines.length; i++) {
    lineNumbersHtml += i + '\n';
  }
  lineNumbers.textContent = lineNumbersHtml;
}

function formatCode() {
  const textarea = document.getElementById('scriptCode');
  if (!textarea) return;
  
  try {
    // 使用简单的格式化逻辑
    let code = textarea.value;
    let formatted = '';
    let indent = 0;
    const indentStr = '  ';
    
    code.split('\n').forEach(line => {
      const trimmed = line.trim();
      
      // 减少缩进的情况
      if (trimmed.startsWith('}') || trimmed.startsWith(')') || trimmed.startsWith(']')) {
        indent = Math.max(0, indent - 1);
      }
      
      // 添加缩进
      formatted += indentStr.repeat(indent) + trimmed + '\n';
      
      // 增加缩进的情况
      if (trimmed.endsWith('{') || trimmed.endsWith('(') || trimmed.endsWith('[') || 
          (trimmed.endsWith(':') && !trimmed.startsWith('case'))) {
        indent++;
      }
    });
    
    textarea.value = formatted.trim();
    updateLineNumbers();
  } catch (e) {
    console.error('格式化代码失败:', e);
  }
}

function indentCode() {
  const textarea = document.getElementById('scriptCode');
  if (!textarea) return;
  
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  
  // 获取选中的行
  const before = value.substring(0, start);
  const selected = value.substring(start, end);
  const after = value.substring(end);
  
  // 在每行前添加缩进
  const indented = selected.split('\n').map(line => '  ' + line).join('\n');
  
  textarea.value = before + indented + after;
  
  // 更新光标位置
  textarea.selectionStart = start + 2;
  textarea.selectionEnd = end + 2 * (selected.split('\n').length);
  updateLineNumbers();
}

function unindentCode() {
  const textarea = document.getElementById('scriptCode');
  if (!textarea) return;
  
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  
  const before = value.substring(0, start);
  const selected = value.substring(start, end);
  const after = value.substring(end);
  
  // 移除每行开头的两个空格
  const unindented = selected.split('\n').map(line => 
    line.startsWith('  ') ? line.substring(2) : line
  ).join('\n');
  
  textarea.value = before + unindented + after;
  
  // 更新光标位置
  const lines = selected.split('\n');
  let newStart = start;
  let newEnd = end;
  lines.forEach((line, i) => {
    if (line.startsWith('  ')) {
      if (i === 0) newStart -= 2;
      newEnd -= 2;
    }
  });
  textarea.selectionStart = Math.max(0, newStart);
  textarea.selectionEnd = Math.max(0, newEnd);
  updateLineNumbers();
}

function commentCode() {
  const textarea = document.getElementById('scriptCode');
  if (!textarea) return;
  
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  
  const before = value.substring(0, start);
  const selected = value.substring(start, end);
  const after = value.substring(end);
  
  // 在每行前添加 //
  const commented = selected.split('\n').map(line => '// ' + line).join('\n');
  
  textarea.value = before + commented + after;
  textarea.selectionStart = start + 3;
  textarea.selectionEnd = end + 3 * selected.split('\n').length;
  updateLineNumbers();
}

function uncommentCode() {
  const textarea = document.getElementById('scriptCode');
  if (!textarea) return;
  
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  
  const before = value.substring(0, start);
  const selected = value.substring(start, end);
  const after = value.substring(end);
  
  // 移除每行开头的 //
  const uncommented = selected.split('\n').map(line => 
    line.startsWith('// ') ? line.substring(3) : line.startsWith('//') ? line.substring(2) : line
  ).join('\n');
  
  textarea.value = before + uncommented + after;
  updateLineNumbers();
}

function highlightSyntax() {
  // 语法高亮（简单实现）
  // 实际项目中可以引入 CodeMirror 或 Monaco Editor
  console.log('语法高亮切换');
}

function showScriptHistory() {
  const id = document.getElementById('editScriptId').value;
  if (!id) return;
  
  document.getElementById('historyScriptId').value = id;
  document.getElementById('historyModal').style.display = 'flex';
  loadScriptHistory(id);
}

function closeHistoryModal() {
  document.getElementById('historyModal').style.display = 'none';
}

function loadScriptHistory(scriptId) {
  fetch(`/api/scripts/${scriptId}`)
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success' && data.script && data.script.history && data.script.history.length > 0) {
        const history = data.script.history;
        document.getElementById('historyList').innerHTML = `
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#f8f9fa;">
                <th style="padding:10px;text-align:left;border-bottom:1px solid #ddd;">版本</th>
                <th style="padding:10px;text-align:left;border-bottom:1px solid #ddd;">修改时间</th>
                <th style="padding:10px;text-align:left;border-bottom:1px solid #ddd;">修改备注</th>
                <th style="padding:10px;text-align:left;border-bottom:1px solid #ddd;">操作</th>
              </tr>
            </thead>
            <tbody>
              ${history.map(h => `
                <tr style="border-bottom:1px solid #eee;">
                  <td style="padding:10px;">v${h.version}</td>
                  <td style="padding:10px;">${formatTimestamp(h.timestamp)}</td>
                  <td style="padding:10px;">${h.changeNote}</td>
                  <td style="padding:10px;">
                    <button onclick="viewHistoryVersion(${scriptId}, ${h.version})" style="padding:4px 10px;font-size:12px;margin-right:5px;">查看</button>
                    <button onclick="restoreFromHistory(${scriptId}, ${h.version})" style="padding:4px 10px;font-size:12px;">恢复</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      } else {
        document.getElementById('historyList').innerHTML = `
          <div style="text-align: center; color: #999; padding: 20px;">暂无历史版本</div>
        `;
      }
    })
    .catch(err => {
      console.error('加载历史版本失败:', err);
      document.getElementById('historyList').innerHTML = `
        <div style="text-align: center; color: #e74c3c; padding: 20px;">加载失败</div>
      `;
    });
}

function viewHistoryVersion(scriptId, version) {
  fetch(`/api/scripts/${scriptId}`)
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success' && data.script && data.script.history) {
        const historyItem = data.script.history.find(h => h.version === version);
        if (historyItem) {
          document.getElementById('viewHistoryVersion').textContent = `v${historyItem.version}`;
          document.getElementById('viewHistoryTime').textContent = formatTimestamp(historyItem.timestamp);
          document.getElementById('viewHistoryNote').textContent = historyItem.changeNote;
          document.getElementById('viewHistoryName').value = historyItem.data.name || '';
          document.getElementById('viewHistoryCategory').value = historyItem.data.category || '';
          document.getElementById('viewHistoryCode').value = historyItem.data.code || '';
          document.getElementById('viewHistoryModal').style.display = 'flex';
        } else {
          alert('未找到该版本');
        }
      }
    })
    .catch(err => {
      console.error('查看历史版本失败:', err);
      alert('查看失败');
    });
}

function closeViewHistoryModal() {
  document.getElementById('viewHistoryModal').style.display = 'none';
}

function restoreFromHistory(scriptId, version) {
  if (!confirm('确定要恢复到此版本吗？当前内容将被覆盖。')) return;
  
  fetch(`/api/scripts/${scriptId}`)
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success' && data.script && data.script.history) {
        const historyItem = data.script.history.find(h => h.version === version);
        if (historyItem) {
          // 填充到编辑表单
          document.getElementById('scriptName').value = historyItem.data.name || '';
          document.getElementById('scriptCategory').value = historyItem.data.category || '';
          document.getElementById('scriptCode').value = historyItem.data.code || '';
          document.getElementById('changeNote').value = `恢复到 v${version}`;
          closeHistoryModal();
        } else {
          alert('未找到该版本');
        }
      }
    })
    .catch(err => {
      console.error('恢复版本失败:', err);
      alert('恢复失败');
    });
}

function saveScript() {
  const id = document.getElementById('editScriptId').value;
  const name = document.getElementById('scriptName').value.trim();
  const category = document.getElementById('scriptCategory').value.trim();
  const changeNote = document.getElementById('changeNote').value.trim();
  const code = document.getElementById('scriptCode').value.trim();

  if (!name || !code) {
    alert('脚本名称和代码不能为空');
    return;
  }

  const isEdit = !!id;
  const url = isEdit ? `/api/scripts/${id}` : '/api/scripts';
  const method = isEdit ? 'PUT' : 'POST';

  fetch(url, {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, category, code, changeNote, username: currentUser })
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === 'success') {
      closeModal();
      loadScripts();
      loadScriptsForSelect();
    } else {
      alert('操作失败: ' + data.msg);
    }
  })
  .catch(err => console.error('保存脚本失败:', err));
}

function deleteScript(id) {
  if (!confirm('确定要删除这个脚本吗？')) return;
  fetch(`/api/scripts/${id}`, { method: 'DELETE' })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success') {
        loadScripts();
        loadScriptsForSelect();
      } else {
        alert('删除失败: ' + data.msg);
      }
    })
    .catch(err => console.error('删除脚本失败:', err));
}