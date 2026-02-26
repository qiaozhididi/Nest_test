import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyPassword, generateToken } from '@/lib/auth';
import { User } from '@/types/user';
import { ErrorMessages } from '@/lib/errorMessages';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // 验证输入
    if (!username || !password) {
      return NextResponse.json(
        { error: ErrorMessages.LOGIN_FIELDS_REQUIRED },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection<User>('users');

    // 查找用户（支持用户名或邮箱登录）
    const user = await usersCollection.findOne({
      $or: [{ username }, { email: username }]
    });

    if (!user) {
      return NextResponse.json(
        { error: ErrorMessages.USER_NOT_FOUND },
        { status: 401 }
      );
    }

    // 验证密码
    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      console.log('密码验证失败:', { username, passwordLength: password.length });
      return NextResponse.json(
        { error: ErrorMessages.WRONG_PASSWORD },
        { status: 401 }
      );
    }

    // 生成 JWT token
    const token = generateToken(user._id!.toString());

    return NextResponse.json(
      {
        message: '登录成功',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('登录错误:', error);
    return NextResponse.json(
      { error: ErrorMessages.SERVER_ERROR },
      { status: 500 }
    );
  }
}