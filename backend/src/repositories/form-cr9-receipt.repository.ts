import type { PoolClient } from "pg"
import pool from "@/config/database"
import type { FormCr9ReceiptWithUploader } from "@/models/form-cr9-receipt.model"

export async function findAllByCr9Id(
  cr9Id: string,
): Promise<FormCr9ReceiptWithUploader[]> {
  const result = await pool.query<FormCr9ReceiptWithUploader>(
    /* sql */ `
      SELECT
        r.*,
        u.full_name AS added_by_name,
        u.email AS added_by_email
      FROM form_cr9_receipt r
      LEFT JOIN users u ON u.id = r.added_by
      WHERE r.form_cr9_id = $1
      ORDER BY r.added_at ASC
    `,
    [cr9Id],
  )
  return result.rows
}

/** Insert baris kuitansi baru — dipakai saat create CR9, dalam transaksi yang sama. */
export async function insertMany(
  client: PoolClient,
  cr9Id: string,
  storagePaths: string[],
  userId: string,
): Promise<void> {
  for (const storagePath of storagePaths) {
    await client.query(
      /* sql */ `
        INSERT INTO form_cr9_receipt (form_cr9_id, storage_path, added_by)
        VALUES ($1, $2, $3)
      `,
      [cr9Id, storagePath, userId],
    )
  }
}

/** Ganti seluruh daftar kuitansi (hapus lama, insert baru) — dipakai saat update CR9. */
export async function replaceAll(
  cr9Id: string,
  storagePaths: string[],
  userId: string,
): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    await client.query(`DELETE FROM form_cr9_receipt WHERE form_cr9_id = $1`, [
      cr9Id,
    ])
    await insertMany(client, cr9Id, storagePaths, userId)
    await client.query("COMMIT")
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}
