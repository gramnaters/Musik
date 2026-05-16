const AsyncFunctionConstructor = Object.getPrototypeOf(async function () {}).constructor;

const inner = `
(function() {
    function getDeezerCoverUrl(url, size) {
        if (!url) return null;
        return url.replace(/\\/\\d+x\\d+-/, '/' + size + 'x' + size + '-');
    }
    return { id: 'test', getDeezerCoverUrl };
})();
`;

const code = "return await (async () => {\\n" + inner + "\\n})();";

async function test() {
  try {
    const f = new AsyncFunctionConstructor(code);
    const out = await f();
    console.log('OK', out.id);
  } catch (e) {
    console.error(e);
  }
}
test();
