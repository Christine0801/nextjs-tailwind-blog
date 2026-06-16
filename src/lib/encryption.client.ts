import type { EncryptedData } from 'types/EncryptedData'

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * 浏览器端 SHA-256 哈希（用于密码预验证）
 */
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * 浏览器端解密 MDX 内容
 * 先验证 SHA-256 哈希，再 PBKDF2 派生密钥，最后 AES-GCM 解密
 */
export async function decryptMDXSource(
  encrypted: EncryptedData,
  password: string
): Promise<string> {
  const passwordHash = await sha256(password)
  if (passwordHash !== encrypted.hash) {
    throw new Error('INCORRECT_PASSWORD')
  }

  const salt = base64ToUint8Array(encrypted.salt)
  const iv = base64ToUint8Array(encrypted.iv)
  const ciphertext = base64ToUint8Array(encrypted.ciphertext)
  const authTag = base64ToUint8Array(encrypted.authTag)

  // Web Crypto API 要求 authTag 附加在 ciphertext 末尾
  const combined = new Uint8Array(ciphertext.length + authTag.length)
  combined.set(ciphertext)
  combined.set(authTag, ciphertext.length)

  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )

  try {
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, combined)
    return new TextDecoder().decode(decrypted)
  } catch {
    throw new Error('DECRYPT_FAILED')
  }
}
