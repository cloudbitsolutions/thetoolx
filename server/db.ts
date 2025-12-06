import pg from "pg";
const { Pool } = pg;
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import fs from "fs";
import path from "path";

const sslCert = fs
  .readFileSync(
    path.join(process.cwd(), "certs", "ca.pem")
  )
  .toString();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Create a standard PostgreSQL connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    ca: sslCert,
    rejectUnauthorized: true,
  },
  max: 10,
  min: 1,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 5000,
});

// Add error handling for pool
pool.on("error", (err) => {
  console.error("Database pool error:", err);
});

// Drizzle instance
export const db = drizzle(pool, { schema });
