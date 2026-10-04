# FINCLIQ Showoff

Centered animated ASCII branding, multicolor palettes and temporary styled
Windows terminal sessions. MIT licensed: anyone can reuse it or change the brand.
This public repository contains only the display toolkit, themes and tests.
Keep your installation commands and customer data in your own private code.

Requires **Node.js 20+ and npm**. Use Windows Terminal for the full animation.
PowerShell and CMD are supported. Release archive commands require no Git
installation or GitHub login. No fonts or npm dependencies are installed.

## Quick run on a new Windows machine

Open a **PowerShell** tab in Windows Terminal and paste:

```powershell
npm.cmd exec --yes --package "https://github.com/kalidas7337/fincliq-showoff/releases/download/v0.3.1/fincliq-showoff-0.3.1.tgz" -- showoff session --theme green --reveal background
```

The centered greeting plays once, then a styled PowerShell prompt opens. Run
your own commands normally. Type `exit` to return to your original shell.
This does not install a global command; npm retains downloaded files in its cache.

Try another palette or the CMD fallback, exiting each session before the next:

```powershell
npm.cmd exec --yes --package "https://github.com/kalidas7337/fincliq-showoff/releases/download/v0.3.1/fincliq-showoff-0.3.1.tgz" -- showoff session --theme aurora --art circuit
npm.cmd exec --yes --package "https://github.com/kalidas7337/fincliq-showoff/releases/download/v0.3.1/fincliq-showoff-0.3.1.tgz" -- showoff session --shell cmd --plain
```

The `.cmd` suffix works in PowerShell and CMD and avoids PowerShell's npm script shim.

## Install once, then use the short command

```powershell
npm.cmd install --global "https://github.com/kalidas7337/fincliq-showoff/releases/download/v0.3.1/fincliq-showoff-0.3.1.tgz"
showoff.cmd --version
showoff.cmd session --theme green --reveal background
```

The version should be `0.3.1`. If `showoff.cmd` is not found, reopen your
terminal so it picks up npm's command path. Run from any folder; no local
`package.json` is required.

```powershell
showoff.cmd session --theme neon --art block --shell cmd
showoff.cmd demo --theme aurora --reveal right-left
showoff.cmd gallery
showoff.cmd banner --plain
```

