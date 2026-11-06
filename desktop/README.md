# Windows / Electron 宿主

本目录包含完整桌面源代码和已适配的 `game/`，无需先生成网页。要求 Node.js / npm，Electron 固定为 44.9.1。

```sh
npm install
npm start
```

程序使用自定义 `yuji://game` 来源。网页关闭 Node 集成、启用上下文隔离和 sandbox，通过 `preload.cjs` 暴露受限 IPC。图片导出使用原生保存窗口；存档位于当前用户的应用数据目录 `Yuji` 下。

发布 Windows x64 时需另外选择并安装 Electron 打包工具，携带完整 Electron 运行时、LICENSE 和第三方声明。本仓库没有纳入旧构建缓存、运行时或已签名安装器，也未添加商业代码签名。
