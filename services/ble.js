// services/ble.js
// BLE 核心封装 —— 初始化、扫描、连接、订阅、写入（串行队列）、断开

import { SCAN_FILTER_UUID } from '../utils/protocol.js';

// ── 带超时的 Promise 包装 ──
function withTimeout(promiseFn, timeoutMs, timeoutMsg) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error(timeoutMsg || `操作超时 (${timeoutMs}ms)`));
      }
    }, timeoutMs);
    promiseFn(
      (val) => {
        if (!settled) { settled = true; clearTimeout(timer); resolve(val); }
      },
      (err) => {
        if (!settled) { settled = true; clearTimeout(timer); reject(err); }
      }
    );
  });
}

// ── 初始化蓝牙适配器 ──
export function initBluetooth() {
  return new Promise((resolve, reject) => {
    uni.openBluetoothAdapter({
      success: () => {
        uni.onBluetoothAdapterStateChange((res) => {
          console.log('[BLE] 适配器状态:', res.available);
        });
        resolve();
      },
      fail: (err) => reject(new Error('蓝牙初始化失败: ' + err.errMsg)),
    });
  });
}

// ── 扫描设备 ──
// 优化点：
// 1. 支持 onDeviceFound 回调，UI 可实时展示设备
// 2. 默认超时缩短为 5 秒
// 3. 去掉冗余的二次扫描，一次扫描同时按名称过滤
// 4. 扫描结束后返回按信号强度排序的结果
export function startScan(timeoutSec = 5, onDeviceFound = null) {
  return new Promise((resolve, reject) => {
    const devices = [];
    const nameFilter = (dev) => {
      const name = (dev.localName || dev.name || '').toUpperCase();
      return name.includes('WZ-') || name.includes('EXO');
    };

    const addDevice = (dev) => {
      if (!devices.find(d => d.deviceId === dev.deviceId)) {
        devices.push(dev);
        if (onDeviceFound) onDeviceFound(dev);
      }
    };

    // 使用局部回调，确保 offBluetoothDeviceFound 能正确移除
    let foundCallback = null;

    const cleanup = () => {
      if (foundCallback) {
        try { uni.offBluetoothDeviceFound(foundCallback); } catch (e) {}
        foundCallback = null;
      }
      startScan._stopFn = null;
      startScan._activeTimer = null;
    };

    const stopAndResolve = () => {
      uni.stopBluetoothDevicesDiscovery({
        complete: () => {
          cleanup();
          const filtered = devices.filter(nameFilter);
          const result = filtered.length > 0 ? filtered : devices;
          result.sort((a, b) => (b.RSSI || -100) - (a.RSSI || -100));
          resolve(result);
        }
      });
    };

    foundCallback = (res) => {
      for (const dev of res.devices) addDevice(dev);
    };
    uni.onBluetoothDeviceFound(foundCallback);

    // 先尝试带 UUID 过滤扫描（更快更精准）
    uni.startBluetoothDevicesDiscovery({
      services: [SCAN_FILTER_UUID],
      allowDuplicatesKey: false,
      interval: 0,
      success: () => {
        const timer = setTimeout(() => {
          stopAndResolve();
        }, timeoutSec * 1000);
        // 如果中途已找到目标设备，可提前结束（由调用方控制）
        startScan._activeTimer = timer;
        startScan._stopFn = () => {
          clearTimeout(timer);
          stopAndResolve();
        };
      },
      fail: (err) => {
        cleanup();
        reject(new Error('启动蓝牙扫描失败: ' + (err.errMsg || err.message)));
      },
    });
  });
}

// 外部可调用提前结束扫描
startScan.stopEarly = () => {
  if (startScan._stopFn) {
    startScan._stopFn();
    startScan._stopFn = null;
  }
  if (startScan._activeTimer) {
    clearTimeout(startScan._activeTimer);
    startScan._activeTimer = null;
  }
};

// ── 当前连接的服务 UUID（从设备发现，不使用硬编码） ──
let activeServiceId = SCAN_FILTER_UUID;

