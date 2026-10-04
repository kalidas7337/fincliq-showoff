import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { cleanText } from './display.js';
import { getTheme, validateArt } from './styles.js';
import { validateReveal, speeds } from './scene.js';

const quotePowerShell = (value) => "'" + value.replaceAll("'", "''") + "'";

export function buildSessionScript(shell, plain, { theme: themeName = 'green', art = 'block', brand = 'FINCLIQ', reveal = 'background', speed = 'normal' } = {}) {
  if (!['cmd', 'powershell'].includes(shell)) throw new Error('Shell must be cmd or powershell.');
  const selectedTheme = getTheme(themeName);
  validateArt(art);
  validateReveal(reveal);
  if (!Object.hasOwn(speeds, speed)) throw new Error('Speed must be fast, normal or slow.');
  const label = cleanText(brand);
  const prompt = plain
    ? `function global:prompt { ${quotePowerShell(`[${label}] PS `)} + $executionContext.SessionState.Path.CurrentLocation + '> ' }`
    : `function global:prompt {
  Write-Host ${quotePowerShell(`[${label}] `)} -NoNewline -ForegroundColor ${selectedTheme.nativeAccent}
  Write-Host ('PS ' + $executionContext.SessionState.Path.CurrentLocation) -NoNewline -ForegroundColor ${selectedTheme.nativeSecondary}
  Write-Host ' >' -NoNewline -ForegroundColor ${selectedTheme.nativeTertiary}
  ' '
}`;
  const inner = Buffer.from(prompt, 'utf16le').toString('base64');
  const cli = fileURLToPath(new URL('../bin/showoff.js', import.meta.url));
  const bannerCommand = `& ${quotePowerShell(process.execPath)} ${quotePowerShell(cli)} intro --theme ${quotePowerShell(themeName)} --art ${quotePowerShell(art)} --brand ${quotePowerShell(label)} --reveal ${quotePowerShell(reveal)} --speed ${quotePowerShell(speed)} ${plain ? '--plain' : ''}`;
  const cmdBrand = label.replaceAll('$', '$$');
  const ansi = (hex) => '\x1b[38;2;' + hex.slice(1).match(/../g).map((part) => parseInt(part, 16)).join(';') + 'm';
  const richCmd = !plain && Boolean(process.env.WT_SESSION || process.env.TERM?.startsWith('xterm') || process.env.TERM_PROGRAM);
  const cmdPrompt = richCmd
    ? `${ansi(selectedTheme.accent)}[${cmdBrand}] ${ansi(selectedTheme.secondary)}$P${ansi(selectedTheme.tertiary)} $G\x1b[0m$S`
    : `[${cmdBrand}] $P$G$S`;
  const nativeCmdColor = { Green: '0A', Cyan: '0B', Magenta: '0D', Yellow: '0E' }[selectedTheme.nativeAccent];
  // Brand text is quoted as PowerShell data; CMD reads PROMPT from the environment.
  const command = shell === 'cmd'
    ? `$env:PROMPT = ${quotePowerShell(cmdPrompt)}\n  & $env:ComSpec /d ${plain || richCmd ? '' : '/t:' + nativeCmdColor} /k`
    : `& "$PSHOME\\powershell.exe" -NoLogo -NoProfile -NoExit -EncodedCommand '${inner}'`;
  return `
$ErrorActionPreference = 'Stop'
$ui = $Host.UI.RawUI
$savedForeground = $ui.ForegroundColor
$savedBackground = $ui.BackgroundColor
$savedTitle = $ui.WindowTitle
try {
  ${bannerCommand}
  $ui.WindowTitle = ${quotePowerShell(`${label} - ${themeName.toUpperCase()} Session`)}
  ${plain ? '' : "$ui.BackgroundColor = 'Black'; $ui.ForegroundColor = 'Gray'"}
  Write-Host 'Type your own commands. Type exit to return to your original shell.'
  ${command}
  $sessionExitCode = $LASTEXITCODE
} finally {
  $ui.ForegroundColor = $savedForeground
  $ui.BackgroundColor = $savedBackground
  $ui.WindowTitle = $savedTitle
}
exit $sessionExitCode
`;
}

export async function startSession({ shell = 'powershell', plain = false, ...options } = {}) {
  if (process.platform !== 'win32') throw new Error('Styled shell sessions require Windows. Banner and demo work on other platforms.');
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('Session needs an interactive terminal. Use banner or demo for redirected output.');
  const script = buildSessionScript(shell, plain, options);
  const child = spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], {
    stdio: 'inherit',
    windowsHide: true,
  });
  // Let the interactive shell handle Ctrl+C; typing exit closes the session.
  const ignoreInterrupt = () => {};
  process.on('SIGINT', ignoreInterrupt);
  try {
    return await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('close', (code) => resolve(code ?? 1));
    });
  } finally {
    process.off('SIGINT', ignoreInterrupt);
  }
}
