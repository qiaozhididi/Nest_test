import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    console.log('开始测试数据库连接...');
    const { db } = await connectToDatabase();
    
    // 简单的ping测试
    await db.admin().ping();
    console.log('数据库ping测试成功');
    
    return NextResponse.json(
      { 
        message: '数据库连接成功',
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('数据库连接测试失败:', error);
    return NextResponse.json(
      { 
        error: '数据库连接失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}