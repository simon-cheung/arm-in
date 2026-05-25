export function createBlobUrl(html: string): string {
  const wrapped = `<!DOCTYPE html><html><head><meta charset="utf-8"><script>
window.addEventListener('message', function(e) {
  if (e.data) {
    if (e.data.type === 'playground.html' && e.data.html) {
      try {
        eval(e.data.html);
      } catch (err) {
        console.error('playground.html error:', err);
      }
    } else if (e.data.action === 'download') {
      window.parent.postMessage(e.data, '*');
    }
  }
});
<\/script></head><body>${html}</body></html>`
  const blob = new Blob([wrapped], { type: "text/html" })
  return URL.createObjectURL(blob)
}

export function createBlobUrlWithScript(html: string, script: string): string {
  const wrapped = `<!DOCTYPE html><html><head><meta charset="utf-8"><script>
window.addEventListener('message', function(e) {
  if (e.data) {
    if (e.data.type === 'playground.html' && e.data.html) {
      try {
        eval(e.data.html);
      } catch (err) {
        console.error('playground.html error:', err);
      }
    } else if (e.data.action === 'download') {
      window.parent.postMessage(e.data, '*');
    }
  }
});
<\/script></head><body>${html}<script>${script}<\/script></body></html>`
  const blob = new Blob([wrapped], { type: "text/html" })
  return URL.createObjectURL(blob)
}
