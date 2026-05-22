"ui";
//2026-3-12-11点
importClass(java.net.HttpURLConnection);
importClass(java.net.URL);
importClass(java.io.File);
importClass(java.io.FileOutputStream);
importClass(android.graphics.Color);
importClass(android.animation.ObjectAnimator);
importClass("java.net.InetAddress");
importClass("java.net.NetworkInterface");
importClass("java.net.Inet6Address");
importClass(android.view.View);
importPackage(com.powerX.httpClient);
importClass(java.io.BufferedReader);
importClass(java.io.IOException);
importClass(java.io.InputStream);
importClass(java.io.InputStreamReader);
importClass(java.io.OutputStream);
importClass(java.net.HttpURLConnection);
importClass(java.net.MalformedURLException);
importClass(java.net.URL);
importClass(android.view.WindowManager);
importClass(java.io.File);
importClass(java.io.FileOutputStream);


// var color = "#009688";
var color = "#222222";

ui.statusBarColor("#222222")


ui.layout(
    <drawer id="drawer">
        <vertical>
            <appbar>
                <toolbar id="toolbar" bg="#222222" title="dy评论" />
                <tabs id="tabs" bg="#222222" />
            </appbar>
            <viewpager id="viewpager">
                
                <frame>
                    <ScrollView>
                        <frame>
                            
                            <vertical id="lianxin_zs" padding="16 8" w="*">
                                <vertical gravity="center" layout_weight="1">
                                    <card w="*" h="50" margin="10 5" cardCornerRadius="2dp" cardElevation="1dp" foreground="?selectableItemBackground">
                                        <horizontal gravity="center_vertical">
                                            <vertical padding="10 8" h="auto" w="0" layout_weight="1">
                                                <text text="脚本选择" textColor="#222222" textSize="16sp" maxLines="1" />
                                            </vertical>
                                            <spinner id="script_chosen" marginLeft="4" marginRight="6" entries="dy评论1|dy评论2|3" />
                                        </horizontal>
                                    </card>
                                    <horizontal gravity="center_vertical">
                                        <card w="*" h="55" margin="10 5" cardCornerRadius="2dp" cardElevation="1dp" foreground="?selectableItemBackground" layout_weight="1">
                                            <horizontal gravity="center_vertical">
                                                <vertical padding="10 8" h="auto" w="0" layout_weight="1">
                                                    <text text="无障碍服务" textColor="#222222" textSize="16sp" maxLines="1" />
                                                    <text text="请确保开启" textColor="#999999" textSize="14sp" maxLines="1" />
                                                </vertical>
                                                <checkbox id="autoService" marginLeft="4" marginRight="6" checked="{{auto.service != null}}" />
                                            </horizontal>
                                        </card>
                                        <card w="*" h="55" margin="10 5" cardCornerRadius="2dp" cardElevation="1dp" foreground="?selectableItemBackground" layout_weight="1">
                                            <horizontal gravity="center_vertical">
                                                <vertical padding="10 8" h="auto" w="0" layout_weight="1">
                                                    <text text="悬浮窗权限" textColor="#222222" textSize="16sp" maxLines="1" />
                                                    <text text="请确保开启" textColor="#999999" textSize="14sp" maxLines="1" />
                                                </vertical>
                                                <checkbox id="consoleshow" marginLeft="4" marginRight="6" checked="{{floaty.checkPermission()}}" />
                                            </horizontal>
                                        </card>
                                    </horizontal>
                                    
                                    
                                </vertical>
                                <button h="40" layout_gravity="center" id="log" textSize="16sp" text="查看日志" />
                                <button id="start" text="开 始 运 行" textSize="16sp" color="#ffffff" bg="#222222" foreground="?selectableItemBackground" />
                                <horizontal margin="6 0">
                                    <text text="限制评论区用户名" textColor="#000000" marginLeft="8"/>
                                    <input id="lianxin_zs_xzyhm" text="" hint="dy用户名，支持多个输入/分割" textSize="12sp" w="200" gravity="center"/>
                                </horizontal>
                                <!-- 搜索设置 -->
                                <horizontal gravity="center_vertical" padding="5 5">
                                    <View bg="#00BFFF" h="*" w="10"/>
                                    <vertical padding="10 8" h="auto" w="0" layout_weight="1">
                                        <text text="搜索关键词模式" textColor="#222222" textSize="15sp"/>
                                    </vertical>
                                    <checkbox id="lianxin_zs_shousuo" marginLeft="4" marginRight="6" checked="true"/>
                                </horizontal>
                                
                                
                                <!-- 搜索模式选择 -->
                                <vertical margin="8 2 8 8" padding="5">
                                    <text text="搜索模式:" textColor="#666666" textSize="13sp" marginBottom="5"/>
                                    <radiogroup id="searchModeGroup">
                                        <radio text="多个关键词一轮搜索（遍历完结束）" id="searchMode0" checked="true"/>
                                        <radio text="一个关键词无限搜索（循环第一个）" id="searchMode1"/>
                                        <radio text="多个关键词无限轮（循环所有）" id="searchMode2"/>
                                    </radiogroup>
                                </vertical>
                                
                                <horizontal margin="6 0">
                                    <text text="搜索关键词内容" textColor="#000000" marginLeft="8"/>
                                    <input id="lianxin_zs_gjcnr" text="" hint="输入关键词内容" textSize="12sp" w="200" gravity="center"/>
                                </horizontal>
                                <horizontal gravity="center_vertical" padding="5 5">
                                    <View bg="#00BFFF" h="*" w="10"/>
                                    <vertical padding="10 8" h="auto" w="0" layout_weight="1">
                                        <text text="筛选功能" textColor="#222222" textSize="15sp"/>
                                    </vertical>
                                    <checkbox id="lianxin_zs_shousuosx" marginLeft="4" marginRight="6" checked="true"/>
                                </horizontal>
                                <!-- 筛选条件 -->
                                <card w="*" margin="0 0 8 0" cardCornerRadius="4" cardElevation="1">
                                    <vertical padding="8 8">
                                        <!-- 排序方式 -->
                                        <text text="排序方式" textSize="16sp" textColor="#222222" marginBottom="4"/>
                                        <horizontal gravity="center" w="*">
                                            <checkbox id="lianxin_zs_zhpx" text="综合排序" w="0" layout_weight="1" margin="2"textSize="12sp" height="36dp"checked="true"/>
                                            <checkbox id="lianxin_zs_zxfb" text="最新发布" w="0" layout_weight="1" margin="2"textSize="12sp" height="36dp"checked="false"/>
                                            <checkbox id="lianxin_zs_zddz" text="最多点赞" w="0" layout_weight="1" margin="2"textSize="12sp" height="36dp"checked="false"/>
                                        </horizontal>
                                        
                                        <!-- 发布时间 -->
                                        <text text="发布时间" textSize="16sp" textColor="#222222" marginTop="12" marginBottom="4"/>
                                        <horizontal gravity="center" w="*">
                                            <checkbox id="lianxin_zs_sjbx" text="时间不限" w="0" layout_weight="1" margin="2"
                                            textSize="12sp" height="36dp"checked="true"/>
                                            <checkbox id="lianxin_zs_ytn" text="一天内" w="0" layout_weight="1" margin="2"
                                            textSize="12sp" height="36dp"checked="false"/>
                                            <checkbox id="lianxin_zs_yzn" text="一周内" w="0" layout_weight="1" margin="2"
                                            textSize="12sp" height="36dp"checked="false"/>
                                            <checkbox id="lianxin_zs_bnn" text="半年内" w="0" layout_weight="1" margin="2"
                                            textSize="12sp" height="36dp"checked="false"/>
                                        </horizontal>
                                        
                                        <!-- 视频时长 -->
                                        <text text="视频时长" textSize="16sp" textColor="#222222" marginTop="12" marginBottom="4"/>
                                        <horizontal gravity="center" w="*">
                                            <checkbox id="lianxin_zs_scbx" text="时长不限" w="0" layout_weight="1" margin="2"
                                            textSize="12sp" height="36dp"checked="true"/>
                                            <checkbox id="lianxin_zs_yfzyx" text="1分钟以下" w="0" layout_weight="1" margin="2"
                                            textSize="12sp" height="36dp"checked="false"/>
                                            <checkbox id="lianxin_zs_yzwfz" text="1-5分钟" w="0" layout_weight="1" margin="2"
                                            textSize="12sp" height="36dp"checked="false"/>
                                            <checkbox id="lianxin_zs_wfzys" text="5分钟以上" w="0" layout_weight="1" margin="2"
                                            textSize="12sp" height="36dp"checked="false"/>
                                        </horizontal>
                                        
                                        <!-- 观看状态 -->
                                        <text text="观看状态" textSize="16sp" textColor="#222222" marginTop="12" marginBottom="4"/>
                                        <horizontal gravity="center" w="*">
                                            <checkbox id="lianxin_zs_gkzdbx" text="观看不限" w="0" layout_weight="1" margin="2"
                                            textSize="12sp" height="36dp"checked="true"/>
                                            <checkbox id="lianxin_zs_gzdr" text="关注的人" w="0" layout_weight="1" margin="2"
                                            textSize="12sp" height="36dp"checked="false"/>
                                            <checkbox id="lianxin_zs_zjkg" text="最近看过" w="0" layout_weight="1" margin="2"
                                            textSize="12sp" height="36dp"checked="false"/>
                                            <checkbox id="lianxin_zs_hwkg" text="还未看过" w="0" layout_weight="1" margin="2"
                                            textSize="12sp" height="36dp"checked="false"/>
                                        </horizontal>
                                    </vertical>
                                </card>
                                <!-- 其他设置 -->
                                <card w="*" margin="0 0 8 0" cardCornerRadius="4" cardElevation="1">
                                    <vertical padding="8 8">
                                        <horizontal gravity="center_vertical" padding="5 5">
                                            <View bg="#00BFFF" h="*" w="10"/>
                                            <vertical padding="10 8" h="auto" w="0" layout_weight="1">
                                                <text text="热点" textColor="#222222" textSize="15sp"/>
                                            </vertical>
                                            <checkbox id="lianxin_zs_redian" marginLeft="4" marginRight="6" checked="false"/>
                                        </horizontal>
                                        
                                        <horizontal gravity="center_vertical" padding="5 5">
                                            <View bg="#00BFFF" h="*" w="10"/>
                                            <vertical padding="10 8" h="auto" w="0" layout_weight="1">
                                                <text text="同城" textColor="#222222" textSize="15sp"/>
                                            </vertical>
                                            <checkbox id="lianxin_zs_tongcen" marginLeft="4" marginRight="6" checked="false"/>
                                        </horizontal>
                                        
                                        <horizontal margin="6 0">
                                            <text text="同城名称" textColor="#000000" marginLeft="8"/>
                                            <input id="lianxin_zs_tcmc" text="" hint="输入同城城市名称" textSize="12sp" w="200" gravity="center"/>
                                        </horizontal>
                                        
                                        <horizontal margin="6 0">
                                            <checkbox id="lianxin_zs_glsfwjc" marginLeft="4" marginRight="6" checked="false"/>
                                            
                                            <text text="公里范围:" textColor="#000000" textSize="14sp" marginLeft="8"/>
                                            <input id="lianxin_zs_gls" text="" hint="1" w="40" textSize="11sp" gravity="center"/>
                                            <text text="—" textColor="#000000" marginLeft="2" marginRight="2"/>
                                            <input id="lianxin_zs_gls1" text="" hint="10" w="40" textSize="11sp" gravity="center"/>
                                            <text text="公里" textColor="#000000" textSize="11sp" marginLeft="4"/>
                                        </horizontal>
                                    </vertical>
                                </card>
                                
                                <!-- 评论设置 -->
                                <card w="*" margin="0 0 8 0" cardCornerRadius="4" cardElevation="1">
                                    <vertical padding="8 8">
                                        <horizontal gravity="center_vertical" padding="5 5">
                                            <View bg="#00BFFF" h="*" w="10"/>
                                            <vertical padding="10 8" h="auto" w="0" layout_weight="1">
                                                <text text="是否开启视频博主评论" textColor="#222222" textSize="15sp"/>
                                            </vertical>
                                            <checkbox id="lianxin_zs_spbzpl" marginLeft="4" marginRight="6" checked="true"/>
                                        </horizontal>
                                        <horizontal gravity="center_vertical" padding="5 5">
                                            <View bg="#00BFFF" h="*" w="10"/>
                                            <vertical padding="10 8" h="auto" w="0" layout_weight="1">
                                                <text text="是否开启评论区用户评论" textColor="#222222" textSize="15sp"/>
                                            </vertical>
                                            <checkbox id="lianxin_zs_pinglunyfpl" marginLeft="4" marginRight="6" checked="true"/>
                                        </horizontal>
                                        <horizontal margin="6 0">
                                            <text text="评论内容" textColor="#000000" marginLeft="8"/>
                                            <input id="lianxin_zs_dzhnr" text="" hint="多条内容用/分割" textSize="12sp" w="200" gravity="center"/>
                                        </horizontal>
                                        <horizontal gravity="center_vertical" padding="5 5">
                                            <View bg="#00BFFF" h="*" w="10"/>
                                            <vertical padding="10 8" h="auto" w="0" layout_weight="1">
                                                <text text="评论上限是否重启自动换号" textColor="#222222" textSize="15sp"/>
                                            </vertical>
                                            <checkbox id="lianxin_zs_plsxzq" marginLeft="4" marginRight="6" checked="true"/>
                                        </horizontal>
                                          <horizontal margin="6 0">
                                    <text text="设定多久时间重启一次" textColor="#000000" marginLeft="8"/>
                                    <input id="lianxin_zs_restartInterval" text="" hint="分钟" textSize="12sp" w="200" gravity="center"/>
                                </horizontal>
                                        <horizontal gravity="center_vertical" padding="5 5">
                                            <View bg="#00BFFF" h="*" w="10"/>
                                            <vertical padding="10 8" h="auto" w="0" layout_weight="1">
                                                <text text="切换账号后重置搜索" textColor="#222222" textSize="15sp"/>
                                            </vertical>
                                            <checkbox id="lianxin_zs_qhzhhsfcz" marginLeft="4" marginRight="6" checked="true"/>
                                        </horizontal>
                                        <horizontal gravity="center_vertical" padding="5 5">
                                            <View bg="#00BFFF" h="*" w="10"/>
                                            <vertical padding="10 8" h="auto" w="0" layout_weight="1">
                                                <text text="是否开启私信" textColor="#222222" textSize="15sp"/>
                                            </vertical>
                                            <checkbox id="lianxin_zs_sfkqsx" marginLeft="4" marginRight="6" checked="true"/>
                                        </horizontal>
                                        <text text="评论内容每次随机一条" textColor="red" textSize="11sp" marginLeft="8" marginTop="4"/>
                                        
                                        <horizontal margin="6 0" marginTop="8">
                                            <text text="上滑视频随机延时进评论区:" textColor="#000000" textSize="14sp" marginLeft="8"/>
                                            <input id="lianxin_zs_kspplys" text="" hint="" w="40" textSize="11sp" gravity="center"/>
                                            <text text="—" textColor="#000000" marginLeft="2" marginRight="2"/>
                                            <input id="lianxin_zs_kspplys1" text="" hint="" w="40" textSize="11sp" gravity="center"/>
                                            <text text="秒" textColor="#000000" textSize="11sp" marginLeft="4"/>
                                        </horizontal>
                                        <text text="【随机等待，自定义修改】" textColor="red" textSize="8sp" marginLeft="8" textStyle="bold"/>
                                        
                                        <horizontal margin="6 0" marginTop="8">
                                            <text text="评论前随机延时:" textColor="#000000" textSize="14sp" marginLeft="8"/>
                                            <input id="lianxin_zs_plqys" text="" hint="" w="40" textSize="11sp" gravity="center"/>
                                            <text text="—" textColor="#000000" marginLeft="2" marginRight="2"/>
                                            <input id="lianxin_zs_plqys1" text="" hint="" w="40" textSize="11sp" gravity="center"/>
                                            <text text="秒" textColor="#000000" textSize="11sp" marginLeft="4"/>
                                        </horizontal>
                                        <text text="【随机等待，自定义修改】" textColor="red" textSize="8sp" marginLeft="8" textStyle="bold"/>
                                    </vertical>
                                </card>
                                
                                <!-- 其他功能设置 -->
                                <card w="*" margin="0 0 8 0" cardCornerRadius="4" cardElevation="1">
                                    <vertical padding="8 8">
                                        <horizontal margin="6 0">
                                            <text text="随机延时点用户:" textColor="#000000" textSize="14sp" marginLeft="8"/>
                                            <input id="lianxin_zs_djyfys" text="" hint="" w="40" textSize="11sp" gravity="center"/>
                                            <text text="—" textColor="#000000" marginLeft="2" marginRight="2"/>
                                            <input id="lianxin_zs_djyfys1" text="" hint="" w="40" textSize="11sp" gravity="center"/>
                                            <text text="秒" textColor="#000000" textSize="11sp" marginLeft="4"/>
                                        </horizontal>
                                        <text text="【随机等待，自定义修改】" textColor="red" textSize="8sp" marginLeft="8" textStyle="bold"/>
                                        
                                        <horizontal margin="6 0" marginTop="8">
                                            <text text="私信随机延时时间:" textColor="#000000" textSize="14sp" marginLeft="8"/>
                                            <input id="lianxin_zs_sxys" text="" hint="" w="40" textSize="11sp" gravity="center"/>
                                            <text text="—" textColor="#000000" marginLeft="2" marginRight="2"/>
                                            <input id="lianxin_zs_sxys1" text="" hint="" w="40" textSize="11sp" gravity="center"/>
                                            <text text="秒" textColor="#000000" textSize="11sp" marginLeft="4"/>
                                        </horizontal>
                                        <text text="【随机等待，自定义修改】" textColor="red" textSize="8sp" marginLeft="8" textStyle="bold"/>
                                    </vertical>
                                </card>
                                
                                <!-- 操作按钮 -->
                                <horizontal margin="8 0">
                                    <button id="dzhcsh" text="清理缓存记录" textSize="12sp" layout_weight="1" margin="2" style="Widget.AppCompat.Button.Colored"/>
                                    <button id="dcdcjl" text="导出记录" textSize="12sp" layout_weight="1" margin="2" style="Widget.AppCompat.Button.Colored"/>
                                    <button id="drjl" text="导入记录" textSize="12sp" layout_weight="1" margin="2" style="Widget.AppCompat.Button.Colored"/>
                                </horizontal>
                                
                                
                            </vertical>
                            
                        </frame>
                    </ScrollView>
                    
                </frame>
                
                
                
            </viewpager>
        </vertical>
    </drawer>
);



