"ui";

// ==================== 后台保活机制 ====================
let wakeLock = null;
let wifiLock = null;
let alarmManager = null;
let wakeupReceiver = null;

function initKeepAlive() {
    try {
        importClass(android.os.PowerManager);
        importClass(android.net.wifi.WifiManager);
        importClass(android.app.AlarmManager);
        importClass(android.app.PendingIntent);
        importClass(android.content.Intent);
        importClass(android.content.BroadcastReceiver);
        importClass(android.content.IntentFilter);
        
        // CPU 唤醒锁 - 保持 CPU 运行
        let pm = context.getSystemService(context.POWER_SERVICE);
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE, "autojs:keepalive");
        acquireWakeLock();
        
        // WiFi 唤醒锁 - 保持 WiFi 连接
        let wm = context.getSystemService(context.WIFI_SERVICE);
        wifiLock = wm.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "autojs:wifi");
        acquireWifiLock();
        
        // 定时唤醒 - 防止系统深度睡眠
        alarmManager = context.getSystemService(context.ALARM_SERVICE);
        setupWakeupAlarm();
        
        // 监听屏幕状态
        monitorScreenState();
        
        log("后台保活机制已初始化");
    } catch (e) {
        log("初始化保活机制失败: " + e.message);
    }
}

function acquireWakeLock() {
    try {
        if (wakeLock && !wakeLock.isHeld()) {
            wakeLock.acquire();
            log("CPU 唤醒锁已获取");
        }
    } catch (e) {
        log("获取 CPU 唤醒锁失败: " + e.message);
    }
}

function acquireWifiLock() {
    try {
        if (wifiLock && !wifiLock.isHeld()) {
            wifiLock.acquire();
            log("WiFi 唤醒锁已获取");
        }
    } catch (e) {
        log("获取 WiFi 唤醒锁失败: " + e.message);
    }
}

function releaseLocks() {
    try {
        if (wakeLock && wakeLock.isHeld()) {
            wakeLock.release();
            log("CPU 唤醒锁已释放");
        }
        if (wifiLock && wifiLock.isHeld()) {
            wifiLock.release();
            log("WiFi 唤醒锁已释放");
        }
    } catch (e) {
        log("释放锁失败: " + e.message);
    }
}

function setupWakeupAlarm() {
    try {
        let intent = new Intent("autojs.wakeup.action");
        wakeupReceiver = new BroadcastReceiver({
            onReceive: function(context, intent) {
                log("定时唤醒触发");
                acquireWakeLock();
                acquireWifiLock();
                // 发送心跳保持连接
                if (ws && isConnected) {
                    try {
                        ws.send(JSON.stringify({ action: 'heartbeat' }));
                    } catch (e) {
                        log("定时心跳失败: " + e.message);
                    }
                }
            }
        });
        
        context.registerReceiver(wakeupReceiver, new IntentFilter("autojs.wakeup.action"));
        
        // 每3分钟唤醒一次
        let pendingIntent = PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        alarmManager.setRepeating(AlarmManager.RTC_WAKEUP, Date.now() + 60000, 3 * 60 * 1000, pendingIntent);
        log("定时唤醒闹钟已设置 (每3分钟)");
    } catch (e) {
        log("设置定时唤醒失败: " + e.message);
    }
}

function monitorScreenState() {
    try {
        let receiver = new BroadcastReceiver({
            onReceive: function(context, intent) {
                let action = intent.getAction();
                if (action === "android.intent.action.SCREEN_OFF") {
                    log("屏幕关闭，加强保活...");
                    acquireWakeLock();
                    acquireWifiLock();
                } else if (action === "android.intent.action.SCREEN_ON") {
                    log("屏幕开启");
                }
            }
        });
        
        let filter = new IntentFilter();
        filter.addAction("android.intent.action.SCREEN_OFF");
        filter.addAction("android.intent.action.SCREEN_ON");
        context.registerReceiver(receiver, filter);
        log("屏幕状态监听器已注册");
        
        events.on("exit", function() {
            try {
                context.unregisterReceiver(receiver);
                releaseLocks();
                if (wakeupReceiver) {
                    context.unregisterReceiver(wakeupReceiver);
                }
            } catch (e) {}
        });
    } catch (e) {
        log("注册屏幕监听器失败: " + e.message);
    }
}

// 初始化保活机制
initKeepAlive();

var configStorage = storages.create("yunkong_config");

function loadConfig() {
    return {
        serverAddress: configStorage.get("serverAddress", "ws://39.101.76.111:3006"),
        username: configStorage.get("username", "15077352220"),
        deviceId: configStorage.get("deviceId", "123456")
    };
}

function saveConfig(serverAddr, username, deviceId) {
    configStorage.put("serverAddress", serverAddr);
    configStorage.put("username", username);
    configStorage.put("deviceId", deviceId);
    log("配置已保存");
}

let savedConfig = loadConfig();
let hasScreenCapturePermission = false;

