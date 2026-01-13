# Batch fix all admin pages to add dynamic export for Next.js 15 compatibility
# This fixes the "useSearchParams() should be wrapped in suspense boundary" error

Write-Host "`n🔧 Fixing all admin pages for Next.js 15..." -ForegroundColor Cyan

# Find all admin page.tsx files
$files = Get-ChildItem -Path "app\(admin)\admin" -Filter "page.tsx" -Recurse
$updatedCount = 0
$skippedCount = 0
$clientCount = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Encoding UTF8 | Out-String
    
    # Skip if already has dynamic export
    if ($content -match "export const dynamic") {
        Write-Host "  ✓ Skipped (already fixed): $($file.Directory.Name)" -ForegroundColor Gray
        $skippedCount++
        continue
    }
    
    # Check if it's a client component
    if ($content -match "^'use client'") {
        Write-Host "  🔄 Converting client component: $($file.Directory.Name)" -ForegroundColor Yellow
        $clientCount++
        
        # Create client component file
        $clientPath = Join-Path $file.DirectoryName "$($file.Directory.Name)-client.tsx"
        $content | Set-Content $clientPath -Encoding UTF8 -NoNewline
        
        # Create server wrapper
        $componentName = (Get-Culture).TextInfo.ToTitleCase($file.Directory.Name -replace '-', ' ') -replace ' ', ''
        $serverContent = @"
import { Suspense } from 'react'
import ${componentName}Client from './$($file.Directory.Name)-client'

export const dynamic = 'force-dynamic'

export default function ${componentName}Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <${componentName}Client />
    </Suspense>
  )
}
"@
        $serverContent | Set-Content $file.FullName -Encoding UTF8 -NoNewline
        Write-Host "    ✓ Created: $($file.Directory.Name)-client.tsx" -ForegroundColor Green
        Write-Host "    ✓ Updated: page.tsx (server wrapper)" -ForegroundColor Green
        $updatedCount++
        
    } else {
        # Server component - just add dynamic export
        $newContent = $content -replace "(^export\s+(const\s+metadata|default\s+))", "export const dynamic = 'force-dynamic'`r`n`r`n`$1"
        
        if ($newContent -ne $content) {
            $newContent | Set-Content $file.FullName -Encoding UTF8 -NoNewline
            Write-Host "  ✓ Updated (server): $($file.Directory.Name)" -ForegroundColor Green
            $updatedCount++
        }
    }
}

Write-Host "`n📊 Summary:" -ForegroundColor Cyan
Write-Host "  Updated: $updatedCount pages" -ForegroundColor Green
Write-Host "  Client conversions: $clientCount pages" -ForegroundColor Yellow
Write-Host "  Skipped: $skippedCount pages" -ForegroundColor Gray
Write-Host "`n✅ Admin pages batch fix complete!" -ForegroundColor Green