http.__okhttp__.setTimeout(20000);


var GLOBAL_CONFIG = storages.create("GLOBAL_CONFIG");
var lianxin_zs_CONFIG = storages.create("lianxin_zs_CONFIG");
var STUDY_CONFIG = storages.create("STUDY_CONFIG");
var storage = storages.create("storage");
var lianxin_storage = storages.create("lianxin_storage");
var storage2 = storages.create("storage2");
var BAIDUAPI = storages.create("BAIDUAPI");
var 用户记录 = storages.create("user_record");


var execution = "";
var thread = null;
var remoteLogListener = null;
var remoteLogThread = null;
var remoteScriptEngine = null;
var console_floaty = null;
Initialize();
// 读取脚本设置
function Initialize() {
    ui.script_chosen.setSelection(GLOBAL_CONFIG.get("script_chosen", 0));

    // 搜索设置
    ui.lianxin_zs_shousuo.setChecked(lianxin_storage.get("shousuo", false));
    ui.lianxin_zs_shousuosx.setChecked(lianxin_storage.get("shousuosx", false));
    ui.lianxin_zs_gjcnr.setText(lianxin_storage.get("gjcnr", ""));

    // 热点和同城设置
    ui.lianxin_zs_redian.setChecked(lianxin_storage.get("redian", false));
    ui.lianxin_zs_tongcen.setChecked(lianxin_storage.get("tongcen", false));
    ui.lianxin_zs_tcmc.setText(lianxin_storage.get("tcmc", ""));

    ui.lianxin_zs_zhpx.setChecked(lianxin_storage.get("zhpx", true));
    ui.lianxin_zs_zxfb.setChecked(lianxin_storage.get("zxfb", false));
    ui.lianxin_zs_zddz.setChecked(lianxin_storage.get("zddz", false));

    ui.lianxin_zs_sjbx.setChecked(lianxin_storage.get("sjbx", true));
    ui.lianxin_zs_ytn.setChecked(lianxin_storage.get("ytn", false));
    ui.lianxin_zs_yzn.setChecked(lianxin_storage.get("yzn", false));
    ui.lianxin_zs_bnn.setChecked(lianxin_storage.get("bnn", false));

    ui.lianxin_zs_scbx.setChecked(lianxin_storage.get("scbx", true));
    ui.lianxin_zs_yfzyx.setChecked(lianxin_storage.get("yfzyx", false));
    ui.lianxin_zs_yzwfz.setChecked(lianxin_storage.get("yzwfz", false));
    ui.lianxin_zs_wfzys.setChecked(lianxin_storage.get("wfzys", false));

    ui.lianxin_zs_gkzdbx.setChecked(lianxin_storage.get("gkzdbx", true));
    ui.lianxin_zs_gzdr.setChecked(lianxin_storage.get("gzdr", false));
    ui.lianxin_zs_zjkg.setChecked(lianxin_storage.get("zjkg", false));
    ui.lianxin_zs_hwkg.setChecked(lianxin_storage.get("hwkg", false));

    // 评论设置
    ui.lianxin_zs_dzhnr.setText(lianxin_storage.get("dzhnr", ""));
    ui.lianxin_zs_kspplys.setText(lianxin_storage.get("kspplys", ""));
    ui.lianxin_zs_kspplys1.setText(lianxin_storage.get("kspplys1", ""));
    ui.lianxin_zs_plqys.setText(lianxin_storage.get("plqys", ""));
    ui.lianxin_zs_plqys1.setText(lianxin_storage.get("plqys1", ""));

    // 其他功能设置
    ui.lianxin_zs_gls.setText(lianxin_storage.get("gls", ""));
    ui.lianxin_zs_gls1.setText(lianxin_storage.get("gls1", ""));
    ui.lianxin_zs_glsfwjc.setChecked(lianxin_storage.get("glsfwjc", false));
    ui.lianxin_zs_djyfys.setText(lianxin_storage.get("djyfys", ""));
    ui.lianxin_zs_djyfys1.setText(lianxin_storage.get("djyfys1", ""));
    ui.lianxin_zs_sxys.setText(lianxin_storage.get("sxys", ""));
    ui.lianxin_zs_sxys1.setText(lianxin_storage.get("sxys1", ""));
    ui.lianxin_zs_pinglunyfpl.setChecked(lianxin_storage.get("pinglunyfpl", false));
    ui.lianxin_zs_spbzpl.setChecked(lianxin_storage.get("spbzpl", false));
    ui.lianxin_zs_xzyhm.setText(lianxin_storage.get("zs_xzyhm", ""));
    ui.lianxin_zs_plsxzq.setChecked(lianxin_storage.get("zs_plsxzq", false));
    ui.lianxin_zs_sfkqsx.setChecked(lianxin_storage.get("zs_sfkqsx", false));
    ui.lianxin_zs_restartInterval.setText(lianxin_storage.get("zs_restartInterval", ""));

ui.lianxin_zs_xzyhm.setText(lianxin_storage.get("zs_xzyhm", ""));

    // 读取搜索模式
    var searchMode = lianxin_storage.get("searchMode", 0);
    switch (searchMode) {
        case 0:
            ui.searchMode0.setChecked(true);
            break;
        case 1:
            ui.searchMode1.setChecked(true);
            break;
        case 2:
            ui.searchMode2.setChecked(true);
            break;
        default:
            ui.searchMode0.setChecked(true);
    }

    toastLog("读取配置成功");
}

