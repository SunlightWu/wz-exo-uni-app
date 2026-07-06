// services/device-service.js
// 设备服务整合层 —— 连接管理 + 命令发送 + 数据解析分发

import { useDeviceStore } from '../store/device.js';
import {
  CHAR_UUIDS, CMD, MODE_MAP,
  parseFFF2, parseFFF4, parseFFF5, faultCodeDescription,
} from '../utils/protocol.js';
import { createThrottle } from '../utils/throttle.js';
import {
  initBluetooth, startScan, connectDevice,
  subscribeNotify, registerNotifyHandler, clearNotifyHandler,
  writeCharacteristic, disconnect,
  onConnectionStateChange, closeBluetooth,
} from './ble.js';
import { sendCommand, sendCommandWithoutAck, handleAckByte, setCmdChar, resetAckLock } from './exo-command.js';

// ── 数据限流（FFF2: 50Hz → 4Hz, FFF5: 10Hz → 4Hz） ──
const throttleStatus = createThrottle(250);
const throttleSensor = createThrottle(250);

// ── 连接断开监听是否已注册 ──
let connectionMonitorRegistered = false;

// ── 保活机制 ──
// 逻辑：连接成功后启动 20s 空闲倒计时；20s 内无用户操作则每 20s 发送一次 setMode 保活
let _keepAliveIdleTimer = null;
let _keepAlivePeriodicTimer = null;
const KEEP_ALIVE_IDLE_MS = 20 * 1000;
const KEEP_ALIVE_INTERVAL_MS = 20 * 1000;

function _sendKeepAlive() {
  const store = useDeviceStore();
  if (!store.connected || store.status.errorCode !== 0) return;
  try {
    sendCommandWithoutAck(store.deviceId, CMD.setMode, { mode: store.mode });
    console.log('[KeepAlive] 发送保活 setMode');
  } catch (e) {
    console.warn('[KeepAlive] 保活发送失败:', e);
  }
}

function _startPeriodicKeepAlive() {
  _keepAlivePeriodicTimer && clearInterval(_keepAlivePeriodicTimer);
  _keepAlivePeriodicTimer = setInterval(_sendKeepAlive, KEEP_ALIVE_INTERVAL_MS);
  console.log('[KeepAlive] 启动周期性保活');
}

export function resetKeepAliveIdle() {
  const store = useDeviceStore();
  if (!store.connected) return;
  _keepAliveIdleTimer && clearTimeout(_keepAliveIdleTimer);
  _keepAlivePeriodicTimer && clearInterval(_keepAlivePeriodicTimer);
  _keepAlivePeriodicTimer = null;
  _keepAliveIdleTimer = setTimeout(() => {
    _startPeriodicKeepAlive();
  }, KEEP_ALIVE_IDLE_MS);
}

function _stopKeepAlive() {
  _keepAliveIdleTimer && clearTimeout(_keepAliveIdleTimer);
  _keepAlivePeriodicTimer && clearInterval(_keepAlivePeriodicTimer);
  _keepAliveIdleTimer = null;
  _keepAlivePeriodicTimer = null;
  console.log('[KeepAlive] 停止保活');
}

// ── Alive 检测 ──
// 设备通过 log 通道发送 alive 消息，10s 内未收到则认为离线
let _aliveTimer = null;
const ALIVE_TIMEOUT_MS = 10 * 1000;

function _markAlive() {
  const store = useDeviceStore();
  store.setAlive(true);
  store.setOnline(true);
  _aliveTimer && clearTimeout(_aliveTimer);
  _aliveTimer = setTimeout(() => {
    store.setAlive(false);
    store.setOnline(false);
    console.warn('[Alive] 设备 10s 未响应，标记为离线');
  }, ALIVE_TIMEOUT_MS);
}

// ── 设置 Notify 处理器 ──
export function setupNotifyHandlers() {
  registerNotifyHandler((charId, value) => {
    const store = useDeviceStore();

    // FFF2: 状态包 + ACK
    if (charId.toUpperCase().includes('FFF2')) {
      if (value.byteLength === 1) {
        // ACK 应答
        const bytes = new Uint8Array(value);
        handleAckByte(bytes[0]);
        return;
      }
      if (!throttleStatus()) return;
      const data = parseFFF2(value);
      if (data) {
        store.updateStatus(data);
        store.updateCost(data.runtimeSeconds);
      }
    }

    // FFF4: 故障包
    if (charId.toUpperCase().includes('FFF4')) {
      const data = parseFFF4(value);
      if (data && data.errorCode !== 0) {
        const desc = faultCodeDescription(data.errorCode);
        store.updateStatus({ errorCode: data.errorCode });
        uni.showModal({
          title: '设备故障',
          content: desc,
          showCancel: false,
        });
      }
    }

    // FFF5: 传感器包
    if (charId.toUpperCase().includes('FFF5')) {
      if (!throttleSensor()) return;
      // 传感器数据可用于更精细的展示，暂仅限流接收
    }

    // FFF6: 日志 / alive 心跳
    if (charId.toUpperCase().includes('FFF6')) {
      try {
        const text = new TextDecoder('utf-8').decode(value).toLowerCase();
        if (text.includes('alive')) {
          _markAlive();
        }
      } catch (e) {
        // 解码失败静默忽略
      }
    }
  });
}

