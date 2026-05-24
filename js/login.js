// 退出登录
function logout() {
  if (!confirm('确定要退出登录吗？')) {
    return;
  }
  localStorage.removeItem('currentUser');
  localStorage.removeItem('isAdmin');
  localStorage.removeItem('loginTime');
  currentUser = null;
  isAdmin = false;
  stopRefreshInterval();
  
  if (webWs) {
    webWs.close();
    webWs = null;
    webWsConnected = false;
  }
  
  // 跳转到登录页面
  window.location.href = '/login.html';
}

// 检查登录状态
function checkLogin() {
  const savedUser = localStorage.getItem('currentUser');
  const savedIsAdmin = localStorage.getItem('isAdmin');
  
  if (savedUser) {
    currentUser = savedUser;
    isAdmin = savedIsAdmin === 'true';
    return true;
  }
  return false;
}