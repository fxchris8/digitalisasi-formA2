import {
  type Color,
  type PDFDocument,
  type PDFFont,
  type PDFPage,
  rgb,
} from "pdf-lib"

// ── Ukuran & palet ───────────────────────────────────────────────────────────

export const PAGE_WIDTH = 595.28 // A4 portrait (points)
export const PAGE_HEIGHT = 841.89
export const MARGIN = 45
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

export const COLORS = {
  primary: rgb(0.05, 0.28, 0.47), // biru laut tua — warna utama dokumen
  primarySoft: rgb(0.9, 0.94, 0.98), // latar lembut untuk header tabel
  accent: rgb(0.85, 0.65, 0.13), // aksen emas untuk garis pemisah
  text: rgb(0.13, 0.15, 0.18),
  textMuted: rgb(0.42, 0.45, 0.5),
  border: rgb(0.82, 0.85, 0.88),
  zebra: rgb(0.97, 0.975, 0.98),
  white: rgb(1, 1, 1),
  success: rgb(0.09, 0.5, 0.28),
  successSoft: rgb(0.88, 0.96, 0.91),
  warning: rgb(0.68, 0.45, 0.02),
  warningSoft: rgb(0.99, 0.95, 0.85),
  danger: rgb(0.7, 0.16, 0.16),
  dangerSoft: rgb(0.99, 0.9, 0.9),
} as const

export interface TableColumn {
  header: string
  /** Lebar kolom dalam points. Total semua kolom sebaiknya = CONTENT_WIDTH. */
  width: number
  align?: "left" | "right" | "center"
}

/**
 * Karakter di luar CP1252 tidak bisa digambar oleh font standar PDF
 * (Helvetica) dan akan melempar error saat encode — data nama/RS/catatan
 * kadang mengandung karakter seperti itu, jadi dibersihkan dulu.
 */
export function sanitizeText(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value)
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\n\x20-\x7E\xA0-\xFF]/g, "?")
}

/**
 * Penyusun halaman PDF: menjaga posisi kursor, pindah halaman otomatis, dan
 * menyediakan komponen siap pakai (banner, judul bagian, grid info, tabel).
 */
export class PdfBuilder {
  private page: PDFPage
  private y: number
  /** Halaman yang digambar sendiri — dipakai supaya footer tidak menimpa
   *  halaman hasil merge dari file scan yang diupload user. */
  readonly ownPages: PDFPage[] = []

  constructor(
    private readonly doc: PDFDocument,
    private readonly font: PDFFont,
    private readonly bold: PDFFont,
  ) {
    this.page = this.newPage()
    this.y = PAGE_HEIGHT - MARGIN
  }

  private newPage(): PDFPage {
    const page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    this.ownPages.push(page)
    return page
  }

  /** Pastikan masih ada ruang setinggi `height`, kalau tidak pindah halaman. */
  private ensure(height: number): void {
    if (this.y - height < MARGIN + 28) {
      this.page = this.newPage()
      this.y = PAGE_HEIGHT - MARGIN
    }
  }

  private textWidth(text: string, size: number, bold = false): number {
    return (bold ? this.bold : this.font).widthOfTextAtSize(text, size)
  }

  /** Pecah teks jadi beberapa baris agar muat dalam `maxWidth`. */
  wrap(text: string, maxWidth: number, size: number, bold = false): string[] {
    const lines: string[] = []
    for (const paragraph of sanitizeText(text).split("\n")) {
      if (!paragraph.trim()) {
        lines.push("")
        continue
      }
      let current = ""
      for (const word of paragraph.split(/\s+/)) {
        const candidate = current ? `${current} ${word}` : word
        if (this.textWidth(candidate, size, bold) <= maxWidth) {
          current = candidate
          continue
        }
        if (current) lines.push(current)
        // Kata tunggal yang lebih panjang dari kolom — potong paksa.
        if (this.textWidth(word, size, bold) > maxWidth) {
          let chunk = ""
          for (const char of word) {
            if (this.textWidth(chunk + char, size, bold) > maxWidth) {
              lines.push(chunk)
              chunk = char
            } else {
              chunk += char
            }
          }
          current = chunk
        } else {
          current = word
        }
      }
      if (current) lines.push(current)
    }
    return lines.length > 0 ? lines : [""]
  }

  private draw(
    text: string,
    x: number,
    size: number,
    opts: { bold?: boolean; color?: Color } = {},
  ): void {
    this.page.drawText(sanitizeText(text), {
      x,
      y: this.y,
      size,
      font: opts.bold ? this.bold : this.font,
      color: opts.color ?? COLORS.text,
    })
  }

