#!/usr/bin/env node
import { createDisplay } from '../src/display.js';
import { startSession } from '../src/session.js';
import { themes, artStyles, getTheme, validateArt } from '../src/styles.js';
import { readFileSync } from 'node:fs';
import { validateReveal, speeds } from '../src/scene.js';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const help = `FINCLIQ Showoff - display only

Usage: showoff [session|banner|demo|showcase|gallery] [options]

  session                  Open a styled PowerShell session (default)
  session --shell cmd      Open a styled CMD session
  banner                   Print the FINCLIQ ASCII banner
  demo                     Play a centered cinematic ASCII entrance
  showcase                 Play the greeting, then open your command prompt
  showcase --loop          Preview entrances repeatedly; Space next, Esc close
  gallery                  Preview all palettes and ASCII styles

  --theme green|aurora|neon|amber    Choose a multicolor palette
  --art block|circuit|classic       Choose the ASCII wordmark
  --reveal background|top-down|right-left|none   Choose the entrance
  --speed fast|normal|slow          Choose the animation speed
  --plain                  Plain ASCII, no animation or color
  --loop                   Repeat the showcase instead of opening a shell
  --brand "Company Name"   Company name (FINCLIQ is default)
  --help                   Show this help
  --version                Show package version

Type exit to leave a styled session. Your own commands stay private.
Session uses built-in Windows PowerShell, with no saved profile changes.
`;

function parse(args) {
  const options = { command: 'session', shell: 'powershell', plain: false, loop: false, brand: 'FINCLIQ', theme: 'green', art: 'block', reveal: 'background', speed: 'normal' };
  let commandSeen = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg === '--version' || arg === '-v') return { version: true };
    if (arg === '--plain') options.plain = true;
    else if (arg === '--loop') options.loop = true;
    else if (['--shell', '--brand', '--theme', '--art', '--reveal', '--speed'].includes(arg)) {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value.`);
      options[arg.slice(2)] = value;
    } else if (!commandSeen && ['session', 'banner', 'demo', 'intro', 'showcase', 'gallery'].includes(arg)) {
      options.command = arg;
      commandSeen = true;
    } else throw new Error(`Unknown argument: ${arg}. Use --help.`);
  }
  if (!['cmd', 'powershell'].includes(options.shell)) throw new Error('--shell must be cmd or powershell.');
  if (options.loop && options.command !== 'showcase') throw new Error('--loop is only available for showcase.');
  getTheme(options.theme);
  validateArt(options.art);
  validateReveal(options.reveal);
  if (!Object.hasOwn(speeds, options.speed)) throw new Error('Speed must be fast, normal or slow.');
  return options;
}

let display;
const cleanup = () => display?.dispose();
const interrupt = () => { cleanup(); process.exit(130); };
try {
  const options = parse(process.argv.slice(2));
  if (options.help) process.stdout.write(help);
  else if (options.version) process.stdout.write(version + '\n');
  else if (options.command === 'session' || (options.command === 'showcase' && !options.loop)) {
    // Snapshot the console in the session wrapper before drawing the banner.
    const plain = options.plain || 'NO_COLOR' in process.env || process.env.TERM === 'dumb';
    process.exitCode = await startSession({ ...options, plain });
  }
  else if (options.command === 'gallery') {
    for (const themeName of Object.keys(themes)) {
      const preview = createDisplay({ ...options, theme: themeName });
      preview.banner();
      preview.accents();
      preview.dispose();
    }
    for (const art of artStyles.filter((name) => name !== options.art)) {
      const preview = createDisplay({ ...options, art });
      preview.banner();
      preview.dispose();
    }
  } else {
    display = createDisplay(options);
    process.once('exit', cleanup);
    if (['demo', 'intro', 'showcase'].includes(options.command)) {
      process.once('SIGINT', interrupt);
      process.once('SIGTERM', interrupt);
      if (options.command === 'showcase') await display.showcase(options);
      else await display.intro(options);
    } else {
      display.banner();
      display.accents();
    }
  }
} catch (error) {
  process.stderr.write(`showoff: ${error.message}\n`);
  process.exitCode = 1;
} finally {
  cleanup();
  process.off('SIGINT', interrupt);
  process.off('SIGTERM', interrupt);
}
