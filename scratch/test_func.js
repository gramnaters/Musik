try {
  const inner = 'return "/".replace(/\\/\\d+x\\d+-/, "test")';
  const f = new Function(inner);
  console.log('OK', f());
} catch(e) {
  console.error(e);
}