function requestScreenCaptureAuto() {
    try {
        sleep(200);
        let _req_result = false;
        let autoThread = threads.start(function () {
            for (let i = 0; i < 20; i++) {
                let rememberNode = id('com.android.systemui:id/remember').findOnce();
                if (rememberNode) {
                    click(rememberNode.bounds().left + 20, rememberNode.bounds().centerY());
                    sleep(1000);
                }
                if (click('立即开始') || click('START NOW') || click('允许')) {
                    return true;
                }
                sleep(1000);
            }
            return false;
        });
        
        let _thread_monitor = threads.start(function () {
            let _check_time = 2000;
            let _check_interval = 500;
            while (!_req_result && _check_time >= 0) {
                sleep(_check_interval);
                _check_time -= _check_interval;
            }
            autoThread.interrupt();
        });
        
        sleep(100);
        _req_result = images.requestScreenCapture();
        sleep(300);
        _thread_monitor.join(2400);
        _thread_monitor.interrupt();
        
        log("截图权限申请结果: " + _req_result);
        return _req_result;
    } catch (error) {
        log('[ERROR]requestScreenCaptureAuto', error.message);
        return false;
    }
}

let remoteScriptRunning = false;
let remoteScriptPath = null;
let screenShareRunning = false;
let screenShareThread = null;

function stopRemoteScript() {
    try {
        let currentEngine = engines.myEngine();
        let currentId = currentEngine.id;
        let scripts = engines.all();
        let stoppedCount = 0;
        for (let i = 0; i < scripts.length; i++) {
            let s = scripts[i];
            let scriptId = s.id;
            let scriptSource = String(s.source || '');
            if (scriptId === currentId) continue;
            if (scriptSource.indexOf("远程脚本") !== -1) {
                try { s.stop(); stoppedCount++; continue; } catch (e1) {}
                try { s.forceStop && s.forceStop(); stoppedCount++; continue; } catch (e2) {}
                try { s.interrupt && s.interrupt(); stoppedCount++; continue; } catch (e3) {}
            }
        }
        if (stoppedCount > 0) {
            remoteScriptRunning = false;
            remoteScriptPath = null;
        }
    } catch (e) {}
}

// ==================== UI 布局 ====================
ui.layout(
    <vertical padding="16">
        <text text="云控服务配置" textSize="20sp" textColor="#FF333333" marginBottom="12"/>
        
        <text text="接口地址:" textSize="14sp" textColor="#FF666666"/>
        <input id="serverAddress" hint="ws://39.101.76.111:3006" marginBottom="6"/>
        
        <text text="用户名:" textSize="14sp" textColor="#FF666666"/>
        <input id="username" hint="用户名" marginBottom="6"/>
        
        <text text="设备ID:" textSize="14sp" textColor="#FF666666"/>
        <input id="deviceId" hint="设备ID" marginBottom="10"/>
        
        <horizontal gravity="center_vertical" marginBottom="10">
            <card w="*" h="55" margin="4" cardCornerRadius="4dp" foreground="?selectableItemBackground" layout_weight="1">
                <horizontal gravity="center_vertical">
                    <vertical padding="8 6" w="0" layout_weight="1">
                        <text text="无障碍服务" textColor="#FF222222" textSize="14sp"/>
                    </vertical>
                    <checkbox id="autoService" marginRight="8" checked="{{auto.service != null}}"/>
                </horizontal>
            </card>
            <card w="*" h="55" margin="4" cardCornerRadius="4dp" foreground="?selectableItemBackground" layout_weight="1">
                <horizontal gravity="center_vertical">
                    <vertical padding="8 6" w="0" layout_weight="1">
                        <text text="悬浮窗权限" textColor="#FF222222" textSize="14sp"/>
                    </vertical>
                    <checkbox id="consoleshow" marginRight="8" checked="{{floaty.checkPermission()}}"/>
                </horizontal>
            </card>
        </horizontal>
        
        <button id="connectBtn" text="连接服务器" style="Widget.AppCompat.Button.Colored" marginTop="6"/>
        <horizontal marginTop="6">
            <button id="saveBtn" text="保存配置" layout_weight="1" marginRight="4"/>
            <button id="dkklog" text="查看日志" layout_weight="1" marginLeft="4"/>
        </horizontal>
        
        <text id="statusText" text="未连接" textSize="16sp" textColor="#FFFF6600" marginTop="8"/>
        <text id="logText" text="" textSize="11sp" textColor="#FF999999" marginTop="4" maxLines="6" height="100"/>
        
        <card w="*" marginTop="12" cardCornerRadius="8dp" cardElevation="2dp" padding="12">
            <vertical>
                <text text="📤 发送消息到服务器" textSize="15sp" textColor="#FF333333" marginBottom="8"/>
                
                <horizontal marginBottom="6">
                    <input id="sendMsgInput" hint="输入要发送的文字消息..." layout_weight="1" marginRight="6" h="40"/>
                    <button id="sendTextBtn" text="发送" w="60" h="40" style="Widget.AppCompat.Button.Colored"/>
                </horizontal>
                
                <horizontal>
                    <button id="sendScreenshotBtn" text="📷 发送截图" layout_weight="1" marginRight="4" style="Widget.AppCompat.Button.Colored"/>
                    <button id="sendPicBtn" text="🖼️ 发送图片" layout_weight="1" marginLeft="4" style="Widget.AppCompat.Button.Colored"/>
                </horizontal>
            </vertical>
        </card>
    </vertical>
);

// ==================== 初始化UI值 ====================
ui.run(function() {
    ui.serverAddress.setText(savedConfig.serverAddress);
    ui.username.setText(savedConfig.username);
    ui.deviceId.setText(savedConfig.deviceId);
});

