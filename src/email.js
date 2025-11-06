import nodemailer from 'nodemailer';
import { open } from './crypto.js';

export function smtpFromConnection(conn){
  const c = conn.config_json;
  return nodemailer.createTransport({
    host: c.host,
    port: Number(c.port||587),
    secure: Number(c.port)===465,
    auth: { user: c.user, pass: open(c.pass_encrypted) }
  });
}
