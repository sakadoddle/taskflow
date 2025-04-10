import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
// Removed: import jwt from 'jsonwebtoken';
import * as jose from 'jose'; // Use jose instead

const prisma = new PrismaClient();

const JWT_SECRET_STRING = process.env.JWT_SECRET;
if (!JWT_SECRET_STRING) {
  throw new Error('JWT_SECRET environment variable is not set');
}
// jose requires the secret to be a Uint8Array
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
const JWT_ALGORITHM = 'HS256';

export interface JwtPayload {
  id: string;
  email: string;
}

export interface UserData {
  id: string;
  email: string;
  name?: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Updated generateToken function using jose
export async function generateToken(user: Pick<UserData, 'id' | 'email'>): Promise<string> {
  const payload: JwtPayload = {
    id: user.id,
    email: user.email,
  };

  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime('7d') 
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  if (!token) {
    return null;
  }
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET, {
      algorithms: [JWT_ALGORITHM],
    });

    return payload as JwtPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export async function getUserFromToken(token: string): Promise<UserData | null> {
  const decodedPayload = await verifyToken(token); // Await the async verifyToken
  if (!decodedPayload) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: decodedPayload.id },
      select: { id: true, email: true, name: true } 
    });
    return user; 
  } catch (dbError) {
    console.error("Database error fetching user:", dbError);
    return null;
  }
}