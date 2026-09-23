@echo off
setlocal
rem 把本地开发目录里的 ui-personalize 插件源码同步到本仓库（双击即可运行）
rem 源目录来自环境变量 DSH_PERSONALIZE_SRC 或 tools\sync.local.json（后者不入库）
cd /d "%~dp0"

set "NODE_EXE="

rem 1) 优先用 PATH 里的 node
where node >nul 2>nul
if not errorlevel 1 set "NODE_EXE=node"

rem 2) 退回 WorkBuddy 托管的 node（用 %USERPROFILE%，不写死用户名）
if not defined NODE_EXE (
  if exist "%USERPROFILE%\.workbuddy\binaries\node\versions\22.22.2-3\node.exe" (
    set "NODE_EXE=%USERPROFILE%\.workbuddy\binaries\node\versions\22.22.2-3\node.exe"
  )
)

if not defined NODE_EXE (
  echo [错误] 未找到 node.exe。
  echo 请安装 Node.js，或在 PATH 中提供 node，或安装 WorkBuddy 托管的 node。
  pause
  exit /b 1
)

"%NODE_EXE%" "%~dp0tools\sync.cjs"
echo.
pause
