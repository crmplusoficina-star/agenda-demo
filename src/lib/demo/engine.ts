// Banco de demonstração em memória, com a mesma interface do cliente Supabase
// usada pelo app (from/select/eq/insert/update..., rpc, functions.invoke, channel).
// Nada aqui se conecta a servidor algum: tudo fica no navegador.

export type Row = Record<string, any>;
export type Tables = Record<string, Row[]>;
type Result = { data: any; error: { message: string } | null; count?: number | null; status?: number };

const STORAGE_KEY = 'agenda-demo-db-v1';

export type DemoHooks = {
  seed: () => Tables;
  defaults: (table: string, row: Row, db: DemoDb) => Row;
  primaryKey: (table: string) => string[];
  afterWrite: (table: string, op: 'insert' | 'update' | 'delete', rows: Row[], before: Row[], db: DemoDb) => void;
  beforeInsert?: (table: string, row: Row, db: DemoDb) => boolean;
};

export function uuid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const fold = (v: unknown) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function likeToRegex(pattern: string, insensitive: boolean) {
  const escaped = String(pattern).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.');
  return new RegExp(`^${escaped}$`, insensitive ? 'is' : 's');
}

function cmp(a: any, b: any) {
  if (a === b) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'pt-BR');
}

function parseValue(raw: string): any {
  if (raw === 'null') return null;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  return raw;
}

type Filter = (row: Row) => boolean;

function opFilter(column: string, op: string, value: any): Filter {
  switch (op) {
    case 'eq': return (r) => r[column] === value || (r[column] != null && value != null && String(r[column]) === String(value));
    case 'neq': return (r) => !(r[column] === value || (r[column] != null && String(r[column]) === String(value)));
    case 'gt': return (r) => r[column] != null && cmp(r[column], value) > 0;
    case 'gte': return (r) => r[column] != null && cmp(r[column], value) >= 0;
    case 'lt': return (r) => r[column] != null && cmp(r[column], value) < 0;
    case 'lte': return (r) => r[column] != null && cmp(r[column], value) <= 0;
    case 'is': return (r) => value === null ? r[column] == null : r[column] === value;
    case 'in': {
      const list = Array.isArray(value) ? value : String(value).replace(/^\(|\)$/g, '').split(',').map((v) => parseValue(v.trim()));
      const set = new Set(list.map((v: any) => String(v)));
      return (r) => r[column] != null && set.has(String(r[column]));
    }
    case 'like': { const re = likeToRegex(value, false); return (r) => r[column] != null && re.test(String(r[column])); }
    case 'ilike': { const re = likeToRegex(fold(value), true); return (r) => r[column] != null && re.test(fold(r[column])); }
    case 'contains': return (r) => {
      const cell = r[column];
      if (Array.isArray(cell)) return (Array.isArray(value) ? value : [value]).every((v) => cell.includes(v));
      if (cell && typeof cell === 'object') return Object.entries(value || {}).every(([k, v]) => cell[k] === v);
      return false;
    };
    default: return () => true;
  }
}

function parseOr(expression: string): Filter {
  const parts: string[] = [];
  let depth = 0; let current = '';
  for (const ch of expression) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { parts.push(current); current = ''; } else current += ch;
  }
  if (current) parts.push(current);
  const filters = parts.map((part) => {
    const [column, op, ...rest] = part.split('.');
    const raw = rest.join('.');
    if (op === 'not') {
      const [innerOp, ...innerRest] = raw.split('.');
      const inner = opFilter(column, innerOp, parseValue(innerRest.join('.')));
      return (r: Row) => !inner(r);
    }
    return opFilter(column, op, op === 'in' ? raw : parseValue(raw));
  });
  return (row) => filters.some((f) => f(row));
}

export class DemoDb {
  tables: Tables = {};
  private saveTimer: number | null = null;
  private listeners = new Set<(table: string) => void>();
  constructor(public hooks: DemoHooks, autoload = true) {
    if (autoload) this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.__version === 1 && parsed.tables) { this.tables = parsed.tables; return; }
      }
    } catch { /* sem armazenamento: usa a semente */ }
    this.tables = this.hooks.seed();
    this.persist();
  }

  reset() {
    this.tables = this.hooks.seed();
    this.persist(true);
  }

  persist(now = false) {
    const write = () => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ __version: 1, savedAt: new Date().toISOString(), tables: this.tables })); } catch { /* cheio ou bloqueado */ }
    };
    if (now) { write(); return; }
    if (this.saveTimer) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(write, 250);
  }

  table(name: string) {
    if (!this.tables[name]) this.tables[name] = [];
    return this.tables[name];
  }

  onChange(listener: (table: string) => void) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  notify(table: string) { for (const listener of this.listeners) listener(table); }

  from(name: string) { return new Query(this, name); }

  // Escrita interna, usada pelos "gatilhos" da demo
  insertRaw(table: string, rows: Row[]) {
    const target = this.table(table);
    const added: Row[] = [];
    for (const row of rows) {
      const full = this.hooks.defaults(table, { ...row }, this);
      if (this.hooks.beforeInsert && !this.hooks.beforeInsert(table, full, this)) continue;
      target.push(full); added.push(full);
    }
    return added;
  }
}

