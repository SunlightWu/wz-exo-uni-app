// services/api.js
// 服务端 HTTP API 封装 —— 当前无服务端，使用模拟数据/本地存储

const BASE_URL = 'https://api.exo-rental.example.com';

function request(method, url, data = null) {
  // 模拟模式：返回本地存储数据或模拟数据
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    console.log(`[API] ${method} ${url}`, data);

    // ---- 模拟数据 ----
    setTimeout(() => {
      try {
        const result = mockResponse(method, url, data);
        resolve(result);
      } catch (e) {
        reject(e);
      }
    }, 300);
  });
}

function mockResponse(method, url, data) {
  // 设备附近
  if (url === '/api/device/nearby') {
    return {
      code: 0,
      data: [
        { id: 1, name: 'CDC康复中心', lat: 39.9042, lng: 116.4074, distance: 320, available: 3, priceMin: 0.50 },
        { id: 2, name: '奥森公园南门', lat: 40.0150, lng: 116.3907, distance: 1200, available: 2, priceMin: 0.50 },
        { id: 3, name: '朝阳大悦城', lat: 39.9219, lng: 116.4690, distance: 2500, available: 5, priceMin: 0.40 },
      ],
    };
  }

  // 设备详情
  if (url.startsWith('/api/device/')) {
    return {
      code: 0,
      data: {
        sn: url.split('/').pop(),
        name: 'WZ-EXO-S3 外骨骼',
        location: 'CDC康复中心 3F',
        rate: 0.50,
        dailyCap: 120,
        battery: 85,
        online: true,
      },
    };
  }

  // 创建租赁订单
  if (url === '/api/lease/create') {
    const leaseId = 'L' + Date.now();
    const orderId = 'ORD' + Date.now();
    // 模拟免押金
    if (data.depositFree) {
      return { code: 0, data: { leaseId, orderId, deposit: 0, depositFree: true } };
    }
    return { code: 0, data: { leaseId, orderId, deposit: 299, depositFree: false } };
  }

  // 支付押金
  if (url === '/api/lease/pay-deposit') {
    return { code: 0, data: { paid: true, deposit: 299 } };
  }

  // 授权开始
  if (url === '/api/lease/authorize') {
    const token = 'eyJhbGciOiJIUzI1NiJ9.mock';
    return { code: 0, data: { token, expiresIn: 3600 } };
  }

  // 租赁状态
  if (url === '/api/lease/status') {
    const store = useDeviceStore?.();
    const runtime = store?.status?.runtimeSeconds || 0;
    const minutes = Math.max(1, Math.ceil(runtime / 60));
    const cost = Math.min(minutes * 0.5, 120);
    return { code: 0, data: { running: true, runtimeSeconds: runtime, cost } };
  }

  // 结束租赁
  if (url === '/api/lease/end') {
    return { code: 0, data: { totalCost: data.cost || 0, depositRefund: 0, actualMinutes: 30 } };
  }

  // 押金退还
  if (url === '/api/lease/deposit-refund') {
    return { code: 0, data: { refunded: true, amount: 299 } };
  }

  // 上传运动数据
  if (url === '/api/session/upload') {
    return { code: 0, data: { id: 'H' + Date.now() } };
  }

  // 历史列表
  if (url === '/api/history') {
    return {
      code: 0,
      data: [
        { id: 'H001', date: '2026-06-24', duration: 3150, steps: 3247, mode: 'assist', cost: 25.00, location: 'CDC康复中心', deviceSn: 'WZ-EXO-S3-001' },
        { id: 'H002', date: '2026-06-23', duration: 1800, steps: 1526, mode: 'training', cost: 15.00, location: '奥森公园南门', deviceSn: 'WZ-EXO-S3-003' },
        { id: 'H003', date: '2026-06-22', duration: 3600, steps: 3102, mode: 'assist', cost: 25.00, location: 'CDC康复中心', deviceSn: 'WZ-EXO-S3-001' },
        { id: 'H004', date: '2026-06-20', duration: 1260, steps: 985, mode: 'transparent', cost: 10.50, location: '朝阳大悦城', deviceSn: 'WZ-EXO-S3-005' },
      ],
    };
  }

  // 单条历史详情
  if (url.startsWith('/api/history/')) {
    return {
      code: 0,
      data: {
        id: url.split('/').pop(),
        date: '2026-06-24',
        duration: 3150,
        steps: 3247,
        avgSpeed: 3.2,
        calories: 128,
        symmetry: 94.2,
        modeDistribution: { transparent: 10, assist: 65, training: 25 },
        cost: 25.00,
        rate: 0.50,
        dailyCap: 120,
        deposit: 0,
        location: 'CDC康复中心',
        deviceSn: 'WZ-EXO-S3-001',
      },
    };
  }

  // 微信登录
  if (url === '/api/user/wx-login') {
    return {
      code: 0,
      data: {
        token: 'mock-token-' + Date.now(),
        user: { openid: 'mock-openid', nickname: '微信用户', avatar: '' },
      },
    };
  }

  // 用户资料
  if (url === '/api/user/profile') {
    if (method === 'GET') {
      const saved = uni.getStorageSync('userProfile');
      return {
        code: 0,
        data: saved || { height: 170, weight: 70, gender: 'male', age: 34 },
      };
    }
    if (method === 'POST') {
      uni.setStorageSync('userProfile', data);
      return { code: 0, data: { saved: true } };
    }
  }

  return { code: -1, message: '未知接口: ' + url };
}

// 用于 lease status 模拟中引用 store
import { useDeviceStore } from '../store/device.js';

export const api = {
  // 设备
  getNearbyDevices: () => request('GET', '/api/device/nearby'),
  getDeviceDetail: (sn) => request('GET', `/api/device/${sn}`),

  // 租赁
  createLease: (data) => request('POST', '/api/lease/create', data),
  payDeposit: (data) => request('POST', '/api/lease/pay-deposit', data),
  authorizeLease: (data) => request('POST', '/api/lease/authorize', data),
  getLeaseStatus: () => request('GET', '/api/lease/status'),
  endLease: (data) => request('POST', '/api/lease/end', data),
  depositRefund: (data) => request('POST', '/api/lease/deposit-refund', data),

  // 数据
  uploadSession: (data) => request('POST', '/api/session/upload', data),
  getHistory: () => request('GET', '/api/history'),
  getHistoryDetail: (id) => request('GET', `/api/history/${id}`),

  // 用户
  wxLogin: (code) => request('POST', '/api/user/wx-login', { code }),
  getUserProfile: () => request('GET', '/api/user/profile'),
  saveUserProfile: (data) => request('POST', '/api/user/profile', data),
};
