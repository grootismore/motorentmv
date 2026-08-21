#!/usr/bin/env node
// Hand-rolled Supabase-shaped `Database` type generator, used because
// `supabase gen types typescript --db-url` also shells out to Docker
// internally on this CLI version, which isn't available in this sandbox
// (see supabase/local-dev/README.md). Reads the JSON emitted by
// introspect.sql on stdin, writes a TypeScript file matching the shape
// `@supabase/supabase-js` expects (Database.public.Tables/Views/Enums),
// good enough for real client typing even though it isn't byte-identical
// to the CLI's own output (no Relationships/Functions introspection).
import { readFileSync, writeFileSync } from 'node:fs';

const schema = JSON.parse(readFileSync(0, 'utf8'));

const PG_TO_TS = {
  uuid: 'string',
  text: 'string',
  varchar: 'string',
  bpchar: 'string',
  date: 'string',
  timestamp: 'string',
  timestamptz: 'string',
  bool: 'boolean',
  int2: 'number',
  int4: 'number',
  int8: 'number',
  float4: 'number',
  float8: 'number',
  numeric: 'number',
  jsonb: 'Json',
  json: 'Json',
};

function scalarTsType(udtName, enums) {
  if (enums[udtName]) return `Database['public']['Enums']['${udtName}']`;
  return PG_TO_TS[udtName] ?? 'unknown';
}

function tsType(col, enums) {
  const base = col.is_array
    ? `${scalarTsType(col.element_udt_name, enums)}[]`
    : scalarTsType(col.udt_name, enums);
  return col.nullable ? `${base} | null` : base;
}

function buildRow(table, enums) {
  return table.columns.map((c) => `          ${c.name}: ${tsType(c, enums)}`).join('\n');
}

function buildInsert(table, enums) {
  return table.columns
    .map((c) => {
      const optional = c.nullable || c.has_default || c.is_generated;
      return `          ${c.name}${optional ? '?' : ''}: ${tsType(c, enums)}`;
    })
    .join('\n');
}

function buildUpdate(table, enums) {
  return table.columns.map((c) => `          ${c.name}?: ${tsType(c, enums)}`).join('\n');
}

const enums = schema.enums;
const tables = schema.tables.filter((t) => t.kind === 'table');
const views = schema.tables.filter((t) => t.kind === 'view');

let out = `// AUTO-GENERATED. Do not edit by hand.
// Regenerate with: bash supabase/local-dev/generate-types.sh
// Source: introspection of the local migrated schema (supabase/migrations),
// not the Supabase CLI (which requires Docker for --db-url on this
// version) — see supabase/local-dev/README.md.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
`;

for (const table of tables) {
  out += `      ${table.name}: {
        Row: {
${buildRow(table, enums)}
        }
        Insert: {
${buildInsert(table, enums)}
        }
        Update: {
${buildUpdate(table, enums)}
        }
      }
`;
}

out += `    }
    Views: {
`;

for (const view of views) {
  out += `      ${view.name}: {
        Row: {
${buildRow(view, enums)}
        }
      }
`;
}

out += `    }
    Functions: {
      transition_booking_status: {
        Args: {
          p_booking_id: string
          p_new_status: Database['public']['Enums']['booking_status']
          p_quote_snapshot?: Json | null
          p_policy_snapshot?: Json | null
          p_total_amount_laari?: number | null
          p_note?: string | null
        }
        Returns: Database['public']['Tables']['bookings']['Row']
      }
    }
    Enums: {
`;

for (const [name, labels] of Object.entries(enums)) {
  out += `      ${name}: ${labels.map((l) => `'${l}'`).join(' | ')}\n`;
}

out += `    }
  }
}
`;

writeFileSync(1, out);
