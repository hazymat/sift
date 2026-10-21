// The "scanned" look for a page photographed with the camera: grey, with the
// paper's uneven light and shadows taken out so it shows white and the writing
// dark, as a scanner would. Before that, the page's edges are looked for and,
// when found, everything around them is cut away and the page drawn square on.
// Everything happens on this device, on a canvas.
//
//   scanLook(file, { edges, look })  a new JPEG File, or the same file if it can't be drawn
//   findPage(image)                  the page's corners [[x, y] ×4, clockwise from top left], or null

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

// ---------- the page's edges ----------

const FIND_EDGE = 360; // looked for on a copy this big on its long edge

// The page's four sides are the straight edges that best go all the way round
// something lighter than what's around it. Straight edges come from a Hough
// transform of the picture's sharp edges; each pairing of two across and two
// down is scored by how much of its outline really is an edge, and the biggest
// well-edged one wins. A sheet that fills the photo, or no clear sheet, gives null.
export function findPage(image) {
  const { data, width, height } = image;
  const scale = Math.min(1, FIND_EDGE / Math.max(width, height));
  const w = Math.max(8, Math.round(width * scale)), h = Math.max(8, Math.round(height * scale));
  let grey = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const at = (Math.min(height - 1, (y / scale) | 0) * width + Math.min(width - 1, (x / scale) | 0)) * 4;
    grey[y * w + x] = 0.299 * data[at] + 0.587 * data[at + 1] + 0.114 * data[at + 2];
  }
  for (let pass = 0; pass < 2; pass++) {
    const soft = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let total = 0, count = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const yy = y + dy, xx = x + dx;
        if (yy >= 0 && xx >= 0 && yy < h && xx < w) { total += grey[yy * w + xx]; count++; }
      }
      soft[y * w + x] = total / count;
    }
    grey = soft;
  }
  // Sharp edges: the strongest tenth of the picture's changes in brightness.
  const strength = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const at = y * w + x;
    const gx = grey[at - w + 1] + 2 * grey[at + 1] + grey[at + w + 1] - grey[at - w - 1] - 2 * grey[at - 1] - grey[at + w - 1];
    const gy = grey[at + w - 1] + 2 * grey[at + w] + grey[at + w + 1] - grey[at - w - 1] - 2 * grey[at - w] - grey[at - w + 1];
    strength[at] = Math.hypot(gx, gy);
  }
  const sorted = Float32Array.from(strength).sort();
  const cutoff = Math.max(40, sorted[Math.floor(sorted.length * 0.9)]);
  const edge = new Uint8Array(w * h);
  for (let n = 0; n < edge.length; n++) if (strength[n] >= cutoff) edge[n] = 1;
  // Near an edge (within 2 points), for scoring outlines.
  const near = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!edge[y * w + x]) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const yy = y + dy, xx = x + dx;
      if (yy >= 0 && xx >= 0 && yy < h && xx < w) near[yy * w + xx] = 1;
    }
  }
  // Hough: every edge point votes for the lines through it (angle in degrees, distance from the corner).
  const reachMax = Math.ceil(Math.hypot(w, h));
  const votes = new Int32Array(180 * (2 * reachMax + 1));
  const cos = [], sin = [];
  for (let deg = 0; deg < 180; deg++) { cos.push(Math.cos(deg * Math.PI / 180)); sin.push(Math.sin(deg * Math.PI / 180)); }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!edge[y * w + x]) continue;
    for (let deg = 0; deg < 180; deg++) votes[deg * (2 * reachMax + 1) + Math.round(x * cos[deg] + y * sin[deg]) + reachMax]++;
  }
  // The strongest few lines across (angle near 90) and down (near 0 or 180), each well apart.
  const strongest = across => {
    const found = [];
    const order = [];
    for (let deg = 0; deg < 180; deg++) {
      const isAcross = deg >= 55 && deg <= 125, isDown = deg <= 35 || deg >= 145;
      if (across ? !isAcross : !isDown) continue;
      for (let r = 0; r <= 2 * reachMax; r++) { const v = votes[deg * (2 * reachMax + 1) + r]; if (v > 15) order.push([v, deg, r - reachMax]); }
    }
    order.sort((p, q) => q[0] - p[0]);
    for (const [v, deg, dist] of order) {
      if (found.length >= 12) break;
      const close = found.some(line => { let gap = Math.abs(line.deg - deg); if (gap > 90) gap = 180 - gap; const flip = Math.abs(line.deg - deg) > 90; return gap < 8 && Math.abs((flip ? -line.dist : line.dist) - dist) < 12; });
      if (!close) found.push({ deg, dist });
    }
    return found;
  };
  const meet = (p, q) => {
    const det = cos[p.deg] * sin[q.deg] - sin[p.deg] * cos[q.deg];
    if (Math.abs(det) < 1e-6) return null;
    return [(p.dist * sin[q.deg] - q.dist * sin[p.deg]) / det, (q.dist * cos[p.deg] - p.dist * cos[q.deg]) / det];
  };
  const sideSupport = (p, q) => {
    // How much of the side is an edge, with the paper side lighter (a line of writing
    // on the page has paper on both sides, so it doesn't count).
    const length = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    const nx = -(q[1] - p[1]) / length * 4, ny = (q[0] - p[0]) / length * 4; // 4 points inside (the corners go clockwise)
    const at = (x, y) => grey[Math.min(h - 1, Math.max(0, Math.round(y))) * w + Math.min(w - 1, Math.max(0, Math.round(x)))];
    let hits = 0, lighter = 0;
    const steps = 40;
    for (let n = 0; n <= steps; n++) {
      const x = p[0] + (q[0] - p[0]) * n / steps, y = p[1] + (q[1] - p[1]) * n / steps;
      const ix = Math.round(x), iy = Math.round(y);
      if (ix >= 0 && iy >= 0 && ix < w && iy < h && near[iy * w + ix]) hits++;
      lighter += at(x + nx, y + ny) - at(x - nx, y - ny);
    }
    return lighter / (steps + 1) < 8 ? 0 : hits / (steps + 1);
  };
  const across = strongest(true), down = strongest(false);
  let best = null;
  for (let i = 0; i < across.length; i++) for (let j = i + 1; j < across.length; j++) for (let k = 0; k < down.length; k++) for (let l = k + 1; l < down.length; l++) {
    const top = across[i], bottom = across[j], left = down[k], right = down[l];
    const meets = [meet(top, left), meet(top, right), meet(bottom, right), meet(bottom, left)];
    if (meets.some(c => !c || c[0] < -0.03 * w || c[1] < -0.03 * h || c[0] > 1.03 * w || c[1] > 1.03 * h)) continue;
    // In order: top left, top right, bottom right, bottom left.
    const pickBy = rank => meets.reduce((p, q) => (rank(q) > rank(p) ? q : p));
    const corners = [pickBy(c => -c[0] - c[1]), pickBy(c => c[0] - c[1]), pickBy(c => c[0] + c[1]), pickBy(c => c[1] - c[0])];
    if (new Set(corners).size < 4) continue;
    let area = 0;
    for (let n = 0; n < 4; n++) { const [x1, y1] = corners[n], [x2, y2] = corners[(n + 1) % 4]; area += x1 * y2 - x2 * y1; }
    const share = Math.abs(area) / 2 / (w * h);
    if (share < 0.1 || share > 0.95) continue;
    let squareEnough = true;
    for (let n = 0; n < 4; n++) {
      const [ax, ay] = corners[(n + 3) % 4], [bx, by] = corners[n], [cx, cy] = corners[(n + 1) % 4];
      const turn = ((ax - bx) * (cx - bx) + (ay - by) * (cy - by)) / (Math.hypot(ax - bx, ay - by) * Math.hypot(cx - bx, cy - by) || 1);
      if (Math.abs(turn) > 0.5) squareEnough = false;
    }
    if (!squareEnough) continue;
    const sides = [0, 1, 2, 3].map(n => sideSupport(corners[n], corners[(n + 1) % 4]));
    const weakest = Math.min(sides[0], sides[1], sides[2], sides[3]);
    if (weakest < 0.6) continue;
    const score = weakest + (sides[0] + sides[1] + sides[2] + sides[3]) / 4 + share;
    if (!best || score > best.score) best = { score, corners };
  }
  if (!best) return null;
  // The inside should be lighter than the outside (paper on a table).
  const inside = (x, y) => {
    let sign = 0;
    for (let n = 0; n < 4; n++) {
      const [x1, y1] = best.corners[n], [x2, y2] = best.corners[(n + 1) % 4];
      const side = (x2 - x1) * (y - y1) - (y2 - y1) * (x - x1);
      if (side !== 0) { if (sign && Math.sign(side) !== sign) return false; sign = Math.sign(side); }
    }
    return true;
  };
  let inTotal = 0, inCount = 0, outTotal = 0, outCount = 0;
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
    if (inside(x, y)) { inTotal += grey[y * w + x]; inCount++; } else { outTotal += grey[y * w + x]; outCount++; }
  }
  if (outCount && inTotal / inCount < outTotal / outCount + 10) return null;
  // A touch inside the edges, so no sliver of the table shows.
  const mid = [best.corners.reduce((t, c) => t + c[0], 0) / 4, best.corners.reduce((t, c) => t + c[1], 0) / 4];
  return best.corners.map(([x, y]) => [Math.min(width, Math.max(0, (x + (mid[0] - x) * 0.012) / scale)), Math.min(height, Math.max(0, (y + (mid[1] - y) * 0.012) / scale))]);
}

