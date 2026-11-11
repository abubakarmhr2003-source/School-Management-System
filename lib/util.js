import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

// 8 character code a school admin shares with staff so they can join the school.
export const schoolCode = () => randomBytes(4).toString('hex').toUpperCase();

export const hashPassword = pw => bcrypt.hash(pw, 10);
export const checkPassword = (pw, hash) => bcrypt.compare(pw, hash);

// A real hash used to keep login timing the same whether or not the email exists.
let dummy;
export const dummyHash = async () => (dummy ??= await bcrypt.hash('not-a-real-password', 10));
