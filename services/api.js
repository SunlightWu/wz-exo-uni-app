// services/api.js
// 服务端 HTTP API 封装 —— 仅真实请求，无 mock

const REAL_BASE_URL = 'http://192.168.108.183:8080';

// ── 安全关闭 loading（防止 showToast 替换后报错） ──
export function safeHideLoading() {
  try {
    uni.hideLoading();
  } catch (e) {
    // ignore
  }
}

// ── Token 管理 ──
const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';

function getToken() { return uni.getStorageSync(TOKEN_KEY); }
function getRefreshToken() { return uni.getStorageSync(REFRESH_TOKEN_KEY); }
function setTokens(token, refreshToken) {
  uni.setStorageSync(TOKEN_KEY, token);
  uni.setStorageSync(REFRESH_TOKEN_KEY, refreshToken);
}
function clearTokens() {
  uni.removeStorageSync(TOKEN_KEY);
  uni.removeStorageSync(REFRESH_TOKEN_KEY);
}

// ── 刷新 token ──
let isRefreshing = false;
let refreshQueue = [];

async function doRefreshToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('无刷新令牌');

  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      refreshQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;
  try {
    const res = await new Promise((resolve, reject) => {
      uni.request({
        url: `${REAL_BASE_URL}/member/refresh`,
        method: 'POST',
        header: { 'Content-Type': 'application/json' },
        data: { refreshToken },
        success: (r) => {
          if (r.statusCode >= 200 && r.statusCode < 300) resolve(r.data);
          else reject(new Error(`HTTP ${r.statusCode}`));
        },
        fail: (err) => reject(new Error(err.errMsg || '刷新失败')),
      });
    });

    if (res.code === 200 && res.data?.token && res.data?.refreshToken) {
      setTokens(res.data.token, res.data.refreshToken);
      refreshQueue.forEach(q => q.resolve(res.data.token));
      refreshQueue = [];
      return res.data.token;
    }
    throw new Error(res.msg || '刷新失败');
  } catch (e) {
    refreshQueue.forEach(q => q.reject(e));
    refreshQueue = [];
    clearTokens();
    throw e;
  } finally {
    isRefreshing = false;
  }
}

// ── 真实 HTTP 请求（支持 401 自动刷新） ──
function httpRequest(method, url, data = null, options = {}) {
  return new Promise((resolve, reject) => {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    console.log(`[HTTP] ${method} ${url}`, data);

    const doRequest = () => {
      const currentToken = getToken();
      if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`;

      let requestUrl = url;
      if (options.params) {
        const query = Object.entries(options.params)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
          .join('&');
        requestUrl = url + (url.includes('?') ? '&' : '?') + query;
      }

      uni.request({
        url: requestUrl,
        method,
        data,
        header: headers,
        timeout: options.timeout || 10000,
        success: async (res) => {
          if (res.statusCode === 401) {
            try {
              await doRefreshToken();
              doRequest();
            } catch (e) {
              reject(e);
              uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
            }
            return;
          }
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
          } else {

            const msg = res.data?.message || res.data?.msg || `服务器错误 (${res.statusCode})`;
            reject(new Error(`HTTP ${res.statusCode}: ${msg}`));
          }
        },
        fail: (err) => {
          reject(new Error(err.errMsg || '网络请求失败'));
        },
      });
    };

    doRequest();
  });
}

export const api = {
  // ── 用户 ──
  wxXcxLogin: (data) => httpRequest('POST', `${REAL_BASE_URL}/member/xcx/login`, data),
  updateXcxProfile: (data) => httpRequest('POST', `${REAL_BASE_URL}/member/xcx/profile`, data),
  getMemberInfo: () => httpRequest('GET', `${REAL_BASE_URL}/member/info`),

  // ==================== 外骨骼设备 ====================

  // ── 柜机 ──
  getNearbyCabinets: (params) => httpRequest('GET', `${REAL_BASE_URL}/api/v1/cabinet/nearby`, null, { params }),
  getCabinetDetail: (cabinetNo) => httpRequest('GET', `${REAL_BASE_URL}/api/v1/cabinet/${cabinetNo}`),
  getCabinetDevices: (cabinetNo) => httpRequest('GET', `${REAL_BASE_URL}/api/v1/cabinet/${cabinetNo}/devices`),

  // ── 租借 ──
  scanDevice: (deviceSn) => httpRequest('GET', `${REAL_BASE_URL}/api/v1/lease/scan/${deviceSn}`),
  scanCabinet: (cabinetNo, params) => httpRequest('GET', `${REAL_BASE_URL}/api/v1/lease/scan/cabinet/${cabinetNo}`, null, { params }),
  confirmLease: (data) => httpRequest('POST', `${REAL_BASE_URL}/api/v1/lease/confirm`, data),
  returnDevice: (deviceSn) => httpRequest('POST', `${REAL_BASE_URL}/api/v1/lease/${deviceSn}/return`, { deviceSn }),
  getLeaseStatusByTradeNo: (tradeNo) => httpRequest('GET', `${REAL_BASE_URL}/api/v1/lease/${tradeNo}/status`),
  uploadTrajectory: (tradeNo, points) => httpRequest('POST', `${REAL_BASE_URL}/api/v1/lease/${tradeNo}/trajectory`, { points }),

  // ── 网点 ──
  getNearbyPlaces: (params) => httpRequest('GET', `${REAL_BASE_URL}/api/v1/places/nearby`, null, { params }),
  getPlaceDetail: (id) => httpRequest('GET', `${REAL_BASE_URL}/api/v1/places/${id}`),

  // ── 记录 ──
  getMyOrders: (params) => httpRequest('GET', `${REAL_BASE_URL}/api/v1/record/order`, null, { params }),

  // ── 轨迹 ──
  reportTrajectory: (data) => httpRequest('POST', `${REAL_BASE_URL}/member/trajectory/report`, data),
  getTrajectoryList: (deviceSn, startDate, endDate) => httpRequest('GET', `${REAL_BASE_URL}/member/trajectory/list`, null, { params: { deviceSn, startDate, endDate } }),
};
