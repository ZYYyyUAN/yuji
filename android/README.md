# Android / Java 宿主

要求：JDK 17、Android SDK Platform 36、Build Tools 36.0.0；最低 Android API 26。工程使用 Android Gradle Plugin 8.12.2 和 Gradle Wrapper 8.13。

1. 用 Android Studio 打开本目录，配置本机 SDK；`local.properties` 不应提交。
2. 运行 `gradlew.bat :app:assembleDebug :app:lintDebug`（macOS/Linux 使用 `./gradlew`）。
3. 测试 APK 位于 `app/build/outputs/apk/debug/`。

`app/src/main/assets/web` 已包含最终资源，无需先从其他目录生成。需要同步 H5 更改时，在此目录运行 `python sync-web.py`；脚本保留原生布局、图片保存桥接，公共 H5 在仓库根目录的 `web/` 中。

发行构建使用 `:app:assembleRelease`，自行配置本机发行签名。仓库不提供原作者的签名密钥或密码；不同签名不能直接覆盖已有安装。

主要 Java 文件：MainActivity.java 实现资源访问、WebView 生命周期与图片保存桥接，ByteRange.java 处理资源范围请求。