// ui.autoService.on("check", function(checked) {
//     if (checked && auto.service == null) {
//         app.startActivity({ action: "android.settings.ACCESSIBILITY_SETTINGS" });
//     }
//     if (!checked && auto.service != null) {
//         auto.service.disableSelf();
//     }
// });

// ui.consoleshow.on("check", function(checked) {
//     try {
//         app.startActivity({ action: "android.settings.action.MANAGE_OVERLAY_PERMISSION" });
//     } catch (error) {
//         toast('请手动开启悬浮窗权限');
//     }
// });

// ui.emitter.on("resume", function() {
//     ui.autoService.checked = auto.service != null;
//     ui.consoleshow.checked = floaty.checkPermission();
// });

// ==================== 状态和日志 ====================
function updateStatus(text, color) {
    ui.run(() => {
        ui.statusText.setText(text);
        ui.statusText.setTextColor(android.graphics.Color.parseColor(color || "#FF6600"));
    });
}

function appendLog(msg) {
    ui.run(() => {
        let old = ui.logText.getText();
        let lines = old.split("\n").filter(l => l.trim() !== "");
        if (lines.length > 5) lines = lines.slice(lines.length - 5);
        lines.push(msg);
        ui.logText.setText(lines.join("\n"));
    });
    log(msg);
}

// ==================== 主动发送功能 ====================

function sendTextMessage() {
    if (!ws || !isConnected) {
        toast("请先连接服务器");
        return;
    }
    let text = ui.sendMsgInput.getText().toString().trim();
    if (!text) {
        toast("请输入消息内容");
        return;
    }
    try {
        ws.send(JSON.stringify({
            action: 'sendMessage',
            content: text,
            deviceId: currentDeviceId,
            timestamp: Date.now()
        }));
        appendLog("已发送消息: " + text);
        toast("消息已发送");
        ui.run(() => ui.sendMsgInput.setText(""));
    } catch (e) {
        appendLog("发送失败: " + e.message);
        toast("发送失败: " + e.message);
    }
}

function sendScreenshot() {
    if (!ws || !isConnected) {
        toast("请先连接服务器");
        return;
    }
    if (!hasScreenCapturePermission) {
        toast("请先获取截图权限（连接时会自动申请）");
        return;
    }
    threads.start(function() {
        try {
            appendLog("正在截图...");
            let img = captureScreen();
            if (!img) {
                appendLog("截图获取失败");
                ui.run(() => toast("截图获取失败"));
                return;
            }
            let scaledImg = images.scale(img, 0.5, 0.5);
            let imgBase64 = images.toBase64(scaledImg);
            let msg = JSON.stringify({
                action: 'deviceImage',
                type: 'img',
                content: 'data:image/png;base64,' + imgBase64,
                deviceId: currentDeviceId,
                timestamp: Date.now()
            });
            ws.send(msg);
            // 释放图片内存
            img.recycle();
            scaledImg.recycle();
            appendLog("截图已发送到服务器");
            ui.run(() => toast("截图已发送"));
        } catch (e) {
            appendLog("截图发送失败: " + e.message);
            ui.run(() => toast("截图失败: " + e.message));
        }
    });
}

function sendPictureFromGallery() {
    if (!ws || !isConnected) {
        toast("请先连接服务器");
        return;
    }
    
    threads.start(function() {
        let picDirs = [
            "/sdcard/DCIM/Camera/",
            "/sdcard/DCIM/Screenshots/",
            "/sdcard/Pictures/",
            "/sdcard/Download/",
            "/sdcard/云控图片/"
        ];
        
        let allImages = [];
        picDirs.forEach(function(dir) {
            if (files.exists(dir)) {
                let list = files.listDir(dir);
                list.forEach(function(f) {
                    let fullPath = files.join(dir, f);
                    if (!files.isDir(fullPath)) {
                        let ext = f.toLowerCase();
                        if (ext.endsWith('.png') || ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.webp')) {
                            allImages.push({
                                name: f,
                                path: fullPath,
                                dir: dir
                            });
                        }
                    }
                });
            }
        });
        
        if (allImages.length === 0) {
            ui.run(function() {
                toast("未找到图片文件，请确认目录中有图片");
            });
            return;
        }
        
        allImages.sort(function(a, b) { return a.name.localeCompare(b.name); });
        if (allImages.length > 50) {
            allImages = allImages.slice(0, 50);
        }
        
        let items = allImages.map(function(img, index) {
            return (index + 1) + ". " + img.name + " [" + img.dir.replace("/sdcard/", "") + "]";
        });
        
        ui.run(function() {
            let selectedIndex = dialogs.select("选择要发送的图片 (共" + allImages.length + "张)", items);
            if (selectedIndex >= 0) {
                sendPictureFile(allImages[selectedIndex].path);
            }
        });
    });
}

