#!/usr/bin/env node

/**
 * Ketterly Production Deployment Helper
 * 
 * This script helps prepare and deploy Ketterly to Vercel
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n🚀 Ketterly Deployment Helper\n');

// Check if .env.local exists
const envPath = path.join(__dirname, '.env.local');
if (!fs.existsSync(envPath)) {
  console.log('⚠️  Warning: .env.local not found');
  console.log('   Make sure to set environment variables in Vercel dashboard\n');
}

// Check for required dependencies
console.log('📦 Checking dependencies...');
try {
  execSync('npm list --depth=0', { stdio: 'ignore' });
  console.log('✅ Dependencies installed\n');
} catch (error) {
  console.log('❌ Missing dependencies. Run: npm install\n');
  process.exit(1);
}

// Run type check
console.log('🔍 Running type check...');
try {
  execSync('npm run type-check', { stdio: 'inherit' });
  console.log('✅ Type check passed\n');
} catch (error) {
  console.log('❌ Type check failed. Fix errors before deploying.\n');
  process.exit(1);
}

// Run build test
console.log('🏗️  Testing production build...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build successful\n');
} catch (error) {
  console.log('❌ Build failed. Fix errors before deploying.\n');
  process.exit(1);
}

// Deployment instructions
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ Pre-deployment checks passed!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📋 Next steps:\n');
console.log('1. Set environment variables in Vercel dashboard:');
console.log('   - NEXT_PUBLIC_SUPABASE_URL');
console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY');
console.log('   - SUPABASE_SERVICE_ROLE_KEY');
console.log('   - NEXT_PUBLIC_APP_URL=https://ketterly.com');
console.log('   - RESEND_API_KEY');
console.log('   - RESEND_FROM_EMAIL=orders@ketterly.com');
console.log('   - GOOGLE_MAPS_API_KEY');
console.log('   - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');
console.log('   - NEXT_PUBLIC_ONESIGNAL_APP_ID');
console.log('   - ONESIGNAL_REST_API_KEY\n');

console.log('2. Update Supabase settings:');
console.log('   - Site URL: https://ketterly.com');
console.log('   - Redirect URLs:');
console.log('     * https://ketterly.com/auth/callback');
console.log('     * https://ketterly.com/login');
console.log('     * https://ketterly.com/signup\n');

console.log('3. Deploy to Vercel:');
console.log('   Option A - CLI: vercel --prod');
console.log('   Option B - Dashboard: Push to main branch\n');

console.log('4. Configure DNS for ketterly.com:');
console.log('   - A Record: @ → 76.76.21.21');
console.log('   - CNAME Record: www → cname.vercel-dns.com\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📖 See DEPLOYMENT_CHECKLIST.md for full guide');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
