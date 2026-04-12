/**
 * Cryptographically secure random helpers.
 *
 * Used in place of Math.random for display shuffling and id generation
 * to satisfy SonarCloud's weak-cryptography hotspot rule (S2245).
 * Math.random is non-deterministic but predictable, so even non-security
 * usages get flagged. crypto.getRandomValues silences the rule and is
 * available in both browser and Node 20+.
 */

export function secureRandomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) return 0;
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % maxExclusive;
}

export function secureRandomFloat(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 0x1_0000_0000;
}

export function secureShuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    // eslint-disable-next-line security/detect-object-injection -- numeric index from secureRandomInt
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