function sendPictureFile(filePath) {
    if (!filePath) return;
    let img = null;
    let scaledImg = null;
    try {
        if (!files.exists(filePath)) {
            appendLog("文件不存在: " + filePath);
            ui.run(() => toast("文件不存在"));
            return;
        }
        img = images.read(filePath);
        if (!img) {
            appendLog("无法读取图片: " + filePath);
            ui.run(() => toast("无法读取图片"));
            return;
        }
        let maxSize = 800;
        let w = img.getWidth();
        let h = img.getHeight();
        let scale = 1;
        if (w > maxSize || h > maxSize) {
            scale = maxSize / Math.max(w, h);
        }
        if (scale < 1) {
            scaledImg = images.scale(img, scale, scale);
        }
        let finalImg = scaledImg || img;
        let imgBase64 = images.toBase64(finalImg, "png", 70);
        let msg = JSON.stringify({
            action: 'deviceImage',
            type: 'img',
            content: 'data:image/png;base64,' + imgBase64,
            deviceId: currentDeviceId,
            timestamp: Date.now()
        });
        ws.send(msg);
        appendLog("图片已发送: " + filePath);
        ui.run(() => toast("图片已发送"));
    } catch (e) {
        appendLog("发送图片失败: " + e.message);
        ui.run(() => toast("发送失败: " + e.message));
    } finally {
        // 释放图片内存
        if (img) {
            try { img.recycle(); } catch (e) {}
        }
        if (scaledImg) {
            try { scaledImg.recycle(); } catch (e) {}
        }
    }
}

// ==================== UI按钮事件 ====================

ui.sendTextBtn.on("click", () => {
    sendTextMessage();
});

ui.sendScreenshotBtn.on("click", () => {
    sendScreenshot();
});

ui.sendPicBtn.on("click", () => {
    sendPictureFromGallery();
});

ui.sendMsgInput.on("key_enter", () => {
    sendTextMessage();
});

// ==================== WebSocket 相关 ====================
let ws = null;
let isConnected = false;
let shouldReconnect = true;
let reconnectDelay = 5;
let heartbeatInterval = null;
let heartbeatTimeout = null;
let currentServerAddr = "";
let currentUsername = "";
let currentDeviceId = "";
let isReconnecting = false;
let connectionThread = null;

function startHeartbeat(w) {
    stopHeartbeat();
    // 缩短心跳间隔到10秒，更及时检测连接状态
    heartbeatInterval = setInterval(() => {
        try {
            w.send(JSON.stringify({ action: 'heartbeat' }));
            // 发送心跳后启动超时检测
            if (heartbeatTimeout) clearTimeout(heartbeatTimeout);
            heartbeatTimeout = setTimeout(() => {
                // 心跳超时，主动断开重连
                if (isConnected) {
                    appendLog("心跳超时，连接可能已断开");
                    cleanupConnection();
                    if (shouldReconnect && !isReconnecting) {
                        isReconnecting = true;
                        scheduleReconnect();
                        setTimeout(() => { isReconnecting = false; }, 2000);
                    }
                }
            }, 5000); // 5秒未收到响应则认为超时
        } catch (e) {
            stopHeartbeat();
            if (shouldReconnect && !isReconnecting) {
                isReconnecting = true;
                appendLog("心跳发送失败，准备重连: " + e.message);
                cleanupConnection();
                scheduleReconnect();
                setTimeout(() => { isReconnecting = false; }, 2000);
            }
        }
    }, 10000); // 每10秒发送一次心跳
}

function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
    if (heartbeatTimeout) {
        clearTimeout(heartbeatTimeout);
        heartbeatTimeout = null;
    }
}

function cleanupConnection() {
    stopHeartbeat();
    stopScreenShare();
    if (ws) {
        try { ws.close(1000, "cleanup"); } catch (e) {}
        ws = null;
    }
    isConnected = false;
}

function scheduleReconnect() {
    if (!shouldReconnect) return;
    let delay = reconnectDelay * 1000;
    appendLog("将在 " + reconnectDelay + " 秒后重连");
    threads.start(function () {
        sleep(delay);
        if (!shouldReconnect) return;
        cleanupConnection();
        connectToServer(currentServerAddr, currentUsername, currentDeviceId);
    });
}

function connectToServer(serverAddr, username, deviceId) {
    currentServerAddr = serverAddr;
    currentUsername = username;
    currentDeviceId = deviceId;
    
    if (ws && isConnected) {
        appendLog("已连接，无需重复操作");
        return;
    }
    
    if (ws) {
        try { ws.close(1000, "reconnect"); } catch (e) {}
        ws = null;
    }
    
    if (!hasScreenCapturePermission) {
        updateStatus("正在申请截图权限...", "#2196F3");
        let capResult = requestScreenCaptureAuto();
        if (!capResult) {
            updateStatus("截图权限申请失败", "#F44336");
            appendLog("截图权限未获取，将无法使用截图功能");
        } else {
            hasScreenCapturePermission = true;
            appendLog("截图权限已获取");
        }
    }
    
    updateStatus("正在连接...", "#2196F3");
    appendLog("连接中...");
    
    try {
        ws = web.newWebSocket(serverAddr);
        
        ws.on("open", (res, w) => {
            isConnected = true;
            reconnectDelay = 5;
            updateStatus("已连接", "#4CAF50");
            appendLog("WebSocket 连接成功");
            startHeartbeat(w);
            
            let loginMsg = JSON.stringify({
                action: 'login',
                username: username,
                deviceId: deviceId,
                deviceName: device.model,
                osVersion: device.release
            });
            w.send(loginMsg);
            appendLog("已发送登录信息");
            
            ui.run(() => ui.connectBtn.setText("断开连接"));
        }).on("failure", (err, res, w) => {
            isConnected = false;
            updateStatus("连接失败", "#F44336");
            appendLog("连接失败: " + err);
            cleanupConnection();
            reconnectDelay = Math.min(reconnectDelay + 5, 60);
            scheduleReconnect();
        }).on("closing", (code, reason, w) => {
            appendLog("连接关闭中...");
        }).on("text", (text, w) => {
            handleServerMessage(text, w);
        }).on("binary", (bytes, w) => {
            appendLog("收到二进制, 大小: " + bytes.size());
        }).on("closed", (code, reason, w) => {
            isConnected = false;
            updateStatus("已断开", "#FF9800");
            appendLog("连接已关闭");
            cleanupConnection();
            if (shouldReconnect && !isReconnecting) {
                isReconnecting = true;
                reconnectDelay = Math.min(reconnectDelay + 5, 60);
                scheduleReconnect();
                setTimeout(() => { isReconnecting = false; }, 2000);
            }
        });
    } catch (e) {
        isConnected = false;
        updateStatus("创建连接异常", "#F44336");
        appendLog("错误: " + e.message);
        cleanupConnection();
        reconnectDelay = Math.min(reconnectDelay + 5, 60);
        scheduleReconnect();
    }
}

