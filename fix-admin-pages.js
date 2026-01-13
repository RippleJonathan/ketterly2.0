const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

function addDynamicExport() {
  const files = globSync('app/(admin)/admin/**/page.tsx', { 
    cwd: __dirname,
    absolute: true 
  });

  console.log(`Found ${files.length} admin pages`);

  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Skip if already has dynamic export
    if (content.includes('export const dynamic')) {
      console.log(`✓ Skipped (already has dynamic): ${path.relative(__dirname, file)}`);
      continue;
    }

    // Find the first export (either metadata or default function)
    const firstExportMatch = content.match(/^(export\s+(const\s+metadata|default\s+))/m);
    
    if (firstExportMatch) {
      const insertIndex = firstExportMatch.index;
      const updatedContent = 
        content.slice(0, insertIndex) +
        "export const dynamic = 'force-dynamic'\n\n" +
        content.slice(insertIndex);
      
      fs.writeFileSync(file, updatedContent, 'utf8');
      console.log(`✓ Added dynamic export: ${path.relative(__dirname, file)}`);
    } else {
      console.log(`✗ Could not find export in: ${path.relative(__dirname, file)}`);
    }
  }

  console.log('\nDone!');
}

addDynamicExport();
