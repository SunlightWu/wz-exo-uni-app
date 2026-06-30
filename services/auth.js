// services/auth.js
// 微信登录 + 令牌管理 —— 当前无服务端，使用本地模拟

import { api } from './api.js';

export async function wxLogin() {
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: async (res) => {
        try {
          // 模拟登录：无服务端时直接用 mock 数据
          const result = await api.wxLogin(res.code);
          uni.setStorageSync('token', result.token);
          uni.setStorageSync('userInfo', result.user);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      },
      fail: (err) => {
        // 无微信环境（如H5）时使用模拟登录
        console.warn('[Auth] 微信登录失败，使用模拟登录:', err);
        const mockResult = {
          token: 'mock-token-' + Date.now(),
          user: { openid: 'mock-openid', nickname: '体验用户', avatar: '' },
        };
        uni.setStorageSync('token', mockResult.token);
        uni.setStorageSync('userInfo', mockResult.user);
        resolve(mockResult);
      },
    });
  });
}

export function getToken() {
  return uni.getStorageSync('token');
}

export function getUserInfo() {
  return uni.getStorageSync('userInfo') || { nickname: '体验用户' };
}

export function logout() {
  uni.removeStorageSync('token');
  uni.removeStorageSync('userInfo');
}

export function isLoggedIn() {
  return !!uni.getStorageSync('token');
}
