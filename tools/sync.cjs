// 把本地开发目录里的 ui-personalize 插件源码同步到本发布仓库。
//
//   源（开发目录）: 由环境变量 DSH_PERSONALIZE_SRC 或 tools/sync.local.json 指定
//   目标（本仓库）: 本文件所在目录的上一级
//
// 仓库里不保留任何本机绝对路径 / 用户名：源目录由使用者在本地配置。
//
// 用法（在仓库根目录）：
//   node tools/sync.cjs            同步
//   node tools/sync.cjs --dry      只打印将要发生的变更，不写盘
//
// 同步策略：
//   - src/、tests/ 做镜像同步（源里没有的文件会从仓库删除）；
//   - 单文件：package.json（规范化元数据）、tsconfig.json、tsdown.config.ts、README.i18n.yaml；
//   - 由源 README.zh.md 生成仓库 README.md，由源 README.md 生成 README.en.md；
//   - LICENSE / AUTHORS.md / .gitignore / tools/ 属于仓库自有文件，不会被覆盖。

const fs = require("node:fs");
const path = require("node:path");

const DST = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");

// 本地配置（不入库，见 .gitignore）：{ "src": "<你的本地插件目录>" }
const LOCAL_CONFIG = path.join(__dirname, "sync.local.json");

/** 解析源目录：环境变量 > 本地配置 > 报错。仓库内不含任何本机路径。 */
function resolveSrc() {
  if (process.env.DSH_PERSONALIZE_SRC) return process.env.DSH_PERSONALIZE_SRC;
  try {
    const cfg = JSON.parse(fs.readFileSync(LOCAL_CONFIG, "utf8"));
    if (cfg && typeof cfg.src === "string" && cfg.src) return cfg.src;
  } catch (_) {}
  return "";
}

const SRC = resolveSrc();

// 发布元数据（源 package.json 里没有的字段在这里补齐）
const AUTHOR = "租着月小娅";
const LICENSE = "MIT";
const REPO_URL = "git+https://github.com/<owner>/dsh-personalize.git";
const HOMEPAGE = "https://github.com/<owner>/dsh-personalize#readme";

const MIRROR_DIRS = ["src", "tests"];
const COPY_FILES = ["tsconfig.json", "tsdown.config.ts", "README.i18n.yaml"];
const EXCLUDE = new Set(["node_modules", "lib"]);

const stats = { added: 0, updated: 0, removed: 0, unchanged: 0 };
const log = (s) => console.log(s);

function walk(dir, base = dir, out = new Set()) {
  for (const name of fs.readdirSync(dir)) {
    if (EXCLUDE.has(name)) continue;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, base, out);
    else out.add(path.relative(base, full));
  }
  return out;
}

function sameBytes(a, b) {
  try {
    if (fs.statSync(a).size !== fs.statSync(b).size) return false;
    return fs.readFileSync(a).equals(fs.readFileSync(b));
  } catch (_) {
    return false;
  }
}

function copyFile(rel) {
  const from = path.join(SRC, rel);
  const to = path.join(DST, rel);
  const exists = fs.existsSync(to);
  if (exists && sameBytes(from, to)) {
    stats.unchanged++;
    return;
  }
  if (!DRY) {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }
  exists ? stats.updated++ : stats.added++;
  log((exists ? "  更新 " : "  新增 ") + rel);
}

function mirrorDir(rel) {
  const from = path.join(SRC, rel);
  const to = path.join(DST, rel);
  if (!fs.existsSync(from)) {
    log("  跳过（源不存在）: " + rel);
    return;
  }
  const srcFiles = walk(from);
  const dstFiles = fs.existsSync(to) ? walk(to) : new Set();
  for (const rel2 of srcFiles) copyFile(path.join(rel, rel2));
  for (const rel2 of dstFiles) {
    if (srcFiles.has(rel2)) continue;
    const target = path.join(to, rel2);
    if (!DRY) fs.rmSync(target, { force: true });
    stats.removed++;
    log("  删除 " + path.join(rel, rel2));
  }
}