// ── 注册连接断开监听（全局只需一次） ──
function ensureConnectionMonitor() {
  if (connectionMonitorRegistered) return;
  connectionMonitorRegistered = true;
  onConnectionStateChange((connected, deviceId) => {
    const store = useDeviceStore();
    if (!connected && store.deviceId === deviceId) {
      console.warn('[BLE] 设备意外断开:', deviceId);

      // 对标 Flutter _bindTunnelStreams: 停止保活、结束 session、重置状态
      _stopKeepAlive();
      _aliveTimer && clearTimeout(_aliveTimer);
      _aliveTimer = null;

      if (store.leaseRunning) {
        store.endLease();
      }

      store.reset();
      resetAckLock();
      clearNotifyHandler();

      uni.showModal({
        title: '连接已断开',
        content: '设备连接已中断，请重新连接',
        showCancel: false,
        success: () => {
          uni.navigateBack();
        },
      });
    }
  });
}

// ── 连接并配置设备 ──
// 注意：初始化阶段使用 sendCommandWithoutAck（对齐 ble_debug.html），不阻塞等待 ACK
export async function connectAndConfigure(deviceInfo, userProfile = {}, onStep = null) {
  const store = useDeviceStore();
  const { deviceId, serviceId, characteristics } = deviceInfo;
  const step = (msg) => { console.log('[BLE]', msg); if (onStep) onStep(msg); };

  store.setDevice(deviceId, deviceInfo.name || 'WZ-EXO-S3');
  store.resetConnectSteps();

  // 注册连接断开监听
  ensureConnectionMonitor();

  // 订阅 Notify 特征（只订阅 properties 里标明支持 notify 的）
  step('正在订阅数据通道...');
  const notifyChars = [CHAR_UUIDS.status, CHAR_UUIDS.fault, CHAR_UUIDS.sensor, CHAR_UUIDS.log];
  for (const charId of notifyChars) {
    const char = characteristics.find(c =>
      c.uuid.toUpperCase().includes(charId.slice(4, 8)) &&
      c.properties && (c.properties.notify || c.properties.indicate)
    );
    if (char) {
      try {
        await subscribeNotify(deviceId, char.uuid);
        console.log('[BLE] 订阅成功:', char.uuid);
      } catch (e) {
        console.warn(`[BLE] 订阅 ${charId.slice(4, 8)} 失败:`, e.message || e);
      }
    } else {
      console.warn(`[BLE] 未找到可订阅的特征:`, charId.slice(4, 8));
    }
  }

  // 使用设备实际返回的特征 UUID
  const cmdChar = characteristics.find(c => c.uuid.toUpperCase().includes('FFF1'));
  if (cmdChar) {
    setCmdChar(cmdChar.uuid);
    console.log('[BLE] 命令特征:', cmdChar.uuid, 'properties:', JSON.stringify(cmdChar.properties));
  } else {
    throw new Error('未找到命令特征 FFF1');
  }

  // 步骤 1: 握手（不等待 ACK，对齐 ble_debug.html）
  step('正在握手 (HELLO)...');
  store.setConnectStep(0, false);
  await sendCommandWithoutAck(deviceId, CMD.hello);
  store.setConnectStep(0, true);
  await new Promise(r => setTimeout(r, 300)); // 给设备处理时间

  // 步骤 2: 下发用户参数（不等待 ACK）
  step('正在下发用户参数...');
  store.setConnectStep(1, false);
  await sendCommandWithoutAck(deviceId, CMD.setUserProfile, {
    heightCm: userProfile.height || 170,
    weightKg: userProfile.weight || 70,
    age: userProfile.age || 30,
    gender: userProfile.gender || 'male',
  });
  store.setConnectStep(1, true);
  await new Promise(r => setTimeout(r, 200));

  // 步骤 3: 设置模式（不等待 ACK）
  step('正在设置模式...');
  store.setConnectStep(2, false);
  await sendCommandWithoutAck(deviceId, CMD.setMode, { mode: store.mode });
  store.setConnectStep(2, true);
  await new Promise(r => setTimeout(r, 200));

  // 步骤 4: 设置等级（不等待 ACK）
  if (store.mode !== 'transparent') {
    step('正在设置等级...');
    const levelCmd = store.mode === 'training' ? CMD.setImpedanceLevel : CMD.setAssistLevel;
    await sendCommandWithoutAck(deviceId, levelCmd, { level: store.activeLevel });
    await new Promise(r => setTimeout(r, 200));
  }

  // 就绪
  step('设备就绪');
  store.setConnectStep(3, true);
  store.setOutputState('ready');
  store.setConnected(true);
  store.setOnline(true);
  store.setNeedsCalibration(true);

  // 启动保活空闲倒计时
  resetKeepAliveIdle();
}

