export type EncryptedData = {
  ciphertext: string // base64, AES-256-GCM 加密内容
  iv: string // base64, 12 字节初始化向量
  salt: string // base64, 16 字节 PBKDF2 盐
  authTag: string // base64, 16 字节 GCM 认证标签
  hash: string // hex, SHA-256(password), 客户端快速验证
}