// 排序方式（单选）
ui.lianxin_zs_zhpx.on("check", checked => {
    if (checked) {
        ui.lianxin_zs_zxfb.checked = false;
        ui.lianxin_zs_zddz.checked = false;
    }
});
ui.lianxin_zs_zxfb.on("check", checked => {
    if (checked) {
        ui.lianxin_zs_zhpx.checked = false;
        ui.lianxin_zs_zddz.checked = false;
    }
});
ui.lianxin_zs_zddz.on("check", checked => {
    if (checked) {
        ui.lianxin_zs_zhpx.checked = false;
        ui.lianxin_zs_zxfb.checked = false;
    }
});

// 发布时间（单选）
ui.lianxin_zs_sjbx.on("check", checked => {
    if (checked) {
        ui.lianxin_zs_ytn.checked = false;
        ui.lianxin_zs_yzn.checked = false;
        ui.lianxin_zs_bnn.checked = false;
    }
});
ui.lianxin_zs_ytn.on("check", checked => {
    if (checked) {
        ui.lianxin_zs_sjbx.checked = false;
        ui.lianxin_zs_yzn.checked = false;
        ui.lianxin_zs_bnn.checked = false;
    }
});
ui.lianxin_zs_yzn.on("check", checked => {
    if (checked) {
        ui.lianxin_zs_sjbx.checked = false;
        ui.lianxin_zs_ytn.checked = false;
        ui.lianxin_zs_bnn.checked = false;
    }
});
ui.lianxin_zs_bnn.on("check", checked => {
    if (checked) {
        ui.lianxin_zs_sjbx.checked = false;
        ui.lianxin_zs_ytn.checked = false;
        ui.lianxin_zs_yzn.checked = false;
    }
});

// 视频时长（单选）
ui.lianxin_zs_scbx.on("check", checked => {
    if (checked) {
        ui.lianxin_zs_yfzyx.checked = false;
        ui.lianxin_zs_yzwfz.checked = false;
        ui.lianxin_zs_wfzys.checked = false;
    }
});
ui.lianxin_zs_yfzyx.on("check", checked => {
    if (checked) {
        ui.lianxin_zs_scbx.checked = false;
        ui.lianxin_zs_yzwfz.checked = false;
        ui.lianxin_zs_wfzys.checked = false;
    }
});
ui.lianxin_zs_yzwfz.on("check", checked => {
    if (checked) {
        ui.lianxin_zs_scbx.checked = false;
        ui.lianxin_zs_yfzyx.checked = false;
        ui.lianxin_zs_wfzys.checked = false;
    }
});
ui.lianxin_zs_wfzys.on("check", checked => {
    if (checked) {
        ui.lianxin_zs_scbx.checked = false;
        ui.lianxin_zs_yfzyx.checked = false;
        ui.lianxin_zs_yzwfz.checked = false;
    }
});

// 观看状态（单选）
ui.lianxin_zs_gkzdbx.on("check", checked => {
    if (checked) {
        ui.lianxin_zs_gzdr.checked = false;
        ui.lianxin_zs_zjkg.checked = false;
        ui.lianxin_zs_hwkg.checked = false;
    }
});
ui.lianxin_zs_gzdr.on("check", checked => {
    if (checked) {
        ui.lianxin_zs_gkzdbx.checked = false;
        ui.lianxin_zs_zjkg.checked = false;
        ui.lianxin_zs_hwkg.checked = false;
    }
});
ui.lianxin_zs_zjkg.on("check", checked => {
    if (checked) {
        ui.lianxin_zs_gkzdbx.checked = false;
        ui.lianxin_zs_gzdr.checked = false;
        ui.lianxin_zs_hwkg.checked = false;
    }
});
ui.lianxin_zs_hwkg.on("check", checked => {
    if (checked) {
        ui.lianxin_zs_gkzdbx.checked = false;
        ui.lianxin_zs_gzdr.checked = false;
        ui.lianxin_zs_zjkg.checked = false;
    }
});

// 热点、同城、搜索关键词三个互斥的实现
ui.lianxin_zs_shousuo.on("check", checked => {
    if (checked) {
        ui.lianxin_zs_redian.checked = false;
        ui.lianxin_zs_tongcen.checked = false;
    }
});

ui.lianxin_zs_redian.on("check", checked => {
    if (checked) {
        ui.lianxin_zs_shousuo.checked = false;
        ui.lianxin_zs_tongcen.checked = false;
    }
});

ui.lianxin_zs_tongcen.on("check", checked => {
    if (checked) {
        ui.lianxin_zs_shousuo.checked = false;
        ui.lianxin_zs_redian.checked = false;
    }
});

// 创建选项菜单(右上角)
ui.emitter.on("create_options_menu", menu => {
    menu.add("日志");
    //menu.add("关于");
    //menu.add("Github");
    //menu.add("V2.33.0下载");
});

// 监听选项菜单点击
ui.emitter.on("options_item_selected", (e, item) => {
    switch (item.getTitle()) {
        case "日志":
            app.startActivity("console");
            break;
            // case "关于":
            //     alert("关于", "vx消息助手 " + latest_version);
            //     break;
            // case "Github":
            //     app.openUrl("https://github.com/sec-an/Better-Auto-XXQG");
            //     break;
            // case "V2.33.0下载":
            //     app.openUrl("https://android-apps.pp.cn/fs08/2021/12/28/3/110_f37c420b0944cb7b9f60a2ad9b5518d2.apk?yingid=web_space&packageid=500730793&md5=664bb7bdcae57be189fc86100f4371c4&minSDK=21&size=191654161&shortMd5=1fee0bd160d08108a9d9e5f4773ce741&crc32=3879122865&did=ad484a175e19d0928044435e24bf03cb");
            //     break;
    }
    e.consumed = true;
});
activity.setSupportActionBar(ui.toolbar);

// 设置滑动页面的标题
ui.viewpager.setTitles(["首页", "脚本配置"]);
// 让滑动页面和标签栏联动
ui.tabs.setupWithViewPager(ui.viewpager);

