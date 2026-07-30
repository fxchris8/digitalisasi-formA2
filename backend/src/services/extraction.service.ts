import axios from "axios"
import { z } from "zod"
import type { ExtractedReceiptData } from "@/models/extraction.model"
import * as hospitalRepo from "@/repositories/hospital.repository"
import { getStorageProvider } from "@/storage"
import { AppError } from "@/utils/app-error"

// ── OpenRouter (vision) — baca nota/kwitansi RS, kembalikan data terstruktur ───
//
// OpenRouter menerima PDF langsung (lewat content type "file"), jadi tidak
// perlu render ke gambar dulu seperti provider yang cuma terima image. Model
// default Gemini 2.5 Flash — murah, kuat baca dokumen, dan hasilnya sudah
// terbukti akurat di pengujian nota rumah sakit asli.

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const MAX_ATTEMPTS = 2 // jaga-jaga kalau model gagal sesaat (non-determinism)

const EXTRACTION_PROMPT = /* text */ `
Kamu membaca dokumen kwitansi/nota tagihan rumah sakit dalam bahasa Indonesia.
Dokumen ini seringkali berupa gabungan banyak halaman hasil scan untuk SATU klaim
yang sama: form pengajuan internal, invoice/tagihan, kwitansi resmi, tabel
ringkasan rincian biaya per kunjungan/tindakan, nota-nota kecil per obat/jasa
dokter, dan kadang lampiran non-biaya (resume medis, surat jaminan, hasil lab).
Semua halaman itu menjelaskan biaya yang SAMA dari beberapa tingkat kedetailan
berbeda — bukan biaya berbeda-beda yang harus dijumlah semua.

Baca seluruh dokumen dan kembalikan data berikut sebagai JSON:

- hospital_name: nama rumah sakit persis seperti tertulis di dokumen (biasanya di kop surat/invoice). null kalau tidak terbaca.
- date: tanggal pelayanan/nota utama, format DD/MM/YYYY. null kalau tidak ada.
- total_amount: TOTAL AKHIR keseluruhan tagihan klaim ini — ambil dari kwitansi/invoice resmi (label semacam "Total Pembayaran", "Jumlah Tagihan", "Grand Total", "Harap Dibayar", atau "TOTAL AKHIR"). Angka murni tanpa "Rp" atau pemisah ribuan. null kalau tidak ada.
- details: rincian biaya yang KALAU DIJUMLAHKAN SEMUA BARISNYA HARUS PAS SAMA DENGAN total_amount — tidak boleh lebih besar.

Cara memilih baris details (PENTING, supaya tidak dobel hitung):
- Kalau dokumen punya SATU tabel ringkasan per kunjungan/tindakan (biasanya berkolom tanggal/klinik-tindakan/total per baris, contoh judul "Rincian Biaya per Pasien" atau semacamnya) yang totalnya cocok dengan total_amount, PAKAI TABEL ITU sebagai sumber details — satu baris tabel = satu baris details (description = tanggal + nama klinik/tindakan pada baris itu, amount = kolom total baris itu).
- JANGAN tambahkan lagi baris dari nota-nota kecil per obat/per tindakan/per jasa dokter di halaman lain — nota-nota itu cuma bukti pendukung dari salah satu baris ringkasan di atas dan nilainya sudah termasuk di baris tersebut. Menambahkannya sebagai baris terpisah akan membuat total details lebih besar dari total_amount (dobel hitung).
- Kalau dokumen cuma satu kwitansi sederhana tanpa tabel ringkasan (satu total, satu uraian), kembalikan details dengan satu baris saja: description dari uraian pembayaran, amount = total_amount.
- Sebelum menjawab, jumlahkan semua amount di details dan pastikan hasilnya SAMA DENGAN total_amount. Kalau tidak sama, tingkat rincian yang kamu pilih salah (biasanya karena mencampur baris dari tingkat ringkasan dan tingkat nota kecil sekaligus) — pilih ulang.

Kalau dokumen tidak jelas atau bukan nota/kwitansi rumah sakit, kembalikan hospital_name: null dan details: [].
Jangan mengarang data yang tidak ada di dokumen.
`.trim()

const RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    hospital_name: { type: ["string", "null"] },
    date: { type: ["string", "null"] },
    total_amount: { type: ["number", "null"] },
    details: {
      type: "array",
      items: {
        type: "object",
        properties: {
          description: { type: "string" },
          amount: { type: "number" },
        },
        required: ["description", "amount"],
        additionalProperties: false,
      },
    },
  },
  required: ["hospital_name", "date", "total_amount", "details"],
  additionalProperties: false,
}

const extractionResultSchema = z.object({
  hospital_name: z.string().nullable(),
  date: z.string().nullable(),
  total_amount: z.number().nullable(),
  details: z.array(
    z.object({
      description: z.string(),
      amount: z.number(),
    }),
  ),
})

