#!/usr/bin/env node

/**
 * Generate Secure Secrets for Logto Integration
 * 
 * Usage: node scripts/generate-secrets.js
 */

const crypto = require('crypto');

console.log('🔐 Logto Secure Secrets Generator\n');

// Cookie Secret (64 chars = 32 bytes)
const cookieSecret = crypto.randomBytes(32).toString('hex');

console.log('Add these to your .env.local:\n');
console.log(`LOGTO_COOKIE_SECRET=${cookieSecret}`);
console.log('\n✅ Secrets generated successfully!');
console.log('⚠️  Never commit .env.local to Git!');
