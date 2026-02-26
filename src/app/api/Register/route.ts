import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { hashPassword } from '@/lib/auth';
import { User } from '@/types/user';
import { ErrorMessages } from '@/lib/errorMessages';

export async function POST(request: NextRequest) {
  try {
    const { username, email, password } = await request.json();

    // 验证输入
    if (!username || !email || !password) {
      return NextResponse.json(
        { error: ErrorMessages.REGISTER_FIELDS_REQUIRED },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: ErrorMessages.PASSWORD_TOO_SHORT },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection<User>('users');

    // 检查用户是否已存在
    const existingUser = await usersCollection.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return NextResponse.json(
        { error: ErrorMessages.USER_ALREADY_EXISTS },
        { status: 409 }
      );
    }

    // 加密密码
    const hashedPassword = await hashPassword(password);

    // 创建新用户
    const newUser: User = {
      username,
      email,
      password: hashedPassword,
      createdAt: new Date()
    };

    const result = await usersCollection.insertOne(newUser);

    return NextResponse.json(
      {
        message: '用户注册成功',
        userId: result.insertedId
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('注册错误:', error);
    return NextResponse.json(
      { error: ErrorMessages.SERVER_ERROR },
      { status: 500 }
    );
  }
}