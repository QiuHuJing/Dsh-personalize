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
