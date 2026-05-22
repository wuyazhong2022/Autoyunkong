"ui";

// ==================== 导入 Java 类（统一放在顶部，只导入一次）====================
importClass(android.os.PowerManager);
importClass(android.net.wifi.WifiManager);
importClass(android.app.AlarmManager);
importClass(android.app.PendingIntent);
importClass(android.content.Intent);
importClass(android.content.IntentFilter);
// 注意：BroadcastReceiver 不需要导入，Auto.js 环境已预定义
// 前台服务相关类
importClass(android.app.NotificationChannel);
importClass(android.app.NotificationManager);
importClass(android.app.Notification);

// ==================== 全局日志配置（应用专属目录，权限稳定）====================
try {
    // 1. 配置日志路径（应用专属外部目录，权限稳定）
    const logPath = files.join(context.getExternalFilesDir(null).getAbsolutePath(), "app_log.txt");

    // 2. 配置全局日志写入
    console.setGlobalLogConfig({
        file: logPath,
        rootLevel: "ALL",       // 所有日志级别都写入
        maxFileSize: 1024*1024*5 // 单个文件最大5MB，防止过大
    });

    // 3. 打印文件路径，方便手动查找
    console.log("全局日志路径: " + logPath);
} catch (e) {
    log("配置全局日志失败: " + e.message);
}

// ==================== 日志缓存系统（拦截 console.log 发送日志）====================
let consoleLogBuffer = [];
const MAX_CONSOLE_BUFFER = 2000;

// 拦截 console 输出以缓存日志
try {
    let origLog = console.log;
    let origError = console.error;
    let origWarn = console.warn;

    console.log = function() {
        let args = Array.prototype.slice.call(arguments);
        let msg = args.map(function(arg) {
            return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
        }).join(' ');
        let timestamp = new Date().toLocaleTimeString();
        consoleLogBuffer.push("[LOG]" + timestamp + " " + msg);
        if (consoleLogBuffer.length > MAX_CONSOLE_BUFFER) {
            consoleLogBuffer.shift();
        }
        origLog.apply(console, arguments);
    };

    console.error = function() {
        let args = Array.prototype.slice.call(arguments);
        let msg = args.map(function(arg) {
            return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
        }).join(' ');
        let timestamp = new Date().toLocaleTimeString();
        consoleLogBuffer.push("[ERR]" + timestamp + " " + msg);
        if (consoleLogBuffer.length > MAX_CONSOLE_BUFFER) {
            consoleLogBuffer.shift();
        }
        origError.apply(console, arguments);
    };

    console.warn = function() {
        let args = Array.prototype.slice.call(arguments);
        let msg = args.map(function(arg) {
            return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
        }).join(' ');
        let timestamp = new Date().toLocaleTimeString();
        consoleLogBuffer.push("[WRN]" + timestamp + " " + msg);
        if (consoleLogBuffer.length > MAX_CONSOLE_BUFFER) {
            consoleLogBuffer.shift();
        }
        origWarn.apply(console, arguments);
    };
    console.log("[日志缓存] 系统已初始化");
} catch (e) {
    log("拦截console失败: " + e.message);
}

function getRecentConsoleLogs() {
    if (consoleLogBuffer.length === 0) return "";
    return consoleLogBuffer.join("\n");
}

