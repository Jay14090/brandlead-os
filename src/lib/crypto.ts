import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT = 'brandlead-os-salt';

function getKey(): Buffer {
  const secret = process.env.APP_ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('APP_ENCRYPTION_SECRET is not set in environment variables');
  }
  return pbkdf2Sync(secret, SALT, 100000, 32, 'sha256');
}

export function encrypt(plaintext: string): string {
  if (!plaintext) return '';
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext (all base64)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

export function decrypt(encrypted: string): string {
  if (!encrypted) return '';
  const key = getKey();

  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(parts[0], 'base64');
  const authTag = Buffer.from(parts[1], 'base64');
  const ciphertext = parts[2];

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export function maskKey(key: string): string {
  if (!key || key.length < 8) return key ? '••••••••' : '';
  return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
}