  /** Banner judul dokumen dengan latar warna utama. */
  banner(
    title: string,
    subtitle: string,
    rightLabel: string,
    rightValue: string,
  ): void {
    const height = 62
    this.ensure(height + 10)
    const top = this.y - height

    this.page.drawRectangle({
      x: MARGIN,
      y: top,
      width: CONTENT_WIDTH,
      height,
      color: COLORS.primary,
    })
    // Garis aksen tipis di bawah banner
    this.page.drawRectangle({
      x: MARGIN,
      y: top - 3,
      width: CONTENT_WIDTH,
      height: 3,
      color: COLORS.accent,
    })

    this.page.drawText(sanitizeText(title), {
      x: MARGIN + 16,
      y: top + height - 26,
      size: 18,
      font: this.bold,
      color: COLORS.white,
    })
    this.page.drawText(sanitizeText(subtitle), {
      x: MARGIN + 16,
      y: top + height - 44,
      size: 9,
      font: this.font,
      color: rgb(0.78, 0.85, 0.92),
    })

    const valueSize = 11
    const valueWidth = this.textWidth(sanitizeText(rightValue), valueSize, true)
    const labelWidth = this.textWidth(sanitizeText(rightLabel), 8)
    this.page.drawText(sanitizeText(rightLabel), {
      x: MARGIN + CONTENT_WIDTH - 16 - labelWidth,
      y: top + height - 24,
      size: 8,
      font: this.font,
      color: rgb(0.78, 0.85, 0.92),
    })
    this.page.drawText(sanitizeText(rightValue), {
      x: MARGIN + CONTENT_WIDTH - 16 - valueWidth,
      y: top + height - 40,
      size: valueSize,
      font: this.bold,
      color: COLORS.white,
    })

    this.y = top - 22
  }

