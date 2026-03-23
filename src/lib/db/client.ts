/* eslint-disable @typescript-eslint/no-explicit-any */
import postgres from "postgres";

// ---------------------------------------------------------------------------
// Connection (singleton) — uses postgres.js (Vercel serverless compatible)
// ---------------------------------------------------------------------------
let sql: ReturnType<typeof postgres> | null = null;

function getSQL() {
  if (!sql) {
    sql = postgres(process.env.DATABASE_URL!, {
      ssl: "require",
      max: 5,
      idle_timeout: 30,
      connect_timeout: 10,
    });
  }
  return sql;
}

// pg-compatible query wrapper
function getPool() {
  const s = getSQL();
  return {
    query: async (text: string, values?: any[]) => {
      // Convert $1, $2 style params to postgres.js unsafe style
      if (values && values.length > 0) {
        const result = await s.unsafe(text, values);
        return { rows: result as any[], rowCount: result.count };
      }
      const result = await s.unsafe(text);
      return { rows: result as any[], rowCount: result.count };
    },
  };
}

// ---------------------------------------------------------------------------
// QueryBuilder — mimics Supabase PostgREST query builder
// ---------------------------------------------------------------------------

interface Condition {
  clause: string;
  values: any[];
}

type OperationType = "select" | "insert" | "upsert" | "update" | "delete";

class QueryBuilder {
  private table: string;
  private operation: OperationType = "select";
  private selectCols: string = "*";
  private conditions: Condition[] = [];
  private orderClauses: string[] = [];
  private limitVal: number | null = null;
  private offsetVal: number | null = null;
  private isCount: boolean = false;
  private countType: string | null = null;
  private isHead: boolean = false;
  private isSingle: boolean = false;
  private _signal: AbortSignal | null = null;

  // For insert / upsert / update
  private insertData: Record<string, any>[] | null = null;
  private updateData: Record<string, any> | null = null;
  private upsertConflictCols: string | null = null;
  private upsertIgnoreDuplicates: boolean = false;

  // For chaining .select() after .upsert()/.insert()/.update()/.delete()
  private returningCols: string | null = null;

  // Track the current parameter index for $N placeholders
  private paramIdx = 0;

  constructor(table: string) {
    this.table = table;
  }

  // ------ SELECT ------

  select(cols?: string, opts?: { count?: string; head?: boolean }): this {
    if (this.operation !== "select") {
      // Called after insert/upsert/update/delete — it's a RETURNING clause
      this.returningCols = cols || "*";
      if (opts?.count === "exact") {
        this.isCount = true;
        this.countType = "exact";
      }
      if (opts?.head) this.isHead = true;
      return this;
    }
    this.selectCols = cols || "*";
    if (opts?.count === "exact") {
      this.isCount = true;
      this.countType = "exact";
    }
    if (opts?.head) this.isHead = true;
    return this;
  }

  // ------ FILTERS ------

  private nextParam(): string {
    this.paramIdx++;
    return `$${this.paramIdx}`;
  }

  eq(col: string, val: any): this {
    const p = this.nextParam();
    this.conditions.push({ clause: `"${col}" = ${p}`, values: [val] });
    return this;
  }

  neq(col: string, val: any): this {
    const p = this.nextParam();
    this.conditions.push({ clause: `"${col}" != ${p}`, values: [val] });
    return this;
  }

  lt(col: string, val: any): this {
    const p = this.nextParam();
    this.conditions.push({ clause: `"${col}" < ${p}`, values: [val] });
    return this;
  }

  gt(col: string, val: any): this {
    const p = this.nextParam();
    this.conditions.push({ clause: `"${col}" > ${p}`, values: [val] });
    return this;
  }

  gte(col: string, val: any): this {
    const p = this.nextParam();
    this.conditions.push({ clause: `"${col}" >= ${p}`, values: [val] });
    return this;
  }

  lte(col: string, val: any): this {
    const p = this.nextParam();
    this.conditions.push({ clause: `"${col}" <= ${p}`, values: [val] });
    return this;
  }