interface OpenRouterChatResponse {
  choices?: { message?: { content?: string } }[]
}

/** Buang markdown code fence (```json ... ```) dan ambil blok {...} pertama kalau ada teks lain di sekitarnya. */
function extractJsonBlock(raw: string): string {
  const withoutFence = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim()

  const start = withoutFence.indexOf("{")
  const end = withoutFence.lastIndexOf("}")
  if (start === -1 || end === -1 || end < start) return withoutFence
  return withoutFence.slice(start, end + 1)
}

async function requestOnce(params: {
  buffer: Buffer
  filename: string
  apiKey: string
  model: string
}): Promise<z.infer<typeof extractionResultSchema>> {
  const base64 = params.buffer.toString("base64")

  let response: { data: OpenRouterChatResponse }
  try {
    response = await axios.post<OpenRouterChatResponse>(
      OPENROUTER_URL,
      {
        model: params.model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: EXTRACTION_PROMPT },
              {
                type: "file",
                file: {
                  filename: params.filename,
                  file_data: `data:application/pdf;base64,${base64}`,
                },
              },
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "receipt_extraction",
            strict: true,
            schema: RESPONSE_JSON_SCHEMA,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${params.apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 60_000,
      },
    )
  } catch (err) {
    if (axios.isAxiosError(err)) {
      throw new AppError(
        `Gagal menghubungi layanan ekstraksi: ${err.response?.status ?? 0} ${err.response?.statusText ?? err.message}`,
        502,
        "EXTRACTION_API_ERROR",
      )
    }
    throw err
  }

  const rawContent = response.data?.choices?.[0]?.message?.content
  if (typeof rawContent !== "string") {
    throw new AppError(
      "Respons layanan ekstraksi tidak valid",
      502,
      "EXTRACTION_INVALID_RESPONSE",
    )
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(extractJsonBlock(rawContent))
  } catch {
    throw new AppError(
      "Gagal membaca hasil ekstraksi (bukan JSON valid)",
      502,
      "EXTRACTION_PARSE_ERROR",
    )
  }

  const result = extractionResultSchema.safeParse(parsed)
  if (!result.success) {
    throw new AppError(
      "Hasil ekstraksi tidak sesuai format yang diharapkan",
      502,
      "EXTRACTION_SCHEMA_MISMATCH",
    )
  }
  return result.data
}

async function callOpenRouter(params: {
  buffer: Buffer
  filename: string
}): Promise<z.infer<typeof extractionResultSchema>> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new AppError(
      "OPENROUTER_API_KEY belum dikonfigurasi di environment",
      500,
      "EXTRACTION_NOT_CONFIGURED",
    )
  }
  const model = process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash"

  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await requestOnce({ ...params, apiKey, model })
    } catch (err) {
      lastError = err
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    }
  }
  throw lastError
}

/**
 * Ekstrak satu atau lebih file kwitansi sekaligus (Form CR9 sekarang boleh
 * punya >1 kuitansi) dan gabungkan hasilnya: semua `details` digabung apa
 * adanya (setiap file diekstrak independen, jadi tidak ada risiko dobel
 * hitung ANTAR file — dobel hitung DALAM satu file sudah ditangani prompt),
 * `hospital_name`/`date` ambil dari file pertama yang berhasil terbaca, dan
 * `total_amount` dijumlah dari semua file (asumsi: tiap file adalah nota
 * terpisah untuk klaim yang sama, bukan halaman dari satu nota yang sama —
 * kalau strategi ini tidak sesuai kasus nyata, perlu direvisi bersama client).
 */
export async function extractReceiptData(
  storedPaths: string[],
): Promise<ExtractedReceiptData> {
  const storage = getStorageProvider()

  const results = await Promise.all(
    storedPaths.map(async (storedPath) => {
      const buffer = await storage.readBuffer(storedPath)
      const filename = storedPath.split("/").pop() ?? "document.pdf"
      return callOpenRouter({ buffer, filename })
    }),
  )

  const hospitalName =
    results.find((r) => r.hospital_name)?.hospital_name ?? null
  const date = results.find((r) => r.date)?.date ?? null
  const details = results.flatMap((r) => r.details)
  const amounts = results
    .map((r) => r.total_amount)
    .filter((a): a is number => a !== null)
  const totalAmount =
    amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) : null

  // Cocokkan nama RS hasil ekstraksi ke master data — kalau ketemu, langsung
  // kasih hospital_id; kalau tidak, biarkan null (user pilih manual di FE).
  let hospitalId: string | null = null
  if (hospitalName) {
    const { rows } = await hospitalRepo.findAll({
      search: hospitalName,
      limit: 1,
      offset: 0,
    })
    hospitalId = rows[0]?.id ?? null
  }

  return {
    hospital_name: hospitalName,
    hospital_id: hospitalId,
    date,
    total_amount: totalAmount,
    details,
  }
}
