// 基于koa-websocket实现的AutoJS远程控制服务端
const Koa = require('koa')
const route = require('koa-route')
const websockify = require('koa-websocket')
const serve = require('koa-static')
const path = require('path')
const fs = require('fs')
const os = require('os')
const cors = require('koa-cors')
const bodyParser = require('koa-bodyparser')

const app = websockify(new Koa());

// 配置项
const PORT = 3006; // 直接固定端口为3007
const HOST = '0.0.0.0';

// 获取本机IP地址
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

// 在线设备管理（key: deviceId, value: { ws, info, username, lastActive }）
const devices = new Map();

// Web管理端连接（key: username, value: ws）
const webClients = new Map();

// 脚本存储目录
const SCRIPTS_DIR = path.join(__dirname, 'scripts');
if (!fs.existsSync(SCRIPTS_DIR)) {
    fs.mkdirSync(SCRIPTS_DIR, { recursive: true });
}

// 脚本存储文件
const SCRIPTS_FILE = path.join(SCRIPTS_DIR, 'scripts.json');

// ==================== 用户管理 ====================

// 用户数据目录
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 用户数据文件
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// 设备数据文件
const DEVICES_FILE = path.join(DATA_DIR, 'devices.json');

// 持久化设备列表（记录所有用户添加过的设备）
let persistedDevices = [];