// The 3×3 matrix taking the corners of a w × h rectangle to the four points.
function squareToQuad(quad, w, h) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = quad;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const det = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / det, k = (dx1 * dy3 - dx3 * dy1) / det;
  const a = x1 - x0 + g * x1, b = x3 - x0 + k * x3, d = y1 - y0 + g * y1, e = y3 - y0 + k * y3;
  return [a / w, b / h, x0, d / w, e / h, y0, g / w, k / h, 1];
}

// The page cut out and drawn square on, as big as it was in the photo.
function straighten(image, quad) {
  const side = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  const w = Math.round(Math.max(side(quad[0], quad[1]), side(quad[3], quad[2]))), h = Math.round(Math.max(side(quad[0], quad[3]), side(quad[1], quad[2])));
  const [m0, m1, m2, m3, m4, m5, m6, m7] = squareToQuad(quad, w, h);
  const out = new ImageData(w, h);
  const { data, width, height } = image;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const z = m6 * x + m7 * y + 1;
    const sx = Math.min(width - 1.001, Math.max(0, (m0 * x + m1 * y + m2) / z)), sy = Math.min(height - 1.001, Math.max(0, (m3 * x + m4 * y + m5) / z));
    const x0 = sx | 0, y0 = sy | 0, fx = sx - x0, fy = sy - y0;
    const a = (y0 * width + x0) * 4, b = a + 4, c = a + width * 4, d = c + 4, to = (y * w + x) * 4;
    for (let ch = 0; ch < 3; ch++) out.data[to + ch] = (data[a + ch] * (1 - fx) + data[b + ch] * fx) * (1 - fy) + (data[c + ch] * (1 - fx) + data[d + ch] * fx) * fy;
    out.data[to + 3] = 255;
  }
  return out;
}

export async function scanLook(file, { edges = true, look = true } = {}) {
  try {
    const bmp = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bmp, 0, 0);
    bmp.close?.();
    let image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const quad = edges ? findPage(image) : null;
    if (quad) {
      image = straighten(image, quad);
      canvas.width = image.width;
      canvas.height = image.height;
    }
    if (!quad && !look) return file;
    ctx.putImageData(look ? scanPixels(image) : image, 0, 0);
    const blob = await new Promise(done => canvas.toBlob(done, 'image/jpeg', 0.8));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
  } catch { return file; }
}
