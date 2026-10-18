import type { KeyData } from './types';

/**
 * The key file links codes back to real students, so it can be locked with a passphrase.
 * Encryption: PBKDF2-SHA-256 (600,000 iterations) → AES-256-GCM, using the browser's Web Crypto API.
 */

const ITERATIONS = 600_000;

interface EncryptedKeyFile {
  app: 'aisa-data-anonymizer';
  type: 'key';
  version: 1;
  encrypted: true;
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number; salt: string };
  cipher: { name: 'AES-GCM'; iv: string };
  data: string;
}

export class PassphraseRequiredError extends Error {
  constructor() {
    super('This key file is locked. Enter the passphrase that was used when it was created.');
  }
}

export class WrongPassphraseError extends Error {
  constructor() {
    super('That passphrase did not unlock the key file. Check it and try again.');
  }
}

export class InvalidKeyFileError extends Error {
  constructor(
    readonly code: 'notJson' | 'notKeyFile',
    message: string,
  ) {
    super(message);
  }
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function serializeKey(key: KeyData, passphrase?: string): Promise<string> {
  if (!passphrase) return JSON.stringify(key, null, 2);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await deriveKey(passphrase, salt, ITERATIONS);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    new TextEncoder().encode(JSON.stringify(key)),
  );
  const file: EncryptedKeyFile = {
    app: 'aisa-data-anonymizer',
    type: 'key',
    version: 1,
    encrypted: true,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS, salt: toBase64(salt) },
    cipher: { name: 'AES-GCM', iv: toBase64(iv) },
    data: toBase64(new Uint8Array(ciphertext)),
  };
  return JSON.stringify(file, null, 2);
}

function assertKeyData(value: unknown): KeyData {
  const v = value as Partial<KeyData> | null;
  if (!v || v.app !== 'aisa-data-anonymizer' || typeof v.tokens !== 'object' || !Array.isArray(v.columns)) {
    throw new InvalidKeyFileError('notKeyFile', 'This is not a key file created by this tool.');
  }
  return v as KeyData;
}

export function isEncryptedKeyFile(text: string): boolean {
  try {
    return JSON.parse(text)?.encrypted === true;
  } catch {
    return false;
  }
}

export async function parseKeyFile(text: string, passphrase?: string): Promise<KeyData> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new InvalidKeyFileError('notJson', 'This file is not a key file (it is not valid JSON).');
  }
  const envelope = parsed as Partial<EncryptedKeyFile>;
  if (envelope?.encrypted !== true) return assertKeyData(parsed);

  if (envelope.app !== 'aisa-data-anonymizer' || !envelope.kdf || !envelope.cipher || !envelope.data) {
    throw new InvalidKeyFileError('notKeyFile', 'This is not a key file created by this tool.');
  }
  if (!passphrase) throw new PassphraseRequiredError();
  const aesKey = await deriveKey(passphrase, fromBase64(envelope.kdf.salt), envelope.kdf.iterations);
  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(envelope.cipher.iv) },
      aesKey,
      fromBase64(envelope.data),
    );
  } catch {
    throw new WrongPassphraseError();
  }
  return assertKeyData(JSON.parse(new TextDecoder().decode(plaintext)));
}
