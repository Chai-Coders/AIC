// Creates the signing keys Convex Auth needs and stores them as environment
// variables on the deployment in .env.local (or the one given with
// CONVEX_SELF_HOSTED_URL / CONVEX_SELF_HOSTED_ADMIN_KEY). Run once per
// deployment; running it again signs every admin out.
//
//   node scripts/setup-auth-keys.mjs <cms-url>
//   e.g. node scripts/setup-auth-keys.mjs https://cms.aic-iiitkottayam.in

import { execFileSync } from 'node:child_process';
import { exportJWK, exportPKCS8, generateKeyPair } from 'jose';

const siteUrl = process.argv[2];
if (!/^https?:\/\//.test(siteUrl ?? '')) {
  console.error('Usage: node scripts/setup-auth-keys.mjs <cms-url>');
  process.exit(1);
}

const keys = await generateKeyPair('RS256', { extractable: true });
const privateKey = (await exportPKCS8(keys.privateKey)).trimEnd().replace(/\n/g, ' ');
const jwks = JSON.stringify({ keys: [{ use: 'sig', ...(await exportJWK(keys.publicKey)) }] });

const set = (name, value) => execFileSync('npx', ['convex', 'env', 'set', '--', name, value], { stdio: 'inherit' });
set('JWT_PRIVATE_KEY', privateKey);
set('JWKS', jwks);
set('SITE_URL', siteUrl);
console.log('Convex Auth keys are set.');
