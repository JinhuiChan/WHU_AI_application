import assert from "node:assert/strict";
import { decryptField, encryptField, maskTail } from "../lib/crypto";

process.env.FIELD_ENCRYPTION_KEY ??= "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f";

const plain = "中文敏感信息：身份证号、银行卡号。" + "长文本内容ABC123。".repeat(200);
const firstCipher = encryptField(plain);
assert.equal(decryptField(firstCipher), plain);
console.log("[PASS] 用例一：中文与长文本加密后解密完全一致");

const secondCipher = encryptField(plain);
assert.notEqual(firstCipher, secondCipher);
assert.equal(decryptField(secondCipher), plain);
console.log("[PASS] 用例二：同一明文两次加密密文不同（IV 随机）");

const parts = firstCipher.split(":");
const data = parts[3];
assert.ok(data);
const middle = Math.floor(data.length / 2);
const replacement = data[middle] === "A" ? "B" : "A";
parts[3] = `${data.slice(0, middle)}${replacement}${data.slice(middle + 1)}`;
assert.throws(() => decryptField(parts.join(":")), /密文解密失败/);
console.log("[PASS] 用例三：篡改密文中间一段后解密按预期抛错");

// 使用明显无效的占位号码，避免仓库中出现形似真实银行卡的字符串
assert.equal(maskTail("1111222233334444"), "************4444");
console.log("[PASS] 用例四：maskTail 输出 ************4444");

console.log("全部 4 项加密自测通过。");
