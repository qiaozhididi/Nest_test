import { NextRequest, NextResponse } from 'next/server';
import { getWechatAuthUrl } from '@/lib/wechatConfig';

/**
 * 微信扫码授权入口
 * 
 * 流程：前端点击“微信登录”，跳转到此接口，此接口重定向到微信开放平台扫码页面
 */
export async function GET(request: NextRequest) {
  const authUrl = getWechatAuthUrl();
  console.log('重定向到微信授权页面:', authUrl);
  
  return NextResponse.redirect(authUrl);
}
