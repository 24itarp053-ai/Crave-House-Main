const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function walk(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      files = files.concat(walk(full));
    } else if (full.endsWith('.js') || full.endsWith('.jsx')) {
      files.push(full);
    }
  }
  return files;
}

const serverFiles = walk(path.join(__dirname, '..'));
console.log(`Checking ${serverFiles.length} server files individually:`);
let failed = 0;
for (const file of serverFiles) {
  try {
    execSync(`node -c "${file}"`, { stdio: 'pipe' });
    console.log(`  [OK] ${path.relative(path.join(__dirname, '../..'), file)}`);
  } catch (err) {
    console.error(`  [FAIL] ${path.relative(path.join(__dirname, '../..'), file)}: ${err.message}`);
    failed++;
  }
}

console.log(`\nServer Syntax Check: ${serverFiles.length - failed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