// ==================== 发送日志文件到服务端 ====================
function sendLogFileToServer(w) {
    log("[getLogFile] 开始发送日志...");
    try {
        let allLogs = [];
        let foundSources = [];

        // 1. 读取控制台缓存日志
        let consoleLogs = getRecentConsoleLogs();
        if (consoleLogs && consoleLogs.length > 0) {
            allLogs.push("【控制台缓存日志】");
            allLogs = allLogs.concat(consoleLogs.split("\n").filter(function(l) { return l.trim() !== ""; }));
            foundSources.push("控制台缓存");
            log("[getLogFile] 控制台缓存日志: " + consoleLogBuffer.length + " 条");
        }

        // 2. 读取远程脚本日志文件
        let remoteLogFile = files.join(files.getSdcardPath(), '脚本', '.remote_log.txt');
        log("[getLogFile] 检查远程日志文件: " + remoteLogFile + ", 存在=" + files.exists(remoteLogFile));
        if (files.exists(remoteLogFile)) {
            try {
                let remoteLogs = files.read(remoteLogFile);
                if (remoteLogs && remoteLogs.trim().length > 0) {
                    allLogs.push("【远程脚本日志】");
                    allLogs = allLogs.concat(remoteLogs.split("\n").filter(function(l) { return l.trim() !== ""; }));
                    foundSources.push("远程脚本日志文件");
                    log("[getLogFile] 远程脚本日志文件已读取, 内容长度: " + remoteLogs.length);
                } else {
                    log("[getLogFile] 远程日志文件为空");
                }
            } catch(e) {
                log("[getLogFile] 读取远程日志文件失败: " + e.message);
            }
        }

        // 3. 读取 AutoJS 全局日志目录 (/sdcard/脚本/logs/)
        let globalLogDir = files.join(files.getSdcardPath(), '脚本', 'logs');
        log("[getLogFile] 检查全局日志目录: " + globalLogDir + ", 存在=" + files.exists(globalLogDir));
        if (files.exists(globalLogDir)) {
            try {
                let logFiles = files.listDir(globalLogDir, function(name) {
                    return name.endsWith('.log') || name.endsWith('.txt');
                });
                // 按修改时间排序，取最新的文件
                let logFileInfos = [];
                logFiles.forEach(function(fileName) {
                    let filePath = files.join(globalLogDir, fileName);
                    try {
                        let modTime = files.lastModified(filePath);
                        logFileInfos.push({ name: fileName, path: filePath, time: modTime });
                    } catch(e) {}
                });
                // 按时间倒序，取最新的3个日志文件
                logFileInfos.sort(function(a, b) { return b.time - a.time; });
                let topFiles = logFileInfos.slice(0, 3);
                
                if (topFiles.length > 0) {
                    allLogs.push("【AutoJS 全局日志】");
                    topFiles.forEach(function(fileInfo) {
                        try {
                            let content = files.read(fileInfo.path);
                            if (content && content.trim().length > 0) {
                                allLogs.push("--- " + fileInfo.name + " ---");
                                // 只取最后100行
                                let lines = content.split("\n");
                                let recentLines = lines.slice(-100);
                                allLogs = allLogs.concat(recentLines.filter(function(l) { return l.trim() !== ""; }));
                                foundSources.push("全局日志:" + fileInfo.name);
                                log("[getLogFile] 读取全局日志: " + fileInfo.name);
                            }
                        } catch(e) {
                            log("[getLogFile] 读取 " + fileInfo.name + " 失败: " + e.message);
                        }
                    });
                }
            } catch(e) {
                log("[getLogFile] 读取全局日志目录失败: " + e.message);
            }
        }

        // 4. 读取应用专属全局日志文件
        try {
            let appLogPath = files.join(context.getExternalFilesDir(null).getAbsolutePath(), "app_log.txt");
            log("[getLogFile] 检查应用专属日志: " + appLogPath + ", 存在=" + files.exists(appLogPath));
            if (files.exists(appLogPath)) {
                let appLogs = files.read(appLogPath);
                if (appLogs && appLogs.trim().length > 0) {
                    allLogs.push("【应用专属全局日志】");
                    // 只取最后200行
                    let lines = appLogs.split("\n");
                    let recentLines = lines.slice(-200);
                    allLogs = allLogs.concat(recentLines.filter(function(l) { return l.trim() !== ""; }));
                    foundSources.push("app_log.txt");
                    log("[getLogFile] 应用专属日志已读取, 内容长度: " + appLogs.length);
                }
            }
        } catch(e) {
            log("[getLogFile] 读取应用专属日志失败: " + e.message);
        }

        // 组合日志内容
        let logContent = allLogs.join("\n");
        
        if (logContent.length > 0) {
            // 限制发送大小，最多发送最后 300KB
            let maxSize = 300 * 1024;
            if (logContent.length > maxSize) {
                logContent = logContent.substring(logContent.length - maxSize);
            }

            w.send(JSON.stringify({
                action: 'logFileContent',
                deviceId: currentDeviceId,
                content: logContent,
                source: foundSources.join(" + ") || "(未知来源)"
            }));
            log("[getLogFile] 日志已发送, 来源: " + foundSources.join(" + ") + ", 长度: " + logContent.length);
        } else {
            let noLogMsg = "[getLogFile] 未找到任何日志。\n" +
                "请确保远程脚本中有运行过 log() 或 console.log() 语句。\n" +
                "日志将在脚本输出后自动缓存。";
            w.send(JSON.stringify({
                action: 'logFileContent',
                deviceId: currentDeviceId,
                content: noLogMsg
            }));
            log("[getLogFile] 未找到任何日志");
        }
    } catch (e) {
        log("[getLogFile] 发送日志失败: " + e.message);
        try {
            w.send(JSON.stringify({
                action: 'logFileContent',
                deviceId: currentDeviceId,
                content: "[getLogFile] 错误: " + e.message
            }));
        } catch (e2) {
            log("[getLogFile] 发送错误消息也失败: " + e2.message);
        }
    }
}

// ==================== 布局分析发送到服务端 ====================
function sendLayoutToServer(w) {
    let startTime = Date.now();
    log("[getLayout] 开始获取布局...");
    try {
        auto.waitFor();
        
        // 尝试多种方式获取布局
        let root = auto.root;
        let rootInfo = null;
        
        // 方式1: 使用auto.root
        if (root) {
            log("[getLayout] auto.root 存在, childCount: " + root.childCount);
            rootInfo = parseNodeWithChildren(root, 0);
        }
        
        // 方式2: 如果root为空或无子节点，尝试获取当前窗口
        if (!rootInfo || (rootInfo.children && rootInfo.children.length === 0)) {
            log("[getLayout] 尝试获取当前窗口...");
            try {
                let info = context.getPackageName();
                log("[getLayout] 当前包名: " + info);
                
                // 获取窗口列表
                if (auto.windows) {
                    let wins = auto.windows();
                    log("[getLayout] 窗口数量: " + (wins ? wins.length : 0));
                    if (wins && wins.length > 0) {
                        let winRoot = wins[0];
                        if (winRoot && winRoot.root) {
                            let winRootNode = winRoot.root();
                            log("[getLayout] 窗口根节点存在");
                            rootInfo = parseNodeWithChildren(winRootNode, 0);
                        }
                    }
                }
            } catch(e2) {
                log("[getLayout] 获取窗口失败: " + e2.message);
            }
        }
        
        if (!rootInfo) {
            log("[getLayout] 无法获取布局，请确保无障碍服务已开启且屏幕亮着");
            w.send(JSON.stringify({
                action: 'layoutData',
                deviceId: currentDeviceId,
                layout: null,
                error: "无法获取布局，请确保无障碍服务已开启且屏幕亮着"
            }));
            return;
        }

        let nodeCount = countAllNodes(rootInfo);
        let duration = Date.now() - startTime;
        
        log("[getLayout] 布局获取完成，节点数: " + nodeCount + ", 耗时: " + duration + "ms");
        
        // 发送到服务端
        w.send(JSON.stringify({
            action: 'layoutData',
            deviceId: currentDeviceId,
            layout: {
                meta: {
                    captureTime: new Date().toISOString(),
                    captureTimeCN: new Date().toLocaleString('zh-CN'),
                    packageName: root ? getVal(root, 'packageName', '') : '',
                    nodeCount: nodeCount,
                    captureDuration: duration
                },
                hierarchy: rootInfo
            }
        }));
        log("[getLayout] 布局数据已发送");
        
    } catch (e) {
        log("[getLayout] 获取布局失败: " + e.message);
        try {
            w.send(JSON.stringify({
                action: 'layoutData',
                deviceId: currentDeviceId,
                layout: null,
                error: e.message
            }));
        } catch(e2) {
            log("[getLayout] 发送错误消息失败: " + e2.message);
        }
    }
}

// ==================== 布局分析辅助函数 ====================

/**
 * 安全获取节点属性值（兼容方法和属性）
 */
