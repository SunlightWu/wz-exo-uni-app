// utils/protocol.js
// BLE 协议常量、命令编码、数据包解析 —— 唯一权威来源
// 参考: 02-技术架构与协议规范.md §2

// ── GATT UUID ──
export const SERVICE_UUID    = '0000FFF0-0000-1000-8000-00805F9B34FB';
export const SCAN_FILTER_UUID = '777a6b6a-3230-3236-6878-79717165786f';

export const CHAR_UUIDS = {
  command:  '0000FFF1-0000-1000-8000-00805F9B34FB', // Write
  status:   '0000FFF2-0000-1000-8000-00805F9B34FB', // Notify 50Hz + ACK
  params:   '0000FFF3-0000-1000-8000-00805F9B34FB', // Write
  fault:    '0000FFF4-0000-1000-8000-00805F9B34FB', // Notify
  sensor:   '0000FFF5-0000-1000-8000-00805F9B34FB', // Notify 10Hz
  log:      '0000FFF6-0000-1000-8000-00805F9B34FB', // Notify
};

// ── 命令码 ──
export const CMD = {
  hello:            0x01,
  setUserProfile:   0x02,
  calibrateZero:    0x03,
  setMode:          0x04,
  setAssistLevel:   0x05,
  setImpedanceLevel: 0x06,
  start:            0x07,
  stop:             0x08,
  clearFault:       0x09,
  disconnect:       0x0A,
};

// ── 模式枚举 ──
export const MODE_MAP = { transparent: 0, assist: 1, training: 2 };
export const MODE_NAMES = ['transparent', 'assist', 'training'];

// ── ACK 应答码 ──
export const ACK_CODES = {
  0x00: null,                // 成功
  0x01: '运行中忙',
  0x02: '状态不允许',
  0x03: '故障中',
  0x04: '参数无效',
  0x05: '电机未就绪',
  0x06: '超时',
};

// ── 故障码位掩码 ──
export const FAULT_MASKS = [
  [0x00000001, 'IMU离线'],
  [0x00000004, '电机0离线'],
  [0x00000008, '电机1离线'],
  [0x00000010, '控制不允许'],
  [0x00000020, '参数无效'],
  [0x00000040, '通信超时'],
  [0x00000080, '电机未使能'],
  [0x00000100, '电池低电量'],
  [0x00000200, '自检失败'],
  [0x00000400, '过温'],
  [0x00000800, '关节角度超限'],
  [0x00001000, '力矩超限'],
  [0x00002000, 'CAN通信错误'],
  [0x00004000, '控制周期超时'],
];

// ── 命令编码 ──
export function encodeCommand(code, payload = {}) {
  switch (code) {
    case CMD.hello:
    case CMD.calibrateZero:
    case CMD.start:
    case CMD.stop:
    case CMD.clearFault:
    case CMD.disconnect:
      return new Uint8Array([code]).buffer;

    case CMD.setUserProfile: {
      const buf = new ArrayBuffer(11);
      const v = new DataView(buf);
      v.setUint8(0, CMD.setUserProfile); // 命令字节 0x02
      v.setFloat32(1, payload.heightCm || 170, true);
      v.setFloat32(5, payload.weightKg || 70, true);
      v.setUint8(9, payload.age || 0);
      v.setUint8(10, payload.gender === 'male' ? 1 : 2);
      return buf;
    }

    case CMD.setMode: {
      const modeVal = MODE_MAP[payload.mode] ?? 0;
      return new Uint8Array([code, modeVal]).buffer;
    }

    case CMD.setAssistLevel:
    case CMD.setImpedanceLevel: {
      const lv = Math.max(1, Math.min(10, payload.level || 1));
      return new Uint8Array([code, lv]).buffer;
    }

    default:
      return null;
  }
}

// ── FFF2 状态包解析（30 字节，50Hz） ──
export function parseFFF2(buffer) {
  if (buffer.byteLength < 30) return null;
  const v = new DataView(buffer);
  return {
    timestampMs: v.getUint32(0, true),
    stateCode: v.getUint8(4),
    mode: MODE_NAMES[v.getUint8(5)] || 'transparent',
    running: v.getUint8(6) !== 0,
    battery: v.getUint8(7),
    errorCode: v.getUint32(8, true),
    leftHipAngle: v.getInt16(12, true) / 100,
    rightHipAngle: v.getInt16(14, true) / 100,
    leftTorqueNm: v.getInt16(16, true) / 1000,
    rightTorqueNm: v.getInt16(18, true) / 1000,
    assistLevel: v.getUint8(20),
    impedanceLevel: v.getUint8(21),
    stepCount: v.getUint32(22, true),
    runtimeSeconds: v.getUint32(26, true),
  };
}

// ── FFF5 传感器包解析（60 字节，10Hz） ──
export function parseFFF5(buffer) {
  if (buffer.byteLength < 60) return null;
  const v = new DataView(buffer);
  return {
    rollDeg: v.getFloat32(4, true),
    pitchDeg: v.getFloat32(8, true),
    yawDeg: v.getFloat32(12, true),
    accX: v.getFloat32(16, true),
    accY: v.getFloat32(20, true),
    accZ: v.getFloat32(24, true),
    altitudeM: v.getFloat32(40, true),
    baroTempC: v.getFloat32(44, true),
    motor0TempC: v.getFloat32(48, true),
    motor1TempC: v.getFloat32(52, true),
    battery: v.getUint8(56),
  };
}

// ── FFF4 故障包解析（12 字节） ──
export function parseFFF4(buffer) {
  if (buffer.byteLength < 12) return null;
  const v = new DataView(buffer);
  return {
    timestampMs: v.getUint32(0, true),
    errorCode: v.getUint32(4, true),
    stateCode: v.getUint8(8),
  };
}

// ── 故障码 → 中文描述 ──
export function faultCodeDescription(code) {
  if (code === 0) return '正常';
  return FAULT_MASKS.filter(([m]) => code & m).map(([, s]) => s).join('、') || '未知故障';
}
