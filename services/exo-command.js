// services/exo-command.js
// 命令服务 + ACK 互斥锁 —— 与 Flutter sendCommandAndWaitAck 等价

import { CHAR_UUIDS, CMD, encodeCommand, ACK_CODES } from '../utils/protocol.js';
import { writeCharacteristic } from './ble.js';

let cmdChar = CHAR_UUIDS.command;
export function setCmdChar(uuid) { cmdChar = uuid; }

// ── ACK 互斥锁（支持等待队列，避免并发抛异常） ──
export class AckLock {
  constructor() {
    this._locked = false;
    this._waiters = [];
  }
  async acquire() {
    if (!this._locked) {
      this._locked = true;
      return;
    }
    return new Promise((resolve) => {
      this._waiters.push(resolve);
    });
  }
  release() {
    if (this._waiters.length > 0) {
      const next = this._waiters.shift();
      next();
    } else {
      this._locked = false;
    }
  }
}

let pendingResolve = null;
let pendingReject = null;
let ackTimeout = null;

export function handleAckByte(byte) {
  console.log('[BLE] handleAckByte 被调用, byte=0x' + byte.toString(16).padStart(2, '0'), 'pendingResolve=' + (pendingResolve ? '有' : '无'));
  if (!pendingResolve) {
    console.warn('[BLE] 收到 ACK 但没有等待中的命令，已忽略');
    return;
  }
  clearTimeout(ackTimeout);
  const res = pendingResolve;
  const rej = pendingReject;
  pendingResolve = null;
  pendingReject = null;
  const msg = ACK_CODES[byte];
  if (msg) rej(new Error(msg));
  else res();
}

const lock = new AckLock();

// ── 强制重置 ACK 状态（设备断开时调用，防止锁死） ──
export function resetAckLock() {
  if (ackTimeout) { clearTimeout(ackTimeout); ackTimeout = null; }
  pendingResolve = null;
  pendingReject = null;
  lock._locked = false;
  lock._waiters = [];
}

// ── 发送命令并等待 ACK（运行时控制使用） ──
export async function sendCommand(deviceId, code, payload = {}, timeoutMs = 3000) {
  await lock.acquire();
  try {
    const buf = encodeCommand(code, payload);
    if (!buf || buf.byteLength === 0) {
      return;
    }
    console.log('[BLE] 发送命令 0x' + code.toString(16).padStart(2, '0'), '到', cmdChar, '长度', buf.byteLength, 'B');
    const ackP = new Promise((resolve, reject) => {
      pendingResolve = resolve;
      pendingReject = reject;
      ackTimeout = setTimeout(() => {
        console.warn('[BLE] ACK 超时 (' + timeoutMs + 'ms)，命令 0x' + code.toString(16).padStart(2, '0'));
        pendingResolve = null;
        pendingReject = null;
        reject(new Error('指令响应超时'));
      }, timeoutMs);
    });
    await writeCharacteristic(deviceId, cmdChar, buf);
    console.log('[BLE] 命令 0x' + code.toString(16).padStart(2, '0') + ' 写入完成，等待 ACK...');
    await ackP;
    console.log('[BLE] 命令 0x' + code.toString(16).padStart(2, '0') + ' 收到 ACK');
  } finally {
    lock.release();
  }
}

// ── 发送命令但不等待 ACK（初始化阶段使用，对齐 ble_debug.html） ──
export async function sendCommandWithoutAck(deviceId, code, payload = {}) {
  const buf = encodeCommand(code, payload);
  if (!buf || buf.byteLength === 0) return;
  console.log('[BLE] [NoAck] 发送命令 0x' + code.toString(16).padStart(2, '0'), '长度', buf.byteLength, 'B');
  await writeCharacteristic(deviceId, cmdChar, buf);
  console.log('[BLE] [NoAck] 命令 0x' + code.toString(16).padStart(2, '0') + ' 写入完成');
}

// ── 带重试的命令发送（等待 ACK） ──
export async function sendCommandWithRetry(deviceId, code, payload = {}, timeoutMs = 8000, maxRetries = 2, retryDelayMs = 300) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await sendCommand(deviceId, code, payload, timeoutMs);
    } catch (e) {
      lastError = e;
      console.warn('[BLE] 命令 0x' + code.toString(16).padStart(2, '0') + ' 第' + attempt + '次失败:', e.message);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, retryDelayMs));
      }
    }
  }
  throw lastError;
}
