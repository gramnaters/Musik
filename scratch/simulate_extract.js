const fs = require('fs');

function extractEightspineInner(source) {
  const trimmed = source.trim();
  const firstBacktick = trimmed.indexOf('`');
  const lastBacktick = trimmed.lastIndexOf('`');
  if (firstBacktick === -1 || lastBacktick === -1 || firstBacktick === lastBacktick) {
    return trimmed;
  }
  const inner = trimmed.slice(firstBacktick + 1, lastBacktick);
  return inner.replace(/\\`/g, '`').replace(/\\\$\{/g, '${');
}

const source = fs.readFileSync('scratch/deezer.txt', 'utf8');
const inner = extractEightspineInner(source);
fs.writeFileSync('scratch/deezer_inner.js', inner);
console.log('Extracted to scratch/deezer_inner.js');