// 脚本选择监听
var script_chosen_Listener = new android.widget.AdapterView.OnItemSelectedListener({
    onItemSelected: function(parent, view, position, id) {
        toastLog('选择脚本：' + ui.script_chosen.getSelectedItem());
        if (ui.script_chosen.getSelectedItemPosition() == 0) {
            // ui.ttxs.visibility = 8;

            ui.lianxin_zs.visibility = 0;
            // ui.ksjsgg.visibility = 8;
            // ui.ksjsgg2.visibility = 8
            // ui.ksjssp.visibility = 8;
            // ui.lianxin_zs2.visibility = 8;
            // ui.wxgzh.visibility = 8;
            // ui.dyjsjj.visibility = 8;
            // ui.baiduYj.visibility = 8;
            // ui.cshj.visibility = 8;
            // ui.ttxs_xxx.visibility = 0;
            // ui.ttxs_qltck.visibility = 8;
        } else if (ui.script_chosen.getSelectedItemPosition() == 1) {
            // ui.lianxin_zs.visibility = 8;

            // ui.ttxs.visibility = 8;
            // ui.ksjsgg.visibility = 8;
            // ui.ksjsgg2.visibility = 8
            // ui.ksjssp.visibility = 8;
            // ui.lianxin_zs2.visibility = 8;
            // ui.wxgzh.visibility = 8;
            // ui.dyjsjj.visibility = 8;
            // ui.baiduYj.visibility = 8;
            // ui.cshj.visibility = 8;
            // ui.ttxs_xxx.visibility = 8;
            // ui.ttxs_qltck.visibility = 8;
        } else if (ui.script_chosen.getSelectedItemPosition() == 2) {
            // ui.lianxin_zs.visibility = 8;
            // ui.ttxs.visibility = 8;
            // ui.ttxs_qltck.visibility = 8;
            // ui.ksjsgg.visibility = 8;
            // ui.ksjsgg2.visibility = 8
            // ui.ksjssp.visibility = 8;
            // ui.lianxin_zs2.visibility = 8;
            // ui.wxgzh.visibility = 8;
            // ui.dyjsjj.visibility = 8;
            // ui.baiduYj.visibility = 8;
            // ui.cshj.visibility = 8;
            // ui.ttxs_xxx.visibility = 8;
        } else if (ui.script_chosen.getSelectedItemPosition() == 3) {
            // ui.lianxin_zs.visibility = 8;
            // ui.ttxs.visibility = 8;

            // ui.ksjsgg.visibility = 8;
            // ui.ksjsgg2.visibility = 8
            // ui.ksjssp.visibility = 8;
            // ui.lianxin_zs2.visibility = 8;
            // ui.wxgzh.visibility = 8;
            // ui.dyjsjj.visibility = 8;
            // ui.baiduYj.visibility = 8;
            // ui.cshj.visibility = 8;
        } else if (ui.script_chosen.getSelectedItemPosition() == 4) {
            // ui.lianxin_zs.visibility = 8;
            // ui.ttxs.visibility = 8;

            // ui.ksjsgg.visibility = 8;
            // ui.ksjsgg2.visibility = 8
            // ui.ksjssp.visibility = 8;
            // ui.lianxin_zs2.visibility = 8;
            // ui.wxgzh.visibility = 8;
            // ui.dyjsjj.visibility = 0;
            // ui.baiduYj.visibility = 8;
            // ui.cshj.visibility = 8;
        } else if (ui.script_chosen.getSelectedItemPosition() == 5) {
            // ui.lianxin_zs.visibility = 8;
            // ui.ttxs.visibility = 8;

            // ui.ksjsgg.visibility = 8;
            // ui.ksjsgg2.visibility = 8
            // ui.ksjssp.visibility = 8;
            // ui.lianxin_zs2.visibility = 8;
            // ui.wxgzh.visibility = 0;
            // ui.dyjsjj.visibility = 8;
            // ui.baiduYj.visibility = 8;
            // ui.cshj.visibility = 8;
        } else if (ui.script_chosen.getSelectedItemPosition() == 6) {
            // ui.lianxin_zs.visibility = 8;
            // ui.ttxs.visibility = 8;

            // ui.ksjsgg.visibility = 8;
            // ui.ksjsgg2.visibility = 8
            // ui.ksjssp.visibility = 8;
            // ui.lianxin_zs2.visibility = 8;
            // ui.wxgzh.visibility = 8;
            // ui.dyjsjj.visibility = 8;
            // ui.baiduYj.visibility = 8;
            // ui.cshj.visibility = 8;
        } else if (ui.script_chosen.getSelectedItemPosition() == 7) {
            // ui.lianxin_zs.visibility = 8;
            // ui.ttxs.visibility = 8;

            // ui.ksjsgg.visibility = 8;
            // ui.ksjsgg2.visibility = 8
            // ui.ksjssp.visibility = 8;
            // ui.lianxin_zs2.visibility = 8;
            // ui.wxgzh.visibility = 8;
            // ui.dyjsjj.visibility = 8;
            // ui.baiduYj.visibility = 0;
            // ui.cshj.visibility = 8;
        } else if (ui.script_chosen.getSelectedItemPosition() == 8) {
            // ui.lianxin_zs.visibility = 8;
            // ui.ttxs.visibility = 8;

            // ui.ksjsgg.visibility = 8;
            // ui.ksjsgg2.visibility = 8
            // ui.ksjssp.visibility = 8;
            // ui.lianxin_zs2.visibility = 8;
            // ui.wxgzh.visibility = 8;
            // ui.dyjsjj.visibility = 8;
            // ui.baiduYj.visibility = 8;
            // ui.cshj.visibility = 0;
        }

        GLOBAL_CONFIG.put("script_chosen", ui.script_chosen.getSelectedItemPosition());
    }
})
ui.script_chosen.setOnItemSelectedListener(script_chosen_Listener);

// 用户勾选无障碍服务的选项时，跳转到页面让用户去开启 
// android.permission.SYSTEM_ALERT_WINDOW
ui.autoService.on("check", function(checked) {
    if (checked && auto.service == null) {
        app.startActivity({
            action: "android.settings.ACCESSIBILITY_SETTINGS"
        });
    }
    if (!checked && auto.service != null) {
        auto.service.disableSelf();
    }
});

// 悬浮窗权限
ui.consoleshow.on("check", function(checked) {
    // 用户勾选悬浮窗权限的选项时，跳转到页面让用户去开启//
    try {
        app.startActivity({
            action: "android.settings.action.MANAGE_OVERLAY_PERMISSION",
        });
    } catch (error) {
        toast('当前设备不支持跳转设置,请手动开启权限!')
    }
});





// 当用户回到本界面时，resume事件会被触发
ui.emitter.on("resume", function() {
    // 此时根据无障碍服务的开启情况，同步开关的状态
    ui.autoService.checked = auto.service != null;
    ui.consoleshow.checked = floaty.checkPermission();
    //ui.consoleshow1.checked = notificationListenerEnable() != null;

});


ui.dzhcsh.on("click", function() {
    // 1. 仅清理用户名缓存
    清理用户名缓存(false);

    // 2. 仅清理用户ID缓存
    清理用户ID缓存(false);
    toastLog("已清除所有用户记录初始化");
});

// 导出记录
ui.dcdcjl.on("click", function() {
    try {
        FileChooserDialog({
            dir: "/sdcard/",
            title: "选择导出目录",
            canChoose: ["dir"],
            fileCallback: function(exportDir) {
                if (!exportDir) {
                    toastLog("已取消导出");
                    return;
                }

                try {
                    // 获取当前时间作为文件名
                    let date = new Date();
                    let timestamp = date.getFullYear() +
                        String(date.getMonth() + 1).padStart(2, '0') +
                        String(date.getDate()).padStart(2, '0') + '_' +
                        String(date.getHours()).padStart(2, '0') +
                        String(date.getMinutes()).padStart(2, '0') +
                        String(date.getSeconds()).padStart(2, '0');

                    // 如果目录不存在，创建目录
                    if (!files.exists(exportDir)) {
                        files.createWithDirs(exportDir);
                        console.log("目录创建成功: " + exportDir);
                    }

                    // 导出用户名记录
                    let clickedUsers = 用户记录.get("clickedUsers", []);
                    let hasUserData = clickedUsers && clickedUsers.length > 0;
                    let userFilePath = files.join(exportDir, "用户名记录_" + timestamp + ".txt");
                    let userFile = open(userFilePath, "w");
                    userFile.write(JSON.stringify(clickedUsers, null, 2));
                    userFile.close();
                    console.log("导出用户名记录: " + clickedUsers.length + " 条");

                    // 导出用户ID记录
                    let yfid = 用户记录.get("yfid", []);
                    let hasIdData = yfid && yfid.length > 0;
                    let idFilePath = files.join(exportDir, "用户ID记录_" + timestamp + ".txt");
                    let idFile = open(idFilePath, "w");
                    idFile.write(JSON.stringify(yfid, null, 2));
                    idFile.close();
                    console.log("导出用户ID记录: " + yfid.length + " 条");

                    // 显示导出结果
                    let resultText = "导出成功！\n";
                    resultText += "用户名记录: " + (hasUserData ? clickedUsers.length + " 条" : "无数据") + "\n";
                    resultText += "用户ID记录: " + (hasIdData ? yfid.length + " 条" : "无数据") + "\n";
                    resultText += "文件保存在: " + exportDir;
                    toastLog(resultText);
                } catch (e) {
                    console.log("导出失败: " + e);
                    toastLog("导出失败: " + e);
                }
            }
        }).show();
    } catch (e) {
        console.log("打开文件选择器失败: " + e);
        toastLog("打开文件选择器失败: " + e);
    }
});

// 导入记录
ui.drjl.on("click", function() {
    try {
        FileChooserDialog({
            dir: "/sdcard/",
            title: "选择导入文件",
            canChoose: ["file"],
            fileCallback: function(importFile) {
                if (!importFile) {
                    toastLog("已取消导入");
                    return;
                }

                try {
                    // 检查文件是否存在
                    if (!files.exists(importFile)) {
                        toastLog("文件不存在: " + importFile);
                        return;
                    }

                    // 读取文件内容
                    let content = files.read(importFile);
                    let data = JSON.parse(content);

                    // 获取文件名
                    let fileName = files.getName(importFile);

                    // 判断记录类型
                    let recordType;
                    if (fileName.includes("用户名记录")) {
                        recordType = "用户名";
                    } else if (fileName.includes("用户ID记录")) {
                        recordType = "用户ID";
                    } else {
                        // 让用户选择
                        let typeChoice = dialogs.select("请选择记录类型", ["用户名记录", "用户ID记录"]);
                        if (typeChoice === 0) {
                            recordType = "用户名";
                        } else if (typeChoice === 1) {
                            recordType = "用户ID";
                        } else {
                            toastLog("已取消导入");
                            return;
                        }
                    }

                    // 确认导入
                    let confirm = dialogs.confirm(
                        "确认导入",
                        "文件: " + fileName + "\n" +
                        "记录类型: " + recordType + "记录\n" +
                        "记录数量: " + data.length + " 条\n\n" +
                        "是否覆盖现有记录？"
                    );

                    if (!confirm) {
                        toastLog("已取消导入");
                        return;
                    }

                    // 导入数据
                    if (recordType === "用户名") {
                        用户记录.put("clickedUsers", data);
                        toastLog("导入用户名记录成功，共 " + data.length + " 条");
                        console.log("已导入用户名记录: " + importFile);
                    } else {
                        用户记录.put("yfid", data);
                        toastLog("导入用户ID记录成功，共 " + data.length + " 条");
                        console.log("已导入用户ID记录: " + importFile);
                    }

                } catch (e) {
                    console.log("导入文件失败: " + e);
                    toastLog("导入文件失败: " + e);
                }
            }
        }).show();
    } catch (e) {
        console.log("打开文件选择器失败: " + e);
        toastLog("打开文件选择器失败: " + e);
    }
});


