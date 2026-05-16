const { AsyncFunctionConstructor } = require('../src/lib/eightspine-runtime');

const inner = `
/**
 * Deemix fork fork fork fork my life
 */
const WORKER_URL = 'https://deemix-worker.ddezerouse.workers.dev';
function getDeezerCoverUrl(url, size) {
    if (!url) return null;
    return url.replace(/\\/\\d+x\\d+-/, '/' + size + 'x' + size + '-');
}
return { id: 'test' };
`;

async function test() {
  try {
    const runner = new AsyncFunctionConstructor(inner);
    const out = await runner();
    console.log('Success:', out);
  } catch (e) {
    console.error('Error:', e.message);
  }
}
test();