// ── 开始运行 ──
export async function startRunning() {
  const store = useDeviceStore();
  if (!store.deviceId) return;
  store.setOutputState('starting');
  store.setControlsLocked(true);
  try {
    await sendCommand(store.deviceId, CMD.start);
    store.setEnabled(true);
    store.setOutputState('running');
  } catch (e) {
    uni.showToast({ title: e.message || '启动失败', icon: 'none' });
    store.setOutputState('idle');
  } finally {
    store.setControlsLocked(false);
  }
}

// ── 停止运行 ──
export async function stopRunning() {
  const store = useDeviceStore();
  if (!store.deviceId) return;
  store.setOutputState('stopping');
  store.setControlsLocked(true);
  try {
    await sendCommand(store.deviceId, CMD.stop);
    store.setEnabled(false);
    store.setOutputState('idle');
  } catch (e) {
    uni.showToast({ title: e.message || '停止失败', icon: 'none' });
  } finally {
    store.setControlsLocked(false);
  }
}

// ── 切换模式 ──
export async function switchMode(mode) {
  const store = useDeviceStore();
  if (!store.deviceId) return;
  if (store.enabled) {
    uni.showToast({ title: '请先停止运行', icon: 'none' });
    return;
  }
  store.setMode(mode);
  store.modeCooldown = true;
  try {
    await sendCommand(store.deviceId, CMD.setMode, { mode });
  } catch (e) {
    uni.showToast({ title: e.message || '模式切换失败', icon: 'none' });
  } finally {
    setTimeout(() => { store.modeCooldown = false; }, 500);
  }
}

// ── 调节等级 ──
export async function changeLevel(level, isImpedance = false) {
  const store = useDeviceStore();
  if (!store.deviceId) return;
  const code = isImpedance ? CMD.setImpedanceLevel : CMD.setAssistLevel;
  const safeLevel = Math.max(1, Math.min(10, level));

  // 立即更新本地状态
  if (isImpedance) store.impedanceLevel = safeLevel;
  else store.assistLevel = safeLevel;

  store.levelCooldown = true;
  try {
    await sendCommand(store.deviceId, code, { level: safeLevel });
    uni.vibrateShort({ type: 'medium' });
  } catch (e) {
    // 静默失败，UI 已更新
  } finally {
    setTimeout(() => { store.levelCooldown = false; }, 300);
  }
}

// ── 清除故障 ──
export async function clearFault() {
  const store = useDeviceStore();
  if (!store.deviceId) return;
  try {
    await sendCommand(store.deviceId, CMD.clearFault);
    store.updateStatus({ errorCode: 0 });
    uni.showToast({ title: '故障已清除', icon: 'success' });
  } catch (e) {
    uni.showToast({ title: e.message || '清除失败', icon: 'none' });
  }
}

// ── 断开连接 ──
// 对齐 Flutter: DeviceController.disconnectDevice() + BleService.disconnect()
export async function disconnectDevice() {
  const store = useDeviceStore();

  // 1. 停止保活与 alive 检测
  _stopKeepAlive();
  _aliveTimer && clearTimeout(_aliveTimer);
  _aliveTimer = null;

  // 2. 结束租赁（对标 Flutter _finalizeSession）
  if (store.leaseRunning) {
    store.endLease();
  }

  // 3. 重置 ACK 锁，防止等待中的 ACK 阻塞后续连接
  resetAckLock();

  // 4. 断开 BLE 连接
  if (store.deviceId) {
    await disconnect(store.deviceId);
  }

  // 5. 清除 notify 回调，防止旧数据干扰（对标 Flutter 取消订阅）
  clearNotifyHandler();

  // 6. 重置设备状态
  store.reset();
}

export {
  initBluetooth, startScan, connectDevice,
  disconnect, closeBluetooth, onConnectionStateChange,
};
