import nacl from 'tweetnacl';
import { decodeUTF8, encodeUTF8 } from 'tweetnacl-util';

function b64ToBytes(b64){
  if (typeof Buffer !== 'undefined') return Buffer.from(b64,'base64');
  const bin = atob(b64); const arr = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i); return arr;
}
function bytesToB64(arr){
  if (typeof Buffer !== 'undefined') return Buffer.from(arr).toString('base64');
  let s=''; for (const c of arr) s+=String.fromCharCode(c); return btoa(s);
}

const key = (() => {
  const raw = process.env.MASTER_ENC_KEY; // 32 bytes base64
  const b = b64ToBytes(raw);
  if(b.length !== 32) throw new Error('MASTER_ENC_KEY must be 32 bytes (base64)');
  return b;
})();

export function seal(str){
  const nonce = nacl.randomBytes(24);
  const msg = decodeUTF8(str);
  const box = nacl.secretbox(msg, nonce, key);
  const both = new Uint8Array(nonce.length + box.length);
  both.set(nonce,0); both.set(box,24);
  return bytesToB64(both);
}

export function open(b64){
  const raw = b64ToBytes(b64);
  const nonce = raw.slice(0,24);
  const box = raw.slice(24);
  const msg = nacl.secretbox.open(box, nonce, key);
  if(!msg) throw new Error('decrypt failed');
  return encodeUTF8(msg);
}
