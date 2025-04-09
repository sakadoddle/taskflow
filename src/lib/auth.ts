import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
// Removed: import jwt from 'jsonwebtoken';
import * as jose from 'jose'; // Use jose instead

const prisma = new PrismaClient();

// Ensure JWT_SECRET is set in your environment variables
const JWT_SECRET_STRING = process.env.JWT_SECRET;
if (!JWT_SECRET_STRING) {
  throw new Error('JWT_SECRET environment variable is not set');
}
// jose requires the secret to be a Uint8Array
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
const JWT_ALGORITHM = 'HS256'; // Define the algorithm

// Interface for the data stored IN the JWT payload
// Keep this minimal, only what's needed for verification/lookup
export interface JwtPayload {
  id: string;
  email: string;
  // Avoid putting sensitive or frequently changing data in the token itself
}

// Interface for the user data returned by functions like getUserFromToken
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
    .setExpirationTime('7d') // Set expiration time (e.g., 7 days)
    .sign(JWT_SECRET); // Sign the token with the secret
}

// Updated verifyToken function using jose
export async function verifyToken(token: string): Promise<JwtPayload | null> {
  if (!token) {
    return null;
  }
  try {
    // Verify the token and decode the payload
    const { payload } = await jose.jwtVerify(token, JWT_SECRET, {
      algorithms: [JWT_ALGORITHM],
    });

    // Type assertion is safe here because if verification passes,
    // the payload structure should match what we signed.
    return payload as JwtPayload;
  } catch (error) {
    // Log errors like expired token, invalid signature, etc.
    console.error('Token verification failed:', error);
    return null;
  }
}

// Updated getUserFromToken to be async and await verifyToken
export async function getUserFromToken(token: string): Promise<UserData | null> {
  const decodedPayload = await verifyToken(token); // Await the async verifyToken
  if (!decodedPayload) return null;

  // Fetch the full user data from the database using the ID from the token
  try {
    const user = await prisma.user.findUnique({
      where: { id: decodedPayload.id },
      select: { id: true, email: true, name: true } // Select only necessary fields
    });
    return user; // Returns the user object or null if not found
  } catch (dbError) {
    console.error("Database error fetching user:", dbError);
    return null;
  }
}