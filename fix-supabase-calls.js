/**
 * Script to add `const supabase = createClient()` to all exported async functions
 * in API files that don't already have it.
 */

const fs = require('fs');
const path = require('path');

const apiFiles = [
  'lib/api/users.ts',
  'lib/api/permissions.ts',
  'lib/api/commission-plans.ts',
  'lib/api/role-templates.ts',
  'lib/api/user-commissions.ts',
];

function addSupabaseToFunctions(filePath) {
  console.log(`Processing ${filePath}...`);
  
  const fullPath = path.join(__dirname, filePath);
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Pattern to match: export async function NAME(...): ... { \n  try {
  // Replace with: export async function NAME(...): ... { \n  const supabase = createClient()\n  try {
  const pattern = /(export async function [^{]+\{)\s*\n\s*(try \{)/g;
  
  const newContent = content.replace(pattern, (match, p1, p2) => {
    // Check if supabase declaration already exists in the next few lines
    if (match.includes('const supabase')) {
      return match; // Already has it
    }
    return `${p1}\n  const supabase = createClient()\n  ${p2}`;
  });
  
  if (content !== newContent) {
    fs.writeFileSync(fullPath, newContent, 'utf8');
    console.log(`✓ Updated ${filePath}`);
  } else {
    console.log(`  No changes needed for ${filePath}`);
  }
}

apiFiles.forEach(addSupabaseToFunctions);

console.log('\nDone!');
