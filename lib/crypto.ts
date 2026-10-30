import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

let cachedKey: Buffer | undefined;

function encryptionKey(): Buffer {
  if (cachedKey) return cachedKey;
  const value = process.env.FIELD_ENCRYPTION_KEY?.trim();
  if (!value) {
    throw new Error("未配置 FIELD_ENCRYPTION_KEY，请配置 64 位 hex 或 base64 编码的 32 字节密钥");
  }

  if (/^[0-9a-fA-F]{64}$/.test(value)) {
    cachedKey = Buffer.from(value, "hex");
    return cachedKey;
  }

  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    throw new Error("FIELD_ENCRYPTION_KEY 格式不正确，请配置 64 位 hex 或 base64 编码的 32 字节密钥");
  }
  const key = Buffer.from(value, "base64");
  if (key.length !== 32 || key.toString("base64").replace(/=+$/, "") !== value.replace(/=+$/, "")) {
    throw new Error("FIELD_ENCRYPTION_KEY 必须解码为 32 字节，请检查 hex 或 base64 配置");
  }
  cachedKey = key;
  return cachedKey;
}

function decodeCipherPart(value: string): Buffer {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw new Error("密文编码不正确");
  const decoded = Buffer.from(value, "base64");
  if (decoded.toString("base64").replace(/=+$/, "") !== value.replace(/=+$/, "")) {
    throw new Error("密文编码不正确");
  }
  return decoded;
}

export function encryptField(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${data.toString("base64")}`;
}

export function decryptField(cipher: string): string {
  const key = encryptionKey();
  try {
    const parts = cipher.split(":");
    if (parts.length !== 4 || parts[0] !== "v1") throw new Error("密文版本或格式不正确");
    const iv = decodeCipherPart(parts[1] ?? "");
    const tag = decodeCipherPart(parts[2] ?? "");
    const data = decodeCipherPart(parts[3] ?? "");
    if (iv.length !== 12 || tag.length !== 16) throw new Error("密文参数不正确");
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("密文解密失败，密文可能已篡改或密钥不匹配");
  }
}

export function maskTail(value: string, keep = 4): string {
  const normalizedKeep = Math.max(0, Math.trunc(keep));
  // 长度不足时整串遮蔽，绝不原样返回（否则短值等于没脱敏）
  if (normalizedKeep === 0 || value.length <= normalizedKeep) {
    return "*".repeat(value.length);
  }
  return `${"*".repeat(value.length - normalizedKeep)}${value.slice(-normalizedKeep)}`;
}
