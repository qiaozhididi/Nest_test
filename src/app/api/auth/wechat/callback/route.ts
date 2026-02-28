import { NextRequest, NextResponse } from 'next/server';
import { wechatConfig } from '@/lib/wechatConfig';
import { connectToDatabase } from '@/lib/mongodb';
import { generateToken } from '@/lib/auth';
import { User } from '@/types/user';

/**
 * 微信扫码登录回调处理接口
 * 
 * 流程：
 * 1. 微信授权后重定向到此接口，携带 code 和 state
 * 2. 使用 code 换取 access_token 和 openid
 * 3. 使用 access_token 获取微信用户信息
 * 4. 在数据库中查找或创建用户
 * 5. 生成系统 JWT Token 并跳转回首页
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // 1. 验证授权码和状态
  if (!code) {
    return NextResponse.json({ error: '微信授权失败：未提供授权码' }, { status: 400 });
  }

  // 简单的 CSRF 防护验证
  if (state !== wechatConfig.state) {
    return NextResponse.json({ error: '授权状态异常，请重试' }, { status: 403 });
  }

  try {
    // 2. 使用 code 换取 access_token (真实场景需向微信服务器请求)
    // 注意：以下逻辑在没有真实 AppID 的情况下会失败，因此此处包含模拟逻辑
    
    let wechatUser;

    if (wechatConfig.appId === 'YOUR_WECHAT_APP_ID') {
      // 模拟测试用户 (当没有真实配置时)
      console.log('检测到未配置真实微信 AppID，进入模拟登录模式');
      wechatUser = {
        openid: 'MOCK_OPENID_' + Math.random().toString(36).substr(2, 9),
        nickname: '微信用户_' + Math.random().toString(36).substr(2, 4),
        headimgurl: 'https://placeholder.com/avatar.png',
        unionid: 'MOCK_UNIONID_' + Math.random().toString(36).substr(2, 9)
      };
    } else {
      // 真实请求微信服务器获取 access_token
      const tokenResponse = await fetch(`${wechatConfig.tokenEndpoint}?appid=${wechatConfig.appId}&secret=${wechatConfig.appSecret}&code=${code}&grant_type=authorization_code`);
      const tokenData = await tokenResponse.json();

      if (tokenData.errcode) {
        throw new Error(`微信 Token 获取失败: ${tokenData.errmsg}`);
      }

      const { access_token, openid } = tokenData;

      // 3. 获取微信用户信息
      const userResponse = await fetch(`${wechatConfig.userInfoEndpoint}?access_token=${access_token}&openid=${openid}&lang=zh_CN`);
      wechatUser = await userResponse.json();

      if (wechatUser.errcode) {
        throw new Error(`获取微信用户信息失败: ${wechatUser.errmsg}`);
      }
    }

    // 4. 在数据库中同步用户信息
    const { db } = await connectToDatabase();
    const usersCollection = db.collection<User>('users');

    // 根据 openid (或 unionid) 查找用户
    let user = await usersCollection.findOne({ 
      $or: [
        { wechatOpenId: wechatUser.openid },
        { wechatUnionId: wechatUser.unionid }
      ]
    });

    if (!user) {
      // 如果用户不存在，则创建新用户
      const newUser: any = {
        username: wechatUser.nickname,
        email: `${wechatUser.openid.toLowerCase()}@wechat.auth`, // 虚拟邮箱
        password: 'WECHAT_AUTH_USER', // 微信登录用户不使用普通密码
        wechatOpenId: wechatUser.openid,
        wechatUnionId: wechatUser.unionid,
        avatar: wechatUser.headimgurl,
        createdAt: new Date()
      };
      
      const result = await usersCollection.insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
    }

    if (!user) {
      throw new Error('无法创建用户');
    }

    // 5. 生成系统 JWT Token
    const token = generateToken(user._id!.toString());

    // 6. 重定向回前端页面，并携带 token 和用户信息 (通过 URL 参数或 Cookie)
    // 为了方便演示，我们重定向回首页并通过 query 参数传递，前端拦截后存入 localStorage
    const redirectUrl = new URL('/', request.url);
    redirectUrl.searchParams.set('token', token);
    redirectUrl.searchParams.set('wechat_login', 'success');
    redirectUrl.searchParams.set('user_data', JSON.stringify({
      id: user._id,
      username: user.username,
      email: user.email
    }));

    return NextResponse.redirect(redirectUrl);

  } catch (error: any) {
    console.error('微信登录处理错误:', error);
    return NextResponse.json({ error: '微信登录处理失败', details: error.message }, { status: 500 });
  }
}