// 加载设备数据
function loadDevicesData() {
    try {
        if (fs.existsSync(DEVICES_FILE)) {
            const data = fs.readFileSync(DEVICES_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('加载设备数据失败:', error);
    }
    return [];
}

// 保存设备数据
function saveDevicesData(deviceList) {
    try {
        fs.writeFileSync(DEVICES_FILE, JSON.stringify(deviceList, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('保存设备数据失败:', error);
        return false;
    }
}

// 加载用户数据
function loadUsers() {
    try {
        if (fs.existsSync(USERS_FILE)) {
            const data = fs.readFileSync(USERS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('加载用户数据失败:', error);
    }
    // 返回默认管理员账号
    return [
        {
            username: '15077352220',
            password: '123456',
            createTime: '2024-01-01T00:00:00.000Z'
        }
    ];
}

// 保存用户数据
function saveUsers(users) {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('保存用户数据失败:', error);
        return false;
    }
}

let users = loadUsers();

// 日志存储（用于Web查看）
let serverLogs = [];
const MAX_LOGS = 500;

// 重写console.log来存储日志
const originalLog = console.log;
console.log = function(...args) {
    originalLog.apply(console, args);
    const logStr = args.map(arg => {
        if (typeof arg === 'object') {
            try {
                return JSON.stringify(arg);
            } catch (e) {
                return '[Circular Reference]';
            }
        }
        return String(arg);
    }).join(' ');
    const timestamp = new Date().toISOString();
    serverLogs.unshift({ timestamp, message: logStr });
    if (serverLogs.length > MAX_LOGS) {
        serverLogs.pop();
    }
};

// 初始化脚本数据
function loadScripts() {
    try {
        if (fs.existsSync(SCRIPTS_FILE)) {
            const data = fs.readFileSync(SCRIPTS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('加载脚本数据失败:', error);
    }
    // 返回默认脚本列表
    return [
        {
            id: 1,
            name: "示例脚本-获取设备信息",
            code: "toast('设备型号: ' + device.model);\nlog('系统版本: ' + device.release);\nlog('屏幕宽度: ' + device.width);\nlog('屏幕高度: ' + device.height);",
            category: "工具类",
            owner: "system",
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString()
        },
        {
            id: 2,
            name: "示例脚本-自动滑动",
            code: "auto();\nfor(let i = 0; i < 10; i++) {\n    swipe(500, 1500, 500, 500, 500);\n    sleep(2000);\n}",
            category: "操作类",
            owner: "system",
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString()
        }
    ];
}

// 保存脚本数据
function saveScripts(scripts) {
    try {
        fs.writeFileSync(SCRIPTS_FILE, JSON.stringify(scripts, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('保存脚本数据失败:', error);
        return false;
    }
}

let scripts = loadScripts();
let nextScriptId = scripts.length > 0 ? Math.max(...scripts.map(s => s.id)) + 1 : 1;

// 初始化持久化设备数据
persistedDevices = loadDevicesData();

// 中间件配置
app.use(cors({ origin: '*', credentials: true }));
app.use(bodyParser());

// 根路径跳转
app.use(route.get('/', function (ctx) {
    ctx.redirect('/login.html')
}))

// ==================== 用户管理API ====================

// 用户注册
app.use(route.post('/api/user/register', function (ctx) {
    try {
        const { username, password } = ctx.request.body;
        
        if (!username || !password) {
            ctx.status = 400;
            ctx.body = JSON.stringify({ status: 'error', msg: '用户名和密码不能为空' });
            ctx.set('Content-Type', 'application/json');
            return;
        }
        
        // 检查用户名是否已存在
        const existingUser = users.find(u => u.username === username);
        if (existingUser) {
            ctx.status = 400;
            ctx.body = JSON.stringify({ status: 'error', msg: '用户名已存在' });
            ctx.set('Content-Type', 'application/json');
            return;
        }
        
        // 创建新用户
        const newUser = {
            username: username,
            password: password,
            createTime: new Date().toISOString()
        };
        
        users.push(newUser);
        saveUsers(users);
        
        console.log('新用户注册:', username);
        
        ctx.body = JSON.stringify({
            status: 'success',
            msg: '注册成功'
        });
        ctx.set('Content-Type', 'application/json');
    } catch (error) {
        console.error('用户注册错误:', error);
        ctx.status = 500;
        ctx.body = JSON.stringify({ status: 'error', msg: '服务器内部错误' });
        ctx.set('Content-Type', 'application/json');
    }
}));

// 用户登录验证
app.use(route.post('/api/user/login', function (ctx) {
    try {
        const { username, password } = ctx.request.body;
        
        if (!username || !password) {
            ctx.status = 400;
            ctx.body = JSON.stringify({ status: 'error', msg: '用户名和密码不能为空' });
            ctx.set('Content-Type', 'application/json');
            return;
        }
        
        // 查找用户
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            console.log('用户登录成功:', username);
            ctx.body = JSON.stringify({
                status: 'success',
                msg: '登录成功',
                username: username,
                isAdmin: user.isAdmin || false
            });
        } else {
            console.log('用户登录失败:', username);
            ctx.body = JSON.stringify({
                status: 'error',
                msg: '用户名或密码错误'
            });
        }
        ctx.set('Content-Type', 'application/json');
    } catch (error) {
        console.error('用户登录错误:', error);
        ctx.status = 500;
        ctx.body = JSON.stringify({ status: 'error', msg: '服务器内部错误' });
        ctx.set('Content-Type', 'application/json');
    }
}));

// ==================== 日志查看API ====================

// 获取服务器日志
app.use(route.get('/api/logs', function (ctx) {
    try {
        ctx.body = JSON.stringify({
            status: 'success',
            logs: serverLogs
        });
        ctx.set('Content-Type', 'application/json');
    } catch (error) {
        console.error('获取日志错误:', error);
        ctx.status = 500;
        ctx.body = JSON.stringify({ status: 'error', msg: '服务器内部错误' });
    }
}));

// ==================== 管理员专用API ====================

// 获取所有用户列表（管理员专用）
app.use(route.get('/api/admin/users', function (ctx) {
    const username = ctx.query.username;
    try {
        const user = users.find(u => u.username === username);
        if (!user || !user.isAdmin) {
            ctx.status = 403;
            ctx.body = JSON.stringify({ status: 'error', msg: '权限不足' });
            ctx.set('Content-Type', 'application/json');
            return;
        }
        
        ctx.body = JSON.stringify({
            status: 'success',
            users: users.map(u => ({
                username: u.username,
                isAdmin: u.isAdmin || false,
                createTime: u.createTime
            }))
        });
        ctx.set('Content-Type', 'application/json');
    } catch (error) {
        console.error('获取用户列表错误:', error);
        ctx.status = 500;
        ctx.body = JSON.stringify({ status: 'error', msg: '服务器内部错误' });
        ctx.set('Content-Type', 'application/json');
    }
}));

// 删除用户（管理员专用）
app.use(route.delete('/api/admin/users/:username', function (ctx, targetUsername) {
    const username = ctx.query.username;
    try {
        const user = users.find(u => u.username === username);
        if (!user || !user.isAdmin) {
            ctx.status = 403;
            ctx.body = JSON.stringify({ status: 'error', msg: '权限不足' });
            ctx.set('Content-Type', 'application/json');
            return;
        }
        
        // 不能删除自己
        if (username === targetUsername) {
            ctx.status = 400;
            ctx.body = JSON.stringify({ status: 'error', msg: '不能删除自己' });
            ctx.set('Content-Type', 'application/json');
            return;
        }
        
        const index = users.findIndex(u => u.username === targetUsername);
        if (index === -1) {
            ctx.status = 404;
            ctx.body = JSON.stringify({ status: 'error', msg: '用户不存在' });
            ctx.set('Content-Type', 'application/json');
            return;
        }
        
        users.splice(index, 1);
        saveUsers(users);
        
        // 同时断开该用户的所有设备连接
        devices.forEach((device, deviceId) => {
            if (device.username === targetUsername) {
                try { device.ws.close(1000, 'user deleted'); } catch (e) {}
                devices.delete(deviceId);
            }
        });
        
        ctx.body = JSON.stringify({
            status: 'success',
            msg: '用户删除成功'
        });
        ctx.set('Content-Type', 'application/json');
    } catch (error) {
        console.error('删除用户错误:', error);
        ctx.status = 500;
        ctx.body = JSON.stringify({ status: 'error', msg: '服务器内部错误' });
        ctx.set('Content-Type', 'application/json');
    }
}));

// 修改用户角色（管理员专用）
app.use(route.put('/api/admin/users/:username/role', function (ctx, targetUsername) {
    const username = ctx.query.username;
    const { isAdmin } = ctx.request.body;
    try {
        const user = users.find(u => u.username === username);
        if (!user || !user.isAdmin) {
            ctx.status = 403;
            ctx.body = JSON.stringify({ status: 'error', msg: '权限不足' });
            ctx.set('Content-Type', 'application/json');
            return;
        }
        
        const targetUser = users.find(u => u.username === targetUsername);
        if (!targetUser) {
            ctx.status = 404;
            ctx.body = JSON.stringify({ status: 'error', msg: '用户不存在' });
            ctx.set('Content-Type', 'application/json');
            return;
        }
        
        targetUser.isAdmin = isAdmin;
        saveUsers(users);
        
        ctx.body = JSON.stringify({
            status: 'success',
            msg: '用户角色更新成功'
        });
        ctx.set('Content-Type', 'application/json');
    } catch (error) {
        console.error('修改用户角色错误:', error);
        ctx.status = 500;
        ctx.body = JSON.stringify({ status: 'error', msg: '服务器内部错误' });
        ctx.set('Content-Type', 'application/json');
    }
}));

// 获取所有设备（管理员专用）
app.use(route.get('/api/admin/devices', function (ctx) {
    const username = ctx.query.username;
    try {
        const user = users.find(u => u.username === username);
        if (!user || !user.isAdmin) {
            ctx.status = 403;
            ctx.body = JSON.stringify({ status: 'error', msg: '权限不足' });
            ctx.set('Content-Type', 'application/json');
            return;
        }
        
        const deviceList = Array.from(devices.values()).map(device => ({
            deviceId: device.info.deviceId,
            username: device.username,
            deviceName: device.info.deviceName,
            osVersion: device.info.osVersion,
            lastActive: device.lastActive.toISOString()
        }));
        
        ctx.body = JSON.stringify({
            status: 'success',
            devices: deviceList
        });
        ctx.set('Content-Type', 'application/json');
    } catch (error) {
        console.error('获取设备列表错误:', error);
        ctx.status = 500;
        ctx.body = JSON.stringify({ status: 'error', msg: '服务器内部错误' });
        ctx.set('Content-Type', 'application/json');
    }
}));

// 获取所有脚本（管理员专用）
app.use(route.get('/api/admin/scripts', function (ctx) {
    const username = ctx.query.username;
    try {
        const user = users.find(u => u.username === username);
        if (!user || !user.isAdmin) {
            ctx.status = 403;
            ctx.body = JSON.stringify({ status: 'error', msg: '权限不足' });
            ctx.set('Content-Type', 'application/json');
            return;
        }
        
        ctx.body = JSON.stringify({
            status: 'success',
            scripts: scripts.map(s => ({
                id: s.id,
                name: s.name,
                category: s.category || '未分类',
                owner: s.owner || 'unknown',
                createTime: s.createTime,
                updateTime: s.updateTime
            }))
        });
        ctx.set('Content-Type', 'application/json');
    } catch (error) {
        console.error('获取脚本列表错误:', error);
        ctx.status = 500;
        ctx.body = JSON.stringify({ status: 'error', msg: '服务器内部错误' });
        ctx.set('Content-Type', 'application/json');
    }
}));

// 静态文件服务（放在路由之后，确保API请求不会被拦截）
app.use(serve(path.join(__dirname, '.')));

// ==================== 脚本管理API ====================

// 获取脚本列表（按用户隔离：默认脚本所有用户可见，用户自己的脚本只有自己可见）
app.use(route.get('/api/scripts', function (ctx) {
    console.log('获取脚本列表');
    const username = ctx.query.username;

    try {
        let userScripts = scripts;
        if (username) {
            userScripts = scripts.filter(s => !s.owner || s.owner === 'system' || s.owner === username);
        }
        ctx.body = JSON.stringify({
            status: 'success',
            scripts: userScripts.map(s => ({
                id: s.id,
                name: s.name,
                category: s.category || '未分类',
                createTime: s.createTime,
                updateTime: s.updateTime,
                owner: s.owner,
                isOwner: s.owner === username
            }))
        });
        ctx.set('Content-Type', 'application/json');
    } catch (error) {
        console.error('获取脚本列表错误:', error);
        ctx.status = 500;
        ctx.body = JSON.stringify({ status: 'error', msg: '服务器内部错误' });
        ctx.set('Content-Type', 'application/json');
    }
}))

// 获取单个脚本详情（包含代码）
app.use(route.get('/api/scripts/:id', function (ctx, id) {
    console.log('获取脚本详情, ID:', id);
    
    try {
        const script = scripts.find(s => s.id === parseInt(id));
        if (script) {
            ctx.body = JSON.stringify({
                status: 'success',
                script: script
            });
        } else {
            ctx.status = 404;
            ctx.body = JSON.stringify({ status: 'error', msg: '脚本不存在' });
        }
        ctx.set('Content-Type', 'application/json');
    } catch (error) {
        console.error('获取脚本详情错误:', error);
        ctx.status = 500;
        ctx.body = JSON.stringify({ status: 'error', msg: '服务器内部错误' });
        ctx.set('Content-Type', 'application/json');
    }
}))

// 添加脚本
app.use(route.post('/api/scripts', function (ctx) {
    console.log('添加脚本');
    
    try {
        const { name, code, category, username } = ctx.request.body;
        
        if (!name || !code) {
            ctx.status = 400;
            ctx.body = JSON.stringify({ status: 'error', msg: '脚本名称和代码不能为空' });
            ctx.set('Content-Type', 'application/json');
            return;
        }
        
        const newScript = {
            id: nextScriptId++,
            name: name,
            code: code,
            category: category || '未分类',
            owner: username || 'unknown',
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString()
        };
        
        scripts.push(newScript);
        saveScripts(scripts);
        
        ctx.body = JSON.stringify({
            status: 'success',
            msg: '脚本添加成功',
            script: newScript
        });
        ctx.set('Content-Type', 'application/json');
    } catch (error) {
        console.error('添加脚本错误:', error);
        ctx.status = 500;
        ctx.body = JSON.stringify({ status: 'error', msg: '服务器内部错误' });
        ctx.set('Content-Type', 'application/json');
    }
}))

// 更新脚本
app.use(route.put('/api/scripts/:id', function (ctx, id) {
    console.log('更新脚本, ID:', id);
    
    try {
        const scriptIndex = scripts.findIndex(s => s.id === parseInt(id));
        
        if (scriptIndex === -1) {
            ctx.status = 404;
            ctx.body = JSON.stringify({ status: 'error', msg: '脚本不存在' });
            ctx.set('Content-Type', 'application/json');
            return;
        }
        
        const { name, code, category, changeNote, username } = ctx.request.body;
        
        // 检查权限：只有脚本所有者或超级管理员可以编辑
        if (username) {
            const user = users.find(u => u.username === username);
            const isOwner = scripts[scriptIndex].owner === username;
            const isAdminUser = user && user.isAdmin;
            
            if (!isOwner && !isAdminUser) {
                ctx.status = 403;
                ctx.body = JSON.stringify({ status: 'error', msg: '权限不足，只有脚本所有者或超级管理员可以编辑此脚本' });
                ctx.set('Content-Type', 'application/json');
                return;
            }
        }
        
        // 保存历史版本
        // 先初始化history属性（如果不存在）
        if (!scripts[scriptIndex].history) {
            scripts[scriptIndex].history = [];
        }
        // 使用解构排除 history 属性，避免循环引用
        const { history, ...oldScript } = scripts[scriptIndex];
        // 只保留最近10个历史版本
        if (scripts[scriptIndex].history.length >= 10) {
            scripts[scriptIndex].history.pop();
        }
        scripts[scriptIndex].history.unshift({
            version: scripts[scriptIndex].history.length + 1,
            timestamp: new Date().toISOString(),
            changeNote: changeNote || '无备注',
            data: { ...oldScript }
        });
        
        // 更新脚本内容
        if (name) scripts[scriptIndex].name = name;
        if (code) scripts[scriptIndex].code = code;
        if (category) scripts[scriptIndex].category = category;
        scripts[scriptIndex].updateTime = new Date().toISOString();
        scripts[scriptIndex].version = (scripts[scriptIndex].version || 1) + 1;
        
        saveScripts(scripts);
        
        ctx.body = JSON.stringify({
            status: 'success',
            msg: '脚本更新成功',
            script: scripts[scriptIndex]
        });
        ctx.set('Content-Type', 'application/json');
    } catch (error) {
        console.error('更新脚本错误:', error);
        ctx.status = 500;
        ctx.body = JSON.stringify({ status: 'error', msg: '服务器内部错误' });
        ctx.set('Content-Type', 'application/json');
    }
}))

// 删除脚本
app.use(route.delete('/api/scripts/:id', function (ctx, id) {
    console.log('删除脚本, ID:', id);
    
    try {
        const scriptIndex = scripts.findIndex(s => s.id === parseInt(id));
        
        if (scriptIndex === -1) {
            ctx.status = 404;
            ctx.body = JSON.stringify({ status: 'error', msg: '脚本不存在' });
            ctx.set('Content-Type', 'application/json');
            return;
        }
        
        // 检查权限：只有脚本所有者或超级管理员可以删除
        const username = ctx.query.username;
        if (username) {
            const user = users.find(u => u.username === username);
            const isOwner = scripts[scriptIndex].owner === username;
            const isAdminUser = user && user.isAdmin;
            
            if (!isOwner && !isAdminUser) {
                ctx.status = 403;
                ctx.body = JSON.stringify({ status: 'error', msg: '权限不足，只有脚本所有者或超级管理员可以删除此脚本' });
                ctx.set('Content-Type', 'application/json');
                return;
            }
        }
        
        const deletedScript = scripts.splice(scriptIndex, 1)[0];
        saveScripts(scripts);
        
        ctx.body = JSON.stringify({
            status: 'success',
            msg: '脚本删除成功',
            script: deletedScript
        });
        ctx.set('Content-Type', 'application/json');
    } catch (error) {
        console.error('删除脚本错误:', error);
        ctx.status = 500;
        ctx.body = JSON.stringify({ status: 'error', msg: '服务器内部错误' });
        ctx.set('Content-Type', 'application/json');
    }
}))

// 执行脚本（发送到指定设备）
app.use(route.post('/api/scripts/execute', function (ctx) {
    console.log('执行脚本请求');
    
    try {
        const { scriptId, targetDevices, username } = ctx.request.body;
        
        if (!scriptId || !targetDevices || targetDevices.length === 0) {
            ctx.status = 400;
            ctx.body = JSON.stringify({ status: 'error', msg: '请选择脚本和目标设备' });
            ctx.set('Content-Type', 'application/json');
            return;
        }
        
        const script = scripts.find(s => s.id === parseInt(scriptId));
        if (!script) {
            ctx.status = 404;
            ctx.body = JSON.stringify({ status: 'error', msg: '脚本不存在' });
            ctx.set('Content-Type', 'application/json');
            return;
        }
        
        let sentCount = 0;
        targetDevices.forEach(deviceId => {
            const device = devices.get(deviceId);
            if (device && device.ws.readyState === 1) {
                // 发送脚本执行指令
                device.ws.send(JSON.stringify({
                    action: 'script',
                    code: script.code,
                    scriptName: script.name,
                    scriptId: script.id
                }));
                sentCount++;
                console.log(`脚本[${script.name}]已发送到设备[${deviceId}]`);
            }
        });
        
        ctx.body = JSON.stringify({
            status: 'success',
            msg: `脚本已发送到 ${sentCount} 个设备执行`,
            sentCount: sentCount
        });
        ctx.set('Content-Type', 'application/json');
    } catch (error) {
        console.error('执行脚本错误:', error);
        ctx.status = 500;
        ctx.body = JSON.stringify({ status: 'error', msg: '服务器内部错误' });
        ctx.set('Content-Type', 'application/json');
    }
}))

// ==================== 设备管理API ====================

// 获取设备列表API（返回持久化设备，包含在线状态）
app.use(route.get('/api/devices', function (ctx) {
    const username = ctx.query.username;
    console.log('获取设备列表请求，用户名:', username);
    
    try {
        // 获取该用户的所有持久化设备
        const userPersistedDevices = persistedDevices.filter(d => d.username === username);
        
        const deviceList = userPersistedDevices.map(pd => {
            // 检查设备是否在线
            const onlineDevice = devices.get(pd.deviceId);
            const isOnline = onlineDevice && onlineDevice.ws && onlineDevice.ws.readyState === 1;
            
            return {
                deviceId: pd.deviceId,
                info: {
                    username: pd.username,
                    deviceName: pd.deviceName,
                    osVersion: pd.osVersion,
                    status: isOnline ? 'online' : 'offline',
                    lastActive: isOnline ? onlineDevice.lastActive.toISOString() : pd.lastActive,
                    lastOnline: pd.lastOnline,
                    createTime: pd.createTime
                }
            };
        });
        
        ctx.body = JSON.stringify({
            status: 'success',
            devices: deviceList
        });
        ctx.set('Content-Type', 'application/json');
    } catch (error) {
        console.error('设备列表API错误:', error);
        ctx.status = 500;
        ctx.body = JSON.stringify({ status: 'error', msg: '服务器内部错误' });
        ctx.set('Content-Type', 'application/json');
    }
}))

// 任务下发API
app.use(route.post('/api/task', function (ctx) {
    try {
        const { username, targetDevices, task } = ctx.request.body;
        
        console.log('收到任务下发请求:', {
            username,
            targetDevices,
            taskType: task?.action
        });
        
        let sentCount = 0;
        if (targetDevices && targetDevices.length > 0) {
            // 统一指令格式：将keyCode转换为key，保持客户端兼容性
            const processedTask = { ...task };
            if (processedTask.action === 'keyCode') {
                processedTask.action = 'key';
            }
            
            targetDevices.forEach(deviceId => {
                const device = devices.get(deviceId);
                if (device && device.username === username && device.ws.readyState === 1) {
                    // getLayout需要包装在sendMessage中，因为手机端期望该格式
                    if (processedTask.action === 'getLayout') {
                        device.ws.send(JSON.stringify({ action: 'sendMessage', content: JSON.stringify(processedTask) }));
                    } else {
                        device.ws.send(JSON.stringify(processedTask));
                    }
                    sentCount++;
                    console.log(`任务已发送到设备[${deviceId}]，action: ${task.action} -> ${processedTask.action}`);
                }
            });
        }
        
        ctx.body = JSON.stringify({
            status: 'success',
            msg: `任务发送成功，已发送到 ${sentCount} 个设备`
        });
        ctx.set('Content-Type', 'application/json');
    } catch (error) {
        console.error('任务下发API错误:', error);
        ctx.status = 500;
        ctx.body = JSON.stringify({ status: 'error', msg: '服务器内部错误' });
        ctx.set('Content-Type', 'application/json');
    }
}))

// ==================== 心跳与僵尸连接检测 ====================

// 超过此时间未收到心跳，判定为死连接（毫秒）
const HEARTBEAT_TIMEOUT = 95000;

// 定时清理超时设备（遍历前先收集，避免修改Map时报错）
setInterval(() => {
    const now = Date.now();
    const toRemove = [];

    for (const [deviceId, device] of devices.entries()) {
        const ws = device.ws;
        // 检查 WebSocket 是否已关闭
        if (!ws || ws.readyState !== 1) {
            toRemove.push(deviceId);
            continue;
        }
        // 检查上次活跃时间，超时则终止连接
        const lastActive = device.lastActive ? new Date(device.lastActive).getTime() : 0;
        if (now - lastActive > HEARTBEAT_TIMEOUT) {
            console.log('设备心跳超时，强制移除:', deviceId, '最后活跃:', device.lastActive);
            try { ws.close(1001, 'heartbeat timeout'); } catch (e) {}
            toRemove.push(deviceId);
        }
    }

    toRemove.forEach(id => devices.delete(id));
    if (toRemove.length > 0 || devices.size > 0) {
        console.log('超时移除', toRemove.length, '个设备，当前在线:', devices.size);
    }
}, 30000);

// ==================== WebSocket连接处理 ====================

app.ws.use(function (ctx, next) {
    return next(ctx)
})

app.ws.use(route.all('/', function (ctx) {
    const ws = ctx.websocket;
    let deviceId = null;
    
    console.log('新的WebSocket连接');
    
    ws.on('message', function (message) {
        try {
            const msg = JSON.parse(message);

            // 处理登录请求（安卓设备）
            if (msg.action === 'login' && !msg.role) {
                deviceId = msg.deviceId;
                const username = msg.username;

                // 同一设备ID重复登录：先关闭旧连接
                if (devices.has(deviceId)) {
                    try {
                        const old = devices.get(deviceId);
                        console.log('设备重复登录，关闭旧连接:', deviceId);
                        old.ws.close(1000, 'replaced by new connection');
                    } catch (e) {}
                    devices.delete(deviceId);
                }

                devices.set(deviceId, {
                    ws,
                    info: msg,
                    username,
                    lastActive: new Date()
                });
                
                // 更新持久化设备列表
                const existingIndex = persistedDevices.findIndex(d => d.deviceId === deviceId);
                if (existingIndex >= 0) {
                    // 更新现有设备信息
                    persistedDevices[existingIndex] = {
                        ...persistedDevices[existingIndex],
                        deviceName: msg.deviceName || persistedDevices[existingIndex].deviceName,
                        osVersion: msg.osVersion || persistedDevices[existingIndex].osVersion,
                        lastOnline: new Date().toISOString(),
                        lastActive: new Date().toISOString()
                    };
                } else {
                    // 添加新设备
                    persistedDevices.push({
                        deviceId: deviceId,
                        username: username,
                        deviceName: msg.deviceName || '未命名设备',
                        osVersion: msg.osVersion || '未知',
                        createTime: new Date().toISOString(),
                        lastOnline: new Date().toISOString(),
                        lastActive: new Date().toISOString()
                    });
                }
                saveDevicesData(persistedDevices);
                console.log('设备已持久化:', deviceId);

                console.log('设备登录成功:', deviceId, '用户:', username, '设备名:', msg.deviceName);
                console.log('当前在线设备数:', devices.size);

                ws.send(JSON.stringify({
                    status: 'success',
                    action: 'login',
                    msg: '登录成功'
                }));
                return;
            }

            // 处理Web管理端登录
            if (msg.action === 'login' && msg.role === 'web') {
                const username = msg.username;
                webClients.set(username, ws);
                console.log('Web管理端登录:', username);
                ws.send(JSON.stringify({ action: 'webLoginAck', status: 'success' }));
                return;
            }

            // 屏幕帧转发：安卓设备 → Web管理端
            if (msg.action === 'screenFrame' && deviceId) {
                const username = devices.get(deviceId)?.username;
                if (username) {
                    const webWs = webClients.get(username);
                    if (webWs && webWs.readyState === 1) {
                        // 将设备ID附加到消息中，让Web端知道是哪台设备
                        msg.deviceId = deviceId;
                        webWs.send(JSON.stringify(msg));
                    }
                }
                return;
            }

            // 设备发送消息：安卓设备 → Web管理端（支持 sendMessage 和 deviceMessage 两种格式）
            if ((msg.action === 'deviceMessage' || msg.action === 'sendMessage') && deviceId) {
                const device = devices.get(deviceId);
                const deviceName = device?.info?.deviceName || deviceId;
                console.log(`设备[${deviceId}-${deviceName}]发送消息:`, msg.content);
                
                const username = device?.username;
                if (username) {
                    const webWs = webClients.get(username);
                    if (webWs && webWs.readyState === 1) {
                        webWs.send(JSON.stringify({
                            action: 'deviceMessage',
                            deviceId: deviceId,
                            deviceName: deviceName,
                            content: msg.content,
                            timestamp: new Date().toISOString()
                        }));
                    }
                }
                return;
            }

            // 设备发送图片：安卓设备 → Web管理端（支持 content 和 imageData 两种字段）
            if (msg.action === 'deviceImage') {
                console.log('收到设备图片消息:', 'deviceId:', deviceId, 'has content:', !!msg.content, 'has imageData:', !!msg.imageData);
                
                if (!deviceId) {
                    console.log('设备未登录，无法处理图片消息');
                    return;
                }
                
                if (!msg.content && !msg.imageData) {
                    console.log('图片消息没有内容');
                    return;
                }
                
                const device = devices.get(deviceId);
                const deviceName = device?.info?.deviceName || deviceId;
                const imageData = msg.content || msg.imageData;
                console.log(`设备[${deviceId}-${deviceName}]发送图片, 大小: ${imageData.length} bytes`);
                
                const username = device?.username;
                console.log('尝试转发给用户:', username);
                
                if (username) {
                    const webWs = webClients.get(username);
                    if (webWs && webWs.readyState === 1) {
                        webWs.send(JSON.stringify({
                            action: 'deviceImage',
                            deviceId: deviceId,
                            deviceName: deviceName,
                            imageData: imageData,
                            imageFormat: msg.imageFormat || 'jpg',
                            timestamp: new Date().toISOString()
                        }));
                        console.log('图片已转发给Web管理端');
                    } else {
                        console.log('Web管理端未连接或连接已断开');
                    }
                } else {
                    console.log('设备没有关联的用户名');
                }
                return;
            }

            // 设备发送日志文件内容：安卓设备 → Web管理端
            if (msg.action === 'logFileContent' && deviceId) {
                const device = devices.get(deviceId);
                const deviceName = device?.info?.deviceName || deviceId;
                console.log(`设备[${deviceId}-${deviceName}]发送日志文件内容, 长度: ${msg.content ? msg.content.length : 0}`);

                const username = device?.username;
                if (username) {
                    const webWs = webClients.get(username);
                    if (webWs && webWs.readyState === 1) {
                        webWs.send(JSON.stringify({
                            action: 'logFileContent',
                            deviceId: deviceId,
                            deviceName: deviceName,
                            content: msg.content,
                            timestamp: new Date().toISOString()
                        }));
                        console.log(`日志文件内容已转发给Web管理端(${username})`);
                    }
                }
                return;
            }

            // 设备发送日志：安卓设备 → Web管理端
            if ((msg.action === 'deviceLog' || msg.action === 'realtimeLog') && deviceId && msg.logs) {
                const device = devices.get(deviceId);
                const deviceName = device?.info?.deviceName || deviceId;
                console.log(`设备[${deviceId}-${deviceName}]发送日志(${msg.action}): ${msg.logs.length}条`);
                console.log(`  第一条日志: ${JSON.stringify(msg.logs[0])}`);
                
                const username = device?.username;
                console.log(`  设备用户名: ${username}, Web客户端在线: ${webClients.has(username)}`);
                if (username) {
                    const webWs = webClients.get(username);
                    console.log(`  Web连接状态: ${webWs ? webWs.readyState : '不存在'}`);
                    if (webWs && webWs.readyState === 1) {
                        webWs.send(JSON.stringify({
                            action: 'realtimeLog', // 统一使用 realtimeLog 转发给前端
                            deviceId: deviceId,
                            deviceName: deviceName,
                            logs: msg.logs,
                            timestamp: new Date().toISOString()
                        }));
                        console.log(`  ✓ 日志已转发给Web管理端(${username})`);
                    } else {
                        console.log(`  ✗ Web管理端未连接或连接已断开`);
                    }
                } else {
                    console.log(`  ✗ 设备没有关联的用户名`);
                }
                return;
            }

            // Web管理端发送消息到设备：Web管理端 → 安卓设备
            if (msg.action === 'sendToDevice' && msg.targetDevice && msg.content) {
                const device = devices.get(msg.targetDevice);
                if (device && device.ws.readyState === 1) {
                    const deviceName = device.info.deviceName || msg.targetDevice;
                    
                    try {
                        // 尝试解析content为JSON
                        const contentObj = JSON.parse(msg.content);
                        
                        // 检查是否是按键指令，如果是，直接发送
                        if (contentObj.action === 'keyCode') {
                            // 转换为客户端能识别的key格式
                            const keyMsg = {
                                action: 'key',
                                keyCode: contentObj.keyCode,
                                keyName: contentObj.keyName
                            };
                            device.ws.send(JSON.stringify(keyMsg));
                            console.log(`服务端发送按键指令到设备[${msg.targetDevice}-${deviceName}]: ${contentObj.keyName}(${contentObj.keyCode})`);
                        } else {
                            // 普通消息，保持原格式
                            device.ws.send(JSON.stringify({
                                action: 'sendMessage',
                                content: msg.content,
                                timestamp: new Date().toISOString()
                            }));
                            console.log(`服务端发送消息到设备[${msg.targetDevice}-${deviceName}]: ${msg.content}`);
                        }
                    } catch (e) {
                        // 如果不是JSON，作为普通文本发送
                        device.ws.send(JSON.stringify({
                            action: 'sendMessage',
                            content: msg.content,
                            timestamp: new Date().toISOString()
                        }));
                        console.log(`服务端发送文本消息到设备[${msg.targetDevice}-${deviceName}]: ${msg.content}`);
                    }
                    
                    // 发送确认给Web端
                    ws.send(JSON.stringify({
                        action: 'messageAck',
                        status: 'success',
                        deviceId: msg.targetDevice,
                        deviceName: deviceName,
                        msg: '消息已发送到设备'
                    }));
                } else {
                    ws.send(JSON.stringify({
                        action: 'messageAck',
                        status: 'error',
                        deviceId: msg.targetDevice,
                        msg: '设备不在线'
                    }));
                }
                return;
            }

            // Web管理端广播消息到多个设备：双向消息功能
            if (msg.action === 'broadcastMessage' && msg.targetDevices && msg.content) {
                const sentDevices = [];
                const failedDevices = [];
                
                msg.targetDevices.forEach(deviceId => {
                    const device = devices.get(deviceId);
                    if (device && device.ws.readyState === 1) {
                        const deviceName = device.info.deviceName || deviceId;
                        console.log(`服务端广播消息到设备[${deviceId}-${deviceName}]: ${msg.content}`);
                        // 使用 sendToDevice 格式，与群控投屏中的双向消息保持一致
                        device.ws.send(JSON.stringify({
                            action: 'sendToDevice',
                            targetDevice: deviceId,
                            task: {
                                action: 'broadcastMessage',
                                content: msg.content,
                                contentType: msg.contentType || 'text'
                            }
                        }));
                        sentDevices.push({ deviceId, deviceName });
                    } else {
                        failedDevices.push(deviceId);
                    }
                });
                
                // 发送确认给Web端
                ws.send(JSON.stringify({
                    action: 'messageAck',
                    status: failedDevices.length === 0 ? 'success' : 'partial',
                    sentCount: sentDevices.length,
                    failedCount: failedDevices.length,
                    sentDevices: sentDevices,
                    failedDevices: failedDevices,
                    msg: failedDevices.length === 0 ? '消息已发送到所有设备' : `消息已发送到 ${sentDevices.length} 个设备，${failedDevices.length} 个设备不在线`
                }));
                return;
            }

            // 远程控制指令：Web管理端 → 安卓设备 (action: remote, type: xxx)
            if (msg.action === 'remote' && msg.targetDevice) {
                const device = devices.get(msg.targetDevice);
                if (device && device.ws.readyState === 1) {
                    const forwardMsg = { ...msg };
                    delete forwardMsg.targetDevice;
                    device.ws.send(JSON.stringify(forwardMsg));
                    console.log('远程指令已转发到设备:', msg.targetDevice, 'type:', msg.type);
                } else {
                    ws.send(JSON.stringify({ action: 'remoteAck', type: msg.type, status: 'error', msg: '设备不在线' }));
                }
                return;
            }

            // 直接指令转发：tap / swipe / key / keyCode / getDeviceInfo / volume / getLayout（Web管理端 → 安卓设备）
            if ((msg.action === 'tap' || msg.action === 'swipe' || msg.action === 'key' || msg.action === 'keyCode' || msg.action === 'getDeviceInfo' || msg.action === 'volume' || msg.action === 'getLayout') && msg.targetDevice) {
                const device = devices.get(msg.targetDevice);
                if (device && device.ws.readyState === 1) {
                    const forwardMsg = { ...msg };
                    delete forwardMsg.targetDevice;
                    
                    // 统一指令格式：将keyCode转换为key，保持客户端兼容性
                    if (forwardMsg.action === 'keyCode') {
                        forwardMsg.action = 'key';
                    }
                    
                    // getLayout需要包装在sendMessage中，因为手机端期望该格式
                    if (forwardMsg.action === 'getLayout') {
                        device.ws.send(JSON.stringify({ action: 'sendMessage', content: JSON.stringify(forwardMsg) }));
                    } else {
                        device.ws.send(JSON.stringify(forwardMsg));
                    }
                    console.log('指令转发到设备:', msg.targetDevice, 'action:', msg.action);
                } else {
                    ws.send(JSON.stringify({ action: 'actionAck', action: msg.action, status: 'error', msg: '设备不在线' }));
                }
                return;
            }

            // 布局数据转发：设备 → Web管理端
            if (msg.action === 'layoutData' && deviceId) {
                const device = devices.get(deviceId);
                const deviceName = device?.info?.deviceName || deviceId;
                console.log(`设备[${deviceId}-${deviceName}]发送布局数据`);
                
                const username = device?.username;
                if (username) {
                    const webWs = webClients.get(username);
                    if (webWs && webWs.readyState === 1) {
                        webWs.send(JSON.stringify({
                            action: 'layoutData',
                            deviceId: deviceId,
                            deviceName: deviceName,
                            layout: msg.layout,
                            timestamp: new Date().toISOString()
                        }));
                        console.log(`布局数据已转发给Web管理端(${username})`);
                    }
                }
                return;
            }

            // 脚本执行结果反馈
            if (msg.action === 'scriptResult' && deviceId) {
                console.log(`设备[${deviceId}]脚本执行结果:`, msg.status);
                // 转发结果到Web端
                const username = devices.get(deviceId)?.username;
                if (username) {
                    const webWs = webClients.get(username);
                    if (webWs && webWs.readyState === 1) {
                        msg.deviceId = deviceId;
                        webWs.send(JSON.stringify(msg));
                    }
                }
                return;
            }

            // 心跳/保持在线
            if (msg.action === 'heartbeat' && deviceId) {
                const device = devices.get(deviceId);
                if (device) {
                    device.lastActive = new Date();
                    // 必须回复心跳响应，否则客户端会超时断开
                    try {
                        ws.send(JSON.stringify({ action: 'heartbeat', status: 'ok' }));
                    } catch (e) {
                        console.log('发送心跳响应失败:', e.message);
                    }
                }
                return;
            }

            // 通用设备响应转发：将设备的响应消息转发给Web管理端
            // 例如：getDeviceInfo的响应 { status: 'done', data: {...} }、remoteAck等
            if (deviceId && msg.status === 'done' && msg.data) {
                const username = devices.get(deviceId)?.username;
                if (username) {
                    const webWs = webClients.get(username);
                    if (webWs && webWs.readyState === 1) {
                        // 确保有action字段，方便Web端识别
                        if (!msg.action) {
                            msg.action = 'deviceInfo';
                        }
                        webWs.send(JSON.stringify(msg));
                        console.log('设备响应(deviceInfo)已转发到Web端');
                        return;
                    }
                }
            }
            // 转发 remoteAck 到 Web 端
            if (deviceId && msg.action === 'remoteAck') {
                const username = devices.get(deviceId)?.username;
                if (username) {
                    const webWs = webClients.get(username);
                    if (webWs && webWs.readyState === 1) {
                        webWs.send(JSON.stringify(msg));
                        console.log('设备响应(remoteAck)已转发到Web端');
                        return;
                    }
                }
            }

            console.log('收到设备消息:', msg);

        } catch (e) {
            console.log('解析JSON失败:', e.message);
        }
    })
    
    ws.on('close', function () {
        console.log('WebSocket连接关闭，设备ID:', deviceId);
        if (deviceId && devices.has(deviceId)) {
            devices.delete(deviceId);
            console.log('当前在线设备数:', devices.size);
        }
        // Web管理端断开
        for (const [username, webWs] of webClients.entries()) {
            if (webWs === ws) {
                webClients.delete(username);
                console.log('Web管理端断开:', username);
                break;
            }
        }
    })
    
    ws.on('error', function (err) {
        console.error('WebSocket连接错误:', err);
        if (deviceId && devices.has(deviceId)) {
            devices.delete(deviceId);
        }
    })
}))

// 启动服务
const LOCAL_IP = getLocalIP();
app.listen(PORT, HOST, () => {
    console.log(`服务器已启动，监听端口 ${PORT}`);
    console.log(`前端页面地址: http://${LOCAL_IP}:${PORT}`);
    console.log(`WebSocket地址: ws://${LOCAL_IP}:${PORT}`);
    console.log(`脚本存储目录: ${SCRIPTS_DIR}`);
});