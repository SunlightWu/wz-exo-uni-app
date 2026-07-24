// composables/usePhoneAuth.js
// 手机号授权弹出层 —— 组合式函数，供各页面统一使用

import { ref } from 'vue';
import { useUserStore } from '../store/user.js';

// 全局单例：确保弹出层状态跨页面共享
let _showAuthRef = null;
let _pendingCallbacks = [];

/**
 * 获取全局共享的 showAuth ref
 * 首次调用时创建，后续调用返回同一 ref
 */
export function getPhoneAuthState() {
  if (!_showAuthRef) {
    _showAuthRef = ref(false);
  }
  return _showAuthRef;
}

/**
 * 强制显示手机号授权弹出层（用于 token 失效等场景）
 */
export function forceShowPhoneAuth() {
  const showAuth = getPhoneAuthState();
  showAuth.value = true;
}

/**
 * 组合式函数 —— 在页面中使用
 * @returns {{ showAuth: Ref<boolean>, ensurePhoneBound: Function, onAuthSuccess: Function }}
 */
export function usePhoneAuth() {
  const userStore = useUserStore();
  const showAuth = getPhoneAuthState();

  /**
   * 检查手机号是否已绑定，未绑定则弹出授权层
   * 返回 Promise，授权成功后 resolve(true)
   * @returns {Promise<boolean>}
   */
  async function ensurePhoneBound() {
    if (userStore.phoneBound && userStore.token) return true;

    // 弹出授权层
    showAuth.value = true;

    return new Promise((resolve) => {
      _pendingCallbacks.push(resolve);
    });
  }

  /**
   * 授权成功回调 —— 由组件调用
   * 成功后自动拉取会员信息
   */
  async function onAuthSuccess() {
    showAuth.value = false;
    try {
      await userStore.fetchMemberInfo();
    } catch (e) {
      console.error('[PhoneAuth] 拉取会员信息失败:', e.message);
    }
    // 通知所有等待中的 Promise
    const callbacks = _pendingCallbacks.slice();
    _pendingCallbacks = [];
    callbacks.forEach(cb => cb(true));
  }

  return {
    showAuth,
    ensurePhoneBound,
    onAuthSuccess,
  };
}
