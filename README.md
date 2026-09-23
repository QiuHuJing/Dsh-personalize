# @deepseek-ai/dsh-client-ui-personalize

[English](README.en.md) | 中文

## 概述

`dsh-client-ui-personalize` 在「设置 → 通用」里新增一行「界面个性化」，让用户自定义强调色、界面字体、界面背景（预设渐变或自定义图片）、背景模糊、遮罩浓度与面板透明度。它不改写主题包：强调色与半透明面板通过 `ctx.theme` 的第三方 override 层叠加到活动主题上，背景本体则由本包持有的全局样式表从根元素的 `--dsh-pz-*` 变量绘制，字体则直接写在根元素的 `--dsw-font-family` 上。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [已知限制](#known-limitations)

-----

<a id="use-this-package"></a>
## 使用本包

用户在「设置 → 通用」的「界面个性化」行里完成全部操作，八个偏好字段会随改随写，并跨重启保留：

| 字段 | 作用 |
|---|---|
| `accentId` | 强调色；覆盖 `--dsw-alias-brand-primary` 与侧边栏选中强调色 |
| `fontId` | 界面字体（默认 / 无衬线 / 衬线 / 圆体 / 楷体 / 等宽 / 自定义） |
| `fontCustom` | `fontId` 为 `custom` 时的字体名，多个用逗号分隔 |
| `backgroundId` | 预设渐变背景（无 / 极光 / 暮色 / 深海 / 森屿 / 星云） |
| `backgroundImage` | 图片源：空、`http(s)` 链接，或 `local:`（浏览器本地图片） |
| `blur` | 背景模糊 0–24 px |
| `dim` | 遮罩浓度 0–80%（浅色主题压白，深色主题压黑） |
| `glass` | 面板透明度 0–90%（越高越通透，0 表示完全不透明） |

字体 chip 会用自身字体渲染名字，选中「自定义」后多出一行输入框：填入的名称会清洗掉 `; { } < >`，再补一段系统字体回退尾，因此字体未安装时界面仍然可读。选「等宽」时代码区字体一并切换。

本地图片在浏览器端重压缩（最长边降到 1920 以内、JPEG 0.82）后放进 `localStorage`，设置文档里只留 `local:` 标记，避免把 MB 级数据写进 `settings.yaml`。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

Node 半边只做一件事：存在 settings 服务时注册 `ui-personalize` 命名空间与 schema。浏览器半边把该命名空间绑成 scope，订阅其回放，并把每次偏好变化交给外观控制器。

控制器做三件事：

1. **主题 override 层**：有背景且 `glass > 0` 时，从 `getComputedStyle(document.body)` 采样五个表面 token 的不透明通道，按 `1 - glass/100` 重算 alpha 后调用 `ctx.theme.overrideTokens`。采样只取 RGB 通道，因此重复叠加不会让面板越来越透明；未采到的另一套配色使用内置近似值，等它真正成为活动配色后再自校正。
2. **背景绘制**：在 `<html>` 上写 `--dsh-pz-bg-image / -blur / -scale / -dim` 并打开 `data-dsh-personalize`，由 `backdrop.css` 的两个固定定位伪元素绘制图片层与遮罩层；模糊时同步放大图层，避免边缘漏光。
3. **字体**：在 `<html>` 上写 `--dsw-font-family`，选「等宽」时再多写 `--ds-font-family-code`。走根元素内联样式而不是主题 override 层，是因为字号/字体没有明暗差异，而内联属性优先级高于主题样式表——即使没有开背景也能立刻生效。

### 本机字体选择器

选「自定义」时旁边有一个「从本机选择」按钮：点击后由浏览器枚举**本机已安装的字体家族**（Chromium 的 Local Font Access API），弹出可搜索列表，点名即用，名字会自动补引号并接上系统回退尾。

浏览器不支持或用户拒绝授权时，枚举返回 `unsupported` / `denied`，界面退回手动输入框并显示对应提示——不会留下一个打不开的选择器。枚举结果按去引号后的家族名排序，同家族的多个字重只保留第一个；渲染上限 300 条，避免上千个家族拖慢设置页。

</details>

-----

<a id="known-limitations"></a>
## 已知限制

- **本地图片以 data URL 存在浏览器本地**：换浏览器或清理站点数据会丢失，需要重新选择图片。
- **panel 透明度依赖 `ctx.theme` 的 override 语义**：第三方主题若自己重绑同一批表面 token，本插件的 override 会按注册顺序盖在它之上。
- **高强度透明度会影响文本对比度**：这是用户选择的结果，`glass` 超过 80 时正文可读性明显下降。
- **自定义字体只能是本机已安装的字体**：浏览器不提供字体枚举，也无法加载本地字体文件，未安装的名字会静默回退到系统字体栈。
- **字体只覆盖 `--dsw-font-family`**：个别组件若硬编码了自己的字体栈（未引用该变量），不会跟随切换。

---

## 仓库信息

- **作者**：租着月小娅（详见 [AUTHORS.md](AUTHORS.md)）
- **许可证**：[MIT](LICENSE)
- **内容**：DeepSeek Harness（dsh）客户端插件 `@deepseek-ai/dsh-client-ui-personalize` 的源码与文档。

本仓库只做**发布用快照**：插件源码仍在本地开发目录（dsh 仓库中的
`packages/client/ui-personalize`）维护，每次改完后运行同步脚本，
把 `src/`、`tests/` 与包配置镜像到本仓库。同步脚本**不含任何本机路径**，
源目录通过环境变量 `DSH_PERSONALIZE_SRC` 或 `tools/sync.local.json` 指定。

### 同步

双击仓库根目录的 `sync.bat`，或在仓库根目录运行：

```bash
node tools/sync.cjs
```

脚本会：

1. 镜像 `src/`、`tests/`（新增、更新、删除保持与源一致，排除 `lib/`、`node_modules/`）；
2. 复制并规范化 `package.json`（写入 `author` / `license` / `repository`）、`tsconfig.json`、
   `tsdown.config.ts`、`README.i18n.yaml`；
3. 由源 `README.zh.md` 生成本文件（去掉 dsh 内部 frontmatter，英文链接指向 `README.en.md`），
   由源 `README.md` 生成 `README.en.md`；
4. 打印本次同步的变更统计。

`AUTHORS.md`、`LICENSE`、`.gitignore`、`tools/` 由仓库自己维护，不会被同步覆盖。

### 发布前的隐私检查

- `tools/sync.local.json` 存放本机插件目录，**已在 `.gitignore` 中**；若你是不用 git、
  直接打包上传文件夹，记得先删掉它。
- 同步脚本只会搬运 `src/`、`tests/` 与包配置，不会把 `lib/` 构建产物、日志或本地设置带进来。
- 提交用的 Git 邮箱会出现在公开提交记录里；不想暴露可用 GitHub 的 noreply 邮箱。

### 发布到 GitHub

```bash
git init
git add .
git commit -m "feat: dsh 界面个性化插件"
git remote add origin https://github.com/<你的用户名>/dsh-personalize.git
git push -u origin main
```

推送前记得把 `package.json` 里 `repository.url` 与 `homepage` 的 `<owner>` 换成你的 GitHub 用户名。
