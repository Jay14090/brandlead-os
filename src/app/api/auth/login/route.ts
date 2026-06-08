import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/schemas';
import { createSession, setSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid credentials format' },
        { status: 400 }
      );
    }

    const { username, password } = parsed.data;

    // Check if we need to auto-seed the admin user
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      if (username === 'admin' && password === 'adminjay') {
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.create({
          data: {
            username: 'admin',
            password: hashedPassword,
            role: 'admin',
            isActive: true
          }
        });
      } else {
        return NextResponse.json(
          { error: 'Initial setup requires admin/adminjay' },
          { status: 401 }
        );
      }
    }

    // Authenticate
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Your account has been revoked' },
        { status: 403 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const token = await createSession(user.username, user.id, user.role);
    await setSessionCookie(token);

    return NextResponse.json({ success: true, role: user.role });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
