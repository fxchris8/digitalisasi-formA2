import { PDFDocument, StandardFonts } from "pdf-lib"
import * as a2Repo from "@/repositories/form-a2.repository"
import * as cr9Repo from "@/repositories/form-cr9.repository"
import { getStorageProvider } from "@/storage"
import type { JwtPayload } from "@/types/auth"
import { AppError } from "@/utils/app-error"
import {
  formatActorPlain,
  formatDatePlain,
  formatRupiahPlain,
} from "@/utils/format"
import { CONTENT_WIDTH, PdfBuilder, type TableColumn } from "@/utils/pdf-layout"

function assertCanExport(user: JwtPayload) {
  if (user.role !== "admin" && user.department !== "finance") {
    throw new AppError(
      "Hanya Finance yang dapat mengekspor PDF",
      403,
      "FORBIDDEN",
    )
  }
}

const STEP_LABEL: Record<string, string> = {
  nautica: "Manager Nautica",
  spm: "Manager SPM",
  finance: "Finance",
}

const STATUS_LABEL: Record<string, string> = {
  approved: "Disetujui",
  revision: "Revisi",
  rejected: "Ditolak",
  pending: "Menunggu",
}

/**
 * PDF gabungan untuk arsip Finance: halaman ringkasan Form CR9 & Form A2 yang
 * di-generate rapi, digabung dengan dokumen asli yang diupload (scan CR9,
 * kuitansi, berita acara) dalam satu berkas.
 */
