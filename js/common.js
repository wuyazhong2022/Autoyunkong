// 全局变量
let currentUser = null;
let isAdmin = false;
let devices = [];
let scripts = [];
let refreshInterval = null;
let deviceChatInterval = null;
let currentDeviceChatId = null;

// 响应式菜单控制
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const menuToggle = document.getElementById('menuToggle');

function openMenu() {
  sidebar.classList.add('open');
  overlay.classList.add('show');
}

function closeMenu() {
  sidebar.classList.remove('open');
  overlay.classList.remove('show');
}

function initMenuEvents() {
  menuToggle.addEventListener('click', openMenu);
  overlay.addEventListener('click', closeMenu);
  
  document.querySelectorAll('.sidebar li').forEach(li => {
    li.addEventListener('click', function(e) {
      if (window.innerWidth <= 768) {
        closeMenu();
      }
    });
  });

  window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
      closeMenu();
    }
  });
}

// 显示指定区域
function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));
  document.getElementById(sectionId).classList.add('active');

  const menuMap = {
    'deviceSection': 0,
    'scriptListSection': 1,
    'taskSection': 2,
    'groupControlSection': 3,
    'messageSection': 4,
    'adminSection': 5
  };
  if (menuMap[sectionId] !== undefined) {
    const items = document.querySelectorAll('.sidebar li');
    if (items[menuMap[sectionId]]) {
      items[menuMap[sectionId]].classList.add('active');
    }
  }

  // 根据不同区域加载对应数据
  if (sectionId === 'deviceSection' && currentUser) {
    loadDevices();
  }
  if (sectionId === 'scriptListSection' && currentUser) {
    loadScripts();
  }
  if (sectionId === 'taskSection' && currentUser) {
    loadDevicesForTask();
    loadScriptsForSelect();
  }
  if (sectionId === 'groupControlSection' && currentUser) {
    loadGroupControl();
  }
  if (sectionId === 'messageSection' && currentUser) {
    initMessageSection();
  }
  if (sectionId === 'adminSection' && currentUser) {
    showAdminTab('users');
  }

  if (window.innerWidth <= 768) {
    closeMenu();
  }
}

// 显示消息提示
function showMessage(elementId, text, type) {
  const el = document.getElementById(elementId);
  el.textContent = text;
  el.className = 'message ' + type;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 3000);
}

// 格式化时间戳（显示完整的年月日时分秒）
function formatTimestamp(timestamp) {
  if (!timestamp) return '未知';
  const date = new Date(timestamp);
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// HTML转义
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// 关闭通用弹窗
function closeModal() {
  const modal = document.getElementById('scriptModal');
  if (modal) modal.style.display = 'none';
}

// 自动刷新控制
function startRefreshInterval() {
  refreshInterval = setInterval(() => {
    if (currentUser) loadDevices();
  }, 10000);
}

function stopRefreshInterval() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}