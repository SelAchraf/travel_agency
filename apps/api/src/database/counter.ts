import { pool } from "./connection.js";
import type { PoolClient } from "pg";

export async function getNextSequence(
  prefix: "TRV" | "RCP" | "RFD" | "ENQ" | "DOC",
  client?: PoolClient,
): Promise<string> {
  const year = new Date().getFullYear();
  const counterId = `${prefix}-${year}`;

  const queryText = `
    INSERT INTO counters (id, seq)
    VALUES ($1, 1)
    ON CONFLICT (id)
    DO UPDATE SET seq = counters.seq + 1
    RETURNING seq;
  `;

  let seqNumber = 1;
  if (client) {
    const res = await client.query<{ seq: number }>(queryText, [counterId]);
    seqNumber = res.rows[0]?.seq ?? 1;
  } else {
    const res = await pool.query<{ seq: number }>(queryText, [counterId]);
    seqNumber = res.rows[0]?.seq ?? 1;
  }

  const paddedNumber = seqNumber.toString().padStart(6, "0");
  return `${prefix}-${year}-${paddedNumber}`;
}