function disconnectServer() {
    shouldReconnect = false;
    reconnectDelay = 5;
    cleanupConnection();
    updateStatus("未连接", "#FF6600");
    appendLog("已主动断开连接");
    ui.run(() => ui.connectBtn.setText("连接服务器"));
}

// ==================== 消息处理 ====================
function handleServerMessage(text, w) {
    try {
        let msg = JSON.parse(text);
        
        // 心跳响应 - 收到响应后清除超时定时器
        if (msg.action === 'heartbeat') {
            if (heartbeatTimeout) {
                clearTimeout(heartbeatTimeout);
                heartbeatTimeout = null;
            }
            return;
        }
        
        // 调试日志 - 记录所有收到的指令
        log("收到WebSocket消息 action=" + msg.action + " content=" + (msg.content ? msg.content.substring(0, 100) : 'null'));
        
        switch (msg.action) {
            case 'login':
                if (msg.status === 'success') {
                    toast('登录成功');
                    appendLog("✓ 登录成功");
                } else {
                    toast('登录失败: ' + (msg.msg || ''));
                    appendLog("✗ 登录失败");
                }
                break;
                
            case 'sendMessage':
                let content = msg.content || msg.msg || '';
                appendLog("收到消息: " + content);
                // 尝试解析 JSON 并执行相应指令
                try {
                    let innerMsg = JSON.parse(content);
                    log("解析指令: " + innerMsg.action);
                    switch (innerMsg.action) {
                        case 'tap':
                            click(innerMsg.x, innerMsg.y);
                            log("点击: (" + innerMsg.x + "," + innerMsg.y + ")");
                            break;
                        case 'swipe':
                            let sw = device.width;
                            let sh = device.height;
                            log("AutoJS device: " + sw + "x" + sh + " | 滑动: (" + innerMsg.x1 + "," + innerMsg.y1 + ") -> (" + innerMsg.x2 + "," + innerMsg.y2 + ")");
                            swipe(innerMsg.x1, innerMsg.y1, innerMsg.x2, innerMsg.y2, innerMsg.duration || 500);
                            log("滑动执行完成");
                            break;
                        case 'key':
                            handleKeyCode(innerMsg.keyCode);
                            break;
                        case 'keyCode':
                            handleKeyCode(innerMsg.keyCode);
                            break;
                        default:
                            log("未知内层指令: " + innerMsg.action);
                    }
                } catch (e) {
                    log("解析指令失败: " + e.message);
                }
                break;
                
            case 'showImage':
                try {
                    let imgBase64 = msg.content || '';
                    appendLog("收到图片，正在显示...");
                    let imgDir = files.join(files.getSdcardPath(), "云控图片");
                    if (!files.exists(imgDir)) files.createDir(imgDir);
                    let imgPath = files.join(imgDir, "img_" + Date.now() + ".png");
                    let pureBase64 = imgBase64;
                    if (imgBase64.indexOf("base64,") !== -1) {
                        pureBase64 = imgBase64.split("base64,")[1];
                    }
                    let imgData = images.fromBase64(pureBase64);
                    if (imgData) {
                        images.save(imgData, imgPath);
                        appendLog("图片已保存");
                        app.viewFile(imgPath);
                        toast("收到图片");
                        w.send(JSON.stringify({ status: 'done', msg: '图片已显示', deviceId: currentDeviceId }));
                    }
                } catch (e) {
                    appendLog("显示图片失败: " + e.message);
                }
                break;
                
            case 'script':
                appendLog("执行远程脚本");
                if (remoteScriptRunning) stopRemoteScript();
                try {
                    engines.execScript("远程脚本", msg.code);
                    remoteScriptRunning = true;
                    appendLog("脚本已启动");
                    w.send(JSON.stringify({ status: 'done', msg: '脚本启动成功', deviceId: currentDeviceId }));
                } catch (e) {
                    appendLog("启动失败: " + e.message);
                    w.send(JSON.stringify({ status: 'error', msg: e.message, deviceId: currentDeviceId }));
                }
                break;
                
            case 'stopScript':
                appendLog("停止脚本");
                if (remoteScriptRunning) {
                    stopRemoteScript();
                    remoteScriptRunning = false;
                }
                w.send(JSON.stringify({ status: 'done', msg: '脚本已终止', deviceId: currentDeviceId }));
                break;
                
            case 'uploadScript':
                appendLog("上传脚本: " + (msg.fileName || ''));
                if (remoteScriptRunning) stopRemoteScript();
                try {
                    let scriptDir = files.join(files.getSdcardPath(), "脚本");
                    if (!files.exists(scriptDir)) files.createDir(scriptDir);
                    let filePath = files.join(scriptDir, msg.fileName);
                    files.write(filePath, msg.content);
                    remoteScriptPath = filePath;
                    engines.execScriptFile(filePath);
                    remoteScriptRunning = true;
                    appendLog("已保存并执行");
                    w.send(JSON.stringify({ status: 'done', msg: '上传并执行成功', deviceId: currentDeviceId }));
                } catch (e) {
                    appendLog("失败: " + e.message);
                    w.send(JSON.stringify({ status: 'error', msg: e.message, deviceId: currentDeviceId }));
                }
                break;
                
            case 'runScriptFile':
                appendLog("运行脚本: " + (msg.filePath || ''));
                if (remoteScriptRunning) stopRemoteScript();
                try {
                    let absolutePath = msg.filePath;
                    if (absolutePath.startsWith("脚本")) {
                        absolutePath = files.join(files.getSdcardPath(), absolutePath);
                    }
                    if (!files.exists(absolutePath)) {
                        w.send(JSON.stringify({ status: 'error', msg: '文件不存在', deviceId: currentDeviceId }));
                        break;
                    }
                    remoteScriptPath = absolutePath;
                    engines.execScriptFile(absolutePath);
                    remoteScriptRunning = true;
                    appendLog("执行成功");
                    w.send(JSON.stringify({ status: 'done', msg: '执行成功', deviceId: currentDeviceId }));
                } catch (e) {
                    appendLog("失败: " + e.message);
                    w.send(JSON.stringify({ status: 'error', msg: e.message, deviceId: currentDeviceId }));
                }
                break;
                
            case 'tap':
                try { click(msg.x, msg.y); } catch (e) {}
                w.send(JSON.stringify({ status: 'done', msg: '点击完成', deviceId: currentDeviceId }));
                break;
                
            case 'swipe':
                log("收到swipe命令: " + JSON.stringify(msg));
                try { 
                    let sw = device.width;
                    let sh = device.height;
                    log("AutoJS device: " + sw + "x" + sh);
                    swipe(msg.x1, msg.y1, msg.x2, msg.y2, msg.duration || 500); 
                    log("滑动执行完成");
                } catch (e) { 
                    log("滑动失败: " + e.message); 
                }
                w.send(JSON.stringify({ status: 'done', msg: '滑动完成', deviceId: currentDeviceId }));
                break;
                
            case 'key':
                try {
                    let w = device.width;
                    let h = device.height;
                    
                    // ========== 不需要root的按键（依赖无障碍服务）==========
                    if (msg.keyCode === 3) {  // HOME
                        home();
                    } else if (msg.keyCode === 4) {  // BACK
                        back();
                    } else if (msg.keyCode === 187) {  // RECENT_TASKS
                        recents();
                    } 
                    // ========== 音量调节（使用device模块，不需要root但需要权限）==========
                    else if (msg.keyCode === 24) {  // VOLUME_UP
                        try {
                            let vol = device.getMusicVolume();
                            let maxVol = device.getMusicMaxVolume();
                            let newVol = Math.min(vol + 1, maxVol);
                            device.setMusicVolume(newVol);
                            log("音量+ (" + newVol + "/" + maxVol + ")");
                        } catch (e) {
                            log("音量+ 失败: " + e.message);
                        }
                    } else if (msg.keyCode === 25) {  // VOLUME_DOWN
                        try {
                            let vol = device.getMusicVolume();
                            let newVol = Math.max(vol - 1, 0);
                            device.setMusicVolume(newVol);
                            log("音量- (" + newVol + "/" + device.getMusicMaxVolume() + ")");
                        } catch (e) {
                            log("音量- 失败: " + e.message);
                        }
                    } 
                    // ========== 其他需要root的按键 ==========
                    else if (msg.keyCode === 66 || msg.keyCode === 23) {  // ENTER / OK
                        log("确认键 需要root权限");
                        OK();
                    } else if (msg.keyCode === 19) {  // DPAD_UP - 用滑动代替
                        swipe(w/2, h*0.6, w/2, h*0.4, 300);
                        log("上滑");
                    } else if (msg.keyCode === 20) {  // DPAD_DOWN - 用滑动代替
                        swipe(w/2, h*0.4, w/2, h*0.6, 300);
                        log("下滑");
                    } else if (msg.keyCode === 21) {  // DPAD_LEFT - 用滑动代替
                        swipe(w*0.7, h/2, w*0.3, h/2, 300);
                        log("左滑");
                    } else if (msg.keyCode === 22) {  // DPAD_RIGHT - 用滑动代替
                        swipe(w*0.3, h/2, w*0.7, h/2, 300);
                        log("右滑");
                    } else if (msg.keyCode === 82) {  // MENU
                        log("菜单键 需要root权限");
                        Menu();
                    } else if (msg.keyCode === 26) {  // POWER
                        log("电源键 需要root权限");
                        Power();
                    } else if (msg.keyCode === 27) {  // CAMERA
                        log("相机键 需要root权限");
                        Camera();
                    } else {
                        log("按键 " + msg.keyCode + " 需要root权限");
                        KeyCode(msg.keyCode);
                    }
                } catch (e) {
                    log("按键执行异常: " + e.message);
                }
                w.send(JSON.stringify({ status: 'done', msg: '按键完成', deviceId: currentDeviceId }));
                break;
                
            case 'screenCapture':
                showScreenCapture(w);
                break;
                
            case 'launchQQ':
                try { app.launchPackage("com.tencent.mobileqq"); } catch (e) {}
                w.send(JSON.stringify({ status: 'done', msg: 'QQ已启动', deviceId: currentDeviceId }));
                break;
                
            case 'openApp':
                try { app.launchPackage(msg.packageName); } catch (e) {}
                w.send(JSON.stringify({ status: 'done', msg: '已启动', deviceId: currentDeviceId }));
                break;
                
            case 'getDeviceInfo':
                let info = {
                    model: device.model,
                    release: device.release,
                    width: device.width,
                    height: device.height,
                    brand: device.brand,
                    sdkInt: device.sdkInt
                };
                w.send(JSON.stringify({ status: 'done', data: info, deviceId: currentDeviceId }));
                break;
                
            case 'reboot':
                w.send(JSON.stringify({ status: 'done', msg: '即将重启', deviceId: currentDeviceId }));
                sleep(1000);
                device.reboot();
                break;

            case 'remote':
                handleRemoteCommand(msg, w);
                break;

            default:
                appendLog("未知指令: " + (msg.action || ''));
        }
    } catch (e) {
        appendLog("解析失败: " + e.message);
    }
}