function getVal(node, prop, defaultValue) {
    try {
        let value = node[prop];
        if (typeof value === 'function') {
            return value.call(node);
        }
        return value != null ? value : defaultValue;
    } catch (e) {
        return defaultValue;
    }
}

/**
 * 获取bounds坐标
 */
function getBounds(node, type) {
    try {
        let b = node[type];
        if (typeof b === 'function') {
            b = b.call(node);
        }
        if (b && typeof b === 'object') {
            return {
                left: b.left || 0,
                top: b.top || 0,
                right: b.right || 0,
                bottom: b.bottom || 0
            };
        }
        return null;
    } catch (e) {
        return null;
    }
}

/**
 * 解析节点（含子节点）
 */
function parseNodeWithChildren(node, depth) {
    if (!node) return null;
    
    let info = {
        className: getVal(node, 'className', ''),
        packageName: getVal(node, 'packageName', ''),
        text: getVal(node, 'text', ''),
        desc: getVal(node, 'desc', ''),
        id: getVal(node, 'id', ''),
        depth: depth,
        indexInParent: getVal(node, 'indexInParent', -1),
        childCount: getVal(node, 'childCount', 0),
        boundsInScreen: getBounds(node, 'bounds'),
        clickable: getVal(node, 'clickable', false),
        longClickable: getVal(node, 'longClickable', false),
        checkable: getVal(node, 'checkable', false),
        checked: getVal(node, 'checked', false),
        scrollable: getVal(node, 'scrollable', false),
        enabled: getVal(node, 'enabled', true),
        visibleToUser: getVal(node, 'visibleToUser', true)
    };
    
    // 递归子节点
    let childCountVal = info.childCount;
    if (childCountVal > 0) {
        info.children = [];
        for (let i = 0; i < childCountVal; i++) {
            try {
                let child = node.child(i);
                if (child) {
                    let childInfo = parseNodeWithChildren(child, depth + 1);
                    if (childInfo) info.children.push(childInfo);
                }
            } catch (e) {
                // 跳过无法访问的子节点
            }
        }
    }
    return info;
}

/**
 * 统计节点总数
 */
function countAllNodes(node) {
    if (!node) return 0;
    let count = 1;
    if (node.children) {
        node.children.forEach(function(c) {
            count += countAllNodes(c);
        });
    }
    return count;
}



// ==================== 实时日志同步到服务端 ====================
let _lastSentLogIndex = 0;  // 记录上次发送到的日志行数
let _lastSentAppLogLen = 0; // 记录上次发送的应用日志长度

function sendRealtimeLogsToServer(w) {
    try {
        let logsToSend = [];

        // 1. 发送控制台缓存日志（每次发送新增的日志）
        if (consoleLogBuffer.length > _lastSentLogIndex) {
            let newLogs = consoleLogBuffer.slice(_lastSentLogIndex);
            newLogs.forEach(function(log) {
                logsToSend.push({
                    source: 'console',
                    msg: log,
                    timestamp: Date.now()
                });
            });
            _lastSentLogIndex = consoleLogBuffer.length;
        }

        // 2. 发送应用专属日志文件的新增内容
        try {
            let appLogPath = files.join(context.getExternalFilesDir(null).getAbsolutePath(), "app_log.txt");
            if (files.exists(appLogPath)) {
                let appLogs = files.read(appLogPath);
                if (appLogs && appLogs.length > _lastSentAppLogLen) {
                    let newContent = appLogs.substring(_lastSentAppLogLen);
                    let lines = newContent.split("\n").filter(function(l) { return l.trim() !== ""; });
                    lines.forEach(function(line) {
                        logsToSend.push({
                            source: 'appLog',
                            msg: line,
                            timestamp: Date.now()
                        });
                    });
                    _lastSentAppLogLen = appLogs.length;
                }
            }
        } catch(e) {}

        // 发送日志到服务端
        if (logsToSend.length > 0 && w && w.readyState === 1) {
            w.send(JSON.stringify({
                action: 'realtimeLog',
                deviceId: currentDeviceId,
                logs: logsToSend
            }));
        }
    } catch(e) {
        log("[实时日志] 发送失败: " + e.message);
    }
}

// 启动实时日志定时器（每2秒发送一次）
let _realtimeLogTimer = null;
function startRealtimeLogTimer(w) {
    if (_realtimeLogTimer) return;
    _realtimeLogTimer = threads.start(function() {
        while (true) {
            sleep(2000);
            try {
                // 遍历所有连接的WebSocket发送日志
                devices.forEach(function(device) {
                    if (device.ws && device.ws.readyState === 1) {
                        sendRealtimeLogsToServer(device.ws);
                    }
                });
            } catch(e) {}
        }
    });
    log("[实时日志] 定时器已启动");
}

// ==================== 后台保活机制 ====================
let wakeLock = null;
let wifiLock = null;
let alarmManager = null;
let wakeupReceiver = null;

