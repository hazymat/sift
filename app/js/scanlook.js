// The "scanned" look for a page photographed with the camera: grey, with the
// paper's uneven light and shadows taken out so it shows white and the writing
// dark, as a scanner would. Everything happens on this device, on a canvas.
//
//   scanLook(file)   a new JPEG File with the look, or the same file if it can't be drawn

const BLOCK = 16; // the paper's light is measured in squares this big

// The paper's brightness around each point: the brightest of each square
// (writing is darker than paper, so it drops out), spread a little and smoothed.
function paperLight(grey, width, height) {
  const cols = Math.ceil(width / BLOCK), rows = Math.ceil(height / BLOCK);
  let grid = new Float32Array(cols * rows);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const at = ((y / BLOCK) | 0) * cols + ((x / BLOCK) | 0);
    if (grey[y * width + x] > grid[at]) grid[at] = grey[y * width + x];
  }
  const pass = pick => {
    const next = new Float32Array(grid.length);
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      let best = 0, total = 0, count = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const r = row + dy, c = col + dx;
        if (r < 0 || c < 0 || r >= rows || c >= cols) continue;
        const v = grid[r * cols + c];
        if (v > best) best = v;
        total += v; count++;
      }
      next[row * cols + col] = pick === 'max' ? best : total / count;
    }
    grid = next;
  };
  pass('max'); pass('mean'); pass('mean'); pass('mean');
  return { grid, cols, rows };
}

export function scanPixels(image) {
  const { data, width, height } = image;
  const grey = new Float32Array(width * height);
  for (let n = 0; n < grey.length; n++) grey[n] = 0.299 * data[n * 4] + 0.587 * data[n * 4 + 1] + 0.114 * data[n * 4 + 2];
  const { grid, cols, rows } = paperLight(grey, width, height);
  for (let y = 0; y < height; y++) {
    const gy = Math.min(rows - 1, Math.max(0, y / BLOCK - 0.5)), y0 = gy | 0, y1 = Math.min(rows - 1, y0 + 1), fy = gy - y0;
    for (let x = 0; x < width; x++) {
      const gx = Math.min(cols - 1, Math.max(0, x / BLOCK - 0.5)), x0 = gx | 0, x1 = Math.min(cols - 1, x0 + 1), fx = gx - x0;
      const light = (grid[y0 * cols + x0] * (1 - fx) + grid[y0 * cols + x1] * fx) * (1 - fy) + (grid[y1 * cols + x0] * (1 - fx) + grid[y1 * cols + x1] * fx) * fy;
      // 1 is the paper itself; below about 0.45 is ink. Between them a curve keeps soft pencil readable.
      const ratio = Math.min(1, grey[y * width + x] / Math.max(light, 40));
      const level = Math.min(1, Math.max(0, (ratio - 0.45) / 0.47));
      const out = 255 * Math.pow(level, 1.6);
      const at = (y * width + x) * 4;
      data[at] = data[at + 1] = data[at + 2] = out;
    }
  }
  return image;
}

export async function scanLook(file) {
  try {
    const bmp = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bmp, 0, 0);
    bmp.close?.();
    ctx.putImageData(scanPixels(ctx.getImageData(0, 0, canvas.width, canvas.height)), 0, 0);
    const blob = await new Promise(done => canvas.toBlob(done, 'image/jpeg', 0.8));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
  } catch { return file; }
}
