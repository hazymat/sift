// Reading the text on a photographed page, on this device only: Tesseract
// (app/vendor/tesseract-7.0.0, English), never a service elsewhere. Its files
// (about 7 MB) are fetched from Sift's own site the first time a page is read,
// then kept (sw.js keeps app/vendor between versions).
//
//   readText(blob)   the text on the page, '' if none was found

const BASE = new URL('../vendor/tesseract-7.0.0/', import.meta.url).href;
const IDLE = 60 * 1000; // the reader is put away after a minute with nothing to read

let reader = null;
let idleTimer = null;
let queue = Promise.resolve();

async function getReader() {
  if (!reader) {
    reader = (async () => {
      const { default: Tesseract } = await import(`${BASE}tesseract.esm.min.js`);
      // 1: the LSTM reader only (the smaller core files)
      return Tesseract.createWorker('eng', 1, { workerPath: `${BASE}worker.min.js`, corePath: `${BASE}core`, langPath: `${BASE}lang`, workerBlobURL: false });
    })();
    reader.catch(() => { reader = null; });
  }
  return reader;
}

function putAwayLater() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(async () => {
    const was = reader;
    reader = null;
    try { (await was)?.terminate(); } catch { /* already gone */ }
  }, IDLE);
}

// One page at a time, so a phone isn't asked to read several at once.
export function readText(blob) {
  const job = queue.then(async () => {
    clearTimeout(idleTimer);
    try {
      const { data } = await (await getReader()).recognize(blob);
      return (data.text || '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    } finally { putAwayLater(); }
  });
  queue = job.catch(() => {});
  return job;
}