/**
 * 清理用户名缓存
 * @param {boolean} 完全清理 - 是否完全清空存储(true)或仅清空用户名记录(false)
 */
function 清理用户名缓存(完全清理) {
    if (完全清理) {
        用户记录.clear();
        console.log("已清空所有用户记录存储");
    } else {
        用户记录.remove("clickedUsers");
        console.log("已清除用户名点击记录");
    }

    // 确保数据结构存在
    if (!用户记录.get("clickedUsers")) {
        用户记录.put("clickedUsers", []);
        console.log("已重新初始化用户名记录");
    }
};

/**
 * 清理用户ID缓存
 * @param {boolean} 完全清理 - 是否完全清空存储(true)或仅清空用户ID记录(false)
 */
function 清理用户ID缓存(完全清理) {
    if (完全清理) {
        用户记录.clear();
        console.log("已清空所有用户记录存储");
    } else {
        用户记录.remove("yfid");
        console.log("已清除用户ID记录");
    }

    // 确保数据结构存在
    if (!用户记录.get("yfid")) {
        用户记录.put("yfid", []);
        console.log("已重新初始化用户ID记录");
    }
};



// 打开日志
ui.log.on("click", function() {
    app.startActivity("console");
});


//小哥网络验证//
var url = "zcyx.xiaogezy.cn" //api请求域名
var appid = "10028" //应用id
var keymy = "6I1T1Z6C53qZ1TR1" //应用密钥
var rc4key = "XW8iiFRL47fNS4Nx" //RC4-2密钥

//--------------------------------------------------------------//
var sbm = device.getAndroidId(); //获取应用设备码


try {
    // 获取通知公告接口数据
    var noticeData = http.get(url + "/api.php?api=notice&app=" + appid).body.string();
    var noticeTemp = JSON.parse(RC4(rc4key, noticeData, 1));
    if (noticeTemp.msg.app_gg) {
        toastLog(noticeTemp.msg.app_gg);
    } else {
        // do nothing
    }

    // 获取应用信息接口数据
    var iniData = http.get(url + "/api.php?api=ini&app=" + appid).body.string();
    var iniTemp = JSON.parse(RC4(rc4key, iniData, 1));
    //toastLog(iniTemp)
    // 应用更新参数
    var version = iniTemp.msg.version; // 版本号
    var version_info = iniTemp.msg.version_info; // 应用版本信息
    var app_update_show = iniTemp.msg.app_update_show; // 更新内容
    var app_update_url = iniTemp.msg.app_update_url; // 更新app下载地址
    var app_updatie_must = iniTemp.msg.app_update_must; // 强制更新标识
    toastLog("正在加载脚本")
    //toastLog(app_update_show)
} catch (e) {
    toastLog("网络不稳定，稍等在启动") //("发生错误： " + e.message);
};

function bcsj_lize() {

    lianxin_storage.put("shousuo", ui.lianxin_zs_shousuo.isChecked());
    lianxin_storage.put("shousuosx", ui.lianxin_zs_shousuosx.isChecked());

    // 保存搜索模式
    var searchMode = 0;
    if (ui.searchMode0.isChecked()) {
        searchMode = 0;
    } else if (ui.searchMode1.isChecked()) {
        searchMode = 1;
    } else if (ui.searchMode2.isChecked()) {
        searchMode = 2;
    }
    lianxin_storage.put("searchMode", searchMode);


    lianxin_storage.put("redian", ui.lianxin_zs_redian.isChecked());
    lianxin_storage.put("tcmc", ui.lianxin_zs_tcmc.getText() + "");
    lianxin_storage.put("gjcnr", ui.lianxin_zs_gjcnr.getText() + "");

    lianxin_storage.put("dzhnr", ui.lianxin_zs_dzhnr.getText() + "");
    lianxin_storage.put("kspplys", ui.lianxin_zs_kspplys.getText() + "");
    lianxin_storage.put("kspplys1", ui.lianxin_zs_kspplys1.getText() + "");
    lianxin_storage.put("gls", ui.lianxin_zs_gls.getText() + "");
    lianxin_storage.put("gls1", ui.lianxin_zs_gls1.getText() + "");
    lianxin_storage.put("plqys", ui.lianxin_zs_plqys.getText() + "");
    lianxin_storage.put("plqys1", ui.lianxin_zs_plqys1.getText() + "");
    lianxin_storage.put("djyfys", ui.lianxin_zs_djyfys.getText() + "");
    lianxin_storage.put("djyfys1", ui.lianxin_zs_djyfys1.getText() + "");
    lianxin_storage.put("sxys", ui.lianxin_zs_sxys.getText() + "");
    lianxin_storage.put("sxys1", ui.lianxin_zs_sxys1.getText() + "");
    lianxin_storage.put("glsfwjc", ui.lianxin_zs_glsfwjc.isChecked());

    lianxin_storage.put("tongcen", ui.lianxin_zs_tongcen.isChecked());

    lianxin_storage.put("zhpx", ui.lianxin_zs_zhpx.isChecked());
    lianxin_storage.put("zxfb", ui.lianxin_zs_zxfb.isChecked());
    lianxin_storage.put("zddz", ui.lianxin_zs_zddz.isChecked());
    lianxin_storage.put("ytn", ui.lianxin_zs_ytn.isChecked());
    lianxin_storage.put("yzn", ui.lianxin_zs_yzn.isChecked());
    lianxin_storage.put("bnn", ui.lianxin_zs_bnn.isChecked());
    lianxin_storage.put("yfzyx", ui.lianxin_zs_yfzyx.isChecked());
    lianxin_storage.put("yzwfz", ui.lianxin_zs_yzwfz.isChecked());
    lianxin_storage.put("wfzys", ui.lianxin_zs_wfzys.isChecked());
    lianxin_storage.put("gzdr", ui.lianxin_zs_gzdr.isChecked());
    lianxin_storage.put("zjkg", ui.lianxin_zs_zjkg.isChecked());
    lianxin_storage.put("hwkg", ui.lianxin_zs_hwkg.isChecked());
    lianxin_storage.put("sjbx", ui.lianxin_zs_sjbx.isChecked());
    lianxin_storage.put("scbx", ui.lianxin_zs_scbx.isChecked());
    lianxin_storage.put("gkzdbx", ui.lianxin_zs_gkzdbx.isChecked());
    lianxin_storage.put("spbzpl", ui.lianxin_zs_spbzpl.isChecked());

    lianxin_storage.put("pinglunyfpl", ui.lianxin_zs_pinglunyfpl.isChecked());
    lianxin_storage.put("zs_xzyhm", ui.lianxin_zs_xzyhm.getText() + "");
    lianxin_storage.put("zs_plsxzq", ui.lianxin_zs_plsxzq.isChecked());
    lianxin_storage.put("zs_sfkqsx", ui.lianxin_zs_sfkqsx.isChecked());
    lianxin_storage.put("zs_qhzhhsfcz", ui.lianxin_zs_qhzhhsfcz.isChecked());
 lianxin_storage.put("zs_restartInterval", ui.lianxin_zs_restartInterval.getText() + "");
    toastLog("保存配置")


};

// 下载并运行所选脚本
ui.start.on("click", function() {
    bcsj_lize()
    var latest_version = "v1.3.0"; //版本号修改
    log("当前版本" + latest_version)
    // 版本更新检查
    if (GLOBAL_CONFIG.get("NO_UPDATE", 0) && (version != latest_version)) {
        ui.update.visibility = 0;
        ui.update.setText("点击更新至最新版v" + latest_version);
    } else if (version != latest_version) {
        checkversion();

    }


    if (auto.service == null) {
        toast("请先开启无障碍服务！");
        return;
    } else {

        threads.shutDownAll();
        if (thread != null && thread.isAlive()) {
            alert("注意", "脚本正在运行，请结束之前进程");
            return;
        }
    }
    home()
    运行()


});



////// 运行脚本

let 浮窗开过了 = false
var w = device.width;
var h = device.height;
let musicTask = null;

function 运行() {
    // 这里写脚本的主逻辑
    threads.start(function () {
        if (浮窗开过了 == false) {
            threads.start(悬浮开关);
            浮窗开过了 = true
        }
    });
}

