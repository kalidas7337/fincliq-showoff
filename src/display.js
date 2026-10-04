import { performance } from 'node:perf_hooks';
import { getTheme, renderArt, validateArt } from './styles.js';
import { createStage, validateReveal, speeds } from './scene.js';
import { cleanText } from './text.js';
export { theme, themes, artStyles } from './styles.js';
export { cleanText } from './text.js';

const ESC = '\x1b';
const ansiColor = (hex) => `${ESC}[38;2;${hex.slice(1).match(/../g).map((part) => parseInt(part, 16)).join(';')}m`;

export function formatElapsed(milliseconds) {
  const seconds = Math.floor(Math.max(0, milliseconds) / 1000);
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((part) => String(part).padStart(2, '0')).join(':');
}

export function createDisplay({
  brand = 'FINCLIQ',
  theme: themeName = 'green',
  art = 'block',
  stream = process.stdout,
  plain = false,
  color = Boolean(stream.isTTY) && !('NO_COLOR' in process.env) && process.env.TERM !== 'dumb',
  animate = Boolean(stream.isTTY),
} = {}) {
  const styled = color && !plain;
  const selectedTheme = getTheme(themeName);
  validateArt(art);
  const palette = Object.fromEntries(['accent', 'secondary', 'tertiary', 'highlight', 'foreground', 'muted', 'warning', 'error']
    .map((shade) => [shade, ansiColor(selectedTheme[shade])]));
  const animated = animate && Boolean(stream.isTTY) && !plain;
  const label = cleanText(brand);
  let activeSpinner;
  let activeStage;

  const paint = (text, shade = 'foreground') => styled
    ? `${palette[shade]}${text}${ESC}[0m` : text;
  const line = (text = '', shade) => stream.write(paint(text, shade) + '\n');

  function banner() {
    const width = Math.max(1, (stream.columns || 80) - 2);
    const centered = (text, shade = 'foreground') => {
      const value = text.slice(0, width);
      line(' '.repeat(Math.max(0, Math.floor((width - value.length) / 2))) + value, shade);
    };
    const rows = renderArt(label, art);
    const fits = rows && rows[0].length + 12 <= width;
    const cardWidth = Math.min(width, Math.max(44, (fits ? rows[0].length : label.length) + 12));
    const border = '+' + '-'.repeat(Math.max(0, cardWidth - 2)) + (cardWidth > 1 ? '+' : '');
    line();
    centered(border, 'secondary');
    centered('[ TERMINAL EDITION ]', 'muted');
    line();
    if (fits) {
      const shades = ['accent', 'secondary', 'tertiary'];
      const chunkWidth = Math.ceil(rows[0].length / shades.length);
      for (const row of rows) {
        stream.write(' '.repeat(Math.floor((width - rows[0].length) / 2)) + shades.map((shade, index) => paint(row.slice(index * chunkWidth, (index + 1) * chunkWidth), shade)).join('') + '\n');
      }
    } else {
      centered(label, 'accent');
    }
    line();
    centered('READY WHEN YOU ARE', 'foreground');
    centered(border, 'tertiary');
    line();
  }

  function status(kind, message) {
    activeSpinner?.stop();
    const tag = { info: 'INFO', success: 'OK', warning: 'WARN', error: 'ERROR' }[kind];
    if (!tag) throw new Error(`Unknown status kind: ${kind}`);
    const shade = { info: 'secondary', success: 'accent', warning: 'warning', error: 'error' }[kind];
    stream.write(paint(`[${tag.padEnd(5)}]`, shade) + ' ' + paint(cleanText(message), 'foreground') + '\n');
  }

  function spinner(message) {
    activeSpinner?.stop();
    const started = performance.now();
    const text = cleanText(message);
    const frames = ['|', '/', '-', '\\'];
    let frame = 0;
    let timer;
    let stopped = false;
    const render = () => {
      const content = `${frames[frame++ % frames.length]} ${text}  ${formatElapsed(performance.now() - started)}`;
      // Keep updates on one row even in narrow terminals.
      const maxWidth = Math.max(1, (stream.columns || 80) - 1);
      stream.write(`\r${paint(content.slice(0, maxWidth).padEnd(maxWidth), 'accent')}`);
    };
    if (animated) {
      render();
      timer = setInterval(render, 120);
    } else {
      line(`[WAIT ] ${text}`, 'muted');
    }
    const controller = {
      stop() {
        if (stopped) return;
        stopped = true;
        clearInterval(timer);
        if (animated) stream.write('\r' + ' '.repeat(Math.max(1, (stream.columns || 80) - 1)) + '\r');
        if (activeSpinner === controller) activeSpinner = undefined;
      },
      succeed(message = text) {
        if (stopped) return;
        controller.stop();
        status('success', `${cleanText(message)} (${formatElapsed(performance.now() - started)})`);
      },
      fail(message = text) {
        if (stopped) return;
        controller.stop();
        status('error', `${cleanText(message)} (${formatElapsed(performance.now() - started)})`);
      },
    };
    activeSpinner = controller;
    return controller;
  }

  function dispose() {
    activeSpinner?.stop();
    activeStage?.close();
    if (styled) stream.write(`${ESC}[0m`);
  }

  function accents() {
    const width = Math.max(20, Math.min(stream.columns || 80, 100) - 2);
    const shades = ['accent', 'secondary', 'tertiary', 'highlight'];
    if (width >= 60) {
      stream.write(shades.map((shade) => paint(`[ ${shade.toUpperCase()} ]`, shade)).join(' ') + '\n');
    } else {
      for (const shade of shades) line(`[${shade.toUpperCase()}] ${selectedTheme[shade]}`.slice(0, width), shade);
    }
    line(`  PALETTE: ${selectedTheme.name}`.slice(0, width), 'muted');
  }

  async function intro({ reveal = 'background', speed = 'normal' } = {}) {
    validateReveal(reveal);
    if (!Object.hasOwn(speeds, speed)) throw new Error(`Unknown speed: ${speed}.`);
    activeSpinner?.stop();
    if (!styled || !animated || reveal === 'none') { banner(); return; }
    activeStage = createStage({ stream });
    try {
      await activeStage.play({ brand: label, art, theme: themeName, reveal }, { duration: speeds[speed] });
    } finally {
      activeStage.close();
      activeStage = undefined;
    }
    banner();
  }

  async function showcase({ speed = 'normal', input = process.stdin } = {}) {
    if (!Object.hasOwn(speeds, speed)) throw new Error(`Unknown speed: ${speed}.`);
    if (!styled || !animated || !input.isTTY) { banner(); return; }
    activeSpinner?.stop();
    activeStage = createStage({ stream });
    const controller = new AbortController();
    const wasRaw = Boolean(input.isRaw);
    const wasFlowing = input.readableFlowing === true;
    let next = false;
    const onKey = (data) => {
      const key = data.toString();
      if (key.includes('\x03') || key.includes('\x1b')) controller.abort();
      if (key.includes(' ')) next = true;
    };
    input.setRawMode(true);
    input.resume();
    input.on('data', onKey);
    try {
      const reveals = ['background', 'top-down', 'right-left'];
      for (let index = 0; !controller.signal.aborted; index++) {
        next = false;
        await activeStage.play({ brand: label, art, theme: themeName, reveal: reveals[index % reveals.length], showcase: true },
          { duration: speeds[speed], hold: 1400, signal: controller.signal, skip: () => next });
      }
    } finally {
      input.off('data', onKey);
      input.setRawMode(wasRaw);
      if (!wasFlowing) input.pause();
      activeStage.close();
      activeStage = undefined;
    }
  }

  return { banner, accents, status, spinner, intro, showcase, dispose };
}
