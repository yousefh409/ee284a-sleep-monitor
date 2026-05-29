import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

const url = process.env.DATABASE_URL ?? "";
const noSsl = url.includes(".railway.internal") || url.includes(".proxy.rlwy.net");

export const pool =
  global.__pgPool ??
  new Pool({
    connectionString: url,
    ssl: noSsl ? false : { rejectUnauthorized: false },
  });

if (process.env.NODE_ENV !== "production") global.__pgPool = pool;
