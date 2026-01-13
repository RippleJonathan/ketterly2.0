# Convert client component pages to server wrapper pattern
# This is required because route segment config (export const dynamic) cannot be used in client components

Write-Host "`n🔄 Converting client component pages to server wrappers..." -ForegroundColor Cyan

$pages = @(
    "app\(admin)\admin\document-builder\page.tsx",
    "app\(admin)\admin\notifications\page.tsx",
    "app\(admin)\admin\profile\page.tsx",
    "app\(admin)\admin\settings\page.tsx",
    "app\(admin)\admin\settings\locations\page.tsx",
    "app\(admin)\admin\settings\role-permissions\page.tsx",
    "app\(admin)\admin\test-auto-measure\page.tsx"
)

$converted = 0

foreach ($pagePath in $pages) {
    if (Test-Path $pagePath) {
        $dir = Split-Path $pagePath
        $dirName = Split-Path $dir -Leaf
        
        # Generate component name (e.g., document-builder -> DocumentBuilder)
        $parts = $dirName -split '-'
        $componentName = ($parts | ForEach-Object { $_.Substring(0,1).ToUpper() + $_.Substring(1) }) -join ''
        
        Write-Host "`n  Processing: $dirName" -ForegroundColor Yellow
        
        # 1. Rename page.tsx to {name}-client.tsx
        $clientPath = Join-Path $dir "$dirName-client.tsx"
        Move-Item $pagePath $clientPath -Force
        Write-Host "    ✓ Created: $dirName-client.tsx" -ForegroundColor Green
        
        # 2. Create new server wrapper page.tsx
        $serverContent = @"
import { Suspense } from 'react'
import ${componentName}Client from './$dirName-client'

export const dynamic = 'force-dynamic'

export default function ${componentName}Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <${componentName}Client />
    </Suspense>
  )
}
"@
        
        Set-Content -Path $pagePath -Value $serverContent
        Write-Host "    ✓ Created: page.tsx (server wrapper)" -ForegroundColor Green
        
        $converted++
    } else {
        Write-Host "  ⚠ Not found: $pagePath" -ForegroundColor Gray
    }
}

Write-Host "`n📊 Summary:" -ForegroundColor Cyan
Write-Host "  Converted: $converted pages to server wrapper pattern" -ForegroundColor Green
Write-Host "`n✅ Client component conversion complete!" -ForegroundColor Green
