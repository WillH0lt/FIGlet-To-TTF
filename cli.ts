import { figletToTtf } from './index'
import { cli } from 'cleye'
import fs from 'node:fs'
import path from 'node:path'
import figlet from 'figlet'

const argv = cli({
  name: 'figlet-to-ttf',
  flags: {
    figletFont: {
      type: String,
      alias: 'f',
      description: 'FIGlet font name or path to a .flf file',
      placeholder: '<name|path>',
    },
    glyphFont: {
      type: String,
      alias: 'g',
      default: 'cascadiaMono.ttf',
      description: 'Path to a TTF font for rendering glyphs',
      placeholder: '<path>',
    },
    output: {
      type: String,
      alias: 'o',
      description: 'Output TTF file path (default: out/<figlet-font>.ttf)',
      placeholder: '<path>',
    },
    familyName: {
      type: String,
      description: 'Font family name in the output TTF (default: figlet font name)',
      placeholder: '<name>',
    },
    chars: {
      type: String,
      alias: 'c',
      default: 'chars.txt',
      description: 'Path to a file with space-separated characters to include',
      placeholder: '<file>',
    },
    all: {
      type: Boolean,
      alias: 'a',
      description: 'Generate a TTF for every built-in FIGlet font',
    },
  },
})

const { flags } = argv

if (!flags.figletFont && !flags.all) {
  console.error('Error: specify a font with -f <name|path> or use --all to generate all built-in fonts.')
  process.exit(1)
}

if (flags.figletFont && flags.all) {
  console.error('Error: --figlet-font and --all cannot be used together.')
  process.exit(1)
}

// Read character set
const charsContent = fs.readFileSync(flags.chars, 'utf-8')
const chars = charsContent.split(/\s+/).filter((c) => c.length > 0)
chars.push(' ')

// Determine which fonts to generate
let fontNames: string[]

if (flags.all) {
  fontNames = figlet.fontsSync()
  console.log(`Generating TTFs for all ${fontNames.length} built-in fonts...`)
} else {
  const fontValue = flags.figletFont!
  if (fontValue.endsWith('.flf') || (fs.existsSync(fontValue) && fs.statSync(fontValue).isFile())) {
    const fontName = path.basename(fontValue, '.flf')
    figlet.parseFont(fontName, fs.readFileSync(fontValue, 'utf-8'))
    fontNames = [fontName]
  } else {
    fontNames = [fontValue]
  }
}

const isSingle = fontNames.length === 1

for (const fontName of fontNames) {
  try {
    const output = await figletToTtf({
      figletFont: fontName,
      glyphFontPath: flags.glyphFont,
      output: isSingle ? flags.output : undefined,
      familyName: isSingle ? flags.familyName : undefined,
      chars,
    })
    console.log(`Generated: ${output}`)
  } catch (err) {
    console.error(`Failed to generate font "${fontName}": ${err instanceof Error ? err.message : err}`)
  }
}
