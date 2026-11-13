export interface IntentKey {
  intent: string
  key: string
}

/**
 * Idempotency-Key policy (AGENTS.md §4.6 and N16):
 * - same intent  -> reuse the same key, so a timeout retry resumes the order;
 * - changed form -> different intent -> a new key.
 *
 * The generator is injectable so unit tests do not depend on Web Crypto.
 */
export function resolveIdempotencyKey(
  current: IntentKey | null,
  intent: string,
  generate: () => string = () => crypto.randomUUID()
): IntentKey {
  if (current && current.intent === intent) return current
  return { intent, key: generate() }
}