  like(col: string, val: string): this {
    const p = this.nextParam();
    this.conditions.push({ clause: `"${col}" LIKE ${p}`, values: [val] });
    return this;
  }

  ilike(col: string, val: string): this {
    const p = this.nextParam();
    this.conditions.push({ clause: `"${col}" ILIKE ${p}`, values: [val] });
    return this;
  }

  is(col: string, val: null | boolean): this {
    if (val === null) {
      this.conditions.push({ clause: `"${col}" IS NULL`, values: [] });
    } else {
      this.conditions.push({
        clause: `"${col}" IS ${val ? "TRUE" : "FALSE"}`,
        values: [],
      });
    }
    return this;
  }

  in(col: string, vals: any[]): this {
    if (vals.length === 0) {
      // Impossible condition
      this.conditions.push({ clause: "FALSE", values: [] });
      return this;
    }
    const placeholders = vals.map(() => this.nextParam());
    this.conditions.push({
      clause: `"${col}" IN (${placeholders.join(", ")})`,
      values: vals,
    });
    return this;
  }

  /**
   * .not("col", "is", null) → col IS NOT NULL
   * .not("col", "eq", val) → col != val
   */
  not(col: string, op: string, val: any): this {
    if (op === "is" && val === null) {
      this.conditions.push({ clause: `"${col}" IS NOT NULL`, values: [] });
    } else if (op === "eq") {
      const p = this.nextParam();
      this.conditions.push({ clause: `"${col}" != ${p}`, values: [val] });
    } else if (op === "in") {
      if (Array.isArray(val) && val.length > 0) {
        const placeholders = val.map(() => this.nextParam());
        this.conditions.push({
          clause: `"${col}" NOT IN (${placeholders.join(", ")})`,
          values: val,
        });
      }
    } else {
      // Generic NOT wrapper
      const p = this.nextParam();
      this.conditions.push({
        clause: `NOT ("${col}" ${this.opToSql(op)} ${p})`,
        values: [val],
      });
    }
    return this;
  }

  /**
   * Parse Supabase-style .or() syntax:
   *   "change_rate.gt.900,change_rate.lt.-95"
   *   "region_name.ilike.%val%,dong_name.ilike.%val%"
   *   "total_units.is.null,parking_count.is.null"
   *   "change_rate.is.null,change_rate.gt.-15"
   */
  or(conditions: string): this {
    const parts = this.parseOrConditions(conditions);
    const sqlParts: string[] = [];
    const values: any[] = [];

    for (const part of parts) {
      const { col, op, val } = part;
      const sqlExpr = this.orPartToSql(col, op, val, values);
      sqlParts.push(sqlExpr);
    }

    this.conditions.push({
      clause: `(${sqlParts.join(" OR ")})`,
      values,
    });
    return this;
  }

  // ------ ORDER / LIMIT / OFFSET / RANGE ------

  order(col: string, opts?: { ascending?: boolean }): this {
    const dir = opts?.ascending === false ? "DESC" : "ASC";
    this.orderClauses.push(`"${col}" ${dir}`);
    return this;
  }

  limit(n: number): this {
    this.limitVal = n;
    return this;
  }

  range(from: number, to: number): this {
    this.offsetVal = from;
    this.limitVal = to - from + 1;
    return this;
  }

  single(): this {
    this.isSingle = true;
    this.limitVal = 1;
    return this;
  }

  abortSignal(signal: AbortSignal): this {
    this._signal = signal;
    return this;
  }

  // ------ MUTATION OPERATIONS ------

  insert(data: Record<string, any> | Record<string, any>[]): this {
    this.operation = "insert";
    this.insertData = Array.isArray(data) ? data : [data];
    return this;
  }

  upsert(
    data: Record<string, any> | Record<string, any>[],
    opts?: { onConflict?: string; ignoreDuplicates?: boolean }
  ): this {
    this.operation = "upsert";
    this.insertData = Array.isArray(data) ? data : [data];
    this.upsertConflictCols = opts?.onConflict ?? null;
    this.upsertIgnoreDuplicates = opts?.ignoreDuplicates ?? false;
    return this;
  }

  update(data: Record<string, any>): this {
    this.operation = "update";
    this.updateData = data;
    return this;
  }