////// ========================================================================================
function 悬浮开关() {

    var window = floaty.window(
        <vertical id="mainFrame">
            <card w="40" h="40" cardCornerRadius="10" cardElevation="0" cardBackgroundColor="#FF6600">
                <button id="toggleBtn" w="30" h="30" style="Widget.AppCompat.Button.Borderless" />
            </card>

            <card id="actionCard" w="40" h="40" cardCornerRadius="10" cardElevation="0" cardBackgroundColor="#00FA9A" margin="2">
                <button id="action" text="开" w="40" h="40" style="Widget.AppCompat.Button.Borderless" />
            </card>
            <card id="logCard" w="40" h="40" cardCornerRadius="10" cardElevation="0" cardBackgroundColor="#4169E1" margin="2">
                <button id="logBtn" text="悬浮日志" w="40" h="40" style="Widget.AppCompat.Button.Borderless" textSize="7sp" />
            </card>
        </vertical>
    );

    window.exitOnClose()

    // 初始状态：只显示切换按钮
    var isExpanded = false;
    normalX = w - 120;
    ui.run(() => {
        window.setPosition(normalX, h * 0.6);
        window.actionCard.setVisibility(8);
        window.logCard.setVisibility(8);
    })

    var execution = null;
    //记录按键被按下时的触摸坐标
    var x = 0,
        y = 0;
    //记录按键被按下时的悬浮窗位置
    var windowX, windowY;
    //记录按键被按下的时间以便判断长按等动作
    var downTime;
    var autoCollapseTimer = null;
    var lastInteractionTime = new Date().getTime();
    var isHiddenAtEdge = false;
    var normalX = w - 120;

    // 自动隐藏到边缘
    setInterval(function () {
        var now = new Date().getTime();
        // 如果超过3秒没有交互且没有隐藏，则隐藏到边缘
        if (now - lastInteractionTime > 3000 && !isHiddenAtEdge && !isExpanded) {
            ui.run(function () {
                // 先保存当前位置
                normalX = window.getX();
                // 然后隐藏到边缘
                window.setPosition(w - 50, window.getY());
                isHiddenAtEdge = true;
            });
        }
    }, 1000);

    // 展开菜单
    function toggleMenu() {
        isExpanded = !isExpanded;
        lastInteractionTime = new Date().getTime();
        isHiddenAtEdge = false;
        ui.run(() => {
            if (isExpanded) {

                // 恢复悬浮窗到正常位置
                window.setPosition(normalX, window.getY());

                // 展开菜单，显示所有按钮
                window.actionCard.setVisibility(0);
                window.logCard.setVisibility(0);
                window.toggleBtn.setText("");

                // 5秒后自动收起
                if (autoCollapseTimer) {
                    clearTimeout(autoCollapseTimer);
                }
                autoCollapseTimer = setTimeout(() => {
                    if (isExpanded) {
                        isExpanded = false;
                        window.actionCard.setVisibility(8);
                        window.logCard.setVisibility(8);
                        window.toggleBtn.setText("");
                    }
                }, 5000);
            } else {

                // 收起菜单，只显示切换按钮
                if (autoCollapseTimer) {
                    clearTimeout(autoCollapseTimer);
                    autoCollapseTimer = null;
                }
                window.actionCard.setVisibility(8);
                window.logCard.setVisibility(8);
                window.toggleBtn.setText("");
            }
        });
    }

    // 添加拖动和点击功能
    function addDragAndClick(btn, onClick) {
        var btnX = 0, btnY = 0, btnWindowX = 0, btnWindowY = 0, btnDownTime = 0;
        btn.setOnTouchListener(function (view, event) {
            switch (event.getAction()) {
                case event.ACTION_DOWN:
                    btnX = event.getRawX();
                    btnY = event.getRawY();
                    btnWindowX = window.getX();
                    btnWindowY = window.getY();
                    btnDownTime = new Date().getTime();
                    lastInteractionTime = new Date().getTime();
                    return true;
                case event.ACTION_MOVE:
                    // 移动悬浮窗
                    var newX = btnWindowX + (event.getRawX() - btnX);
                    var newY = btnWindowY + (event.getRawY() - btnY);
                    window.setPosition(newX, newY);
                    lastInteractionTime = new Date().getTime();
                    isHiddenAtEdge = false;
                    // 长按退出
                    if (new Date().getTime() - btnDownTime > 1500) {
                        exit();
                    }
                    return true;
                case event.ACTION_UP:
                    // 判断是点击还是拖动（放宽到10像素）
                    if (Math.abs(event.getRawX() - btnX) < 10 && Math.abs(event.getRawY() - btnY) < 10) {
                        // 如果按钮在边缘隐藏，先恢复位置
                        if (isHiddenAtEdge) {
                            isHiddenAtEdge = false;
                            // 如果normalX太靠近边缘，使用初始位置
                            if (normalX > w - 100) {
                                window.setPosition(w - 120, window.getY());
                                normalX = w - 120;
                            } else {
                                window.setPosition(normalX, window.getY());
                            }
                        }
                        if (onClick) {
                            onClick();
                        }
                    } else {
                        // 拖动结束后，更新正常位置（如果不在边缘附近）
                        var currentX = window.getX();
                        if (currentX <= w - 80) {
                            normalX = currentX;
                        }
                    }
                    return true;
            }
            return true;
        });
    }

    // 为每个按钮添加拖动和点击功能
    addDragAndClick(window.toggleBtn, function () {
        toggleMenu();
    });

    addDragAndClick(window.action, function () {
        启动();
    });

    addDragAndClick(window.logBtn, function () {
        // 切换开悬浮日志()悬浮窗的显示和隐藏
        if (console_floaty) {
            toastLog("关闭悬浮日志")
            // 悬浮窗存在，关闭它
            关闭悬浮窗();
        } else {
            toastLog("显示悬浮日志")
            // 悬浮窗不存在，创建它
            开悬浮日志();
        }
    });

    function 启动() {
        if (window.action.getText() == '开') {
            if (!console_floaty) {
                开悬浮日志()
            }
            // 使用轮询方式从存储中读取日志
            var logStorage = storages.create("remote_log_storage");
            var lastLogIndex = logStorage.get("log_index", 0);

            var logPollingThread = threads.start(function () {
                while (true) {
                    try {
                        var currentIndex = logStorage.get("log_index", 0);
                        if (currentIndex > lastLogIndex) {
                            for (var i = lastLogIndex; i < currentIndex; i++) {
                                var logMsg = logStorage.get("log_" + i, "");
                                if (logMsg) {
                                    console.log(logMsg);
                                }
                            }
                            lastLogIndex = currentIndex;
                        }
                    } catch (e) {
                        // 忽略错误
                    }
                    sleep(100);
                }
            });

            // 保存轮询线程引用，停止时使用
            remoteLogThread = logPollingThread;

            threads.start(function () {
                // 创建缓存存储
                const script_jzjb = storages.create("script_cache");

                try {
                    const tokenUrl = "https://jiaoben.xiaogezy.cn/wuyazhong2022/dypinglun/main/api_token.php";

                    // ========== 1. 拿 token ==========
                    //const tokenUrl = `${url}/api.php?api=ygg&app=${appid}&sbm=${sbm}&jbxh=${ui.script_chosen.getSelectedItemPosition()}&cngj=${cngj}`; // 增加 cngj 参数


                    const tokenRes = http.get(tokenUrl);

                    if (tokenRes.statusCode !== 200) {
                        toastLog("获取 token 失败");

                        return;
                    }

                    let tokenText = tokenRes.body.string();
                    let tokenData;
                    try {

                        try {
                            tokenData = JSON.parse(tokenText);

                        } catch (e1) {

                            try {
                                tokenText = RC4(rc4key, tokenText, 1);


                                tokenText = tokenText.replace(/^\uFEFF/, '').trim();

                                tokenData = JSON.parse(tokenText);

                            } catch (e2) {

                                tokenData = JSON.parse(tokenText);

                            }
                        }
                    } catch (e) {
                        toastLog("最终解析失败：" + e.message);
                        toastLog("失败内容：" + tokenText);

                        return;
                    }

                    let {
                        url: onceUrl,
                        code,
                        msg
                    } = tokenData;

                    if (!onceUrl) {
                        // 显示服务器返回的错误信息
                        if (msg) {
                            toastLog("服务器错误：" + msg + "(错误码：" + code + ")");
                        } else {
                            toastLog("获取的无效");
                        }

                        return;
                    }


                    let res2 = http.get(onceUrl);

                    // 调试：打印响应状态码
                    //toastLog("下载响应状态：" + res2.statusCode);

                    if (res2.statusCode !== 200) {
                        // 调试：打印失败原因
                        toastLog("加裁脚本失败，状态码：" + res2.statusCode);

                        return;
                    }

                    let str = res2.body.string();
                    let currentScriptLength = str.length;

                    if (!str || str.length < 100 || !str.includes("function")) {
                        toastLog("加裁的脚本内容无效");

                        return;
                    }

                    // 更新缓存
                    script_jzjb.put("jzjb_cached_script", str);
                    script_jzjb.put("last_script_length", currentScriptLength);
                    script_jzjb.put("last_update_time", new Date().getTime());

                    // 创建停止标志存储
                    const stopFlagStorage = storages.create("remote_script_stop_flag");
                    stopFlagStorage.put("stop_flag", false);

                    // 执行脚本
                    // 修改脚本，添加日志存储功能和停止标志检查，让远程脚本的日志显示在开悬浮日志()浮窗中
                    const modifiedScript = `
// ====== 日志重定向代码 ======
// 创建日志存储
var logStorage = storages.create("remote_log_storage");
var logIndex = logStorage.get("log_index", 0);

// 创建停止标志存储
var stopFlagStorage = storages.create("remote_script_stop_flag");

// 写入日志到存储的函数
function writeLogToStorage(msg) {
    if (msg) {
        try {
            logStorage.put("log_" + logIndex, msg);
            logStorage.put("log_index", logIndex + 1);
            logIndex++;
        } catch(e) {
            // 存储失败，尝试直接输出
            try {
                console.log(msg);
            } catch(e2) {}
        }
    }
}

// 检查是否需要停止脚本
function checkStopFlag() {
    try {
        var stopFlag = stopFlagStorage.get("stop_flag", false);
        if (stopFlag) {
            writeLogToStorage("检测到停止标志，准备停止脚本");
            // 清理事件监听器
            try {
                events.removeAllListeners();
            } catch(e) {}
            // 停止脚本执行
            exit();
        }
    } catch(e) {
        // 忽略错误
    }
}

// 重定向log函数，通过存储发送日志到本地
if (typeof log === 'function') {
    const originalLog = log;
    log = function() {
        try {
            // 检查停止标志
            checkStopFlag();
            // 只写入存储，不调用原始函数
            if (arguments.length > 0) {
                writeLogToStorage(Array.from(arguments).join(" "));
            }
        } catch(e) {
            // 失败时调用原始函数
            originalLog.apply(this, arguments);
        }
    };
}

// 重定向toastLog函数
if (typeof toastLog === 'function') {
    const originalToastLog = toastLog;
    toastLog = function() {
        // 检查停止标志
        checkStopFlag();
        originalToastLog.apply(this, arguments);
        if (arguments.length > 0) {
            writeLogToStorage(Array.from(arguments).join(" "));
        }
    };
}

// ====== 原始脚本内容 ======
${str}
`;
                    // 执行脚本并获取引擎引用
                    const engine = engines.execScript("remote_script", modifiedScript);
                    // 直接在当前线程中更新全局变量
                    remoteScriptEngine = engine;
                    console.log("成功创建远程脚本引擎，引擎对象: " + typeof engine);
                   // console.log("引擎对象详细信息: " + engine);
                   // console.log("引擎对象是否有stop方法: " + (typeof engine.stop === 'function'));

                } catch (e) {
                    toastLog("网络错误");

                }
            });

            window.action.setText('停');
            withtime("启动脚本");
        } else {
            withtime("停止脚本");
            关闭悬浮窗()
            // 停止日志轮询线程
            if (remoteLogThread) {
                remoteLogThread.interrupt();
                remoteLogThread = null;
            }
            // 不需要移除事件监听器，Auto.js会自动清理
            // 清理日志存储
            try {
                var logStorage = storages.create("remote_log_storage");
                logStorage.clear();
            } catch (e) {
                // 忽略错误
            }
            // 只停止远程脚本，保留UI脚本和悬浮按钮
            var stopped = false;

            // 1. 设置停止标志
            try {
                console.log("设置停止标志");
                var stopFlagStorage = storages.create("remote_script_stop_flag");
                stopFlagStorage.put("stop_flag", true);
                console.log("成功设置停止标志");
                stopped = true;
            } catch (e) {
                console.log("设置停止标志失败: " + e);
            }

            // 2. 尝试使用执行对象的停止方法（作为备用）
            if (!stopped) {
                try {
                    console.log("尝试使用执行对象的停止方法");
                    // 检查remoteScriptEngine是否有stop方法
                    if (remoteScriptEngine && typeof remoteScriptEngine === 'object') {
                        console.log("远程脚本引擎对象类型: " + typeof remoteScriptEngine);
                        console.log("远程脚本引擎对象: " + remoteScriptEngine);

                        // 尝试不同的停止方法
                        if (remoteScriptEngine.stop) {
                            console.log("使用stop方法停止远程脚本");
                            remoteScriptEngine.stop();
                        } else if (remoteScriptEngine.interrupt) {
                            console.log("使用interrupt方法停止远程脚本");
                            remoteScriptEngine.interrupt();
                        } else if (remoteScriptEngine.kill) {
                            console.log("使用kill方法停止远程脚本");
                            remoteScriptEngine.kill();
                        } else {
                            console.log("远程脚本引擎对象没有标准停止方法");
                        }
                        remoteScriptEngine = null;
                        console.log("成功停止远程脚本执行对象");
                        stopped = true;
                    } else {
                        console.log("远程脚本引擎对象不存在或不是对象");
                    }
                } catch (e) {
                    console.log("停止远程脚本执行对象失败: " + e);
                }
            }

            // 3. 清理全局变量和状态
            try {
                console.log("清理脚本执行状态");
                // 确保remoteScriptEngine被重置
                remoteScriptEngine = null;
                // 清理日志存储
                try {
                    var logStorage = storages.create("remote_log_storage");
                    logStorage.clear();
                } catch (e) {
                    console.log("清理日志存储失败: " + e);
                }
                console.log("脚本执行状态清理完成");
            } catch (e) {
                console.log("清理状态失败: " + e);
            }

            console.log("脚本停止操作完成");
            window.action.setText('开');
        }
    }
}

