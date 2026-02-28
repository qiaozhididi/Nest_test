/**
 * 微信扫码登录配置
 * 
 * 注意：实际部署时，请在 .env.local 中配置以下环境变量
 */

export const wechatConfig = {
  // 微信开放平台 AppID (网页应用)
  appId: process.env.WECHAT_APP_ID || 'YOUR_WECHAT_APP_ID',
  
  // 微信开放平台 AppSecret
  appSecret: process.env.WECHAT_APP_SECRET || 'YOUR_WECHAT_APP_SECRET',
  
  // 授权后的回调地址 (必须在微信开放平台配置的授权域名下)
  redirectUri: process.env.WECHAT_REDIRECT_URI || 'http://localhost:3001/api/auth/wechat/callback',
  
  // 微信授权端点
  authEndpoint: 'https://open.weixin.qq.com/connect/qrconnect',
  
  // 微信令牌端点
  tokenEndpoint: 'https://api.weixin.qq.com/sns/oauth2/access_token',
  
  // 微信用户信息端点
  userInfoEndpoint: 'https://api.weixin.qq.com/sns/userinfo',
  
  // 授权作用域
  scope: 'snsapi_login',
  
  // 授权状态标识 (用于防 CSRF 攻击)
  state: 'wechat_login_state_random_string'
};

export const getWechatAuthUrl = () => {
  const params = new URLSearchParams({
    appid: wechatConfig.appId,
    redirect_uri: wechatConfig.redirectUri,
    response_type: 'code',
    scope: wechatConfig.scope,
    state: wechatConfig.state,
  });
  return `${wechatConfig.authEndpoint}?${params.toString()}#wechat_redirect`;
};