  delete(): this {
    this.operation = "delete";
    return this;
  }

  // ------ EXECUTION ------

  /**
   * Thenable: allows `await queryBuilder` to work like Supabase.
   */
  then(
    resolve: (value: any) => any,
    reject?: (reason?: any) => any
  ): Promise<any> {
    return this.execute().then(resolve, reject);
  }

  private async execute(): Promise<{
    data: any;
    error: { message: string } | null;
    count?: number | null;
  }> {
    try {
      switch (this.operation) {
        case "select":
          return await this.executeSelect();
        case "insert":
          return await this.executeInsert();
        case "upsert":
          return await this.executeUpsert();
        case "update":
          return await this.executeUpdate();
        case "delete":
          return await this.executeDelete();
        default:
          return { data: null, error: { message: `Unknown operation: ${this.operation}` } };
      }
    } catch (e: any) {
      return { data: null, error: { message: e.message ?? String(e) }, count: null };
    }
  }

  // ------ SELECT execution ------

  private async executeSelect() {
    // Reset paramIdx since we'll build from scratch
    this.paramIdx = 0;
    this.rebuildConditionParams();

    if (this.isCount && this.isHead) {
      // COUNT only, no data
      const { sql, values } = this.buildCountSQL();
      const result = await this.query(sql, values);
      return { data: null, error: null, count: parseInt(result.rows[0]?.count ?? "0", 10) };
    }

    if (this.isCount && !this.isHead) {
      // Both data AND count (like select("trade_price", { count: "exact" }))
      const { sql: dataSql, values: dataValues } = this.buildSelectSQL();
      const { sql: countSql, values: countValues } = this.buildCountSQL();

      const [dataResult, countResult] = await Promise.all([
        this.query(dataSql, dataValues),
        this.query(countSql, countValues),
      ]);

      return {
        data: dataResult.rows,
        error: null,
        count: parseInt(countResult.rows[0]?.count ?? "0", 10),
      };
    }

    const { sql, values } = this.buildSelectSQL();
    const result = await this.query(sql, values);

    if (this.isSingle) {
      return { data: result.rows[0] ?? null, error: null };
    }

    return { data: result.rows, error: null };
  }

  private buildSelectSQL(): { sql: string; values: any[] } {
    const cols = this.parseSelectCols(this.selectCols);
    let sql = `SELECT ${cols} FROM "${this.table}"`;
    const { whereClause, values } = this.buildWhere();

    if (whereClause) sql += ` WHERE ${whereClause}`;
    if (this.orderClauses.length > 0) sql += ` ORDER BY ${this.orderClauses.join(", ")}`;
    if (this.limitVal !== null) sql += ` LIMIT ${this.limitVal}`;
    if (this.offsetVal !== null) sql += ` OFFSET ${this.offsetVal}`;

    return { sql, values };
  }

  private buildCountSQL(): { sql: string; values: any[] } {
    let sql = `SELECT COUNT(*) as count FROM "${this.table}"`;
    const { whereClause, values } = this.buildWhere();
    if (whereClause) sql += ` WHERE ${whereClause}`;
    return { sql, values };
  }

  // ------ INSERT execution ------

  private async executeInsert() {
    if (!this.insertData || this.insertData.length === 0) {
      return { data: null, error: null };
    }

    const cols = Object.keys(this.insertData[0]);
    const { sql, values } = this.buildInsertSQL(cols, this.insertData);
    const returning = this.returningCols ? ` RETURNING ${this.parseSelectCols(this.returningCols)}` : "";

    const result = await this.query(sql + returning, values);
    return { data: result.rows, error: null };
  }

  // ------ UPSERT execution ------