function withtime(message) {
    var date = new Date();
    var 时 = date.getHours()
    var 分 = date.getMinutes();
    var 秒 = date.getSeconds();
    console.info(时 + ":" + 分 + ":" + 秒 + "  " + message)
};

// //保存卡密配置
// ui.kamibc.click(function() {
//     // 输入值的存储
//     lianxin_zs_CONFIG.put("kami", ui.zs_kami.getText() + "");
//     toastLog("保存卡密")

// })


// ui.lianxin_zs_save.click(function() {
//     lianxin_storage.put("shousuo", ui.lianxin_zs_shousuo.isChecked());
//     lianxin_storage.put("shousuosx", ui.lianxin_zs_shousuosx.isChecked());


//     lianxin_storage.put("redian", ui.lianxin_zs_redian.isChecked());
//     lianxin_storage.put("tcmc", ui.lianxin_zs_tcmc.getText() + "");
//     lianxin_storage.put("gjcnr", ui.lianxin_zs_gjcnr.getText() + "");

//     lianxin_storage.put("dzhnr", ui.lianxin_zs_dzhnr.getText() + "");
//     lianxin_storage.put("kspplys", ui.lianxin_zs_kspplys.getText() + "");
//     lianxin_storage.put("kspplys1", ui.lianxin_zs_kspplys1.getText() + "");
//     lianxin_storage.put("gls", ui.lianxin_zs_gls.getText() + "");
//     lianxin_storage.put("gls1", ui.lianxin_zs_gls1.getText() + "");
//     lianxin_storage.put("plqys", ui.lianxin_zs_plqys.getText() + "");
//     lianxin_storage.put("plqys1", ui.lianxin_zs_plqys1.getText() + "");
//     lianxin_storage.put("djyfys", ui.lianxin_zs_djyfys.getText() + "");
//     lianxin_storage.put("djyfys1", ui.lianxin_zs_djyfys1.getText() + "");
//     lianxin_storage.put("sxys", ui.lianxin_zs_sxys.getText() + "");
//     lianxin_storage.put("sxys1", ui.lianxin_zs_sxys1.getText() + "");
//     lianxin_storage.put("glsfwjc", ui.lianxin_zs_glsfwjc.isChecked());

//     lianxin_storage.put("tongcen", ui.lianxin_zs_tongcen.isChecked());

//     lianxin_storage.put("zhpx", ui.lianxin_zs_zhpx.isChecked());
//     lianxin_storage.put("zxfb", ui.lianxin_zs_zxfb.isChecked());
//     lianxin_storage.put("zddz", ui.lianxin_zs_zddz.isChecked());
//     lianxin_storage.put("ytn", ui.lianxin_zs_ytn.isChecked());
//     lianxin_storage.put("yzn", ui.lianxin_zs_yzn.isChecked());
//     lianxin_storage.put("bnn", ui.lianxin_zs_bnn.isChecked());
//     lianxin_storage.put("yfzyx", ui.lianxin_zs_yfzyx.isChecked());
//     lianxin_storage.put("yzwfz", ui.lianxin_zs_yzwfz.isChecked());
//     lianxin_storage.put("wfzys", ui.lianxin_zs_wfzys.isChecked());
//     lianxin_storage.put("gzdr", ui.lianxin_zs_gzdr.isChecked());
//     lianxin_storage.put("zjkg", ui.lianxin_zs_zjkg.isChecked());
//     lianxin_storage.put("hwkg", ui.lianxin_zs_hwkg.isChecked());
//     lianxin_storage.put("sjbx", ui.lianxin_zs_sjbx.isChecked());
//     lianxin_storage.put("scbx", ui.lianxin_zs_scbx.isChecked());
//     lianxin_storage.put("gkzdbx", ui.lianxin_zs_gkzdbx.isChecked());

//     toastLog("配置保存成功！");
// });




// 更新弹窗
function checkversion() {
    var releaseNotes = "版本 " + version + "\n" + app_update_show + "\n" + version_info + "";
    dialogs.build({
            title: "版本更新",
            content: releaseNotes,
            positive: "立即下载",
            negative: "取消",
            neutral: "浏览器下载",
            cancelable: false // 禁止返回键取消
        })
        .on("positive", () => {
            download(app_update_url);
        })
        .on("neutral", () => {
            if (app_updatie_must == "y") {
                exit();
            }
            app.openUrl(app_update_url);
        })
        .on("negative", () => {
            if (app_updatie_must == "y") {
                exit();
            }
        })
        .on("check", (checked) => {
            GLOBAL_CONFIG.put("NO_UPDATE", 1);
        }).show();
};

var downloadDialog = null;
var downloadId = -1;

function download(url) {
    downloadDialog = dialogs.build({
            title: "下载中...",
            positive: "暂停",
            negative: "取消",
            progress: {
                max: 100,
                showMinMax: true
            },
            autoDismiss: false,
            cancelable: false // 禁止返回键取消
        })
        .on("positive", () => {
            if (downloadDialog.getActionButton("positive") == "暂停") {
                stopDownload();
                downloadDialog.setActionButton("positive", "继续");
            } else {
                startDownload(url);
                downloadDialog.setActionButton("positive", "暂停");
            }
        })
        .on("negative", () => {
            stopDownload();
            downloadDialog.dismiss();
            downloadDialog = null;
            exit(); // 退出脚本
        })
        .show();
    startDownload(url);
};

// 下载apk的主方法体
function startDownload(url) {
    threads.start(function() {
        var path = files.cwd() + "/new.apk";
        let apkFile = new File(path);
        var conn = new URL(url).openConnection();
        conn.connect();
        let is = conn.getInputStream();
        let length = conn.getContentLength();
        let fos = new FileOutputStream(apkFile);
        let count = 0;
        let buffer = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 1024);
        while (true) {
            var p = ((count / length) * 100);
            let numread = is.read(buffer);
            count += numread;
            // 下载完成
            if (numread < 0) {
                toast("下载完成");
                downloadDialog.dismiss();
                downloadDialog = null;
                break;
            }
            // 更新进度条
            downloadDialog.setProgress(p);
            fos.write(buffer, 0, numread);
        }
        fos.close();
        is.close();
        //自动打开进行安装
        app.viewFile(path);
        sleep(2000)
        exit(); // 退出脚本
    });
};

function stopDownload() {
    clearInterval(downloadId);
}



// ===== 文件选择器辅助函数 =====

function listFiles(dir, options, ctx) {
    return Array.prototype.map.call(files.listDir(dir), (name) => {
        let absPath = files.join(dir, name);
        let isDir = files.isDir(absPath);
        let checkable;
        if (isDir) {
            checkable = options.canChooseDir;
            name += '/';
        } else {
            checkable = options.canChooseFile;
        }
        return {
            context: ctx,
            fileName: name,
            checkable: checkable,
            icon: isDir ? "ic_folder_black_48dp" : "ic_insert_drive_file_black_48dp",
            checked: false
        }
    })
}

