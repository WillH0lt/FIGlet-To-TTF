import './happydom'

import fs from 'node:fs'
import path from 'node:path'
import figlet from 'figlet'
import opentype from 'opentype.js'

export interface FigletToTtfOptions {
  /** Name of the FIGlet font (e.g. 'Standard', 'Big', 'Slant'). Must be a built-in figlet font. */
  figletFont: string

  /** Path to a TTF font file used to render individual glyphs (e.g. a monospace font). */
  glyphFontPath: string

  /** Output file path for the generated TTF. Defaults to `<figletFont>.ttf` in the current directory. */
  output?: string

  /** Characters to include in the generated font. Defaults to printable ASCII (32-126). */
  chars?: string[]

  /** Font family name for the output TTF. Defaults to the figlet font name. */
  familyName?: string
}

const PRINTABLE_ASCII = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i))

function scalePath(path: opentype.Path, scale: number) {
  for (const cmd of path.commands) {
    if ('x' in cmd && 'y' in cmd) {
      cmd.x *= scale
      cmd.y *= scale
    }
    if ('x1' in cmd && 'y1' in cmd) {
      cmd.x1 *= scale
      cmd.y1 *= scale
    }
    if ('x2' in cmd && 'y2' in cmd) {
      cmd.x2 *= scale
      cmd.y2 *= scale
    }
  }
}

function translatePath(path: opentype.Path, dx: number, dy: number) {
  for (const cmd of path.commands) {
    if ('x' in cmd && 'y' in cmd) {
      cmd.x += dx
      cmd.y += dy
    }
    if ('x1' in cmd && 'y1' in cmd) {
      cmd.x1 += dx
      cmd.y1 += dy
    }
    if ('x2' in cmd && 'y2' in cmd) {
      cmd.x2 += dx
      cmd.y2 += dy
    }
  }
}

async function charToGlyph(
  char: string,
  glyphFont: opentype.Font,
  figletFontName: string,
  cellWidth: number,
  cellHeight: number,
  baseline: number,
): Promise<opentype.Glyph | null> {
  const art = await figlet.text(char, { font: figletFontName })

  if (art.trim().length === 0 && char !== ' ') {
    return null
  }

  const lines = art.split('\n')
  const maxLineLength = lines.reduce((max, line) => Math.max(max, line.length), 0)
  const fontSize = glyphFont.unitsPerEm
  const glyphPath = new opentype.Path()
  const yShift = glyphFont.descender / fontSize
  const lineSpacing = 1.2

  for (let y = 0; y < lines.length; y++) {
    const line = lines[y]

    for (let x = 0; x < line.length; x++) {
      const symbol = line[x]
      if (symbol === ' ') continue

      const charGlyph = glyphFont.charToGlyph(symbol)
      const charPath = charGlyph.getPath(0, 0, fontSize, { yScale: -1 })

      scalePath(charPath, cellHeight / fontSize / lineSpacing)
      translatePath(charPath, x * cellWidth, (baseline - y - yShift - 1) * cellHeight)

      glyphPath.extend(charPath)
    }
  }

  return new opentype.Glyph({
    name: char,
    unicode: char.codePointAt(0),
    advanceWidth: maxLineLength * cellWidth,
    yMax: baseline * cellHeight,
    yMin: (baseline - lines.length) * cellHeight,
    xMin: 0,
    xMax: maxLineLength * cellWidth,
    path: glyphPath,
  })
}

/**
 * Convert a FIGlet font into a TrueType font (.ttf).
 *
 * Each character is rendered through the FIGlet font as ASCII art, then each
 * cell of that ASCII art is drawn using glyphs from the provided TTF glyph font.
 * The result is a TTF where every character looks like its FIGlet representation.
 */
export async function figletToTtf(options: FigletToTtfOptions): Promise<string> {
  const {
    figletFont,
    glyphFontPath,
    familyName = figletFont,
    chars = PRINTABLE_ASCII,
  } = options

  const output = options.output ?? `out/${figletFont.toLowerCase().replace(/\s+/g, '-')}.ttf`

  // Load the glyph font
  const fontBuffer = fs.readFileSync(glyphFontPath)
  const glyphFont = opentype.parse(fontBuffer.buffer)

  // Get figlet font metadata
  const result = await figlet.metadata(figletFont)
  const metadata = result?.[0]

  if (!metadata) {
    throw new Error(`Could not load metadata for FIGlet font "${figletFont}". Is it a valid built-in font name?`)
  }

  const { height, baseline } = metadata

  if (!height || height <= 0) {
    throw new Error(`FIGlet font height must be positive, got ${height}`)
  }

  if (!baseline || baseline <= 0) {
    throw new Error(`FIGlet font baseline must be positive, got ${baseline}`)
  }

  const cellHeight = glyphFont.unitsPerEm / height
  const cellWidth = cellHeight / 2

  // Build glyphs
  const glyphs: opentype.Glyph[] = [
    new opentype.Glyph({
      name: '.notdef',
      advanceWidth: glyphFont.charToGlyph(' ').advanceWidth!,
      path: new opentype.Path(),
    }),
  ]

  for (const char of chars) {
    if (char.length > 1) continue

    const glyph = await charToGlyph(char, glyphFont, figletFont, cellWidth, cellHeight, baseline)
    if (glyph) {
      glyphs.push(glyph)
    }
  }

  // Create the font
  const ascender = (baseline / height) * glyphFont.unitsPerEm
  const descender = ((baseline - height) / height) * glyphFont.unitsPerEm

  const newFont = new opentype.Font({
    familyName,
    styleName: 'Regular',
    unitsPerEm: glyphFont.unitsPerEm,
    ascender,
    descender,
    glyphs,
  })

  // Set OS/2 metrics
  const yMax = Math.ceil(Math.max(...glyphs.map((g) => g.yMax ?? 0)))
  const yMin = Math.floor(Math.min(...glyphs.map((g) => g.yMin ?? 0)))

  newFont.tables.os2.usWinAscent = yMax
  newFont.tables.os2.usWinDescent = Math.abs(yMin)
  newFont.tables.os2.sTypoAscender = yMax
  newFont.tables.os2.sTypoDescender = yMin

  // Write output
  const outputDir = path.dirname(output)
  if (outputDir && !fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const buffer = newFont.toArrayBuffer()
  fs.writeFileSync(output, Buffer.from(buffer))

  return output
}