  /** Judul bagian dengan garis aksen di kiri. */
  section(title: string): void {
    this.ensure(30)
    this.page.drawRectangle({
      x: MARGIN,
      y: this.y - 11,
      width: 3,
      height: 13,
      color: COLORS.accent,
    })
    this.draw(title.toUpperCase(), MARGIN + 9, 10.5, {
      bold: true,
      color: COLORS.primary,
    })
    this.y -= 13
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: MARGIN + CONTENT_WIDTH, y: this.y },
      thickness: 0.6,
      color: COLORS.border,
    })
    this.y -= 14
  }

  /** Pasangan label–nilai dua kolom, dengan latar selang-seling. */
  infoGrid(rows: [string, string][]): void {
    const rowHeight = 17
    const labelWidth = 150
    rows.forEach(([label, value], i) => {
      this.ensure(rowHeight)
      if (i % 2 === 0) {
        this.page.drawRectangle({
          x: MARGIN,
          y: this.y - 4.5,
          width: CONTENT_WIDTH,
          height: rowHeight,
          color: COLORS.zebra,
        })
      }
      this.draw(label, MARGIN + 6, 9, { color: COLORS.textMuted })
      const lines = this.wrap(
        value || "-",
        CONTENT_WIDTH - labelWidth - 14,
        9.5,
        true,
      )
      this.draw(lines[0] ?? "-", MARGIN + labelWidth, 9.5, { bold: true })
      this.y -= rowHeight
      // Baris lanjutan kalau nilainya panjang
      for (const extra of lines.slice(1)) {
        this.ensure(13)
        this.draw(extra, MARGIN + labelWidth, 9.5, { bold: true })
        this.y -= 13
      }
    })
    this.y -= 6
  }

  /** Paragraf biasa (mis. diagnosis), otomatis wrap. */
  paragraph(text: string, size = 9.5): void {
    for (const line of this.wrap(text || "-", CONTENT_WIDTH - 12, size)) {
      this.ensure(14)
      this.draw(line, MARGIN + 6, size)
      this.y -= 14
    }
    this.y -= 6
  }

  /** Kotak sorotan untuk angka penting (mis. nominal disetujui). */
  highlight(
    label: string,
    value: string,
    tone: "primary" | "success" = "primary",
  ): void {
    const height = 44
    this.ensure(height + 8)
    const top = this.y - height
    const bg = tone === "success" ? COLORS.successSoft : COLORS.primarySoft
    const fg = tone === "success" ? COLORS.success : COLORS.primary

    this.page.drawRectangle({
      x: MARGIN,
      y: top,
      width: CONTENT_WIDTH,
      height,
      color: bg,
      borderColor: fg,
      borderWidth: 0.8,
    })
    this.page.drawText(sanitizeText(label), {
      x: MARGIN + 14,
      y: top + height - 17,
      size: 8.5,
      font: this.font,
      color: COLORS.textMuted,
    })
    this.page.drawText(sanitizeText(value), {
      x: MARGIN + 14,
      y: top + 11,
      size: 15,
      font: this.bold,
      color: fg,
    })
    this.y = top - 16
  }

  /** Tabel dengan header berwarna, garis, dan baris selang-seling. */
  table(
    columns: TableColumn[],
    rows: string[][],
    opts: {
      footer?: string[]
      noteColumn?: (row: number) => string | null
    } = {},
  ): void {
    const headerHeight = 20
    const size = 8.8

    const drawHeader = () => {
      this.ensure(headerHeight + 16)
      const top = this.y - headerHeight
      this.page.drawRectangle({
        x: MARGIN,
        y: top,
        width: CONTENT_WIDTH,
        height: headerHeight,
        color: COLORS.primary,
      })
      let x = MARGIN
      for (const col of columns) {
        const label = sanitizeText(col.header)
        const w = this.textWidth(label, size, true)
        const tx =
          col.align === "right"
            ? x + col.width - 6 - w
            : col.align === "center"
              ? x + (col.width - w) / 2
              : x + 6
        this.page.drawText(label, {
          x: tx,
          y: top + 6.5,
          size,
          font: this.bold,
          color: COLORS.white,
        })
        x += col.width
      }
      this.y = top
    }

    drawHeader()

    rows.forEach((row, rowIndex) => {
      // Hitung tinggi baris dari sel terpanjang
      const cellLines = row.map((cell, i) =>
        this.wrap(cell, (columns[i]?.width ?? 100) - 12, size),
      )
      const maxLines = Math.max(...cellLines.map((l) => l.length), 1)
      const rowHeight = maxLines * 11.5 + 7

      if (this.y - rowHeight < MARGIN + 28) {
        this.page = this.newPage()
        this.y = PAGE_HEIGHT - MARGIN
        drawHeader()
      }

      const top = this.y - rowHeight
      if (rowIndex % 2 === 1) {
        this.page.drawRectangle({
          x: MARGIN,
          y: top,
          width: CONTENT_WIDTH,
          height: rowHeight,
          color: COLORS.zebra,
        })
      }

      let x = MARGIN
      cellLines.forEach((lines, i) => {
        const col = columns[i]
        if (!col) return
        lines.forEach((line, li) => {
          const w = this.textWidth(line, size)
          const tx =
            col.align === "right"
              ? x + col.width - 6 - w
              : col.align === "center"
                ? x + (col.width - w) / 2
                : x + 6
          this.page.drawText(line, {
            x: tx,
            y: top + rowHeight - 13 - li * 11.5,
            size,
            font: this.font,
            color: COLORS.text,
          })
        })
        x += col.width
      })

      this.page.drawLine({
        start: { x: MARGIN, y: top },
        end: { x: MARGIN + CONTENT_WIDTH, y: top },
        thickness: 0.4,
        color: COLORS.border,
      })
      this.y = top

      // Catatan tambahan di bawah baris (mis. catatan approval)
      const note = opts.noteColumn?.(rowIndex)
      if (note) {
        for (const line of this.wrap(note, CONTENT_WIDTH - 30, 8)) {
          this.ensure(11)
          this.draw(line, MARGIN + 18, 8, { color: COLORS.textMuted })
          this.y -= 11
        }
        this.y -= 3
        this.page.drawLine({
          start: { x: MARGIN, y: this.y },
          end: { x: MARGIN + CONTENT_WIDTH, y: this.y },
          thickness: 0.4,
          color: COLORS.border,
        })
      }
    })

    if (opts.footer) {
      const footerHeight = 22
      this.ensure(footerHeight)
      const top = this.y - footerHeight
      this.page.drawRectangle({
        x: MARGIN,
        y: top,
        width: CONTENT_WIDTH,
        height: footerHeight,
        color: COLORS.primarySoft,
      })
      let x = MARGIN
      opts.footer.forEach((cell, i) => {
        const col = columns[i]
        if (!col) return
        const label = sanitizeText(cell)
        const w = this.textWidth(label, 9, true)
        const tx =
          col.align === "right"
            ? x + col.width - 6 - w
            : col.align === "center"
              ? x + (col.width - w) / 2
              : x + 6
        this.page.drawText(label, {
          x: tx,
          y: top + 7,
          size: 9,
          font: this.bold,
          color: COLORS.primary,
        })
        x += col.width
      })
      this.y = top
    }

    this.y -= 16
  }

  /**
   * Tambahkan footer bernomor di halaman yang dibuat builder ini.
   * Panggil SETELAH semua dokumen lain digabung, supaya nomor halamannya
   * mengikuti posisi sebenarnya di berkas akhir.
   */
  addFooters(docLabel: string, printedAt: string): void {
    const allPages = this.doc.getPages()
    const total = allPages.length
    this.ownPages.forEach((page) => {
      const pageNumber = allPages.indexOf(page) + 1
      page.drawLine({
        start: { x: MARGIN, y: MARGIN + 14 },
        end: { x: MARGIN + CONTENT_WIDTH, y: MARGIN + 14 },
        thickness: 0.5,
        color: COLORS.border,
      })
      page.drawText(sanitizeText(docLabel), {
        x: MARGIN,
        y: MARGIN + 3,
        size: 7.5,
        font: this.font,
        color: COLORS.textMuted,
      })
      const right = sanitizeText(
        `Dicetak ${printedAt}  |  Hal. ${pageNumber} dari ${total}`,
      )
      const w = this.textWidth(right, 7.5)
      page.drawText(right, {
        x: MARGIN + CONTENT_WIDTH - w,
        y: MARGIN + 3,
        size: 7.5,
        font: this.font,
        color: COLORS.textMuted,
      })
    })
  }
}
