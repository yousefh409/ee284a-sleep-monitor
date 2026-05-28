import { readFile } from "fs/promises";
import { join } from "path";
import { pool } from "./db";

let done = false;

export async function migrate() {
  if (done) return;
  done = true;
  const sql = await readFile(join(process.cwd(), "db/schema.sql"), "utf8");
  await pool.query(sql);
  console.log("[migrate] schema applied");
}
