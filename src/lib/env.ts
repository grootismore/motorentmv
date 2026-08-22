import { z } from 'zod';

/**
 * Every client-visible env var must be prefixed `EXPO_PUBLIC_` (Expo's convention
 * for values safe to bundle into the app) and validated here. Never read
 * `process.env.EXPO_PUBLIC_*` anywhere else in the app — import `env` instead,
 * so an invalid or missing value fails fast at startup rather than deep in a screen.
 *
 * Secrets (service-role keys, private API keys) never belong in `EXPO_PUBLIC_*`
 * vars, app.config.ts, or EAS Update payloads — they stay server-side only.
 */
const envSchema = z.object({
  EXPO_PUBLIC_APP_ENV: z.enum(['development', 'preview', 'production']).default('development'),
  // Populated once the Supabase project exists (Phase 1). Left optional so
  // Phase 0 can boot without a backend configured yet.
  EXPO_PUBLIC_SUPABASE_URL: z.url().optional(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  /** Visual-review only: when 'true', Explore's discovery section and
   * Search's results both fall back to clearly-labeled, non-bookable demo
   * cards if the real search returns no vehicles, or if
   * EXPO_PUBLIC_SUPABASE_URL/EXPO_PUBLIC_SUPABASE_ANON_KEY aren't set at
   * all (e.g. reviewing this build without a backend configured), so
   * either screen can be reviewed with realistic content. Never affects
   * any other screen or query, never substitutes for real data when real
   * data exists, and defaults off — production builds never set this. */
  EXPO_PUBLIC_DEMO_MODE: z.enum(['true', 'false']).default('false'),
});

export type Env = z.infer<typeof envSchema>;

/** Pure and exported for unit testing — see env.test.ts. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const parsed = envSchema.safeParse({
    EXPO_PUBLIC_APP_ENV: source.EXPO_PUBLIC_APP_ENV,
    EXPO_PUBLIC_SUPABASE_URL: source.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: source.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_DEMO_MODE: source.EXPO_PUBLIC_DEMO_MODE,
  });

  if (!parsed.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(parsed.error)}`);
  }

  return parsed.data;
}

export const env = parseEnv(process.env);

export const isDemoMode = env.EXPO_PUBLIC_DEMO_MODE === 'true';