type Mode = 'select' | 'insert' | 'update' | 'upsert' | 'delete';

class Query implements PromiseLike<Result> {
  private mode: Mode = 'select';
  private filters: Filter[] = [];
  private orders: { column: string; ascending: boolean; nullsFirst?: boolean }[] = [];
  private limitN: number | null = null;
  private rangeFrom: number | null = null;
  private rangeTo: number | null = null;
  private columns = '*';
  private returning = false;
  private singleMode: 'single' | 'maybe' | null = null;
  private countMode: string | null = null;
  private head = false;
  private payload: any = null;
  private conflict: string[] | null = null;
  private ignoreDuplicates = false;

  constructor(private db: DemoDb, private name: string) {}

  select(columns = '*', options?: { count?: string; head?: boolean }) {
    if (this.mode !== 'select') this.returning = true;
    this.columns = columns || '*';
    if (options?.count) this.countMode = options.count;
    if (options?.head) this.head = true;
    return this;
  }
  insert(values: any) { this.mode = 'insert'; this.payload = values; return this; }
  update(values: any) { this.mode = 'update'; this.payload = values; return this; }
  upsert(values: any, options?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.mode = 'upsert'; this.payload = values;
    if (options?.onConflict) this.conflict = options.onConflict.split(',').map((s) => s.trim());
    this.ignoreDuplicates = Boolean(options?.ignoreDuplicates);
    return this;
  }
  delete() { this.mode = 'delete'; return this; }

