# 钢铁前线 · IRON FRONT

原创横版射击闯关游戏：三张地图、步兵、无人机、装甲 Boss、跳跃平台、重机枪补给、手雷、音效与本地最高分。浏览器运行，支持键盘和触屏。

## 开始游戏

下载仓库 ZIP，解压后双击 `index.html` 即可离线游玩。也可以安装 Node.js 后运行 `npm start`，打开 http://127.0.0.1:4173 。运行游戏无需安装 npm 依赖。

| 操作 | 按键 |
| --- | --- |
| 移动 | A / D 或左右方向键 |
| 跳跃 | 空格 |
| 连续射击 | 长按 J |
| 朝上瞄准 | W 或上方向键 |
| 手雷 | K |
| 暂停 / 继续 | P / Esc |
| 开始 / 下一关 | Enter |

触屏设备提供屏幕按钮，建议横屏。全屏模式主要供键盘使用；触屏按钮位于普通页面游戏下方。

每关击败装甲 Boss 后进入下一关。黄色 H 补给提供限时重机枪和三枚手雷，绿色 + 恢复两格生命。手雷同时清除附近敌方弹幕。每关重置生命和手雷；失败后重新开始三关战役。

## GitHub 方案调研与复用

- [zzarcon/html5-slug](https://github.com/zzarcon/html5-slug)：MIT，使用 Phaser 的横版射击参考项目。旧工具链依赖 Bower / Grunt。仅作为方案参考，未复制其代码或《合金弹头》素材。
- [straker/kontra](https://github.com/straker/kontra)：MIT，实际复用其 `init` 和固定步长 `GameLoop`。本地随附 Kontra **10.0.2**，下载源为 https://cdn.jsdelivr.net/npm/kontra@10.0.2/kontra.min.js ，许可证保存在 `vendor/KONTRA-LICENSE.txt`。
- 游戏逻辑、界面、关卡与 Canvas 像素绘制为本项目原创，无远程素材或运行时 CDN 请求。

## 开发与验证

`npm install` 安装仅供测试使用的 Playwright；`npm test` 使用本机 Chrome 做运行检查。可通过 `BROWSER_PATH` 指定 Chromium 可执行文件。测试截图保存在 `test-results/`，不提交仓库。

这是完整可玩的轻量街机原型，采用程序绘制的像素美术，目标是短流程单人闯关；不包含多人模式或商业级动画素材。

## 许可

本项目原创部分采用 MIT；Kontra 保留其原始 MIT 许可。与 SNK 或《合金弹头》无关联。