function FileChooserView(options, ctx) {
    this.ctx = ctx;
    this.options = options;
    let view = ui.inflate(
        <vertical>
            <horizontal padding="8dp" bg="#E0E0E0">
                <button id="parentDir" text="返回上级" w="auto" h="wrap_content" margin="0 4dp"/>
                <text id="currentDir" text="/" textSize="14sp" layout_weight="1" gravity="center_vertical" padding="4dp"/>
            </horizontal>
            <list id="fileList">
                <horizontal>
                    <checkbox id="checkbox" checked="{{this.checked}}" />
                    <img w="40dp" h="40dp" scaleType="fitXY" />
                    <text text="{{this.fileName}}" w="*" h="*" textSize="16sp" textColor="#373737" marginLeft="8dp" />
                </horizontal>
            </list>
        </vertical>
    );
    this.view = view;
    this.enterDir = function(dir) {
        this.ctx.dir = dir;
        this.ctx.data = listFiles(dir, this.options, this.ctx);
        this.view.fileList.setDataSource(this.ctx.data);
        this.view.currentDir.setText(dir);
    };
    view.fileList.on("item_bind", function(itemView, itemHolder) {
        itemView.checkbox.on("check", function(checked) {
            let item = itemHolder.item;
            let ctx = item.context;
            if (checked) {
                if (ctx.selectedPos >= 0) {
                    ctx.data[ctx.selectedPos].checked = false
                };
                ctx.selectedPos = itemHolder.position;
                ctx.data[itemHolder.position].checked = true;
            } else {
                ctx.selectedPos = -1;
                ctx.data[itemHolder.position].checked = false;
            }
        });
    });
    view.fileList.on("item_click", (item, i, itemView, listView) => {
        if (item.fileName == '..') {
            return;
        }
        if (item.fileName.endsWith("/")) {
            this.enterDir(files.join(item.context.dir, item.fileName));
        } else {
            itemView.checkbox.toggle();
        }
    });
    view.parentDir.on("click", () => {
        let parentDir = new java.io.File(ctx.dir).getParent();
        if (parentDir) {
            this.enterDir(parentDir);
        } else {
            toast("已是根目录");
        }
    });
}

function FileChooserDialog(options) {
    let options = Object.assign({}, options);
    let canChoose = options.canChoose || [];
    options.canChooseFile = canChoose.indexOf("file") >= 0;
    options.canChooseDir = canChoose.indexOf("dir") >= 0;
    let ctx = {
        selectedPos: -1,
        data: []
    };
    let view = new FileChooserView(options, ctx);
    view.enterDir(options.dir);
    options.customView = view.view;
    options.wrapInScrollView = false;
    options.title = options.title || "选择文件(夹)";
    options.positive = options.positive || "确定";
    options.negative = "取消";
    let fileCallback = options.fileCallback;
    return dialogs.build(options)
        .on("positive", (dialog) => {
            let selectedFile = ctx.selectedPos >= 0 ? files.join(ctx.dir, ctx.data[ctx.selectedPos].fileName) : null;
            fileCallback && fileCallback(selectedFile);
            dialog.dismiss();
        }).on("negative", (dialog) => {
            dialog.dismiss();
        });
}

// ===== 文件选择器辅助函数结束 =====

// ===== 卡密验证函数开始 =====
function login1() {
    // var text = lianxin_zs_CONFIG.get("pushplus1", "");//网络加载脚本用
    //var text = "xxzx-yK-4mX2477m7B66"
    var text = ui.kami.text()
    var data = rc4_2(text, "kmlogon");
    if (data.code == 200) {

        var vipTime = timestampToTime(data.msg.vip);
        var remainingTime = getRemainingTime(data.msg.vip);
        //console.log('VIP到期时间: ' + vipTime);
        toastLog('vip到期时间:' + remainingTime);
        toastLog('登录成功');
        //需要运行的程序
        ///toastLog("执行脚本")
        //home();
        //运行();
    } else {

        alert("请输入正确的卡密")
        //sleep(1500);
        //toastLog("请输入卡密,右上角3点可获取")
        //sleep(1500);
        exit();
    }
};

function timestampToTime(timestamp) {

    var date = new Date(timestamp * 1000);

    var Y = date.getFullYear() + '-';
    var M = (date.getMonth() + 1).toString().padStart(2, '0') + '-';
    var D = date.getDate().toString().padStart(2, '0') + ' ';
    var h = date.getHours().toString().padStart(2, '0') + ':';
    var m = date.getMinutes().toString().padStart(2, '0') + ':';
    var s = date.getSeconds().toString().padStart(2, '0');
    return Y + M + D + h + m + s;
};


function timestampToTime(timestamp) {
    var date = new Date(timestamp * 1000);
    var Y = date.getFullYear() + '-';
    var M = (date.getMonth() + 1).toString().padStart(2, '0') + '-';
    var D = date.getDate().toString().padStart(2, '0') + ' ';
    var h = date.getHours().toString().padStart(2, '0') + ':';
    var m = date.getMinutes().toString().padStart(2, '0') + ':';
    var s = date.getSeconds().toString().padStart(2, '0');
    return Y + M + D + h + m + s;
};

function getRemainingTime(timestamp) {
    var now = Math.floor(Date.now() / 1000);
    var remainingSeconds = timestamp - now;

    if (remainingSeconds <= 0) {
        return "已过期";
    }

    var days = Math.floor(remainingSeconds / (60 * 60 * 24));
    remainingSeconds %= (60 * 60 * 24);
    var hours = Math.floor(remainingSeconds / (60 * 60));
    remainingSeconds %= (60 * 60);
    var minutes = Math.floor(remainingSeconds / 60);

    return `剩余 ${days} 天 ${hours} 小时 ${minutes} 分钟`;
};






function jb() {
    var text = ui.kami.text()
    var data = rc4_2(text, "kmunmachine")
    if (data.code == 200) {
        alert('解绑成功')
    } else {
        alert(data.msg)
    }
};

function rc4_2(name, api) { //卡密登录RC4-2解密
    if (api === undefined) {
        api = name;
    }
    arr = {
        "app": appid,
        "kami": name,
        "markcode": sbm,
        "t": getTimestamp(),
        "key": keymy
    }
    var Random = $crypto.digest(arr.t + arr.key + arr.markcode, "MD5")
    var md5 = $crypto.digest("kami=" + arr.kami + "&markcode=" + arr.markcode + "&t=" + arr.t + "&" + arr.key, "MD5")
    var bac = RC4(rc4key, 'kami=' + arr.kami + '&markcode=' + arr.markcode + '&t=' + arr.t + '&sign=' + md5 + "&value=" + Random, 0)

    var temp = http.get(url + '/api.php?api=' + api + '&app=' + arr.app + '&data=' + bac).body.string()
    try {
        //log(temp)
        var temp = JSON.parse(RC4(rc4key, temp, 1))

    } catch (e) {
        alert("加密类型错误")
        return false;
    }

    var db = $crypto.digest(temp.time + arr.key + Random, "MD5")
    if (api == "kmlogon") {
        if (db !== temp.check) {
            alert("数据被修改，终止运行")
            return false;
        } else {
            return temp;
        }
    } else {
        return temp;
    }
};

function getTimestamp() {
    try {
        let res = http.get("http://api.m.taobao.com/rest/api3.do?api=mtop.common.getTimestamp");
        let data = res.body.json();
        return Math.floor(data["data"]["t"] / 1000);
    } catch (error) {
        return Math.floor(new Date().getTime() / 1000);
    }
};


function RC4(pwd, data, t) {
    var cipher = "";
    var key = [];
    var box = [];
    var pwd_length = pwd.length;

    if (t == 1) {
        data = hexToString(data);
    }

    var data_length = data.length;

    for (var i = 0; i < 256; i++) {
        key[i] = pwd.charCodeAt(i % pwd_length);
        box[i] = i;
    }

    for (var j = i = 0; i < 256; i++) {
        j = (j + box[i] + key[i]) % 256;
        var tmp = box[i];
        box[i] = box[j];
        box[j] = tmp;
    }

    for (var a = j = i = 0; i < data_length; i++) {
        a = (a + 1) % 256;
        j = (j + box[a]) % 256;
        var tmp = box[a];
        box[a] = box[j];
        box[j] = tmp;
        var k = box[((box[a] + box[j]) % 256)];
        cipher += String.fromCharCode(data.charCodeAt(i) ^ k);
    }

    if (t == 1) {
        return decodeURIComponent(escape(cipher));
    } else {
        return stringToHex(cipher);
    }
};

function hexToString(hex) {
    var string = "";
    for (var i = 0; i < hex.length; i += 2) {
        string += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return string;
};

function stringToHex(string) {
    var hex = "";
    for (var i = 0; i < string.length; i++) {
        hex += string.charCodeAt(i).toString(16).padStart(2, '0');
    }
    return hex;
};
// ===== 卡密验证函数结束 =====



//穿透悬浮日志
function 开悬浮日志() {
    //toastLog("执行的脚本");

    console_floaty = floaty.rawWindow(
        <card cardCornerRadius="10" cardBackgroundColor="#00000000" cardElevation="0">
            <horizontal id="root" gravity="center" padding="10dp" marginBottom="10dp">
                <console id="console" w="*" h="*" />
            </horizontal>
        </card>
    );
    let console_floaty_options = {
        gravity: "top", //位置，可选值：top、bottom 默认值：bottom
        size: "middle", //大小，可选值：small、middle、big 默认值：middle
        alpha: 0.2, //透明度，可选值：0.0-1.0 默认值：0.6
        frontColor: "#00ff00", //文字颜色，可选值：颜色代码 默认值："#ffffff"
        frontSize: 12, //文字大小，单位sp，可选值：0+ 默认值：16
    };
    ui.run(() => {
        let scale = 0.2;
        switch (console_floaty_options.size) {
            case "small":
                scale = 1;
                break;
            case "big":
                scale = 1;
            default:
                break;
        }
        let bg = colors.parseColor("#66000000");
        if (console_floaty_options.alpha < 1 && console_floaty_options.alpha > 0) bg = colors.parseColor("#" + parseInt(console_floaty_options.alpha * 255).toString(16) + "000000");
        console_floaty.setSize(device.width / 2, device.height * scale); // 设置悬浮窗宽度为屏幕宽度的一半
        console_floaty.setPosition(0, (device.height - device.height * scale) / 2); // 设置悬浮窗位置为屏幕左侧中间
        console_floaty.root.setBackgroundColor(bg);
        console_floaty.setTouchable(false);
        console_floaty.console.setConsole(runtime.console);
        console_floaty.console.setColor("D", console_floaty_options.frontColor || "#ffffff");
        console_floaty.console.setTextSize(console_floaty_options.frontSize || 16);
        console_floaty.console.setInputEnabled(false);
    });

    setInterval(() => { }, 1000);
}

function 关闭悬浮窗() {
    if (console_floaty) {
        console_floaty.close();
        console_floaty = null;
    }
};