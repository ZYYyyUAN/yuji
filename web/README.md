# H5 版本

在仓库根目录运行 `python -m http.server 8080 --directory web`，打开 http://localhost:8080。

此目录为参赛候选21的完整 H5 源码，包含场景、音效和 Worker。页面默认使用本地存储，浏览器存档与各原生客户端独立。

算法入口：`engine.js`、`ink.js`、`forms.js`、`sculpture.js`；交互入口：`play.js`、`viewer.js`、`archive.js`。详细说明见 ../docs/ARCHITECTURE.md。