  private async executeUpsert() {
    if (!this.insertData || this.insertData.length === 0) {
      return { data: null, error: null };
    }

    const cols = Object.keys(this.insertData[0]);
    const { sql: insertSql, values } = this.buildInsertSQL(cols, this.insertData);

    let conflictClause: string;
    if (this.upsertConflictCols) {
      const conflictCols = this.upsertConflictCols
        .split(",")
        .map((c) => `"${c.trim()}"`)
        .join(", ");
      conflictClause = `ON CONFLICT (${conflictCols})`;
    } else {
      conflictClause = "ON CONFLICT";
    }

    let actionClause: string;
    if (this.upsertIgnoreDuplicates) {
      actionClause = "DO NOTHING";
    } else {
      // DO UPDATE SET col = EXCLUDED.col for non-conflict columns
      const conflictColSet = new Set(
        (this.upsertConflictCols ?? "").split(",").map((c) => c.trim())
      );
      const updateCols = cols.filter((c) => !conflictColSet.has(c));
      if (updateCols.length > 0) {
        actionClause = `DO UPDATE SET ${updateCols
          .map((c) => `"${c}" = EXCLUDED."${c}"`)
          .join(", ")}`;
      } else {
        actionClause = "DO NOTHING";
      }
    }

    const returning = this.returningCols
      ? ` RETURNING ${this.parseSelectCols(this.returningCols)}`
      : "";

    const fullSql = `${insertSql} ${conflictClause} ${actionClause}${returning}`;
    const result = await this.query(fullSql, values);

    return { data: result.rows, error: null };
  }

  // ------ UPDATE execution ------

  private async executeUpdate() {
    if (!this.updateData) {
      return { data: null, error: null };
    }

    this.paramIdx = 0;
    const setClauses: string[] = [];
    const values: any[] = [];

    for (const [col, val] of Object.entries(this.updateData)) {
      this.paramIdx++;
      setClauses.push(`"${col}" = $${this.paramIdx}`);
      values.push(val);
    }

    // Rebuild conditions with correct param offsets
    this.rebuildConditionParams();
    const { whereClause, values: whereValues } = this.buildWhere();

    let sql = `UPDATE "${this.table}" SET ${setClauses.join(", ")}`;
    if (whereClause) sql += ` WHERE ${whereClause}`;

    const returning = this.returningCols
      ? ` RETURNING ${this.parseSelectCols(this.returningCols)}`
      : "";

    const result = await this.query(sql + returning, [...values, ...whereValues]);
    return { data: result.rows, error: null };
  }

  // ------ DELETE execution ------

  private async executeDelete() {
    this.paramIdx = 0;
    this.rebuildConditionParams();
    const { whereClause, values } = this.buildWhere();

    let sql = `DELETE FROM "${this.table}"`;
    if (whereClause) sql += ` WHERE ${whereClause}`;

    const returning = this.returningCols
      ? ` RETURNING ${this.parseSelectCols(this.returningCols)}`
      : "";

    const result = await this.query(sql + returning, values);
    return { data: result.rows, error: null };
  }

  // ------ SQL helpers ------

  private buildInsertSQL(
    cols: string[],
    rows: Record<string, any>[]
  ): { sql: string; values: any[] } {
    const quotedCols = cols.map((c) => `"${c}"`).join(", ");
    const values: any[] = [];
    const rowPlaceholders: string[] = [];

    let paramCounter = 0;
    for (const row of rows) {
      const placeholders = cols.map(() => {
        paramCounter++;
        return `$${paramCounter}`;
      });
      rowPlaceholders.push(`(${placeholders.join(", ")})`);
      for (const col of cols) {
        const val = row[col];
        // Serialize objects/arrays as JSON strings for CockroachDB jsonb columns
        if (val !== null && val !== undefined && typeof val === "object" && !(val instanceof Date)) {
          values.push(JSON.stringify(val));
        } else {
          values.push(val ?? null);
        }
      }
    }

    const sql = `INSERT INTO "${this.table}" (${quotedCols}) VALUES ${rowPlaceholders.join(", ")}`;
    return { sql, values };
  }

  private buildWhere(): { whereClause: string; values: any[] } {
    if (this.conditions.length === 0) {
      return { whereClause: "", values: [] };
    }

    const clauses: string[] = [];
    const values: any[] = [];

    for (const cond of this.conditions) {
      clauses.push(cond.clause);
      values.push(...cond.values);
    }

    return { whereClause: clauses.join(" AND "), values };
  }

