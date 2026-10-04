import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';
import { getTheme, renderArt } from './styles.js';
import { cleanText } from './text.js';

const ESC = '\x1b';
export const revealStyles = Object.freeze(['background', 'top-down', 'right-left', 'none']);
export const speeds = Object.freeze({ fast: 1200, normal: 2800, slow: 4600 });
export function validateReveal(reveal) {
  if (!revealStyles.includes(reveal)) throw new Error(`Unknown reveal: ${reveal}. Choose ${revealStyles.join(', ')}.`);
}
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const rgb = (hex) => hex.slice(1).match(/../g).map((part) => parseInt(part, 16));
const mix = (a, b, amount) => '#' + rgb(a).map((value, index) => Math.round(value + (rgb(b)[index] - value) * clamp(amount)).toString(16).padStart(2, '0')).join('');
const sgr = (hex, background = false) => `${ESC}[${background ? 48 : 38};2;${rgb(hex).join(';')}m`;
const smooth = (value) => value * value * (3 - 2 * value);

export function layoutScene({ columns = 80, rows = 24, brand = 'FINCLIQ', art = 'block' } = {}) {
  // Leave the final column and row unused to avoid auto-wrap and scroll.
  const width = Math.max(1, Math.floor(columns) - 1);
  const height = Math.max(1, Math.floor(rows) - 1);
  const label = cleanText(brand);
  let wordmark = renderArt(label, art);
  const available = Math.max(1, width - 12);
  if (!wordmark || wordmark[0].length > available || height < 16) wordmark = [label.slice(0, available)];
  const scale = wordmark.length === 5
    ? Math.max(1, Math.min(3, Math.floor((width - 20) / wordmark[0].length), Math.floor((height - 10) / 5)))
    : 1;
  const artRows = wordmark.flatMap((row) => Array.from({ length: scale }, () => [...row].map((char) => char.repeat(scale)).join('')));
  const artWidth = Math.max(...artRows.map((row) => row.length));
  const cardWidth = Math.min(width, Math.max(artWidth + 12, Math.min(44, width)));
  const cardHeight = Math.min(height, artRows.length + 8);
  const cardLeft = Math.floor((width - cardWidth) / 2);
  const cardTop = Math.max(0, Math.floor((height - cardHeight) / 2));
  const artLeft = Math.floor((width - artWidth) / 2);
  const artTop = cardTop + Math.min(4, Math.max(0, cardHeight - artRows.length - 2));
  return { width, height, label, artRows, artWidth, artLeft, artTop, cardLeft, cardTop, cardWidth, cardHeight, scale };
}

