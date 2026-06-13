import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

const { Pool } = pg;

function splitSqlStatements(sql) {
  const statements = [];
  let current = "";
  let quote = null;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index] ?? "";
    const next = sql[index + 1] ?? "";

    if (!quote && char === "-" && next === "-") {
      const lineEnd = sql.indexOf("\n", index);
      if (lineEnd === -1) break;
      index = lineEnd;
      current += "\n";
      continue;
    }

    current += char;

    if ((char === "'" || char === "\"") && sql[index - 1] !== "\\") {
      quote = quote === char ? null : quote ?? char;
      continue;
    }

    if (!quote && char === ";") {
      const statement = current.trim();
      if (statement) statements.push(statement);
      current = "";
    }
  }

  const tail = current.trim();
  if (tail) statements.push(tail);

  return statements;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const schemaPath = resolve(process.cwd(), "scripts/cockroach-bootstrap.sql");
  const sql = await readFile(schemaPath, "utf8");
  const statements = splitSqlStatements(sql);
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 10_000,
  });

  try {
    for (const [index, statement] of statements.entries()) {
      await pool.query(statement);
      console.log(`applied ${index + 1}/${statements.length}`);
    }

    const health = await pool.query("SELECT current_database() AS database");
    console.log(`bootstrap complete: ${health.rows[0]?.database ?? "unknown"}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