  /**
   * Rebuild all condition param placeholders starting from this.paramIdx.
   * This is needed because for UPDATE, paramIdx starts after the SET clause params.
   */
  private rebuildConditionParams(): void {
    const startIdx = this.paramIdx;
    let idx = startIdx;

    for (const cond of this.conditions) {
      // Replace all $N placeholders in the clause
      let newClause = cond.clause;
      const placeholderCount = cond.values.length;

      // Count actual placeholders in clause (some conditions like IS NULL have 0 values)
      const matches = newClause.match(/\$\d+/g);
      if (matches && matches.length > 0) {
        // Replace each placeholder in order
        let matchIdx = 0;
        newClause = newClause.replace(/\$\d+/g, () => {
          idx++;
          matchIdx++;
          return `$${idx}`;
        });
      }

      cond.clause = newClause;
    }
  }

  private parseSelectCols(cols: string): string {
    if (cols === "*") return "*";
    return cols
      .split(",")
      .map((c) => {
        const trimmed = c.trim();
        // Handle expressions that contain spaces or are already quoted
        if (trimmed.includes("(") || trimmed.includes('"') || trimmed === "*") {
          return trimmed;
        }
        return `"${trimmed}"`;
      })
      .join(", ");
  }

  private opToSql(op: string): string {
    switch (op) {
      case "eq": return "=";
      case "neq": return "!=";
      case "lt": return "<";
      case "gt": return ">";
      case "gte": return ">=";
      case "lte": return "<=";
      case "like": return "LIKE";
      case "ilike": return "ILIKE";
      default: return "=";
    }
  }

  /**
   * Parse Supabase .or() syntax into structured parts.
   * Handles: "col.op.value,col.op.value"
   * Values can contain dots (e.g., percentages) so we split on first two dots only.
   */
  private parseOrConditions(
    condStr: string
  ): { col: string; op: string; val: string }[] {
    const results: { col: string; op: string; val: string }[] = [];

    // Split by comma, but be careful of nested values
    // Simple comma split works for Supabase .or() syntax
    const parts = condStr.split(",");

    for (const part of parts) {
      const trimmed = part.trim();
      // Format: col.op.val — split on first two dots
      const firstDot = trimmed.indexOf(".");
      if (firstDot === -1) continue;

      const col = trimmed.substring(0, firstDot);
      const rest = trimmed.substring(firstDot + 1);
      const secondDot = rest.indexOf(".");
      if (secondDot === -1) continue;

      const op = rest.substring(0, secondDot);
      const val = rest.substring(secondDot + 1);

      results.push({ col, op, val });
    }

    return results;
  }

  private orPartToSql(col: string, op: string, val: string, values: any[]): string {
    const quotedCol = `"${col}"`;

    switch (op) {
      case "is": {
        if (val === "null") return `${quotedCol} IS NULL`;
        if (val === "true") return `${quotedCol} IS TRUE`;
        if (val === "false") return `${quotedCol} IS FALSE`;
        return `${quotedCol} IS NULL`;
      }
      case "eq": {
        this.paramIdx++;
        values.push(this.parseValue(val));
        return `${quotedCol} = $${this.paramIdx}`;
      }
      case "neq": {
        this.paramIdx++;
        values.push(this.parseValue(val));
        return `${quotedCol} != $${this.paramIdx}`;
      }
      case "gt": {
        this.paramIdx++;
        values.push(this.parseValue(val));
        return `${quotedCol} > $${this.paramIdx}`;
      }
      case "lt": {
        this.paramIdx++;
        values.push(this.parseValue(val));
        return `${quotedCol} < $${this.paramIdx}`;
      }
      case "gte": {
        this.paramIdx++;
        values.push(this.parseValue(val));
        return `${quotedCol} >= $${this.paramIdx}`;
      }
      case "lte": {
        this.paramIdx++;
        values.push(this.parseValue(val));
        return `${quotedCol} <= $${this.paramIdx}`;
      }
      case "like": {
        this.paramIdx++;
        values.push(val);
        return `${quotedCol} LIKE $${this.paramIdx}`;
      }
      case "ilike": {
        this.paramIdx++;
        values.push(val);
        return `${quotedCol} ILIKE $${this.paramIdx}`;
      }
      default: {
        this.paramIdx++;
        values.push(this.parseValue(val));
        return `${quotedCol} = $${this.paramIdx}`;
      }
    }
  }

