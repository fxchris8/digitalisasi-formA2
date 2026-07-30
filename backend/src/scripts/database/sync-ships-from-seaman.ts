import * as dotenv from "dotenv"
import { expand } from "dotenv-expand"
import { Pool } from "pg"

expand(dotenv.config())

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const isDryRun = process.argv.includes("--dry-run")

/**
 * Sinkronisasi master kapal (`ships`) dengan kapal terakhir tiap seaman
 * (`seamen.last_location`).
 *
 * Masalah yang diselesaikan: dua sumber ini menulis kapal yang SAMA dengan
 * format berbeda — master menyimpan "AKASHIA" / "BC ANGSA LAUT", sedangkan
 * data seaman (sumber resmi dari SPM) menyimpan "KM. AKASHIA" / "BC. ANGSA
 * LAUT". Akibatnya nama kapal yang terisi otomatis di Form CR9 tidak pernah
 * cocok dengan isi dropdown master — itulah "tabrakan" datanya.
 *
 * Solusinya: pakai format dari data seaman sebagai acuan (karena itu yang
 * ikut terisi otomatis ke form), lalu:
 *   1. samakan nama kapal master yang sebenarnya kapal yang sama, dan
 *   2. tambahkan kapal dari data seaman yang belum ada di master.
 *
 * Pencocokan memakai bentuk ternormalisasi: huruf besar, prefix jenis kapal
 * (KM./TB./BC. dst) dibuang, spasi dirapikan.
 */
const NORM = (col: string) => /* sql */ `
  REGEXP_REPLACE(
    REGEXP_REPLACE(UPPER(TRIM(${col})), '^(KM|KMP|TB|TK|MT|BC|SPOB|LCT|BG|AHTS)\\.?[[:space:]]+', ''),
    '[[:space:]]+', ' ', 'g'
  )`

/** Nilai last_location yang bukan nama kapal (seaman sedang tidak bertugas). */
const NOT_A_SHIP = `last_location !~* '(DARAT|PENDING)'`

/** Kapal unik dari data seaman — kalau satu bentuk ternormalisasi punya
 *  beberapa penulisan, ambil yang paling sering dipakai. */
const SEAMAN_SHIPS = /* sql */ `
  SELECT nm, norm FROM (
    SELECT
      last_location AS nm,
      ${NORM("last_location")} AS norm,
      ROW_NUMBER() OVER (
        PARTITION BY ${NORM("last_location")}
        ORDER BY COUNT(*) DESC, last_location
      ) AS rn
    FROM seamen
    WHERE last_location IS NOT NULL AND ${NOT_A_SHIP}
    GROUP BY last_location
  ) ranked
  WHERE rn = 1
`

async function syncShips(): Promise<void> {
  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    const before = await client.query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM ships",
    )

    // 1. Samakan penulisan nama kapal yang sudah ada di master.
    //    Lewati kalau nama tujuan sudah dipakai baris lain (hindari bentrok UNIQUE).
    const renamed = await client.query<{ old_name: string; new_name: string }>(
      /* sql */ `
        UPDATE ships sh
        SET name = sm.nm, updated_at = NOW()
        FROM (${SEAMAN_SHIPS}) sm
        WHERE ${NORM("sh.name")} = sm.norm
          AND sh.name <> sm.nm
          AND NOT EXISTS (
            SELECT 1 FROM ships other WHERE other.name = sm.nm AND other.id <> sh.id
          )
        RETURNING sh.name AS new_name, sm.norm AS old_name
      `,
    )

    // 2. Tambahkan kapal dari data seaman yang memang belum ada di master.
    const inserted = await client.query<{ name: string }>(
      /* sql */ `
        INSERT INTO ships (name)
        SELECT sm.nm FROM (${SEAMAN_SHIPS}) sm
        WHERE NOT EXISTS (
          SELECT 1 FROM ships sh WHERE ${NORM("sh.name")} = sm.norm
        )
        ON CONFLICT (name) DO NOTHING
        RETURNING name
      `,
    )

    // 3. Laporkan kapal master yang tidak dipakai seaman mana pun (tidak
    //    dihapus — bisa jadi kapal baru/lama yang masih valid).
    const orphans = await client.query<{ name: string }>(
      /* sql */ `
        SELECT sh.name FROM ships sh
        WHERE NOT EXISTS (
          SELECT 1 FROM (${SEAMAN_SHIPS}) sm WHERE sm.norm = ${NORM("sh.name")}
        )
        ORDER BY sh.name
      `,
    )

    const after = await client.query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM ships",
    )

    if (isDryRun) {
      await client.query("ROLLBACK")
      console.log("[sync-ships] DRY RUN — tidak ada perubahan yang disimpan.")
    } else {
      await client.query("COMMIT")
    }

    console.log(
      `[sync-ships] Master kapal: ${before.rows[0]?.count} → ${after.rows[0]?.count}`,
    )
    console.log(`[sync-ships] Nama diselaraskan : ${renamed.rowCount}`)
    console.log(`[sync-ships] Kapal baru ditambah: ${inserted.rowCount}`)
    console.log(`[sync-ships] Tidak dipakai seaman: ${orphans.rowCount}`)
    if (renamed.rowCount) {
      console.log(
        "  contoh penyelarasan:",
        renamed.rows
          .slice(0, 5)
          .map((r) => r.new_name)
          .join(", "),
      )
    }
    if (orphans.rowCount) {
      console.log(
        "  contoh tidak terpakai:",
        orphans.rows
          .slice(0, 5)
          .map((r) => r.name)
          .join(", "),
      )
    }
  } catch (err) {
    await client.query("ROLLBACK")
    console.error("[sync-ships] Gagal:", err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

syncShips()