function showScreenCapture(w) {
    try {
        if (!hasScreenCapturePermission) return;
        let img = captureScreen();
        if (!img) return;
        let scaledImg = images.scale(img, 0.5, 0.5);
        let imgBase64 = images.toBase64(scaledImg);
        let info = {
            type: 'img',
            content: 'data:image/png;base64,' + imgBase64,
            deviceId: currentDeviceId
        };
        w.send(JSON.stringify(info));
        // 释放图片内存
        img.recycle();
        scaledImg.recycle();
        appendLog("截图已发送");
    } catch (e) {
        appendLog("截图失败: " + e.message);
    }
}

// ==================== 远程控制 ====================
function handleRemoteCommand(msg, w) {
    const type = msg.type || '';
    switch (type) {
        case 'screenShare':
            startScreenShare(w);
            break;
        case 'stopScreenShare':
            stopScreenShare();
            w.send(JSON.stringify({ action: 'remoteAck', type: 'stopScreenShare', status: 'stopped', deviceId: currentDeviceId }));
            break;
        case 'connect':
            w.send(JSON.stringify({ action: 'remoteAck', type: 'connect', status: 'done', deviceId: currentDeviceId }));
            break;
        case 'disconnect':
            stopScreenShare();
            w.send(JSON.stringify({ action: 'remoteAck', type: 'disconnect', status: 'done', deviceId: currentDeviceId }));
            break;
        case 'requestScreen':
            if (!hasScreenCapturePermission) {
                // 这里在消息处理上下文中，需要在新线程执行
                threads.start(function() {
                    let result = requestScreenCaptureAuto();
                    hasScreenCapturePermission = result;
                    w.send(JSON.stringify({ action: 'remoteAck', type: 'requestScreen', status: result ? 'done' : 'error', deviceId: currentDeviceId }));
                });
                return;
            }
            w.send(JSON.stringify({ action: 'remoteAck', type: 'requestScreen', status: 'done', deviceId: currentDeviceId }));
            break;
        case 'startApp':
        case 'restartApp':
            try { app.launchApp('云控'); } catch (e) {}
            w.send(JSON.stringify({ action: 'remoteAck', type: type, status: 'done', deviceId: currentDeviceId }));
            break;
        case 'endCurrent':
        case 'endAll':
            stopScreenShare();
            w.send(JSON.stringify({ action: 'remoteAck', type: type, status: 'done', deviceId: currentDeviceId }));
            break;
        case 'restartConnection':
            w.send(JSON.stringify({ action: 'remoteAck', type: 'restartConnection', status: 'done', deviceId: currentDeviceId }));
            cleanupConnection();
            setTimeout(() => connectToServer(currentServerAddr, currentUsername, currentDeviceId), 2000);
            break;
        case 'updateStatus':
            w.send(JSON.stringify({ action: 'remoteAck', type: 'updateStatus', status: 'done', data: { connected: isConnected, screenShare: screenShareRunning }, deviceId: currentDeviceId }));
            break;
        default:
            w.send(JSON.stringify({ action: 'remoteAck', type: type, status: 'done', msg: '指令已收到', deviceId: currentDeviceId }));
    }
}

