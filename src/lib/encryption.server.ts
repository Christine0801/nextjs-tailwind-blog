import { randomBytes, createCipheriv, pbkdf2Sync, createHash } from 'crypto'
import type { EncryptedData } from 'types/EncryptedData'

/**
 * 构建时加密 MDX 编译结果（Node.js 端，在 getFileBySlug 中调用）
 */
export function encryptMDXSource(code: string, password: string): EncryptedData {
  const salt = randomBytes(16)
  const iv = randomBytes(12)
  const key = pbkdf2Sync(password, salt, 100000, 32, 'sha256')
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(code, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  const hash = createHash('sha256').update(password).digest('hex')

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    salt: salt.toString('base64'),
    authTag: authTag.toString('base64'),
    hash,
  }
}