export async function exportFormA2Pdf(
  user: JwtPayload,
  formA2Id: string,
): Promise<Buffer> {
  assertCanExport(user)

  const form = await a2Repo.findById(formA2Id)
  if (!form) throw new AppError("Form A2 tidak ditemukan", 404, "NOT_FOUND")
  if (form.status !== "approved") {
    throw new AppError(
      "Form A2 belum disetujui penuh (Finance), export PDF belum bisa dilakukan",
      422,
      "UNPROCESSABLE",
    )
  }

  const cr9 = await cr9Repo.findById(form.form_cr9_id)
  if (!cr9) throw new AppError("Form CR9 tidak ditemukan", 404, "NOT_FOUND")

  const storage = getStorageProvider()
  const outDoc = await PDFDocument.create()
  const font = await outDoc.embedFont(StandardFonts.Helvetica)
  const bold = await outDoc.embedFont(StandardFonts.HelveticaBold)

  outDoc.setTitle(`Form A2 ${form.form_number}`)
  outDoc.setSubject(`Penggantian biaya pengobatan ${cr9.seaman_name}`)
  outDoc.setCreator("Crew Medical System — SPIL")

  const printedAt = formatDatePlain(new Date())
  const totalAmount = Number(cr9.amount)

  // Persentase final = keputusan Finance (step terakhir dalam rantai approval).
  const finalLog = [...form.approval_logs]
    .reverse()
    .find((l) => l.step === "finance" && l.status === "approved")
  const finalPct = finalLog?.percentage ? Number(finalLog.percentage) : null
  const approvedAmount =
    finalPct !== null ? (totalAmount * finalPct) / 100 : null

  // ── Halaman 1: ringkasan Form CR9 ──────────────────────────────────────
  const cr9Doc = new PdfBuilder(outDoc, font, bold)
  cr9Doc.banner(
    "FORM CR9",
    "Pengajuan Penggantian Biaya Pengobatan ABK",
    "Nomor Form",
    cr9.form_number,
  )

  cr9Doc.section("Data Pelaut")
  cr9Doc.infoGrid([
    ["Nama Pelaut", cr9.seaman_name],
    ["Seaman Code", cr9.seaman_code],
    ["Seafarer Code", cr9.seafarer_code],
    ["Jabatan", cr9.position],
    ["Kapal", cr9.ship],
  ])

  cr9Doc.section("Data Pengajuan")
  const jenisCr9 =
    cr9.cr9_type === "reimbursement" ? "CR9 Reimbursement" : "CR9 Perusahaan"
  const pengajuanRows: [string, string][] = [
    ["Kantor Cabang", cr9.branch_office],
    ["Jenis Pengajuan", jenisCr9],
  ]
  if (cr9.cr9_type === "reimbursement") {
    pengajuanRows.push([
      "Kecelakaan Kerja",
      cr9.is_work_accident
        ? "Ya - reimbursement 100% (terkunci)"
        : "Bukan kecelakaan kerja",
    ])
  }
  pengajuanRows.push(
    ["Jenis Keluhan", cr9.complaint],
    ["Dibuat Oleh", formatActorPlain(cr9.creator_name, cr9.creator_email)],
    ["Tanggal Dibuat", formatDatePlain(cr9.created_at)],
    [
      "Tanggal Diajukan",
      cr9.submitted_at ? formatDatePlain(cr9.submitted_at) : "-",
    ],
  )
  cr9Doc.infoGrid(pengajuanRows)

  cr9Doc.section("Diagnosis")
  cr9Doc.paragraph(form.diagnosis)

  cr9Doc.section("Rincian Biaya")
  const detailCols: TableColumn[] = [
    { header: "No", width: 32, align: "center" },
    { header: "Uraian", width: 193 },
    { header: "Rumah Sakit", width: 165 },
    { header: "Jumlah", width: CONTENT_WIDTH - 390, align: "right" },
  ]
  cr9Doc.table(
    detailCols,
    form.details.map((d, i) => [
      String(i + 1),
      d.description,
      d.hospital_name ?? "-",
      formatRupiahPlain(d.amount),
    ]),
    { footer: ["", "TOTAL BIAYA DIAJUKAN", "", formatRupiahPlain(cr9.amount)] },
  )

  // ── Dokumen asli: scan CR9 lalu semua kuitansi ─────────────────────────
  await mergeStoredPdf(outDoc, storage, cr9.cr9_url)
  for (const receipt of cr9.receipts ?? []) {
    await mergeStoredPdf(outDoc, storage, receipt.storage_path)
  }

  // ── Halaman: ringkasan Form A2 & riwayat approval ──────────────────────
  const a2Doc = new PdfBuilder(outDoc, font, bold)
  a2Doc.banner(
    "FORM A2",
    "Persetujuan Penggantian Biaya Pengobatan ABK",
    "Nomor Form",
    form.form_number,
  )

  a2Doc.section("Informasi Form A2")
  a2Doc.infoGrid([
    ["Nomor Form CR9", form.cr9_form_number],
    ["Nama Pelaut", form.seaman_name],
    ["Kapal", form.ship],
    ["Kantor Cabang", form.branch_office],
    ["Status Akhir", "Disetujui (selesai)"],
    [
      "Berita Acara Diupload",
      form.news_added_at
        ? `${formatDatePlain(form.news_added_at)} - ${formatActorPlain(form.news_added_by_name, form.news_added_by_email)}`
        : "-",
    ],
    [
      "Diajukan ke Manager",
      form.submitted_to_manager_at
        ? `${formatDatePlain(form.submitted_to_manager_at)} - ${formatActorPlain(form.submitted_to_manager_name, form.submitted_to_manager_email)}`
        : "-",
    ],
  ])

  a2Doc.section("Hasil Persetujuan")
  a2Doc.highlight(
    finalPct !== null
      ? `NOMINAL DISETUJUI (${finalPct}% dari ${formatRupiahPlain(totalAmount)})`
      : "NOMINAL DISETUJUI",
    approvedAmount !== null ? formatRupiahPlain(approvedAmount) : "-",
    "success",
  )

  a2Doc.section("Riwayat Approval")
  const logCols: TableColumn[] = [
    { header: "Tahap", width: 95 },
    { header: "Keputusan", width: 68, align: "center" },
    { header: "%", width: 38, align: "right" },
    { header: "Oleh", width: 190 },
    { header: "Tanggal", width: CONTENT_WIDTH - 391 },
  ]
  a2Doc.table(
    logCols,
    form.approval_logs.map((log) => [
      STEP_LABEL[log.step] ?? log.step,
      STATUS_LABEL[log.status] ?? log.status,
      log.percentage ? `${Number(log.percentage)}` : "-",
      formatActorPlain(log.actioner_name, log.actioner_email),
      formatDatePlain(log.actioned_at),
    ]),
    {
      noteColumn: (i) => {
        const note = form.approval_logs[i]?.notes
        return note ? `Catatan: ${note}` : null
      },
    },
  )

  // ── Dokumen asli terakhir: berita acara ────────────────────────────────
  if (form.news_url) {
    await mergeStoredPdf(outDoc, storage, form.news_url)
  }

  // Footer ditulis paling akhir supaya nomor halamannya mengikuti posisi
  // sebenarnya di berkas gabungan (bukan cuma halaman yang di-generate).
  cr9Doc.addFooters(`Form CR9 ${cr9.form_number}`, printedAt)
  a2Doc.addFooters(`Form A2 ${form.form_number}`, printedAt)

  const bytes = await outDoc.save()
  return Buffer.from(bytes)
}

async function mergeStoredPdf(
  outDoc: PDFDocument,
  storage: ReturnType<typeof getStorageProvider>,
  storedPath: string,
): Promise<void> {
  let buffer: Buffer
  try {
    buffer = await storage.readBuffer(storedPath)
  } catch {
    throw new AppError(
      `File "${storedPath.split("/").pop()}" tidak ditemukan di storage — export PDF dibatalkan`,
      500,
      "EXPORT_FILE_MISSING",
    )
  }

  let srcDoc: PDFDocument
  try {
    srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })
  } catch {
    throw new AppError(
      `File "${storedPath.split("/").pop()}" rusak atau bukan PDF valid — export PDF dibatalkan`,
      500,
      "EXPORT_FILE_INVALID",
    )
  }

  const pages = await outDoc.copyPages(srcDoc, srcDoc.getPageIndices())
  for (const page of pages) outDoc.addPage(page)
}