// A deterministic frame makes reveal order and centering independently testable.
export function buildFrame(layout, { theme = 'aurora', reveal = 'background', progress = 1, showcase = false } = {}) {
  validateReveal(reveal);
  const palette = getTheme(theme);
  const p = clamp(progress);
  const { width, height, cardLeft, cardTop, cardWidth, cardHeight, artLeft, artTop, artRows, artWidth } = layout;
  const fieldInk = mix(palette.background, palette.muted, 0.22);
  const shadowInk = mix(palette.background, palette.accent, 0.26);
  const bgProgress = reveal === 'background' ? clamp(p / 0.42) : 1;
  const textProgress = reveal === 'background' ? clamp((p - 0.48) / 0.52) : p;
  const visibleText = (x, y) => reveal === 'none' || (textProgress > 0 && (reveal === 'right-left'
    ? x >= Math.floor(artWidth * (1 - textProgress))
    : y < Math.ceil(artRows.length * textProgress)));
  const cells = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    const visible = y < Math.ceil(height * bgProgress);
    const dot = x % 8 === 0 && y % 3 === 0 ? '+' : (x + y * 3) % 19 === 0 ? '.' : ' ';
    return { char: visible ? dot : ' ', color: fieldInk, background: visible ? palette.background : '#000000' };
  }));
  const put = (x, y, char, color, force = false) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    if (!force && y >= Math.ceil(height * bgProgress)) return;
    cells[y][x] = { char, color, background: palette.background };
  };
  const centered = (text, y, color) => {
    const value = text.slice(0, Math.max(0, width - 2));
    const left = Math.floor((width - value.length) / 2);
    [...value].forEach((char, index) => put(left + index, y, char, color));
  };
  // Cut a quiet panel out of the grid behind the wordmark.
  for (let y = cardTop; y < cardTop + cardHeight; y++) {
    for (let x = cardLeft; x < cardLeft + cardWidth; x++) put(x, y, ' ', fieldInk);
  }
  for (let x = 0; x < cardWidth; x++) {
    const char = x === 0 || x === cardWidth - 1 ? '+' : '-';
    put(cardLeft + x, cardTop, char, palette.secondary);
    put(cardLeft + x, cardTop + cardHeight - 1, char, palette.tertiary);
  }
  for (let y = 1; y < cardHeight - 1; y++) {
    put(cardLeft, cardTop + y, '|', fieldInk);
    put(cardLeft + cardWidth - 1, cardTop + y, '|', fieldInk);
  }
  centered('[ T E R M I N A L   E D I T I O N ]', cardTop + 2, palette.muted);
  const gradient = Array.from({ length: 12 }, (_, index) => {
    const t = index / 11;
    return t <= 0.5 ? mix(palette.accent, palette.secondary, t * 2) : mix(palette.secondary, palette.tertiary, (t - 0.5) * 2);
  });
  // Shadow first, then the three-color wordmark over it.
  artRows.forEach((row, y) => [...row].forEach((char, x) => {
    if (char !== ' ' && visibleText(x, y)) put(artLeft + x + 1, artTop + y + 1, char, shadowInk);
  }));
  artRows.forEach((row, y) => [...row].forEach((char, x) => {
    if (visibleText(x, y)) put(artLeft + x, artTop + y, char, gradient[Math.floor(x / Math.max(1, artWidth) * 11)]);
  }));
  // A moving beam shows the direction of the reveal without fabricated progress.
  if (textProgress > 0 && textProgress < 1 && reveal !== 'none') {
    if (reveal === 'right-left') {
      const x = artLeft + Math.floor(artWidth * (1 - textProgress));
      for (let y = 0; y < artRows.length; y++) put(x, artTop + y, '|', palette.highlight);
    } else {
      const y = artTop + Math.min(artRows.length - 1, Math.floor(artRows.length * textProgress));
      for (let x = 0; x < artWidth; x++) put(artLeft + x, y, '-', palette.highlight);
    }
  }
  if (textProgress >= 0.94 || reveal === 'none') centered('R E A D Y   W H E N   Y O U   A R E', cardTop + cardHeight - 2, palette.foreground);
  if (height >= 20) {
    centered(`${theme.toUpperCase()}  /  ${reveal.toUpperCase()} REVEAL`, height - 3, palette.muted);
    if (showcase) centered('SPACE: NEXT ENTRANCE     ESC: CLOSE', height - 1, palette.muted);
  }
  return cells;
}

export function createStage({ stream = process.stdout } = {}) {
  let active = false;
  let previous = [];
  let lastSize = '';
  function open() {
    if (active) return;
    active = true;
    // Alternate buffer keeps the user's existing terminal output intact.
    stream.write(`${ESC}[?1049h${ESC}[?25l${ESC}[2J${ESC}[H`);
  }
  function close() {
    if (!active) return;
    active = false;
    stream.write(`${ESC}[0m${ESC}[?25h${ESC}[?1049l`);
    previous = [];
  }
  function draw(options, progress) {
    const layout = layoutScene({ ...options, columns: stream.columns || 80, rows: stream.rows || 24 });
    const size = `${layout.width}:${layout.height}`;
    if (size !== lastSize) {
      previous = [];
      lastSize = size;
      stream.write(`${ESC}[2J`);
    }
    const rows = buildFrame(layout, { ...options, progress }).map((row) => {
      let output = '';
      let color;
      let background;
      for (const cell of row) {
        if (cell.background !== background) { output += sgr(cell.background, true); background = cell.background; }
        if (cell.color !== color) { output += sgr(cell.color); color = cell.color; }
        output += cell.char;
      }
      return output;
    });
    // Redraw only changed rows; ordinary output never shares this screen.
    let output = '';
    rows.forEach((row, index) => {
      if (row !== previous[index]) output += `${ESC}[${index + 1};1H${row}`;
    });
    if (output) stream.write(output);
    previous = rows;
  }
  async function play(options, { duration = 2800, hold = 1100, signal, skip = () => false } = {}) {
    validateReveal(options.reveal);
    open();
    const started = performance.now();
    while (!signal?.aborted && !skip()) {
      const progress = options.reveal === 'none' ? 1 : clamp((performance.now() - started) / duration);
      draw(options, smooth(progress));
      if (progress === 1) break;
      await delay(40);
    }
    const holdStarted = performance.now();
    while (!signal?.aborted && !skip() && performance.now() - holdStarted < hold) {
      // Resize remains responsive while the finished frame is held.
      draw(options, 1);
      await delay(60);
    }
  }
  return { play, close };
}