function startScreenShare(w) {
    if (screenShareRunning) return;
    if (!hasScreenCapturePermission) {
        threads.start(function() {
            let result = requestScreenCaptureAuto();
            hasScreenCapturePermission = result;
            if (!hasScreenCapturePermission) {
                w.send(JSON.stringify({ action: 'remoteAck', type: 'screenShare', status: 'error', msg: '无截图权限', deviceId: currentDeviceId }));
                return;
            }
            doStartScreenShare(w);
        });
        return;
    }
    doStartScreenShare(w);
}

function doStartScreenShare(w) {
    screenShareRunning = true;
    w.send(JSON.stringify({ action: 'remoteAck', type: 'screenShare', status: 'started', deviceId: currentDeviceId }));
    screenShareThread = threads.start(function () {
        while (screenShareRunning) {
            try {
                let img = captureScreen();
                if (!img) {
                    sleep(200);
                    continue;
                }
                let scaledImg = images.scale(img, 0.3, 0.3);
                let imgBase64 = images.toBase64(scaledImg, "png", 50);
                w.send(JSON.stringify({
                    action: 'screenFrame',
                    deviceId: currentDeviceId,
                    content: 'data:image/png;base64,' + imgBase64,
                    timestamp: Date.now(),
                    deviceWidth: device.width,
                    deviceHeight: device.height
                }));
                // 释放图片内存，防止内存泄露
                img.recycle();
                scaledImg.recycle();
                sleep(200);
            } catch (e) {
                break;
            }
        }
    });
}

