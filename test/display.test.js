import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createDisplay, formatElapsed, themes } from '../src/display.js';
import { renderArt } from '../src/styles.js';

function capture(options = {}) {
  let output = '';
  const stream = { isTTY: false, columns: 80, write(value) { output += value; } };
  return { display: createDisplay({ stream, ...options }), output: () => output };
}

test('redirected output is readable and does not animate or emit ANSI', () => {
  const { display, output } = capture();
  display.banner();
  const spinner = display.spinner('Waiting for a caller');
  spinner.succeed('Caller completed');
  display.dispose();
  assert.match(output(), /#####/);
  assert.match(output(), /\[WAIT \] Waiting for a caller/);
  assert.match(output(), /Caller completed \(00:00:00\)/);
  assert.doesNotMatch(output(), /\x1b|\r/);
});

test('untrusted labels cannot issue terminal control sequences', () => {
  const { display, output } = capture({ brand: '\x1b]0;Bad title\x07OTHER\x1b[2J\nBRAND' });
  display.banner();
  display.status('info', 'Text\x1b[31m\x07\r\nend');
  assert.match(output(), /OTHER BRAND/);
  assert.doesNotMatch(output(), /Bad title|\x1b|\x07|\r/);
});

test('narrow terminals get a compact banner', () => {
  let output = '';
  const display = createDisplay({ stream: { isTTY: false, columns: 30, write(text) { output += text; } } });
  display.banner();
  assert.match(output, /FINCLIQ/);
  for (const line of output.split('\n')) assert.ok(line.length <= 28);
});

test('stopped spinners cannot print duplicate completion messages', () => {
  const { display, output } = capture();
  const activity = display.spinner('Preview');
  activity.succeed('Done');
  activity.fail('Duplicate');
  display.dispose();
  assert.doesNotMatch(output(), /Duplicate/);
});

test('elapsed timer handles minute and hour boundaries', () => {
  assert.equal(formatElapsed(59999), '00:00:59');
  assert.equal(formatElapsed(60000), '00:01:00');
  assert.equal(formatElapsed(3600000), '01:00:00');
});

const cli = fileURLToPath(new URL('../bin/showoff.js', import.meta.url));
test('CLI rejects malformed arguments without launching a shell', () => {
  const result = spawnSync(process.execPath, [cli, 'session', '--shell', 'bad'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--shell must be/);
});

test('CLI refuses a shell session in redirected output', () => {
  const result = spawnSync(process.execPath, [cli, 'session'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /interactive terminal|require Windows/);
});

test('showcase hands over to a shell unless looping is explicitly requested', () => {
  const session = spawnSync(process.execPath, [cli, 'showcase', '--plain'], { encoding: 'utf8' });
  assert.equal(session.status, 1);
  assert.match(session.stderr, /interactive terminal|require Windows/);
  const preview = spawnSync(process.execPath, [cli, 'showcase', '--loop', '--plain'], { encoding: 'utf8' });
  assert.equal(preview.status, 0);
  assert.match(preview.stdout, /READY WHEN YOU ARE/);
});

test('palettes use multiple accents while plain mode suppresses styling', () => {
  for (const theme of Object.keys(themes)) {
    const styled = capture({ theme, color: true });
    styled.display.banner();
    const colors = [...styled.output().matchAll(/\x1b\[38;2;([\d;]+)m/g)].map((match) => match[1]);
    assert.ok(new Set(colors).size >= 3, `${theme} must have distinct accents`);
    const plain = capture({ theme, plain: true, color: true });
    plain.display.banner();
    assert.doesNotMatch(plain.output(), /\x1b/);
  }
});

test('ASCII styles are distinct and support other company names', () => {
  const styles = ['block', 'circuit', 'classic'].map((style) => renderArt('FINCLIQ', style).join('\n'));
  assert.equal(new Set(styles).size, 3);
  assert.match(renderArt('ACME 2', 'block').join('\n'), /#/);
  assert.equal(renderArt('Unsupported!', 'block'), null);
});

test('CLI rejects unknown palettes and ASCII styles', () => {
  for (const args of [['banner', '--theme', 'unknown'], ['banner', '--art', 'unknown']]) {
    const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unknown theme|Unknown art style/);
  }
});
