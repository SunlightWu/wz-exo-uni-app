// services/api.js
// 服务端 HTTP API 封装 —— 仅真实请求，无 mock

// ── 环境配置 ──
// 本地环境：不需要 api/ 前缀
// 线上环境：所有 API 都需要加 api/ 前缀
const ENV_CONFIG = {
  local: {
    baseUrl: 'http://192.168.108.183:8080',
    apiPrefix: '',
  },
  online: {
    baseUrl: 'https://nexaexorental.com/',
    apiPrefix: 'api/',
  },
};

// 切换环境：local | online
const CURRENT_ENV = 'online';
const { baseUrl: BASE_URL, apiPrefix: API_PREFIX } = ENV_CONFIG[CURRENT_ENV];

// ── 安全关闭 loading（防止 showToast 替换后报错） ──
export { BASE_URL };

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

// ── Token 失效回调 ──
let _onTokenExpired = null;

/**
 * 注册 token 失效回调（由 App.vue 调用）
 * @param {Function} cb - token 失效时执行，通常用于弹出手机号授权层
 */
export function setOnTokenExpired(cb) {
  _onTokenExpired = cb;
}

// ── 刷新 token ──
let isRefreshing = false;
let refreshQueue = [];
let refreshRetryCount = 0;
const MAX_REFRESH_RETRY = 1;

