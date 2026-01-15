@echo off
REM Batch script to create door-knocking feature directories

set BASE_DIR=c:\Users\Jonathan\Ketterly2.0\ketterly2.0.worktrees\copilot-worktree-2026-01-15T15-30-00

REM Create component directories
mkdir "%BASE_DIR%\components\admin\door-knocking" 2>nul

REM Create app page directories
mkdir "%BASE_DIR%\app\(admin)\admin\door-knocking" 2>nul
mkdir "%BASE_DIR%\app\(admin)\admin\door-knocking\analytics" 2>nul

echo Door-knocking directory structure created successfully!
pause
