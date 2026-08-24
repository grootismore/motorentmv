/**
 * aes-js ships no TypeScript declarations and no @types/aes-js package
 * exists -- this covers only the subset of its API this project actually
 * uses (src/lib/secureSessionStorage.ts), not the full library surface.
 */
declare module 'aes-js' {
  export class Counter {
    constructor(initialValue: number | Uint8Array);
  }

  namespace ModeOfOperation {
    class ctr {
      constructor(key: Uint8Array, counter: Counter);
      encrypt(bytes: Uint8Array): Uint8Array;
      decrypt(bytes: Uint8Array): Uint8Array;
    }
  }

  export { ModeOfOperation };

  export const utils: {
    utf8: {
      toBytes(text: string): Uint8Array;
      fromBytes(bytes: Uint8Array): string;
    };
    hex: {
      toBytes(hex: string): Uint8Array;
      fromBytes(bytes: Uint8Array): string;
    };
  };
}
