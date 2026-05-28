import { pool } from "./db";
import { SCHEMA_SQL } from "./schema";

let done = false;

export async function migrate() {
  if (done) return;
  done = true;
  await pool.query(SCHEMA_SQL);
  console.log("[migrate] schema applied");
}
