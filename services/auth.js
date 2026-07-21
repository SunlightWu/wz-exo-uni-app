// services/auth.js
// 微信登录 + 令牌管理 —— 统一入口，所有页面从 store 调用

import { api } from './api.js';

/**
 * 静默登录：获取微信 code 并调用后端登录接口
 * 返回 { success, data?, msg? }
 */
export async function wxLogin() {
  try {
    const loginRes = await new Promise((resolve, reject) => {
      uni.login({ provider: 'weixin', success: resolve, fail: reject });
    });
    const result = await api.wxXcxLogin({ code: loginRes.code });
    if (result.code === 200 && result.data) {
      return { success: true, data: result.data };
    }
    return { success: false, msg: result.msg || '登录失败' };
  } catch (e) {
    return { success: false, msg: e.message || '网络异常' };
  }
}

/**
 * 手机号授权登录：获取微信 code + 手机号 code 并调用授权登录接口
 * 返回 { success, data?, msg? }
 */
export async function phoneLogin(phoneCode) {
  try {
    const loginRes = await new Promise((resolve, reject) => {
      uni.login({ provider: 'weixin', success: resolve, fail: reject });
    });
    const result = await api.wxXcxAuthLogin({
      code: loginRes.code,
      phoneCode,
    });
    if (result.code === 200 && result.data) {
      return { success: true, data: result.data };
    }
    return { success: false, msg: result.msg || '手机号登录失败' };
  } catch (e) {
    return { success: false, msg: e.message || '网络异常' };
  }
}

export function getToken() {
  return uni.getStorageSync('token');
}

export function getUserInfo() {
  try {
    const raw = uni.getStorageSync('wxUserInfo');
    if (raw) return { nickname: raw.nickName || '微信用户', avatar: raw.avatarUrl || '' };
  } catch (e) { /* ignore */ }
  return { nickname: '微信用户', avatar: '' };
}

export function logout() {
  uni.removeStorageSync('token');
  uni.removeStorageSync('refreshToken');
  uni.removeStorageSync('memberId');
  uni.removeStorageSync('openId');
  uni.removeStorageSync('wxUserInfo');
  uni.removeStorageSync('phoneBound');
  uni.removeStorageSync('phoneNumber');
}

export function isLoggedIn() {
  return !!uni.getStorageSync('token');
}