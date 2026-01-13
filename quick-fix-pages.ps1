# Quick fix: Add dynamic export to all admin pages
$files = Get-ChildItem -Path "app\(admin)\admin" -Filter "page.tsx" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName
    
    # Skip if already has dynamic export
    if ($content -match "export const dynamic") {
        Write-Host "Skip: $($file.Directory.Name)" -ForegroundColor Gray
        continue
    }
    
    # Add dynamic export at line 2 (after 'use client' or imports)
    $line1 = $content[0]
    $newLine = "`nexport const dynamic = 'force-dynamic'`n"
    $restOfFile = $content[1..($content.Length-1)]
    
    $newContent = @($line1) + $newLine + $restOfFile
    
    $newContent | Set-Content $file.FullName -Encoding UTF8
    Write-Host "Fixed: $($file.Directory.Name)" -ForegroundColor Green
}

Write-Host "`nDone!" -ForegroundColor Cyan
