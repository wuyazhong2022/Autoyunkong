// ==================== 设备聊天窗口 ====================

function openDeviceChat(deviceId, deviceName) {
  const deviceChatDiv = document.createElement('div');
  deviceChatDiv.id = 'deviceChatWindow';
  deviceChatDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80%;
    max-width: 800px;
    height: 80%;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `;
  
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 15px 20px;
    background: #3498db;
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;
  header.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 20px;">📱</span>
      <div>
        <h3 style="margin: 0; font-size: 16px;">${deviceName || deviceId}</h3>
        <div style="font-size: 12px; opacity: 0.8;">设备ID: ${deviceId}</div>
      </div>
    </div>
    <button onclick="closeDeviceChat()" style="
      padding: 8px 16px;
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: 4px;
      color: white;
      cursor: pointer;
      font-size: 14px;
    ">关闭</button>
  `;
  
  const messagesContainer = document.createElement('div');
  messagesContainer.id = 'deviceChatMessages';
  messagesContainer.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    background: #f8f9fa;
  `;
  
  const allMessages = getAllMessages();
  const deviceMessages = allMessages.filter(m => 
    (m.fromType === 'device' && m.fromName === deviceId) ||
    (m.fromType === 'server' && m.targetDevices && m.targetDevices.includes(deviceId))
  );
  
  if (deviceMessages.length === 0) {
    messagesContainer.innerHTML = '<div style="text-align: center; color: #999; padding: 40px;">暂无与该设备的消息记录</div>';
  } else {
    deviceMessages.forEach(msg => {
      const msgDiv = document.createElement('div');
      msgDiv.className = 'chat-msg-item';
      msgDiv.style.cssText = `
        margin-bottom: 15px;
        padding: 12px;
        border-radius: 8px;
        background: ${msg.fromType === 'server' ? '#e8f4fd' : '#f0f8f0'};
        border-left: 4px solid ${msg.fromType === 'server' ? '#3498db' : '#27ae60'};
      `;
      
      let contentHtml;
      if (msg.contentType === 'image') {
        const imgSrc = msg.content.startsWith('data:image/') ? msg.content : `data:image/${msg.imageFormat || 'jpg'};base64,${msg.content}`;
        contentHtml = `<img src="${imgSrc}" style="max-width: 100%; max-height: 400px; border-radius: 4px; display: block;" alt="图片">`;
      } else if (msg.contentType === 'json') {
        try {
          const jsonObj = JSON.parse(msg.content);
          contentHtml = `<pre style="font-size: 14px; color: #333; word-break: break-all; white-space: pre-wrap; font-family: monospace;">${JSON.stringify(jsonObj, null, 2)}</pre>`;
        } catch (e) {
          contentHtml = `<div style="font-size: 14px; color: #333; word-break: break-all; white-space: pre-wrap;">${msg.content}</div>`;
        }
      } else {
        contentHtml = `<div style="font-size: 14px; color: #333; word-break: break-all; white-space: pre-wrap;">${msg.content}</div>`;
      }
      
      msgDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 12px; color: #666;">
          <span><strong>${msg.fromType === 'server' ? '服务端' : '设备'}</strong></span>
          <span>${formatTimestamp(msg.timestamp)}</span>
        </div>
        ${contentHtml}
      `;
      messagesContainer.appendChild(msgDiv);
    });
  }
  
  const inputDiv = document.createElement('div');
  inputDiv.style.cssText = `
    padding: 15px 20px;
    background: white;
    border-top: 1px solid #eee;
    display: flex;
    gap: 15px;
  `;
  inputDiv.innerHTML = `
    <input type="text" id="deviceChatInput" placeholder="输入消息..." style="
      flex: 1;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
    " onkeyup="if(event.keyCode===13) sendDeviceChatMessage('${deviceId}')">
    <button onclick="sendDeviceChatMessage('${deviceId}')" style="
      padding: 12px 30px;
      background: #3498db;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
    ">发送</button>
  `;
  
  deviceChatDiv.appendChild(header);
  deviceChatDiv.appendChild(messagesContainer);
  deviceChatDiv.appendChild(inputDiv);
  
  const overlay = document.createElement('div');
  overlay.id = 'chatOverlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 999;
  `;
  overlay.onclick = closeDeviceChat;
  
  document.body.appendChild(overlay);
  document.body.appendChild(deviceChatDiv);
  
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  currentDeviceChatId = deviceId;
  deviceChatInterval = setInterval(() => {
    refreshDeviceChatMessages(deviceId);
  }, 3000);
}

function closeDeviceChat() {
  const chatWindow = document.getElementById('deviceChatWindow');
  const overlay = document.getElementById('chatOverlay');
  if (chatWindow) chatWindow.remove();
  if (overlay) overlay.remove();
  if (deviceChatInterval) {
    clearInterval(deviceChatInterval);
    deviceChatInterval = null;
  }
  currentDeviceChatId = null;
}

function refreshDeviceChatMessages(deviceId) {
  const messagesContainer = document.getElementById('deviceChatMessages');
  if (!messagesContainer) return;

  const allMessages = getAllMessages();
  const deviceMessages = allMessages.filter(m =>
    (m.fromType === 'device' && m.fromName === deviceId) ||
    (m.fromType === 'server' && m.targetDevices && m.targetDevices.includes(deviceId))
  );

  const currentChildCount = messagesContainer.querySelectorAll('.chat-msg-item').length;
  if (deviceMessages.length > currentChildCount) {
    messagesContainer.innerHTML = '';
    deviceMessages.forEach(msg => {
      const msgDiv = document.createElement('div');
      msgDiv.className = 'chat-msg-item';
      msgDiv.style.cssText = `
        margin-bottom: 15px;
        padding: 12px;
        border-radius: 8px;
        background: ${msg.fromType === 'server' ? '#e8f4fd' : '#f0f8f0'};
        border-left: 4px solid ${msg.fromType === 'server' ? '#3498db' : '#27ae60'};
      `;

      let contentHtml;
      if (msg.contentType === 'image') {
        const imgSrc = msg.content.startsWith('data:image/') ? msg.content : `data:image/${msg.imageFormat || 'jpg'};base64,${msg.content}`;
        contentHtml = `<img src="${imgSrc}" style="max-width: 100%; max-height: 400px; border-radius: 4px; display: block;" alt="图片">`;
      } else if (msg.contentType === 'json') {
        try {
          const jsonObj = JSON.parse(msg.content);
          contentHtml = `<pre style="font-size: 14px; color: #333; word-break: break-all; white-space: pre-wrap; font-family: monospace;">${JSON.stringify(jsonObj, null, 2)}</pre>`;
        } catch (e) {
          contentHtml = `<div style="font-size: 14px; color: #333; word-break: break-all; white-space: pre-wrap;">${msg.content}</div>`;
        }
      } else {
        contentHtml = `<div style="font-size: 14px; color: #333; word-break: break-all; white-space: pre-wrap;">${msg.content}</div>`;
      }

      msgDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 12px; color: #666;">
          <span><strong>${msg.fromType === 'server' ? '服务端' : '设备'}</strong></span>
          <span>${formatTimestamp(msg.timestamp)}</span>
        </div>
        ${contentHtml}
      `;
      messagesContainer.appendChild(msgDiv);
    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

function sendDeviceChatMessage(deviceId) {
  const input = document.getElementById('deviceChatInput');
  const content = input.value.trim();
  if (!content) return;
  
  if (!webWsConnected) {
    alert('Web连接未建立，请刷新页面');
    return;
  }

  webWs.send(JSON.stringify({
    action: 'sendToDevice',
    targetDevice: deviceId,
    content: content
  }));

  const message = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    fromType: 'server',
    fromName: '服务端',
    targetDevices: [deviceId],
    content: content,
    contentType: 'text',
    timestamp: new Date().toISOString(),
    read: true
  };
  saveMessage(message);
  addMessageToList(message);
  
  input.value = '';
  
  refreshDeviceChatMessages(deviceId);
}