/** 去掉 dsh 文档体系用的 YAML frontmatter（--- 开头到下一个 ---）。 */
function stripFrontMatter(text) {
  if (!text.startsWith("---")) return text;
  const end = text.indexOf("\n---", 3);
  if (end < 0) return text;
  // end 指向闭合 "---" 前面的那个 \n，跳过 "\n---" 本身再去掉紧随的空行
  return text.slice(end + 4).replace(/^[\r\n]+/, "");
}

function buildReadme() {
  const tailPath = path.join(DST, "tools", "README.tail.md");
  const tail = fs.existsSync(tailPath) ? fs.readFileSync(tailPath, "utf8") : "";

  // 中文主 README：源 README.zh.md，英文链接改指向 README.en.md
  const zhPath = path.join(SRC, "README.zh.md");
  if (fs.existsSync(zhPath)) {
    let zh = stripFrontMatter(fs.readFileSync(zhPath, "utf8"));
    zh = zh.replace(/\(README\.md\)/g, "(README.en.md)");
    const body = zh.replace(/\s+$/, "") + "\n\n" + tail.replace(/\s+$/, "") + "\n";
    writeIfChanged("README.md", body);
  } else {
    log("  跳过（源不存在）: README.zh.md");
  }

  // 英文 README：源 README.md，中文链接改指向 README.md
  const enPath = path.join(SRC, "README.md");
  if (fs.existsSync(enPath)) {
    let en = stripFrontMatter(fs.readFileSync(enPath, "utf8"));
    en = en.replace(/\(README\.zh\.md\)/g, "(README.md)");
    writeIfChanged("README.en.md", en.replace(/\s+$/, "") + "\n");
  } else {
    log("  跳过（源不存在）: README.md");
  }
}

function writeIfChanged(rel, content) {
  const to = path.join(DST, rel);
  if (fs.existsSync(to) && fs.readFileSync(to, "utf8") === content) {
    stats.unchanged++;
    return;
  }
  if (!DRY) fs.writeFileSync(to, content);
  fs.existsSync(to) ? stats.updated++ : stats.added++;
  log((fs.existsSync(to) ? "  更新 " : "  新增 ") + rel + "（生成）");
}

function syncPackageJson() {
  const from = path.join(SRC, "package.json");
  if (!fs.existsSync(from)) return;
  const pkg = JSON.parse(fs.readFileSync(from, "utf8"));
  pkg.author = AUTHOR;
  pkg.license = LICENSE;
  pkg.repository = { type: "git", url: REPO_URL };
  pkg.homepage = HOMEPAGE;
  // files 只列构建产物，独立仓库里保留也无害，但发布源码时更直观的是交给 .gitignore
  const content = JSON.stringify(pkg, null, 2) + "\n";
  writeIfChanged("package.json", content);
}

(function main() {
  if (!SRC) {
    console.error("未指定源目录。请用以下任一方式指定本地插件目录：");
    console.error("  1) 环境变量：set DSH_PERSONALIZE_SRC=<本地插件目录>");
    console.error("  2) 本地配置：在 " + LOCAL_CONFIG + " 写入 {\"src\": \"<本地插件目录>\"}");
    console.error("     该文件已在 .gitignore 中，不会被提交。");
    process.exit(1);
  }
  if (!fs.existsSync(SRC)) {
    console.error("源目录不存在: " + SRC);
    console.error("请检查 DSH_PERSONALIZE_SRC 或 " + LOCAL_CONFIG);
    process.exit(1);
  }
  log("同步 " + SRC);
  log("  -> " + DST + (DRY ? "  （预演，不写盘）" : ""));
  for (const dir of MIRROR_DIRS) mirrorDir(dir);
  for (const file of COPY_FILES) {
    if (fs.existsSync(path.join(SRC, file))) copyFile(file);
    else log("  跳过（源不存在）: " + file);
  }
  syncPackageJson();
  buildReadme();
  log("");
  log(
    "完成：新增 " + stats.added + "，更新 " + stats.updated +
      "，删除 " + stats.removed + "，未变 " + stats.unchanged
  );
})();