  private parseValue(val: string): any {
    // Try to parse as number
    if (/^-?\d+(\.\d+)?$/.test(val)) {
      return parseFloat(val);
    }
    if (val === "null") return null;
    if (val === "true") return true;
    if (val === "false") return false;
    return val;
  }

  private async query(sql: string, values: any[]): Promise<{ rows: any[] }> {
    const p = getPool();
    try {
      const result = await p.query(sql, values);
      return { rows: result.rows };
    } catch (err: any) {
      // Add SQL to error for debugging in dev
      const enriched = new Error(`${err.message}\nSQL: ${sql}\nParams: ${JSON.stringify(values)}`);
      (enriched as any).code = err.code;
      throw enriched;
    }
  }
}

// ---------------------------------------------------------------------------
// RPC caller
// ---------------------------------------------------------------------------

class RpcCaller {
  private fnName: string;
  private args: Record<string, any>;
  private _signal: AbortSignal | null = null;

  constructor(fnName: string, args: Record<string, any>) {
    this.fnName = fnName;
    this.args = args;
  }

  abortSignal(signal: AbortSignal): this {
    this._signal = signal;
    return this;
  }

  then(
    resolve: (value: any) => any,
    reject?: (reason?: any) => any
  ): Promise<any> {
    return this.execute().then(resolve, reject);
  }

  private async execute(): Promise<{ data: any; error: { message: string } | null }> {
    try {
      const p = getPool();
      const argKeys = Object.keys(this.args);
      const placeholders = argKeys.map((_, i) => `$${i + 1}`);
      const params = argKeys.map((_, i) => `${argKeys[i]} := $${i + 1}`);
      const values = argKeys.map((k) => this.args[k]);

      const sql = `SELECT * FROM "${this.fnName}"(${params.join(", ")})`;
      const result = await p.query(sql, values);
      return { data: result.rows, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e.message ?? String(e) } };
    }
  }
}

// ---------------------------------------------------------------------------
// Storage stub (for code that uses supabase.storage)
// ---------------------------------------------------------------------------

class StorageBucketApi {
  private bucket: string;

  constructor(bucket: string) {
    this.bucket = bucket;
  }

  async upload(
    path: string,
    data: Buffer | Blob,
    opts?: { contentType?: string; upsert?: boolean }
  ): Promise<{ data: { path: string } | null; error: { message: string } | null }> {
    // Storage operations still need Supabase — this is a stub.
    // For now, return an error indicating storage must be handled separately.
    console.warn(
      `[db] Storage upload to "${this.bucket}/${path}" — Supabase storage not available via pg adapter.`
    );
    return {
      data: null,
      error: { message: "Storage operations require Supabase client. Use a separate storage adapter." },
    };
  }

  getPublicUrl(path: string): { data: { publicUrl: string } } {
    // Build a placeholder URL; real implementation would use the Supabase storage URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    return {
      data: {
        publicUrl: `${supabaseUrl}/storage/v1/object/public/${this.bucket}/${path}`,
      },
    };
  }
}

class StorageApi {
  from(bucket: string): StorageBucketApi {
    return new StorageBucketApi(bucket);
  }
}

// ---------------------------------------------------------------------------
// Public API — drop-in replacement for Supabase client
// ---------------------------------------------------------------------------

export interface DbClient {
  from: (table: string) => QueryBuilder;
  rpc: (fnName: string, args?: Record<string, any>) => RpcCaller;
  storage: StorageApi;
}

export function createDbClient(): DbClient {
  return {
    from: (table: string) => new QueryBuilder(table),
    rpc: (fnName: string, args: Record<string, any> = {}) =>
      new RpcCaller(fnName, args),
    storage: new StorageApi(),
  };
}

// Allow graceful shutdown
export async function closePool(): Promise<void> {
  if (sql) {
    await sql.end();
    sql = null;
  }
}
