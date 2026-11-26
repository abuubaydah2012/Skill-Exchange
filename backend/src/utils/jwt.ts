import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'learner' | 'teacher' | 'admin';
}

export const generateToken = (userId: Types.ObjectId | string, email: string, role: string): string => {
  const secret = process.env.JWT_SECRET || 'fallback_development_secret_replace_in_prod';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(
    {
      userId: userId.toString(),
      email,
      role,
    },
    secret,
    { expiresIn: expiresIn as any }
  );
};

export const verifyToken = (token: string): TokenPayload => {
  const secret = process.env.JWT_SECRET || 'fallback_development_secret_replace_in_prod';
  return jwt.verify(token, secret) as TokenPayload;
};
