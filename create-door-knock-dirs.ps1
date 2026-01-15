# PowerShell script to create door-knocking feature structure

$baseDir = "c:\Users\Jonathan\Ketterly2.0\ketterly2.0.worktrees\copilot-worktree-2026-01-15T15-30-00"

# Create directories
$directories = @(
    "$baseDir\components\admin\door-knocking",
    "$baseDir\app\(admin)\admin\door-knocking",
    "$baseDir\app\(admin)\admin\door-knocking\analytics"
)

foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir
        Write-Host "Created: $dir"
    }
}

Write-Host "Directory structure created successfully!"
