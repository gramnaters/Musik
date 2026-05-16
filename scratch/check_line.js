const fs = require('fs');
const s = fs.readFileSync('scratch/deezer.txt', 'utf8');
const inner = s.trim().slice(s.indexOf('`')+1, s.lastIndexOf('`')).replace(/\\`/g, '`').replace(/\\\$\{/g, '${');
console.log('LINE 40:', inner.split('\n')[39]);