function initKeepAlive() {
    try {
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

/* 启动前台服务 */
function startForegroundService() {
    try {
        if (foregroundServiceEnabled === false) return;

        let channelId = "yunkong_channel";
        let channelName = "云控服务";

        // 创建通知渠道（Android 8.0+）
        if (device.sdkInt >= 26) {
            let notificationManager = context.getSystemService(context.NOTIFICATION_SERVICE);
            let channel = new NotificationChannel(channelId, channelName, NotificationManager.IMPORTANCE_LOW);
            notificationManager.createNotificationChannel(channel);
        }

        // 创建通知
        let notificationBuilder = new Notification.Builder(context);
        notificationBuilder.setContentTitle("我的云控");
        notificationBuilder.setContentText("云控服务运行中...");
        notificationBuilder.setSmallIcon(android.R.drawable.ic_menu_info_details);
        notificationBuilder.setWhen(Date.now());

        if (device.sdkInt >= 26) {
            notificationBuilder.setChannelId(channelId);
        }

        let notification = notificationBuilder.build();
        
        // 使用 activity 而不是 context 来启动前台服务
        activity.startForeground(10086, notification);
        log("前台服务已启动");
    } catch (e) {
        log("启动前台服务失败: " + e.message);
    }
}

function stopForegroundService() {
    try {
        activity.stopForeground(true);
        log("前台服务已停止");
    } catch (e) {
        log("停止前台服务失败: " + e.message);
    }
}

// 前台服务状态变量
let foregroundServiceEnabled = false;

function acquireWakeLock() {
    try {
        if (wakeLock && !wakeLock.isHeld()) {
            wakeLock.acquire(10 * 60 * 1000); // 获取10分钟唤醒锁
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
            onReceive: function (context, intent) {
                log("定时唤醒触发");
                acquireWakeLock();
                acquireWifiLock();
                // 发送心跳保持连接
                if (typeof ws !== 'undefined' && ws && isConnected) {
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
            onReceive: function (context, intent) {
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

        events.on("exit", function () {
            try {
                context.unregisterReceiver(receiver);
                releaseLocks();
                if (wakeupReceiver) {
                    context.unregisterReceiver(wakeupReceiver);
                }
            } catch (e) { }
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

// 屏幕共享配置：缩放比例和质量（0-100）
let screenShareConfig = {
    scale: 0.3,      // 缩放比例，0.3表示30%
    quality: 50       // 压缩质量，0-100，值越小图片越小但越模糊
};

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
                try { s.stop(); stoppedCount++; continue; } catch (e1) { }
                try { s.forceStop && s.forceStop(); stoppedCount++; continue; } catch (e2) { }
                try { s.interrupt && s.interrupt(); stoppedCount++; continue; } catch (e3) { }
            }
        }
        if (stoppedCount > 0) {
            remoteScriptRunning = false;
            remoteScriptPath = null;
        }
    } catch (e) { }
}
ui.layout(
    <vertical padding="16" bg="#F5F5F5">
        <ScrollView layout_weight="1">
            <vertical>
                <!-- 设备信息卡片 -->
                <card marginBottom="12" cardCornerRadius="12dp" cardElevation="2dp" cardBackgroundColor="#FFFFFF">
                    <vertical padding="12">
                        <text text="📱 设备信息" textSize="15sp" textColor="#2196F3" textStyle="bold" marginBottom="8" />
                        <vertical>
                            <horizontal gravity="center_vertical" marginBottom="6">
                                <text text="型号" textSize="13sp" textColor="#757575" layout_weight="1" />
                                <text id="设备型号" textSize="13sp" textColor="#212121" layout_weight="2" />
                            </horizontal>
                            <horizontal gravity="center_vertical" marginBottom="6">
                                <text text="系统" textSize="13sp" textColor="#757575" layout_weight="1" />
                                <text id="系统版本" textSize="13sp" textColor="#212121" layout_weight="2" />
                            </horizontal>
                            <horizontal gravity="center_vertical" marginBottom="6">
                                <text text="分辨率" textSize="13sp" textColor="#757575" layout_weight="1" />
                                <text id="屏幕分辨率" textSize="13sp" textColor="#212121" layout_weight="2" />
                            </horizontal>
                            <horizontal gravity="center_vertical">
                                <text text="版本号" textSize="13sp" textColor="#757575" layout_weight="1" />
                                <text id="应用版本" textSize="13sp" textColor="#212121" layout_weight="2" />
                            </horizontal>
                        </vertical>
                    </vertical>
                </card>

                <!-- 连接配置卡片 -->
                <card marginBottom="12" cardCornerRadius="12dp" cardElevation="2dp" cardBackgroundColor="#FFFFFF">
                    <vertical padding="12">
                        <text text="🔗 连接配置" textSize="15sp" textColor="#2196F3" textStyle="bold" marginBottom="10" />
                        
                        <text text="接口地址" textSize="13sp" textColor="#757575" marginBottom="2" />
                        <input id="serverAddress" hint="ws://39.101.76.111:3006" marginBottom="10" padding="8" bg="#F5F5F5" radius="8dp" />
                        
                        <text text="用户名" textSize="13sp" textColor="#757575" marginBottom="2" />
                        <input id="username" hint="用户名" marginBottom="10" padding="8" bg="#F5F5F5" radius="8dp" />
                        
                        <text text="设备ID" textSize="13sp" textColor="#757575" marginBottom="2" />
                        <input id="deviceId" hint="设备ID" marginBottom="5" padding="8" bg="#F5F5F5" radius="8dp" />
                    </vertical>
                </card>

                <!-- 权限开关卡片 -->
                <card marginBottom="12" cardCornerRadius="12dp" cardElevation="2dp" cardBackgroundColor="#FFFFFF">
                    <vertical padding="12">
                        <text text="🛡️ 权限管理" textSize="15sp" textColor="#2196F3" textStyle="bold" marginBottom="10" />
                        
                        <!-- 无障碍服务 -->
                        <horizontal gravity="center_vertical" marginBottom="12">
                            <vertical layout_weight="1">
                                <text text="无障碍服务" textColor="#212121" textSize="14sp" textStyle="bold" />
                                <text text="提供自动操作(点击、滑动等)" textColor="#757575" textSize="11sp" />
                            </vertical>
                            <checkbox id="autoService" checked="{{auto.service != null}}" />
                        </horizontal>
                        
                        <!-- 悬浮窗权限 -->
                        <horizontal gravity="center_vertical" marginBottom="12">
                            <vertical layout_weight="1">
                                <text text="悬浮窗权限" textColor="#212121" textSize="14sp" textStyle="bold" />
                                <text text="软件运行的必开权限" textColor="#757575" textSize="11sp" />
                            </vertical>
                            <checkbox id="consoleshow" checked="{{floaty.checkPermission()}}" />
                        </horizontal>
                        
                        <vertical h="1" bg="#E0E0E0" marginBottom="12" />
                        
                        <!-- 忽略电池优化 -->
                        <horizontal gravity="center_vertical" marginBottom="12">
                            <vertical layout_weight="1">
                                <text text="忽略电池优化" textColor="#212121" textSize="14sp" textStyle="bold" />
                                <text text="防止系统杀死后台进程" textColor="#757575" textSize="11sp" />
                            </vertical>
                            <Switch id="batteryOpt" checked="false" />
                        </horizontal>
                        
                        <!-- 前台服务 -->
                        <horizontal gravity="center_vertical" marginBottom="8">
                            <vertical layout_weight="1">
                                <text text="前台服务" textColor="#212121" textSize="14sp" textStyle="bold" />
                                <text text="保证脚本不被系统杀掉" textColor="#757575" textSize="11sp" />
                            </vertical>
                            <Switch id="foregroundSvc" checked="false" />
                        </horizontal>
                    </vertical>
                </card>

                <!-- 连接按钮区域 -->
                <button id="connectBtn" text="🔌 连接服务器" style="Widget.AppCompat.Button.Colored" marginBottom="12" bg="#2196F3" textColor="#FFFFFF" radius="8dp" padding="12" />
                
                <horizontal marginBottom="12">
                    <button id="saveBtn" text="💾 保存配置" layout_weight="1" marginRight="4" style="Widget.AppCompat.Button.Borderless" bg="#E3F2FD" textColor="#2196F3" radius="8dp" padding="10" />
                    <button id="dkklog" text="📋 查看日志" layout_weight="1" marginLeft="4" style="Widget.AppCompat.Button.Borderless" bg="#E3F2FD" textColor="#2196F3" radius="8dp" padding="10" />
                </horizontal>

                <!-- 状态区域 -->
                <card marginBottom="12" cardCornerRadius="12dp" cardElevation="1dp" cardBackgroundColor="#FFFFFF">
                    <vertical padding="12">
                        <text text="📡 连接状态" textSize="13sp" textColor="#757575" marginBottom="6" />
                        <text id="statusText" text="未连接" textSize="15sp" textColor="#FF5722" textStyle="bold" />
                        <text id="logText" text="" textSize="11sp" textColor="#9E9E9E" marginTop="8" maxLines="4" />
                    </vertical>
                </card>

                <!-- 消息发送卡片 -->
                <card cardCornerRadius="12dp" cardElevation="2dp" cardBackgroundColor="#FFFFFF">
                    <vertical padding="12">
                        <text text="💬 消息控制" textSize="15sp" textColor="#2196F3" textStyle="bold" marginBottom="10" />
                        
                        <horizontal marginBottom="10">
                            <input id="sendMsgInput" hint="输入要发送的文字消息..." layout_weight="1" marginRight="8" padding="10" bg="#F5F5F5" radius="8dp" h="40" textSize="13sp" />
                            <button id="sendTextBtn" text="发送" w="60" h="40" style="Widget.AppCompat.Button.Colored" bg="#4CAF50" textColor="#FFFFFF" radius="8dp" />
                        </horizontal>
                        
                        <horizontal>
                            <button id="sendScreenshotBtn" text="📷 截图" layout_weight="1" marginRight="4" style="Widget.AppCompat.Button.Borderless" bg="#E3F2FD" textColor="#2196F3" radius="8dp" padding="10" />
                            <button id="sendPicBtn" text="🖼️ 图片" layout_weight="1" marginLeft="4" style="Widget.AppCompat.Button.Borderless" bg="#E3F2FD" textColor="#2196F3" radius="8dp" padding="10" />
                        </horizontal>
                    </vertical>
                </card>
                
                <!-- 底部留白 -->
                <vertical h="20" />
            </vertical>
        </ScrollView>
    </vertical>
);
/* 刷新UI权限状态和设备信息 */
function refreshUIState() {
    ui.run(() => {
        // 无障碍服务状态
        if (ui.autoService) ui.autoService.checked = auto.service != null;
        // 悬浮窗权限状态
        if (ui.consoleshow) ui.consoleshow.checked = floaty.checkPermission();

        // 忽略电池优化状态
        try {
            let pm = context.getSystemService(context.POWER_SERVICE);
            let isIgnoring = pm.isIgnoringBatteryOptimizations(context.getPackageName());
            if (ui.batteryOpt) ui.batteryOpt.checked = isIgnoring;
        } catch (e) {
            log("读取电池优化状态失败: " + e.message);
            if (ui.batteryOpt) ui.batteryOpt.checked = false;
        }

        // 前台服务状态
        if (ui.foregroundSvc) ui.foregroundSvc.checked = $settings.isEnabled("foreground_service");
        foregroundServiceEnabled = $settings.isEnabled("foreground_service");

        // 设备信息显示
        if (ui.设备型号) ui.设备型号.setText(device.model + " (" + device.brand + ")");
        if (ui.系统版本) ui.系统版本.setText(device.release + " (API " + device.sdkInt + ")");
        if (ui.屏幕分辨率) ui.屏幕分辨率.setText(device.width + " x " + device.height);
        if (ui.应用版本) ui.应用版本.setText(app.versionName + " (" + app.versionCode + ")");
    });
}

// 当用户回到本界面时，resume事件会被触发
ui.emitter.on("resume", function () {
    refreshUIState();
});

// ==================== 初始化UI值 ====================
ui.run(function () {
    ui.serverAddress.setText(savedConfig.serverAddress);
    ui.username.setText(savedConfig.username);
    ui.deviceId.setText(savedConfig.deviceId);
});

// 忽略电池优化开关监听
if (ui.batteryOpt) {
    ui.batteryOpt.on("check", function (checked) {
        if (checked) {
            try {
                let intent = new Intent();
                intent.setAction("android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS");
                intent.putExtra("extra_pkgname", context.getPackageName());
                app.startActivity(intent);
                toast("请在设置中允许忽略电池优化");
            } catch (e) {
                toast("跳转失败，请手动设置");
                log("跳转电池优化设置失败: " + e.message);
            }
        }
    });
}

// 前台服务开关监听
if (ui.foregroundSvc) {
    ui.foregroundSvc.on("check", function (checked) {
        $settings.setEnabled("foreground_service", checked);
        foregroundServiceEnabled = checked;
        if (checked) {
            threads.start(function () {
                startForegroundService();
            });
        } else {
            stopForegroundService();
        }
    });
}

// 无障碍服务开关监听
if (ui.autoService) {
    ui.autoService.on("check", function (checked) {
        if (checked && auto.service == null) {
            app.startActivity({ action: "android.settings.ACCESSIBILITY_SETTINGS" });
            toast("请手动开启无障碍服务");
        }
        if (!checked && auto.service != null) {
            auto.service.disableSelf();
        }
    });
}

// 悬浮窗权限开关监听
if (ui.consoleshow) {
    ui.consoleshow.on("check", function (checked) {
        if (checked && !floaty.checkPermission()) {
            try {
                app.startActivity({ action: "android.settings.action.MANAGE_OVERLAY_PERMISSION" });
                toast("请手动开启悬浮窗权限");
            } catch (error) {
                toast('请手动开启悬浮窗权限');
            }
        }
    });
}

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
    // 同时添加到日志缓冲，等待发送到服务端
    sendLogToServer(msg, 'info');
}

// ==================== 日志实时同步到服务端 ====================
let logBuffer = [];           // 日志缓冲队列
let logSendEnabled = true;    // 日志发送开关，默认开启
const MAX_LOG_BUFFER = 50;    // 最大缓冲日志数
const LOG_SEND_INTERVAL = 1000; // 发送间隔（毫秒）
let logSendThread = null;

// 设置全局日志捕获（用于捕获所有脚本的 log 输出）
try {
    console.setGlobalLogFunction(function() {
        let args = Array.prototype.slice.call(arguments);
        let msg = args.map(function(arg) {
            return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
        }).join(' ');
        let timestamp = new Date().toLocaleTimeString();
        // 存入控制台缓存日志（打开日志文件时使用）
        consoleLogBuffer.push("[LOG]" + timestamp + " " + msg);
        if (consoleLogBuffer.length > MAX_CONSOLE_BUFFER) {
            consoleLogBuffer.shift();
        }
        // 同时发送到服务器（实时日志显示）
        sendLogToServer('[脚本] ' + msg, 'info');
    });
    
    // 兼容 AutoJS Pro 8+: 拦截 runtime.log（远程脚本使用 log() 函数）
    if (runtime && runtime.log) {
        let origRuntimeLog = runtime.log.bind(runtime);
        runtime.log = function() {
            let args = Array.prototype.slice.call(arguments);
            let msg = args.map(function(arg) {
                return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
            }).join(' ');
            let timestamp = new Date().toLocaleTimeString();
            consoleLogBuffer.push("[LOG]" + timestamp + " " + msg);
            if (consoleLogBuffer.length > MAX_CONSOLE_BUFFER) {
                consoleLogBuffer.shift();
            }
            sendLogToServer('[脚本] ' + msg, 'info');
            origRuntimeLog.apply(runtime, arguments);
        };
        log("[日志缓存] runtime.log 拦截已设置");
    }
} catch (e) {
    log("设置日志捕获失败: " + e.message);
}

function sendLogToServer(msg, level) {
    if (!logSendEnabled) return;
    logBuffer.push({
        msg: msg,
        level: level || 'info',
        timestamp: Date.now()
    });
    // 如果缓冲满了，立即发送
    if (logBuffer.length >= MAX_LOG_BUFFER) {
        flushLogBuffer();
    }
}
// 暴露到全局作用域，供远程脚本调用
global.sendLogToServer = sendLogToServer;

function flushLogBuffer() {
    if (logBuffer.length === 0) return;
    if (!ws || !isConnected) return;
    
    let logsToSend = logBuffer.slice();  // 使用 slice 代替展开运算符
    logBuffer = [];
    
    try {
        ws.send(JSON.stringify({
            action: 'deviceLog',
            deviceId: currentDeviceId,
            logs: logsToSend
        }));
    } catch (e) {
        // 发送失败，将日志放回缓冲
        logBuffer = logsToSend.concat(logBuffer);
        log("日志发送失败: " + e.message);
    }
}

function startLogSender() {
    if (logSendThread) return;
    logSendThread = threads.start(function () {
        while (true) {
            sleep(LOG_SEND_INTERVAL);
            if (isConnected && logBuffer.length > 0) {
                flushLogBuffer();
            }
        }
    });
}

function stopLogSender() {
    if (logSendThread) {
        logSendThread.interrupt();
        logSendThread = null;
    }
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
    threads.start(function () {
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
    threads.start(function () {
        let picDirs = [
            "/sdcard/DCIM/Camera/",
            "/sdcard/DCIM/Screenshots/",
            "/sdcard/Pictures/",
            "/sdcard/Download/",
            "/sdcard/云控图片/"
        ];
        let allImages = [];
        picDirs.forEach(function (dir) {
            if (files.exists(dir)) {
                let list = files.listDir(dir);
                list.forEach(function (f) {
                    let fullPath = files.join(dir, f);
                    if (!files.isDir(fullPath)) {
                        let ext = f.toLowerCase();
                        if (ext.endsWith('.png') || ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.webp')) {
                            allImages.push({ name: f, path: fullPath, dir: dir });
                        }
                    }
                });
            }
        });
        if (allImages.length === 0) {
            ui.run(function () { toast("未找到图片文件"); });
            return;
        }
        allImages.sort(function (a, b) { return a.name.localeCompare(b.name); });
        if (allImages.length > 50) allImages = allImages.slice(0, 50);
        let items = allImages.map(function (img, index) {
            return (index + 1) + ". " + img.name + " [" + img.dir.replace("/sdcard/", "") + "]";
        });
        ui.run(function () {
            let selectedIndex = dialogs.select("选择要发送的图片 (共" + allImages.length + "张)", items);
            if (selectedIndex >= 0) sendPictureFile(allImages[selectedIndex].path);
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
        if (w > maxSize || h > maxSize) scale = maxSize / Math.max(w, h);
        if (scale < 1) scaledImg = images.scale(img, scale, scale);
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
        if (img) try { img.recycle(); } catch (e) { }
        if (scaledImg) try { scaledImg.recycle(); } catch (e) { }
    }
}

// ==================== UI按钮事件 ====================
ui.sendTextBtn.on("click", () => sendTextMessage());
ui.sendScreenshotBtn.on("click", () => sendScreenshot());
ui.sendPicBtn.on("click", () => sendPictureFromGallery());
ui.sendMsgInput.on("key_enter", () => sendTextMessage());

// ==================== WebSocket 相关 ====================
let ws = null;
let isConnected = false;
// 暴露到全局作用域，供远程脚本访问
global.ws = null;
global.currentDeviceId = "";
global.currentServerAddr = "";
global.currentUsername = "";
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
    heartbeatInterval = setInterval(() => {
        try {
            w.send(JSON.stringify({ action: 'heartbeat' }));
            if (heartbeatTimeout) clearTimeout(heartbeatTimeout);
            heartbeatTimeout = setTimeout(() => {
                if (isConnected) {
                    appendLog("心跳超时，连接可能已断开");
                    cleanupConnection();
                    if (shouldReconnect && !isReconnecting) {
                        isReconnecting = true;
                        scheduleReconnect();
                        setTimeout(() => { isReconnecting = false; }, 2000);
                    }
                }
            }, 5000);
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
    }, 10000);
}

function stopHeartbeat() {
    if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
    if (heartbeatTimeout) { clearTimeout(heartbeatTimeout); heartbeatTimeout = null; }
}

function cleanupConnection() {
    stopHeartbeat();
    stopScreenShare();
    stopLogSender(); // 停止日志发送线程
    if (ws) { try { ws.close(1000, "cleanup"); } catch (e) { } ws = null; }
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
    // 同步到全局变量，供远程脚本访问
    global.currentDeviceId = currentDeviceId;
    global.currentServerAddr = currentServerAddr;
    global.currentUsername = currentUsername;
    if (ws && isConnected) { appendLog("已连接，无需重复操作"); return; }
    if (ws) { try { ws.close(1000, "reconnect"); } catch (e) { } ws = null; }
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
            // 更新全局变量，供远程脚本访问
            global.ws = w;
            global.currentDeviceId = currentDeviceId;
            global.currentServerAddr = currentServerAddr;
            global.currentUsername = currentUsername;
            startHeartbeat(w);
            startLogSender(); // 启动日志发送线程
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
        }).on("closing", (code, reason, w) => { appendLog("连接关闭中...");
        }).on("text", (text, w) => { handleServerMessage(text, w);
        }).on("binary", (bytes, w) => { appendLog("收到二进制, 大小: " + bytes.size());
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
                    // 如果服务端发送了屏幕共享配置，则应用该配置
                    if (msg.screenShareConfig) {
                        if (typeof msg.screenShareConfig.scale === 'number') {
                            screenShareConfig.scale = Math.max(0.1, Math.min(1.0, msg.screenShareConfig.scale));
                        }
                        if (typeof msg.screenShareConfig.quality === 'number') {
                            screenShareConfig.quality = Math.max(10, Math.min(100, msg.screenShareConfig.quality));
                        }
                        appendLog("已应用屏幕共享配置: 缩放=" + screenShareConfig.scale + ", 质量=" + screenShareConfig.quality);
                    }
                    // 启动实时日志同步
                    startRealtimeLogTimer(w);
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
                        case 'getLogFile':
                            log("[收到指令] getLogFile 请求");
                            sendLogFileToServer(w);
                            break;
                        case 'getRealtimeLogs':
                            log("[收到指令] getRealtimeLogs 请求");
                            sendRealtimeLogsToServer(w);
                            break;
                        case 'getLayout':
                            log("[收到指令] getLayout 请求");
                            sendLayoutToServer(w);
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
                    let remoteCode = msg.code;
                    let serverUrl = currentServerAddr;
                    let deviceId = currentDeviceId;
                    // 使用 Java OkHttp 创建独立 WebSocket 连接发送日志
                    let logInterceptor = `
var OkHttpClient = Packages.okhttp3.OkHttpClient;
var Request = Packages.okhttp3.Request;
var WebSocketListener = Packages.okhttp3.WebSocketListener;
var _origLog = log;
var _origConsoleLog = console.log;
var _remoteLogBuffer = [];
var _remoteWs = null;
var _deviceId = '__DEVICE_ID__';
var _serverUrl = '__SERVER_URL__';

function sendRemoteLog(msg, level) {
    _remoteLogBuffer.push({
        msg: msg,
        level: level || 'info',
        timestamp: Date.now()
    });
    trySendRemoteLogs();
}

function trySendRemoteLogs() {
    if (_remoteLogBuffer.length === 0 || _remoteWs == null) return;
    try {
        var logsToSend = _remoteLogBuffer.splice(0, _remoteLogBuffer.length);
        var jsonMsg = JSON.stringify({
            action: 'deviceLog',
            deviceId: _deviceId,
            logs: logsToSend
        });
        if (_remoteWs) {
            _remoteWs.send(jsonMsg);
        }
    } catch(e) {
        _remoteLogBuffer = logsToSend.concat(_remoteLogBuffer);
    }
}

function initRemoteWs() {
    try {
        var client = new OkHttpClient();
        var request = new Request.Builder().url(_serverUrl).build();
        _remoteWs = client.newWebSocket(request, new WebSocketListener({
            onOpen: function(ws, response) {},
            onMessage: function(ws, text) {},
            onClosing: function(ws, code, reason) { ws.close(1000, null); },
            onClosed: function(ws, code, reason) { _remoteWs = null; },
            onFailure: function(ws, t, response) { _remoteWs = null; }
        }));
    } catch(e) {}
}

initRemoteWs();

threads.start(function() {
    while (true) {
        sleep(500);
        trySendRemoteLogs();
    }
});

log = function() {
    var args = Array.prototype.slice.call(arguments).join(' ');
    sendRemoteLog('[脚本] ' + args, 'info');
    _origLog.apply(null, arguments);
};

console.log = function() {
    var args = Array.prototype.slice.call(arguments).join(' ');
    sendRemoteLog('[脚本] ' + args, 'info');
    _origConsoleLog.apply(console, arguments);
};
`.replace('__SERVER_URL__', serverUrl).replace('__DEVICE_ID__', deviceId);
                    engines.execScript("远程脚本", logInterceptor + remoteCode);
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
                    let deviceId = currentDeviceId;
                    let serverUrl = currentServerAddr;
                    // 在脚本开头注入日志捕获代码，使用 Java OkHttp
                    let logInterceptor = `
var OkHttpClient = Packages.okhttp3.OkHttpClient;
var Request = Packages.okhttp3.Request;
var WebSocketListener = Packages.okhttp3.WebSocketListener;
var _origLog = log;
var _origConsoleLog = console.log;
var _remoteLogBuffer = [];
var _remoteWs = null;
var _deviceId = '__DEVICE_ID__';
var _serverUrl = '__SERVER_URL__';

function sendRemoteLog(msg, level) {
    _remoteLogBuffer.push({
        msg: msg,
        level: level || 'info',
        timestamp: Date.now()
    });
    trySendRemoteLogs();
}

function trySendRemoteLogs() {
    if (_remoteLogBuffer.length === 0 || _remoteWs == null) return;
    try {
        var logsToSend = _remoteLogBuffer.splice(0, _remoteLogBuffer.length);
        var jsonMsg = JSON.stringify({
            action: 'deviceLog',
            deviceId: _deviceId,
            logs: logsToSend
        });
        if (_remoteWs) {
            _remoteWs.send(jsonMsg);
        }
    } catch(e) {
        _remoteLogBuffer = logsToSend.concat(_remoteLogBuffer);
    }
}

function initRemoteWs() {
    try {
        var client = new OkHttpClient();
        var request = new Request.Builder().url(_serverUrl).build();
        _remoteWs = client.newWebSocket(request, new WebSocketListener({
            onOpen: function(ws, response) {},
            onMessage: function(ws, text) {},
            onClosing: function(ws, code, reason) { ws.close(1000, null); },
            onClosed: function(ws, code, reason) { _remoteWs = null; },
            onFailure: function(ws, t, response) { _remoteWs = null; }
        }));
    } catch(e) {}
}

initRemoteWs();

threads.start(function() {
    while (true) {
        sleep(500);
        trySendRemoteLogs();
    }
});

log = function() {
    var args = Array.prototype.slice.call(arguments).join(' ');
    sendRemoteLog('[脚本] ' + args, 'info');
    _origLog.apply(null, arguments);
};

console.log = function() {
    var args = Array.prototype.slice.call(arguments).join(' ');
    sendRemoteLog('[脚本] ' + args, 'info');
    _origConsoleLog.apply(console, arguments);
};
`.replace('__DEVICE_ID__', deviceId).replace('__SERVER_URL__', serverUrl);
                    files.write(filePath, logInterceptor + msg.content);
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
                try { click(msg.x, msg.y); } catch (e) { }
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
                        swipe(w / 2, h * 0.6, w / 2, h * 0.4, 300);
                        log("上滑");
                    } else if (msg.keyCode === 20) {  // DPAD_DOWN - 用滑动代替
                        swipe(w / 2, h * 0.4, w / 2, h * 0.6, 300);
                        log("下滑");
                    } else if (msg.keyCode === 21) {  // DPAD_LEFT - 用滑动代替
                        swipe(w * 0.7, h / 2, w * 0.3, h / 2, 300);
                        log("左滑");
                    } else if (msg.keyCode === 22) {  // DPAD_RIGHT - 用滑动代替
                        swipe(w * 0.3, h / 2, w * 0.7, h / 2, 300);
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
                try { app.launchPackage("com.tencent.mobileqq"); } catch (e) { }
                w.send(JSON.stringify({ status: 'done', msg: 'QQ已启动', deviceId: currentDeviceId }));
                break;

            case 'openApp':
                try { app.launchPackage(msg.packageName); } catch (e) { }
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
        case 'updateScreenShareConfig':
            // 更新屏幕共享配置
            if (msg.config) {
                if (typeof msg.config.scale === 'number') {
                    screenShareConfig.scale = Math.max(0.1, Math.min(1.0, msg.config.scale));
                }
                if (typeof msg.config.quality === 'number') {
                    screenShareConfig.quality = Math.max(10, Math.min(100, msg.config.quality));
                }
                appendLog("屏幕共享配置已更新: 缩放=" + screenShareConfig.scale + ", 质量=" + screenShareConfig.quality);
            }
            w.send(JSON.stringify({ action: 'remoteAck', type: 'updateScreenShareConfig', status: 'done', config: screenShareConfig, deviceId: currentDeviceId }));
            break;
        case 'stopScreenShare':
            stopScreenShare();
            w.send(JSON.stringify({ action: 'remoteAck', type: 'stopScreenShare', status: 'stopped', deviceId: currentDeviceId }));
            break;
        case 'connect':
            // 连接时发送当前配置给服务端
            w.send(JSON.stringify({ action: 'remoteAck', type: 'connect', status: 'done', screenShareConfig: screenShareConfig, deviceId: currentDeviceId }));
            break;
        case 'disconnect':
            stopScreenShare();
            w.send(JSON.stringify({ action: 'remoteAck', type: 'disconnect', status: 'done', deviceId: currentDeviceId }));
            break;
        case 'requestScreen':
            if (!hasScreenCapturePermission) {
                // 这里在消息处理上下文中，需要在新线程执行
                threads.start(function () {
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
            try { app.launchApp('云控'); } catch (e) { }
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
        threads.start(function () {
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
                // 使用可配置的缩放和质量
                let scaledImg = images.scale(img, screenShareConfig.scale, screenShareConfig.scale);
                let imgBase64 = images.toBase64(scaledImg, "png", screenShareConfig.quality);
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
        try { screenShareThread.interrupt(); } catch (e) { }
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
        connectionThread = threads.start(function () {
            connectToServer(addr, uname, devId);
        });
    }
});

ui.dkklog.on("click", function () {
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
            swipe(w / 2, h * 0.6, w / 2, h * 0.4, 300);
            log("上滑");
        } else if (keyCode === 20) {  // DPAD_DOWN - 用滑动代替
            swipe(w / 2, h * 0.4, w / 2, h * 0.6, 300);
            log("下滑");
        } else if (keyCode === 21) {  // DPAD_LEFT - 用滑动代替
            swipe(w * 0.7, h / 2, w * 0.3, h / 2, 300);
            log("左滑");
        } else if (keyCode === 22) {  // DPAD_RIGHT - 用滑动代替
            swipe(w * 0.3, h / 2, w * 0.7, h / 2, 300);
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
// 延迟初始化 UI 状态和前台服务
threads.start(function () {
    sleep(500);
    refreshUIState();
    if ($settings.isEnabled("foreground_service")) {
        foregroundServiceEnabled = true;
        startForegroundService();
    }
});

setInterval(() => { }, 1000);