  eq(c: string, v: any) { this.filters.push(opFilter(c, 'eq', v)); return this; }
  neq(c: string, v: any) { this.filters.push(opFilter(c, 'neq', v)); return this; }
  gt(c: string, v: any) { this.filters.push(opFilter(c, 'gt', v)); return this; }
  gte(c: string, v: any) { this.filters.push(opFilter(c, 'gte', v)); return this; }
  lt(c: string, v: any) { this.filters.push(opFilter(c, 'lt', v)); return this; }
  lte(c: string, v: any) { this.filters.push(opFilter(c, 'lte', v)); return this; }
  is(c: string, v: any) { this.filters.push(opFilter(c, 'is', v)); return this; }
  in(c: string, v: any[]) { this.filters.push(opFilter(c, 'in', v)); return this; }
  like(c: string, v: string) { this.filters.push(opFilter(c, 'like', v)); return this; }
  ilike(c: string, v: string) { this.filters.push(opFilter(c, 'ilike', v)); return this; }
  contains(c: string, v: any) { this.filters.push(opFilter(c, 'contains', v)); return this; }
  match(obj: Row) { for (const [k, v] of Object.entries(obj)) this.eq(k, v); return this; }
  not(c: string, op: string, v: any) { const f = opFilter(c, op, v); this.filters.push((r) => !f(r)); return this; }
  filter(c: string, op: string, v: any) { this.filters.push(opFilter(c, op, typeof v === 'string' && op !== 'in' ? parseValue(v) : v)); return this; }
  or(expression: string) { this.filters.push(parseOr(expression)); return this; }
  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.orders.push({ column, ascending: options?.ascending !== false, nullsFirst: options?.nullsFirst });
    return this;
  }
  limit(n: number) { this.limitN = n; return this; }
  range(from: number, to: number) { this.rangeFrom = from; this.rangeTo = to; return this; }
  single() { this.singleMode = 'single'; return this; }
  maybeSingle() { this.singleMode = 'maybe'; return this; }
  abortSignal() { return this; }
  returns() { return this; }

  private project(rows: Row[]) {
    const cols = this.columns.split(',').map((c) => c.trim()).filter(Boolean);
    if (!cols.length || cols.includes('*')) return rows.map((r) => ({ ...r }));
    return rows.map((r) => {
      const out: Row = {};
      for (const c of cols) {
        const [source, alias] = c.includes(':') ? c.split(':').reverse() : [c, c];
        out[alias] = r[source] === undefined ? null : r[source];
      }
      return out;
    });
  }

  private matching(rows: Row[]) { return rows.filter((r) => this.filters.every((f) => f(r))); }

  private finish(rows: Row[]): Result {
    let list = rows;
    if (this.orders.length) {
      list = [...list].sort((a, b) => {
        for (const o of this.orders) {
          const av = a[o.column]; const bv = b[o.column];
          if (av == null || bv == null) {
            if (av == null && bv == null) continue;
            const nullsFirst = o.nullsFirst ?? !o.ascending;
            return (av == null ? -1 : 1) * (nullsFirst ? 1 : -1);
          }
          const r = cmp(av, bv);
          if (r !== 0) return o.ascending ? r : -r;
        }
        return 0;
      });
    }
    const count = this.countMode ? list.length : null;
    if (this.rangeFrom != null) list = list.slice(this.rangeFrom, (this.rangeTo ?? this.rangeFrom) + 1);
    if (this.limitN != null) list = list.slice(0, this.limitN);
    if (this.head) return { data: null, error: null, count, status: 200 };
    const data = this.project(list);
    if (this.singleMode === 'single') {
      if (data.length !== 1) return { data: null, error: { message: data.length ? 'Mais de uma linha encontrada' : 'Nenhuma linha encontrada' }, count };
      return { data: data[0], error: null, count, status: 200 };
    }
    if (this.singleMode === 'maybe') {
      if (data.length > 1) return { data: null, error: { message: 'Mais de uma linha encontrada' }, count };
      return { data: data[0] ?? null, error: null, count, status: 200 };
    }
    return { data, error: null, count, status: 200 };
  }

  private execute(): Result {
    const { db, name } = this;
    const table = db.table(name);
    try {
      if (this.mode === 'select') return this.finish(this.matching(table));

      if (this.mode === 'insert') {
        const values = Array.isArray(this.payload) ? this.payload : [this.payload];
        const pk = db.hooks.primaryKey(name);
        for (const v of values) {
          const full = db.hooks.defaults(name, { ...v }, db);
          if (pk.length && pk.every((k) => full[k] != null) && table.some((r) => pk.every((k) => String(r[k]) === String(full[k])))) {
            return { data: null, error: { message: `duplicate key value violates unique constraint (${name})` } };
          }
        }
        const added = db.insertRaw(name, values);
        db.hooks.afterWrite(name, 'insert', added, [], db);
        db.persist(); db.notify(name);
        return this.returning ? this.finishRows(added) : { data: null, error: null, status: 201 };
      }

      if (this.mode === 'upsert') {
        const values = Array.isArray(this.payload) ? this.payload : [this.payload];
        const keys = this.conflict || db.hooks.primaryKey(name);
        const touched: Row[] = []; const added: Row[] = []; const before: Row[] = [];
        for (const v of values) {
          const existing = keys.length ? table.find((r) => keys.every((k) => v[k] != null && String(r[k]) === String(v[k]))) : undefined;
          if (existing) {
            if (this.ignoreDuplicates) continue;
            before.push({ ...existing });
            Object.assign(existing, v);
            if ('updated_at' in existing && !('updated_at' in v)) existing.updated_at = new Date().toISOString();
            touched.push(existing);
          } else {
            added.push(...db.insertRaw(name, [v]));
          }
        }
        if (added.length) db.hooks.afterWrite(name, 'insert', added, [], db);
        if (touched.length) db.hooks.afterWrite(name, 'update', touched, before, db);
        db.persist(); db.notify(name);
        return this.returning ? this.finishRows([...touched, ...added]) : { data: null, error: null, status: 201 };
      }

      if (this.mode === 'update') {
        const rows = this.matching(table);
        const before = rows.map((r) => ({ ...r }));
        for (const r of rows) {
          Object.assign(r, this.payload);
          if ('updated_at' in r && !('updated_at' in (this.payload || {}))) r.updated_at = new Date().toISOString();
        }
        if (rows.length) db.hooks.afterWrite(name, 'update', rows, before, db);
        db.persist(); db.notify(name);
        return this.returning ? this.finishRows(rows) : { data: null, error: null, status: 204 };
      }

      if (this.mode === 'delete') {
        const rows = this.matching(table);
        const set = new Set(rows);
        db.tables[name] = table.filter((r) => !set.has(r));
        if (rows.length) db.hooks.afterWrite(name, 'delete', rows, rows, db);
        db.persist(); db.notify(name);
        return this.returning ? this.finishRows(rows) : { data: null, error: null, status: 204 };
      }
    } catch (error) {
      return { data: null, error: { message: error instanceof Error ? error.message : String(error) } };
    }
    return { data: null, error: null };
  }

  private finishRows(rows: Row[]) {
    const saved = this.filters; this.filters = [];
    const result = this.finish(rows);
    this.filters = saved;
    return result;
  }

  then<TResult1 = Result, TResult2 = never>(onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null): PromiseLike<TResult1 | TResult2> {
    // Um pequeno atraso imita a rede e mantém a ordem dos efeitos do React
    return new Promise<Result>((resolve) => window.setTimeout(() => resolve(this.execute()), 8)).then(onfulfilled, onrejected);
  }
}

export const helpers = { fold };
