import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyPassword, generateToken } from '@/lib/auth'; // generateToken is now async

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    // Verify user exists and password is correct
    if (!user || !(await verifyPassword(password, user.password))) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const token = await generateToken({
      id: user.id,
      email: user.email,
    });

    const responseBody = {
      message: 'Login successful',
      user: { 
        id: user.id,
        email: user.email,
        name: user.name,
      }
    };

    const response = NextResponse.json(responseBody, { status: 200 });

    // Set the JWT as an HTTP-Only cookie
    response.cookies.set({
      name: 'auth-token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', 
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/', 
    });

    return response;

  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { error: 'An internal server error occurred during login.' },
      { status: 500 }
    );
  }
}