For offline transfer, download the archive from the
[v0.3.1 release](https://github.com/kalidas7337/fincliq-showoff/releases/tag/v0.3.1),
copy it to Downloads, and run:

```powershell
npm.cmd install --global "$env:USERPROFILE\Downloads\fincliq-showoff-0.3.1.tgz"
```

This version is distributed through GitHub, without an npm registry publication.

## Finish and uninstall

Type `exit` inside the FINCLIQ shell first. Normal exit restores the starting
console colors and title and returns to your original shell. Then run:

```powershell
Clear-Host
npm.cmd uninstall --global fincliq-showoff
```

Use `cls` in CMD. Clearing removes the visible screen, not shell history.
Uninstall removes the toolkit and command shortcuts. Node/npm and npm's download
cache remain. A quick run through `npm exec` has no global package to uninstall.

Delete an archive you copied to Downloads separately, if desired:

```powershell
Remove-Item -LiteralPath "$env:USERPROFILE\Downloads\fincliq-showoff-0.3.1.tgz"
```

The toolkit does not edit shell profiles, startup hooks or Windows Terminal
settings. If you manually added a FINCLIQ Terminal scheme, switch back to your
previous scheme and remove that added scheme separately.

## One-time visit with automatic cache cleanup

Paste this complete PowerShell block. It downloads to a fresh, separate npm
cache and deletes only that cache after you type `exit`:

```powershell
$fincliqTempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\'
$fincliqVisitCache = Join-Path $fincliqTempRoot ('fincliq-showoff-' + [guid]::NewGuid().ToString('N'))
try {
    npm.cmd exec --yes --cache "$fincliqVisitCache" --package "https://github.com/kalidas7337/fincliq-showoff/releases/download/v0.3.1/fincliq-showoff-0.3.1.tgz" -- showoff session --theme green
} finally {
    $fincliqResolvedCache = [IO.Path]::GetFullPath($fincliqVisitCache)
    if (-not $fincliqResolvedCache.StartsWith($fincliqTempRoot, [StringComparison]::OrdinalIgnoreCase) -or
        (Split-Path $fincliqResolvedCache -Leaf) -notmatch '^fincliq-showoff-[0-9a-f]{32}$') {
        throw 'Refusing to remove a path outside the isolated FINCLIQ visit cache.'
    }
    if (Test-Path -LiteralPath $fincliqResolvedCache) {
        Remove-Item -LiteralPath $fincliqResolvedCache -Recurse -Force
    }
}
```

Force-closing the parent process or shutting down the PC can prevent cleanup.
Do not purge npm's shared cache to uninstall this tool.
See [npm exec](https://docs.npmjs.com/cli/v11/commands/npm-exec/) and
[npm uninstall](https://docs.npmjs.com/cli/v11/commands/npm-uninstall/).

## Entrances, palettes and branding

`session` and `showcase` play a greeting once and open your shell automatically.
`demo` plays only the greeting. `showcase --loop` cycles entrances in a separate
display pane: **Space** advances, **Esc** or **Ctrl+C** closes it.

| Option | Choices |
| --- | --- |
| `--theme` | `green` (green, cyan, violet, gold), `aurora` (cyan, violet, pink, mint), `neon` (pink, cyan, lime, amber), `amber` (gold, orange, teal, lavender) |
| `--art` | `block` (`#` pixels), `circuit` (`+`, `=`, `\|` strokes), `classic` (brand letters) |
| `--reveal` | `background` (background first, then text), `top-down`, `right-left`, `none` |
| `--speed` | `fast`, `normal`, `slow` |
| `--shell` | `powershell` (default), `cmd` |
| `--brand` | Your company name; default `FINCLIQ` |
| `--plain` | Static ASCII without ANSI styling or animation |

```powershell
showoff.cmd session --brand "YOUR COMPANY" --theme aurora --art circuit --reveal top-down
showoff.cmd showcase --theme neon --loop
```

The animated stage centers the wordmark horizontally and vertically, enlarges it
when space allows, and adapts to resizing. It uses a temporary alternate screen
and restores the previous screen and cursor afterward. The entrance ends with a
centered banner and usable prompt; it does not animate over your commands.

ASCII art supports A-Z, digits, spaces and hyphens. Small windows and unsupported
characters use a compact label. No Nerd Font is required. Command output uses
neutral text unless the command supplies colors. Classic CMD uses native console
colors; use `--plain` on legacy hosts. Redirected output, `NO_COLOR` and
`TERM=dumb` disable ANSI styling and animation.

Sessions start fresh shells with PowerShell `-NoProfile` or CMD `/d`; normal
startup customizations are not loaded. Force-closing can prevent color restoration.

For a saved Windows Terminal palette, manually add an object from `themes/` to
the `schemes` array in Terminal's settings JSON, then select it in your profile's
Appearance settings. Cascadia Mono or Consolas works well. This optional setting
persists until you change it back.

## Run from source

With Git installed:

```powershell
git clone https://github.com/kalidas7337/fincliq-showoff.git
Set-Location .\fincliq-showoff
npm.cmd test
npm.cmd start
npm.cmd run demo -- --theme aurora
```

There are no dependencies to install. Alternatively, extract the source ZIP,
open a terminal in its folder and run `node bin/showoff.js session`.
PowerShell changes folders with `Set-Location`; CMD uses `cd /d PATH`.

## Use the display API from private code

Install the release into your private project:

```powershell
npm.cmd install "https://github.com/kalidas7337/fincliq-showoff/releases/download/v0.3.1/fincliq-showoff-0.3.1.tgz"
```

```js
import { createDisplay } from 'fincliq-showoff';

const display = createDisplay({ brand: 'FINCLIQ', theme: 'aurora', art: 'circuit' });
try {
  await display.intro({ reveal: 'background', speed: 'normal' });
  display.status('info', 'Your own status message');
  const activity = display.spinner('Your own activity label');
  // Keep private work separate; stop the spinner before writing command logs.
  activity.succeed('Your own completion message');
} finally {
  display.dispose();
}
```

`display.banner()` prints static art; `display.showcase()` runs the keyboard
controlled loop. Status kinds: `info`, `success`, `warning`, `error`.
Activity methods: `stop()`, `succeed(message)`, `fail(message)`. The spinner
indicates activity, not installation percentage. The toolkit does not inspect
or upload your commands, output or environment.

## Release checks

GitHub Actions tests rendering and shell handoff rules, plus installation,
quick-run and uninstallation from public GitHub source on Windows with Node 20
and 22. Interactive animations and sessions also need checks in Windows Terminal.

```powershell
npm.cmd test
npm.cmd pack --dry-run
npm.cmd pack
```

The package's explicit `files` allowlist contains only `bin`, `src`, `themes`,
README and LICENSE. Keep private scripts out of this repository entirely.

## License

MIT.
