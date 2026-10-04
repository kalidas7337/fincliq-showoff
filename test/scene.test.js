import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutScene, buildFrame, createStage } from '../src/scene.js';
import { createDisplay } from '../src/display.js';
import { EventEmitter } from 'node:events';

test('wordmark stays centered and bounded at common terminal sizes', () => {
  for (const [columns, rows] of [[80, 24], [120, 32], [180, 48], [30, 16], [12, 8]]) {
    const layout = layoutScene({ columns, rows });
    const left = layout.artLeft;
    const right = layout.width - layout.artWidth - left;
    assert.ok(Math.abs(left - right) <= 1);
    assert.ok(left >= 0);
    assert.ok(layout.artWidth <= layout.width);
    const frame = buildFrame(layout);
    assert.equal(frame.length, rows - 1);
    assert.ok(frame.every((row) => row.length === columns - 1));
  }
  assert.equal(layoutScene({ columns: 120, rows: 32 }).scale, 2);
});

test('background reveal completes the field before drawing any wordmark pixels', () => {
  const layout = layoutScene();
  const first = buildFrame(layout, { reveal: 'background', progress: 0.3 });
  const middle = buildFrame(layout, { reveal: 'background', progress: 0.45 });
  const final = buildFrame(layout, { reveal: 'background', progress: 1 });
  assert.ok(first.some((row) => row.some((cell) => cell.background === '#000000')));
  assert.ok(middle.flat().every((cell) => cell.background === '#0B1020'));
  assert.ok(middle.flat().every((cell) => cell.char !== '#'));
  assert.ok(final.flat().some((cell) => cell.char === '#'));
});

test('top-down and right-left reveal opposite portions of the wordmark', () => {
  const layout = layoutScene();
  const down = buildFrame(layout, { reveal: 'top-down', progress: 0.5 });
  const left = buildFrame(layout, { reveal: 'right-left', progress: 0.5 });
  const hasPixel = (frame, x, y) => frame[layout.artTop + y][layout.artLeft + x].char === '#';
  assert.ok(layout.artRows[0].split('').some((char, x) => char === '#' && hasPixel(down, x, 0)));
  assert.ok(layout.artRows.at(-1).split('').every((char, x) => char !== '#' || !hasPixel(down, x, layout.artRows.length - 1)));
  assert.ok(layout.artRows.some((row, y) => [...row].some((char, x) => char === '#' && x > layout.artWidth / 2 && hasPixel(left, x, y))));
  assert.ok(layout.artRows.every((row, y) => [...row].every((char, x) => char !== '#' || x >= layout.artWidth / 2 || !hasPixel(left, x, y))));
});

test('static banner centers its art as a group', () => {
  let output = '';
  createDisplay({ stream: { columns: 120, isTTY: false, write(text) { output += text; } } }).banner();
  const rows = output.split('\n').filter((row) => row.includes('#'));
  assert.equal(rows.length, 5);
  assert.ok(rows.every((row) => row.startsWith(' '.repeat(35))));
});

test('plain intro produces no screen switching or cursor control', async () => {
  let output = '';
  const display = createDisplay({ plain: true, stream: { isTTY: true, columns: 80, rows: 24, write(text) { output += text; } } });
  await display.intro();
  display.dispose();
  assert.match(output, /#####/);
  assert.doesNotMatch(output, /\x1b/);
});

test('stage returns cursor and original screen after cancellation', async () => {
  let output = '';
  const stage = createStage({ stream: { columns: 80, rows: 24, write(text) { output += text; } } });
  const controller = new AbortController();
  controller.abort();
  await stage.play({ reveal: 'background' }, { signal: controller.signal });
  stage.close();
  assert.match(output, /\x1b\[\?1049h/);
  assert.ok(output.endsWith('\x1b[0m\x1b[?25h\x1b[?1049l'));
});

test('Escape closes showcase without leaving stdin resumed or raw', async () => {
  const input = new EventEmitter();
  Object.assign(input, {
    isTTY: true, isRaw: false, readableFlowing: null,
    setRawMode(value) { this.isRaw = value; },
    resume() { this.readableFlowing = true; },
    pause() { this.readableFlowing = false; },
  });
  let output = '';
  const display = createDisplay({ color: true, stream: { isTTY: true, columns: 80, rows: 24, write(value) { output += value; } } });
  setTimeout(() => input.emit('data', Buffer.from('\x1b')), 20);
  await display.showcase({ input, speed: 'fast' });
  assert.equal(input.isRaw, false);
  assert.equal(input.readableFlowing, false);
  assert.equal(input.listenerCount('data'), 0);
  assert.ok(output.endsWith('\x1b[0m\x1b[?25h\x1b[?1049l'));
});
