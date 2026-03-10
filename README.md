<p align="center">
  <img src="figlet_to_ttf.gif" alt="figlet to ttf">
</p>

Convert [FIGlet](https://github.com/patorjk/figlet.js/tree/main) fonts into TrueType (.ttf) font files. I built this project so I could add FIGlet fonts to [Asciinotes](https://asciinotes.com/).

## Install

Requires [Bun](https://bun.sh/) runtime

```bash
git clone https://github.com/WillH0lt/FIGlet-To-TTF.git
cd figlet-to-ttf
bun install
```

## Usage

### CLI

```bash
bun run cli.ts [options]
```

**Options:**

- `-f, --figlet-font <name|path>` — FIGlet font name (e.g. `Standard`, `Big`, `Slant`) or path to a `.flf` font file.
- `-a, --all` — Generate a TTF for every built-in FIGlet font. Mutually exclusive with `-f`.
- `-g, --glyph-font <path>` — Path to a .ttf font file used to draw individual glyphs (default: `cascadiaMono.ttf`).
- `-o, --output <path>` — Output file path (default: `out/<figlet-font>.ttf`). Only used when generating a single font.
- `--family-name <name>` — Font family name embedded in the output TTF (default: the FIGlet font name). Only used when generating a single font.
- `-c, --chars <file>` — Path to a text file containing space-separated characters to include (default: `chars.txt`).
- `-h, --help` — Show help

Either `-f` or `--all` must be specified.

### Examples

Generate a TTF from the "Standard" FIGlet font:

```bash
bun run cli.ts -f Standard
```

Generate TTFs for all built-in FIGlet fonts:

```bash
bun run cli.ts --all
```

Use a custom `.flf` font file:

```bash
bun run cli.ts -f ./my-custom-font.flf
```

Specify an output path and glyph font:

```bash
bun run cli.ts -f Big -g ./myFont.ttf -o ./fonts/big-figlet.ttf
```

### As a library

```ts
import { figletToTtf } from './index'

const outputPath = await figletToTtf({
  figletFont: 'Standard',
  glyphFontPath: './cascadiaMono.ttf',
  output: './my-font.ttf',
})

console.log(`Font written to ${outputPath}`)
```

## Pre-generated fonts

The [`/out`](https://github.com/WillH0lt/FIGlet-To-TTF/tree/main/out) directory contains pre-generated TTF files for all built-in FIGlet fonts, created using [Cascadia Mono](https://fonts.google.com/specimen/Cascadia+Mono) as the glyph source font.

## Available FIGlet fonts

FIGlet ships with many built-in fonts. See [figlet.js/fonts](https://github.com/patorjk/figlet.js/tree/main/fonts) for a full list of available FIGlet fonts.

## License

MIT
