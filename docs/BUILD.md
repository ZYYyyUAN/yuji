# 源码整理与验证范围

本仓库来源于最终交付：H5 候选21、Android21、Windows22、Tap23.4；产品版本均为 0.21.0。整理只改变目录、运行说明和构建配置，不改玩法与算法。

## 可以直接做的事

- 用 Python HTTP 服务运行 web/。
- 用 Android Studio / Gradle 构建 android/。
- 在 desktop/ 安装声明的 Electron 依赖后启动。
- 将 taptap/ 作为原生 Tap 小游戏代码目录导入官方工具。

## 历史来源与本次差异

各端原 `SOURCE_MANIFEST.json` / `web-source-manifest.json` 保留来源追溯用途，历史路径不是现有依赖。当前公开版的差异记录见 SOURCE_IMPORT.json：记录导入时哈希，另列布局调整的文件。

Android 同步脚本的源目录改为 ../web；Windows 增加固定版本 Electron 依赖和 npm start。其余玩法、绘制和 Java 宿主代码按最终交付复制。未附带历史工作目录中的生成器、官方工具、用户存档或签名文件。

## 验证边界

本次上传检查源码中的 JavaScript 语法、HTML 本地引用、同步路径及公开内容；不将这些检查冒称一次新的 Android / Tap 真机验收。最终23.4用户真机确认的范围见 taptap/README.md。开发者已确认游戏上线，但平台后台状态与用户数据不会作为公共源码的一部分上传。

运行依赖需从各自官方渠道安装；Android 发行签名和各平台发布账号由发布者自行管理。
