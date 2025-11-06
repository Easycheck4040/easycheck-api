// src/crypto.js
import nacl from 'tweetnacl';

// Helpers base64 <-> bytes (Node)
function b64ToBytes(b64){ return Buffer.from(b64, 'base64'); }
function bytesToB64(arr){ return Buffer.from(arr).toString('base64'); }

// Text encoder/decoder nativos (substitui tweetnacl-util)
const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Carrega chave mestra (32 bytes em base64)
const key = (() => {
  const raw = process.env.MASTER_ENC_KEY || '';
  const b = b64ToBytes(raw);
  if (b.length !== 32) throw new Error('MASTER_ENC_KEY must be 32 bytes (base64)');
  return b; // Uint8Array compatível com tweetnacl
})();

// Cifra (secretbox)
export function seal(str){
  const nonce = nacl.randomBytes(24);
  const msg = encoder.encode(str);
  const box = nacl.secretbox(msg, nonce, key);
  const both = new Uint8Array(nonce.length + box.length);
  both.set(nonce, 0);
  both.set(box, 24);
  return bytesToB64(both);
}

// Decifra
export function open(b64){
  const raw = b64ToBytes(b64);
  const nonce = raw.slice(0,24);
  const box = raw.slice(24);
  const msg = nacl.secretbox.open(box, nonce, key);
  if(!msg) throw new Error('decrypt failed');
  return decoder.decode(msg);
}
