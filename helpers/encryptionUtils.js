import CryptoJS from "crypto-js";

// Encryption function
function encrypt(data) {
  const jsonData = JSON.stringify(data);
  const ciphertext = CryptoJS.AES.encrypt(
    jsonData,
    process.env.ENCRYPTION_KEY
  ).toString();
  return ciphertext;
}

// Decryption function
function decrypt(ciphertext) {
  const bytes = CryptoJS.AES.decrypt(ciphertext, process.env.ENCRYPTION_KEY);
  const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
  const jsonData = JSON.parse(decryptedData);
  return jsonData;
}

export { encrypt, decrypt };