// ── 连接设备（带步骤回调，便于 UI 显示进度） ──
export async function connectDevice(deviceId, onStep = null) {
  const step = (msg) => { console.log('[BLE]', msg); if (onStep) onStep(msg); };

  // 1. 建立 BLE 连接（15s 超时兜底）
  step('正在连接设备...');
  let disconnectedDuringConnect = false;
  const disconnectGuard = (res) => {
    if (!res.connected && res.deviceId === deviceId) {
      disconnectedDuringConnect = true;
      console.warn('[BLE] 设备在连接过程中断开');
    }
  };
  uni.onBLEConnectionStateChange(disconnectGuard);

  try {
    await withTimeout(
      (resolve, reject) => {
        uni.createBLEConnection({ deviceId, timeout: 10000, success: resolve, fail: reject });
      },
      15000,
      'BLE 连接超时'
    );
  } catch (e) {
    throw new Error('连接设备失败: ' + (e.errMsg || e.message));
  }

  // createBLEConnection 成功后，如果设备立刻断开，后续 API 可能卡住
  // 给系统一点缓冲时间，同时检测设备是否仍然连着
  await new Promise(r => setTimeout(r, 500));
  if (disconnectedDuringConnect) {
    throw new Error('设备连接后立刻断开，请确认设备未被其他客户端占用');
  }

  // 2. Android 需要延迟等系统完成服务发现
  step('等待服务发现...');
  await new Promise(r => setTimeout(r, 1500));

  // 3. 获取服务列表（8s 超时兜底）
  step('正在发现 GATT 服务...');
  let services;
  try {
    const res = await withTimeout(
      (resolve, reject) => {
        uni.getBLEDeviceServices({ deviceId, success: resolve, fail: reject });
      },
      8000,
      '获取 GATT 服务超时'
    );
    services = res.services;
  } catch (e) {
    throw new Error('发现服务失败: ' + (e.errMsg || e.message));
  }

  if (!services || services.length === 0) {
    throw new Error('未发现任何 GATT 服务（设备可能不支持 BLE 协议）');
  }

  // 查找目标服务
  const svc = services.find(s =>
    s.uuid.toUpperCase().replace(/-/g, '') === SCAN_FILTER_UUID.toUpperCase().replace(/-/g, '') ||
    s.uuid.toUpperCase().includes(SCAN_FILTER_UUID.slice(0, 8).toUpperCase())
  );
  if (!svc) {
    const uuids = services.map(s => s.uuid).join(', ');
    console.warn('[BLE] 设备服务列表:', uuids);
    throw new Error(`未找到设备主服务 (${SCAN_FILTER_UUID.slice(0, 8)}...)\n实际服务: ${uuids}`);
  }
  activeServiceId = svc.uuid;
  step(`发现目标服务: ${svc.uuid}`);

  // 4. 获取特征列表（8s 超时兜底）
  step('正在获取特征列表...');
  let characteristics;
  try {
    const res = await withTimeout(
      (resolve, reject) => {
        uni.getBLEDeviceCharacteristics({ deviceId, serviceId: activeServiceId, success: resolve, fail: reject });
      },
      8000,
      '获取特征列表超时'
    );
    characteristics = res.characteristics;
  } catch (e) {
    throw new Error('获取特征失败: ' + (e.errMsg || e.message));
  }

  // 打印特征列表便于调试
  if (characteristics && characteristics.length > 0) {
    for (const ch of characteristics) {
      const props = [];
      if (ch.properties?.read) props.push('R');
      if (ch.properties?.write) props.push('W');
      if (ch.properties?.notify) props.push('Notify');
      if (ch.properties?.indicate) props.push('Ind');
      console.log(`[BLE] 特征 ${ch.uuid} [${props.join(',')}]`);
    }
  }

  step('GATT 发现完成');
  return { deviceId, serviceId: activeServiceId, characteristics };
}

// ── 全局 Notify 监听 ──
let onNotifyData = null;
export function registerNotifyHandler(handler) {
  if (!onNotifyData) {
    onNotifyData = handler;
    uni.onBLECharacteristicValueChange((res) => {
      if (onNotifyData) onNotifyData(res.characteristicId, res.value);
    });
  } else {
    onNotifyData = handler;
  }
}

// ── 清除 Notify 监听 ──
export function clearNotifyHandler() {
  onNotifyData = null;
}

// ── 订阅特征值 Notify（5s 超时兜底） ──
export function subscribeNotify(deviceId, charId) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) { settled = true; resolve(); }
    }, 5000);
    uni.notifyBLECharacteristicValueChange({
      deviceId, serviceId: activeServiceId, characteristicId: charId,
      state: true,
      success: () => { if (!settled) { settled = true; clearTimeout(timer); resolve(); } },
      fail: (err) => { if (!settled) { settled = true; clearTimeout(timer); reject(err); } },
    });
  });
}

// ── 写入（串行队列，Android notify 后立即 write 需延时 50ms） ──
const writeQueue = [];
let writing = false;
async function processWriteQueue() {
  if (writing || writeQueue.length === 0) return;
  writing = true;
  const { deviceId, charId, buffer, resolve, reject } = writeQueue.shift();
  await new Promise(r => setTimeout(r, 50));
  try {
    await withTimeout(
      (res, rej) => {
        uni.writeBLECharacteristicValue({
          deviceId, serviceId: activeServiceId, characteristicId: charId,
          value: buffer,
          success: res,
          fail: rej,
        });
      },
      5000,
      'BLE 写入超时'
    );
    resolve();
  } catch (e) {
    reject(e);
  } finally {
    writing = false;
    processWriteQueue();
  }
}
export function writeCharacteristic(deviceId, charId, buffer) {
  return new Promise((resolve, reject) => {
    writeQueue.push({ deviceId, charId, buffer, resolve, reject });
    processWriteQueue();
  });
}

// ── 连接状态监听 ──
export function onConnectionStateChange(callback) {
  uni.onBLEConnectionStateChange((res) => {
    callback(res.connected, res.deviceId);
  });
}

// ── 断开 ──
export function disconnect(deviceId) {
  return new Promise((resolve) => {
    uni.closeBLEConnection({ deviceId, complete: resolve });
  });
}

// ── 关闭适配器 ──
export function closeBluetooth() {
  uni.closeBluetoothAdapter();
}