async function doRefreshToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('NO_REFRESH_TOKEN');

  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      refreshQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;
  try {
    const res = await new Promise((resolve, reject) => {
      uni.request({
        url: `${BASE_URL}/member/refresh`,
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
      refreshRetryCount = 0;
      return res.data.token;
    }
    throw new Error(res.msg || '刷新失败');
  } catch (e) {
    refreshQueue.forEach(q => q.reject(e));
    refreshQueue = [];
    clearTokens();
    refreshRetryCount = 0;
    throw e;
  } finally {
    isRefreshing = false;
  }
}

/**
 * 处理 token 失效：清除登录态，触发重新登录弹出层
 */
function handleTokenExpired(reason) {
  console.warn('[HTTP] Token 已失效:', reason);
  clearTokens();

  // 触发全局 token 失效回调（弹出手机号授权层）
  if (_onTokenExpired) {
    _onTokenExpired();
  } else {
    uni.showToast({ title: '登录已失效，请重新登录', icon: 'none' });
  }
}

// ── 真实 HTTP 请求（支持 401/40103 自动处理） ──
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
          // HTTP 401 —— Token 过期
          if (res.statusCode === 401) {
            try {
              await doRefreshToken();
              doRequest();
            } catch (e) {
              handleTokenExpired('HTTP 401');
              reject(new Error('登录已过期'));
            }
            return;
          }

          // HTTP 2xx 但业务码 40103 —— Token 已失效
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const body = res.data || {};
            if (body.code === 40103) {
              handleTokenExpired(`业务码 ${body.code}: ${body.msg || 'Token 已失效'}`);
              reject(new Error(body.msg || 'Token 已失效，请重新登录'));
              return;
            }
            resolve(body);
            return;
          }

          const msg = res.data?.message || res.data?.msg || `服务器错误 (${res.statusCode})`;
          reject(new Error(`HTTP ${res.statusCode}: ${msg}`));
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
  wxXcxLogin: (data) => httpRequest('POST', `${BASE_URL}/${API_PREFIX}mini/member/xcx/login`, data),
  wxXcxAuthLogin: (data) => httpRequest('POST', `${BASE_URL}/${API_PREFIX}mini/member/xcx/auth-login`, data),
  updateXcxProfile: (data) => httpRequest('POST', `${BASE_URL}/${API_PREFIX}mini/member/xcx/profile`, data),
  getMemberInfo: () => httpRequest('GET', `${BASE_URL}/${API_PREFIX}mini/member/info`),

  // ── 文件 ──
  uploadFile: (filePath, dir) => new Promise((resolve, reject) => {
    const token = getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    uni.uploadFile({
      url: `${BASE_URL}/${API_PREFIX}mini/file/upload`,
      filePath,
      name: 'file',
      formData: { dir: dir || 'avatar' },
      header: headers,
      success: (res) => {
        try {
          const body = JSON.parse(res.data);
          if (body.code === 200 && body.data) {
            resolve(body.data);
          } else {
            reject(new Error(body.msg || '上传失败'));
          }
        } catch (e) {
          reject(new Error('上传响应解析失败'));
        }
      },
      fail: (err) => reject(new Error(err.errMsg || '上传失败')),
    });
  }),

  // ── 柜机 ──
  getNearbyCabinets: (params) => httpRequest('GET', `${BASE_URL}/${API_PREFIX}mini/v1/cabinet/nearby`, null, { params }),
  getCabinetDetail: (id) => httpRequest('GET', `${BASE_URL}/${API_PREFIX}mini/v1/lease/${id}`),
  getCabinetDevices: (cabinetNo) => httpRequest('GET', `${BASE_URL}/${API_PREFIX}mini/v1/cabinet/${cabinetNo}/devices`),

  // ── 租借 ──
  scanDevice: (deviceSn) => httpRequest('GET', `${BASE_URL}/${API_PREFIX}mini/v1/lease/scan/${deviceSn}`),
  scanCabinet: (cabinetNo, params) => httpRequest('GET', `${BASE_URL}/${API_PREFIX}mini/v1/lease/scan/cabinet/${cabinetNo}`, null, { params }),
  confirmLease: (data) => httpRequest('POST', `${BASE_URL}/${API_PREFIX}mini/v1/lease/confirm`, data),
  returnDevice: (deviceSn, params) => httpRequest('POST', `${BASE_URL}/${API_PREFIX}mini/v1/lease/${deviceSn}/return`, { deviceSn }, { params }),
  cancelOrder: (tradeNo) => httpRequest('POST', `${BASE_URL}/${API_PREFIX}mini/v1/lease/${tradeNo}/cancel`),
  depositConfirm: (tradeNo) => httpRequest('POST', `${BASE_URL}/${API_PREFIX}mini/v1/lease/${tradeNo}/deposit-confirm`),
  settleOrder: (tradeNo) => httpRequest('POST', `${BASE_URL}/${API_PREFIX}mini/v1/lease/${tradeNo}/settle`),
  getLeaseStatusByTradeNo: (tradeNo) => httpRequest('GET', `${BASE_URL}/${API_PREFIX}mini/v1/lease/${tradeNo}/status`),
  uploadTrajectory: (tradeNo, points) => httpRequest('POST', `${BASE_URL}/${API_PREFIX}mini/v1/lease/${tradeNo}/trajectory`, { points }),

  // ── 支付 ──
  createPayment: (data) => httpRequest('POST', `${BASE_URL}/${API_PREFIX}mini/v1/payment/unified-order`, data),
  paymentConfirm: (payNo) => httpRequest('POST', `${BASE_URL}/${API_PREFIX}mini/v1/payment/confirm?payNo=${payNo}`),
  getPaymentStatus: (payNo) => httpRequest('GET', `${BASE_URL}/${API_PREFIX}mini/v1/payment/${payNo}`),
  getWechatStatus: (payNo) => httpRequest('GET', `${BASE_URL}/${API_PREFIX}mini/v1/payment/wechat-status/${payNo}`),
  // 支付分免押订单
  createPreAuthRisk: (data) => httpRequest('POST', `${BASE_URL}/${API_PREFIX}mini/v1/payment/pre-auth-risk`, data),
  confirmRiskAuth: (payNo) => httpRequest('POST', `${BASE_URL}/${API_PREFIX}mini/v1/payment/risk-auth/confirm?payNo=${payNo}`),

  // ── 网点 ──
  getNearbyPlaces: (params) => httpRequest('GET', `${BASE_URL}/${API_PREFIX}mini/v1/places/nearby`, null, { params }),
  getPlaceDetail: (id) => httpRequest('GET', `${BASE_URL}/${API_PREFIX}mini/v1/places/${id}`),

  // ── 记录 ──
  getMyOrders: (params) => httpRequest('GET', `${BASE_URL}/${API_PREFIX}mini/v1/record/order`, null, { params }),
  getPaymentRecords: (params) => httpRequest('GET', `${BASE_URL}/${API_PREFIX}mini/v1/record/payment`, null, { params }),
  getOrderTrack: (tradeNo) => httpRequest('GET', `${BASE_URL}/${API_PREFIX}mini/v1/record/order/${tradeNo}/track`),

  // ── 轨迹 ──
  reportTrajectory: (data) => httpRequest('POST', `${BASE_URL}/${API_PREFIX}mini/member/trajectory/report`, data),
  getTrajectoryList: (deviceSn, startDate, endDate) => httpRequest('GET', `${BASE_URL}/${API_PREFIX}mini/member/trajectory/list`, null, { params: { deviceSn, startDate, endDate } }),
};
