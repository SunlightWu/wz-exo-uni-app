// services/auth.js
// 微信登录 + 令牌管理

import { api } from './api.js';

export async function wxLogin() {
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: async (res) => {
        try {
          const result = await api.wxXcxLogin({ code: res.code });
          if (result.code === 200 && result.data) {
            uni.setStorageSync('token', result.data.token);
            uni.setStorageSync('refreshToken', result.data.refreshToken);
            uni.setStorageSync('userInfo', {
              nickname: result.data.nickname || '微信用户',
              avatar: result.data.avatar || '',
            });
            resolve(result);
          } else {
            reject(new Error(result.msg || '登录失败'));
          }
        } catch (e) {
          reject(e);
        }
      },
      fail: (err) => {
        reject(err);
      },
    });
  });
}

export function getToken() {
  return uni.getStorageSync('token');
}

export function getUserInfo() {
  return uni.getStorageSync('userInfo') || { nickname: '微信用户' };
}

export function logout() {
  uni.removeStorageSync('token');
  uni.removeStorageSync('refreshToken');
  uni.removeStorageSync('userInfo');
}

export function isLoggedIn() {
  return !!uni.getStorageSync('token');
}
