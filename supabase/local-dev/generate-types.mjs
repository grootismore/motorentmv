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

function buildRelationships(table) {
  const rels = table.relationships ?? [];
  if (rels.length === 0) return '        Relationships: []';
  const entries = rels
    .map(
      (r) => `          {
            foreignKeyName: '${r.foreignKeyName}'
            columns: [${r.columns.map((c) => `'${c}'`).join(', ')}]
            isOneToOne: false
            referencedRelation: '${r.referencedRelation}'
            referencedColumns: [${r.referencedColumns.map((c) => `'${c}'`).join(', ')}]
          }`,
    )
    .join(',\n');
  return `        Relationships: [\n${entries}\n        ]`;
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
${buildRelationships(table)}
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
${buildRelationships(view)}
      }
`;
}

out += `    }
    Functions: {
      transition_booking_status: {
        Args: {
          p_booking_id: string
          p_new_status: Database['public']['Enums']['booking_status']
          p_note?: string | null
        }
        Returns: Database['public']['Tables']['bookings']['Row']
      }
      compute_booking_quote: {
        Args: {
          p_vehicle_id: string
          p_starts_at: string
          p_ends_at: string
        }
        Returns: Json
      }
      compute_booking_policy_snapshot: {
        Args: {
          p_organization_id: string
        }
        Returns: Json
      }
      request_booking: {
        Args: {
          p_booking_id?: string | null
          p_organization_id?: string | null
          p_vehicle_id?: string | null
          p_customer_id?: string | null
          p_starts_at?: string | null
          p_ends_at?: string | null
          p_notes?: string | null
        }
        Returns: Database['public']['Tables']['bookings']['Row']
      }
      accept_booking: {
        Args: {
          p_booking_id: string
        }
        Returns: Database['public']['Tables']['bookings']['Row']
      }
      decline_booking: {
        Args: {
          p_booking_id: string
          p_reason?: string | null
        }
        Returns: Database['public']['Tables']['bookings']['Row']
      }
      mark_booking_needs_info: {
        Args: {
          p_booking_id: string
          p_note?: string | null
        }
        Returns: Database['public']['Tables']['bookings']['Row']
      }
      ready_booking: {
        Args: {
          p_booking_id: string
        }
        Returns: Database['public']['Tables']['bookings']['Row']
      }
      activate_booking: {
        Args: {
          p_booking_id: string
        }
        Returns: Database['public']['Tables']['bookings']['Row']
      }
      complete_booking: {
        Args: {
          p_booking_id: string
        }
        Returns: Database['public']['Tables']['bookings']['Row']
      }
      cancel_booking: {
        Args: {
          p_booking_id: string
          p_reason?: string | null
        }
        Returns: Database['public']['Tables']['bookings']['Row']
      }
      search_available_vehicles: {
        Args: {
          p_starts_at: string
          p_ends_at: string
          p_location?: string | null
          p_category?: string | null
          p_transmission?: Database['public']['Enums']['transmission_type'] | null
          p_max_daily_rate_laari?: number | null
        }
        Returns: {
          vehicle_id: string
          organization_id: string
          organization_name: string
          registration_number: string
          make: string | null
          model: string | null
          year: number | null
          category: string | null
          transmission: Database['public']['Enums']['transmission_type'] | null
          color: string | null
          location: string | null
          deposit_amount_laari: number
          daily_rate_laari: number | null
          hourly_rate_laari: number | null
        }[]
      }
      get_vehicle_listing: {
        Args: {
          p_vehicle_id: string
        }
        Returns: {
          vehicle_id: string
          organization_id: string
          organization_name: string
          registration_number: string
          make: string | null
          model: string | null
          year: number | null
          category: string | null
          transmission: Database['public']['Enums']['transmission_type'] | null
          color: string | null
          location: string | null
          included_accessories: string[]
          deposit_amount_laari: number
          daily_rate_laari: number | null
          hourly_rate_laari: number | null
        }[]
      }
      get_listing_quote: {
        Args: {
          p_vehicle_id: string
          p_starts_at: string
          p_ends_at: string
        }
        Returns: Json
      }
      is_vehicle_bookable: {
        Args: {
          p_vehicle_id: string
          p_starts_at: string
          p_ends_at: string
        }
        Returns: boolean
      }
      invite_org_member_by_email: {
        Args: {
          p_organization_id: string
          p_email: string
          p_role: Database['public']['Enums']['org_role']
        }
        Returns: Database['public']['Tables']['organization_members']['Row']
      }
      set_vehicle_rate: {
        Args: {
          p_vehicle_id: string
          p_rate_type: Database['public']['Enums']['rate_type']
          p_amount_laari: number | null
        }
        Returns: Database['public']['Tables']['vehicle_rates']['Row'] | null
      }
      acknowledge_inspection: {
        Args: {
          p_inspection_id: string
        }
        Returns: Database['public']['Tables']['inspections']['Row']
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
