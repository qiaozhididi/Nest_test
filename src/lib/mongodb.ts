import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI!;
const DB_NAME = process.env.DB_NAME!

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  if (!MONGODB_URI) {
    throw new Error('请检查环境变量 MONGODB_URI 是否配置正确');
  }

  try {
    console.log('尝试连接 MongoDB:', MONGODB_URI.replace(/:\/\/[^:]+:[^@]+@/, '://****:****@'));
    
    const client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000, // 增加到30秒
      connectTimeoutMS: 30000, // 30秒连接超时
      socketTimeoutMS: 30000, // 30秒socket超时
      maxPoolSize: 10, // 最大连接池大小
      retryWrites: true, // 重试写操作
      retryReads: true, // 重试读操作
      // authSource: 'admin', // 认证数据库（先注释掉试试）
      directConnection: true, // 直接连接，不使用集群发现
    });
    
    await client.connect();
    console.log('MongoDB 连接成功');
    
    const db = client.db(DB_NAME);

    cachedClient = client;
    cachedDb = db;

    return { client, db };
  } catch (error) {
    console.error('MongoDB 连接失败:', error);
    throw new Error(`数据库连接失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}