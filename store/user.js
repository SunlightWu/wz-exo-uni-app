// store/user.js
// Pinia 用户状态管理 —— 统一管理登录态、用户信息、认证操作

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '../services/api.js';

export const useUserStore = defineStore('user', () => {
  // ── 状态 ──
  const token = ref(uni.getStorageSync('token') || '');
  const refreshToken = ref(uni.getStorageSync('refreshToken') || '');
  const memberId = ref(uni.getStorageSync('memberId') || '');
  const openId = ref(uni.getStorageSync('openId') || '');
  const nickname = ref('');
  const avatar = ref('');
  const phoneBound = ref(!!uni.getStorageSync('phoneBound'));
  const phoneNumber = ref(uni.getStorageSync('phoneNumber') || '');

  // ── 计算属性 ──
  const isLoggedIn = computed(() => !!token.value);
  const userInfo = computed(() => ({
    nickname: nickname.value || '微信用户',
    avatar: avatar.value || '',
  }));

  // ── 持久化到 Storage ──
  function persistAuth(d) {
    token.value = d.token || '';
    if (d.refreshToken) {
      refreshToken.value = d.refreshToken;
    }
    if (d.memberId) {
      memberId.value = String(d.memberId);
    }
    if (d.openId) {
      openId.value = d.openId;
    }
    if (d.nickname || d.avatar) {
      nickname.value = d.nickname || nickname.value;
      avatar.value = d.avatar || avatar.value;
    }
    if (d.phone || d.mobile) {
      phoneBound.value = true;
      phoneNumber.value = d.phone || d.mobile || '';
      uni.setStorageSync('phoneBound', '1');
    }
    // 同步storage
    uni.setStorageSync('token', token.value);
    uni.setStorageSync('refreshToken', refreshToken.value);
    uni.setStorageSync('memberId', memberId.value);
    uni.setStorageSync('openId', openId.value);
    uni.setStorageSync('wxUserInfo', {
      nickName: nickname.value || '',
      avatarUrl: avatar.value || '',
    });
  }

  // ── 静默登录 ──
  async function login() {
    if (token.value) return true;
    try {
      const loginRes = await new Promise((resolve, reject) => {
        uni.login({ provider: 'weixin', success: resolve, fail: reject });
      });
      const result = await api.wxXcxLogin({ code: loginRes.code });
      if (result.code === 200 && result.data) {
        persistAuth(result.data);
        console.log('[UserStore] 静默登录成功');
        return true;
      }
      console.warn('[UserStore] 静默登录失败:', result.msg);
      return false;
    } catch (err) {
      console.error('[UserStore] 静默登录异常:', err.message || err);
      return false;
    }
  }

  // ── 手机号授权登录 ──
  async function phoneLogin(phoneCode) {
    try {
      const loginRes = await new Promise((resolve, reject) => {
        uni.login({ provider: 'weixin', success: resolve, fail: reject });
      });
      const result = await api.wxXcxAuthLogin({
        code: loginRes.code,
        phoneCode,
      });
      if (result.code === 200 && result.data) {
        persistAuth(result.data);
        console.log('[UserStore] 手机号登录成功');
        return true;
      }
      console.warn('[UserStore] 手机号登录失败:', result.msg);
      return false;
    } catch (err) {
      console.error('[UserStore] 手机号登录异常:', err.message || err);
      return false;
    }
  }

  // ── 拉取会员信息 ──
  async function fetchMemberInfo() {
    if (!token.value) return;
    try {
      const result = await api.getMemberInfo();
      if (result.code === 200 && result.data) {
        const d = result.data;
        nickname.value = d.nickname || nickname.value;
        avatar.value = d.avatar || avatar.value;
        if (d.phone || d.mobile) {
          phoneBound.value = true;
          phoneNumber.value = d.phone || d.mobile || '';
          uni.setStorageSync('phoneBound', '1');
          uni.setStorageSync('phoneNumber', phoneNumber.value);
        }
        uni.setStorageSync('wxUserInfo', {
          nickName: nickname.value || '',
          avatarUrl: avatar.value || '',
        });
      }
    } catch (err) {
      console.error('[UserStore] 获取会员信息失败:', err.message || err);
    }
  }

  // ── 登出 ──
  function logout() {
    token.value = '';
    refreshToken.value = '';
    memberId.value = '';
    openId.value = '';
    nickname.value = '';
    avatar.value = '';
    phoneBound.value = false;
    phoneNumber.value = '';
    uni.removeStorageSync('token');
    uni.removeStorageSync('refreshToken');
    uni.removeStorageSync('memberId');
    uni.removeStorageSync('openId');
    uni.removeStorageSync('wxUserInfo');
    uni.removeStorageSync('phoneBound');
    uni.removeStorageSync('phoneNumber');
  }

  // ── 从 Storage 恢复状态（页面 onMounted 时调用） ──
  function restoreFromStorage() {
    token.value = uni.getStorageSync('token') || '';
    refreshToken.value = uni.getStorageSync('refreshToken') || '';
    memberId.value = uni.getStorageSync('memberId') || '';
    openId.value = uni.getStorageSync('openId') || '';
    const wxUser = uni.getStorageSync('wxUserInfo');
    if (wxUser) {
      nickname.value = wxUser.nickName || '';
      avatar.value = wxUser.avatarUrl || '';
    }
    phoneBound.value = !!uni.getStorageSync('phoneBound');
    phoneNumber.value = uni.getStorageSync('phoneNumber') || '';
  }

  return {
    // state
    token, refreshToken, memberId, openId,
    nickname, avatar, phoneBound, phoneNumber,
    // computed
    isLoggedIn, userInfo,
    // actions
    login, phoneLogin, fetchMemberInfo, logout, restoreFromStorage, persistAuth,
  };
});