function stopScreenShare() {
    if (!screenShareRunning) return;
    screenShareRunning = false;
    if (screenShareThread) {
        try { screenShareThread.interrupt(); } catch (e) {}
        screenShareThread = null;
    }
}

// ==================== UI按钮事件 ====================
ui.saveBtn.on("click", () => {
    let addr = ui.serverAddress.getText().toString().trim();
    let uname = ui.username.getText().toString().trim();
    let devId = ui.deviceId.getText().toString().trim();
    saveConfig(addr, uname, devId);
    toast("配置已保存");
});

ui.connectBtn.on("click", () => {
    if (isConnected) {
        disconnectServer();
    } else {
        let addr = ui.serverAddress.getText().toString().trim();
        let uname = ui.username.getText().toString().trim();
        let devId = ui.deviceId.getText().toString().trim();
        if (!addr || !uname || !devId) {
            toast("请填写完整的连接信息");
            return;
        }
        shouldReconnect = true;
        reconnectDelay = 5;
        saveConfig(addr, uname, devId);
        
        // 关键：在子线程中执行连接，避免 UI 线程阻塞
        connectionThread = threads.start(function() {
            connectToServer(addr, uname, devId);
        });
    }
});

ui.dkklog.on("click", function() {
    app.startActivity("console");
});

// ==================== handleKeyCode 按键处理函数 ====================
function handleKeyCode(keyCode) {
    try {
        let w = device.width;
        let h = device.height;
        
        // 不需要root的按键（依赖无障碍服务）
        if (keyCode === 3) {  // HOME
            home();
            log("HOME键执行完成");
        } else if (keyCode === 4) {  // BACK
            back();
            log("BACK键执行完成");
        } else if (keyCode === 187) {  // RECENT_TASKS
            recents();
            log("任务键执行完成");
        } 
        // 音量调节
        else if (keyCode === 24) {  // VOLUME_UP
            try {
                let vol = device.getMusicVolume();
                let maxVol = device.getMusicMaxVolume();
                let newVol = Math.min(vol + 1, maxVol);
                device.setMusicVolume(newVol);
                log("音量+ (" + newVol + "/" + maxVol + ")");
            } catch (e) {
                log("音量+ 失败: " + e.message);
            }
        } else if (keyCode === 25) {  // VOLUME_DOWN
            try {
                let vol = device.getMusicVolume();
                let newVol = Math.max(vol - 1, 0);
                device.setMusicVolume(newVol);
                log("音量- (" + newVol + "/" + device.getMusicMaxVolume() + ")");
            } catch (e) {
                log("音量- 失败: " + e.message);
            }
        } 
        // 其他需要root的按键
        else if (keyCode === 66 || keyCode === 23) {  // ENTER / OK
            log("确认键 需要root权限");
            OK();
        } else if (keyCode === 19) {  // DPAD_UP - 用滑动代替
            swipe(w/2, h*0.6, w/2, h*0.4, 300);
            log("上滑");
        } else if (keyCode === 20) {  // DPAD_DOWN - 用滑动代替
            swipe(w/2, h*0.4, w/2, h*0.6, 300);
            log("下滑");
        } else if (keyCode === 21) {  // DPAD_LEFT - 用滑动代替
            swipe(w*0.7, h/2, w*0.3, h/2, 300);
            log("左滑");
        } else if (keyCode === 22) {  // DPAD_RIGHT - 用滑动代替
            swipe(w*0.3, h/2, w*0.7, h/2, 300);
            log("右滑");
        } else if (keyCode === 82) {  // MENU
            log("菜单键 需要root权限");
            Menu();
        } else if (keyCode === 26) {  // POWER
            log("电源键 需要root权限");
            Power();
        } else if (keyCode === 27) {  // CAMERA
            log("相机键 需要root权限");
            Camera();
        } else {
            log("按键 " + keyCode + " 需要root权限");
            KeyCode(keyCode);
        }
    } catch (e) {
        log("handleKeyCode 执行异常: " + e.message);
    }
}

setInterval(() => {}, 1000);