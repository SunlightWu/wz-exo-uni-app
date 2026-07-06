// store/device.js
// Pinia 设备状态管理 —— 对应 Flutter Riverpod Provider 体系

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useDeviceStore = defineStore('device', () => {
  // ── 基础状态 ──
  const deviceId = ref(null);
  const deviceName = ref('');
  const connected = ref(false);

  // ── 模式 ──
  const mode = ref('transparent');   // transparent | assist | training
  const assistLevel = ref(1);
  const impedanceLevel = ref(1);

  // ── 运行状态 ──
  const outputState = ref('idle');    // idle | starting | running | stopping
  const enabled = ref(false);
  const controlsLocked = ref(false);
  const isStopping = ref(false);
  const commandLoading = ref(new Set());

  // ── 保活 / 在线状态 ──
  const alive = ref(false);
  const online = ref(false);

  // ── 首次连接需要零点校准 ──
  const needsCalibration = ref(false);

  // ── 租赁状态 ──
  const tradeNo = ref('');           // 当前交易编号
  const leaseDeviceSn = ref('');     // 当前租赁设备序列号
  const leaseStartTime = ref(0);     // 租赁开始时间戳
  const leaseCost = ref(0);          // 当前累计费用（分）
  const leaseRunning = ref(false);   // 是否正在租赁中
  const leaseRate = ref(0);          // 费率（分/分钟）
  const leaseFreeMinutes = ref(0);   // 免费分钟数
  const leaseDeposit = ref(0);       // 押金（分）

  // ── 设备状态（来自 FFF2 解析） ──
  const status = ref({
    running: false,
    battery: 0,
    errorCode: 0,
    leftHipAngle: 0,
    rightHipAngle: 0,
    leftTorqueNm: 0,
    rightTorqueNm: 0,
    assistLevel: 0,
    impedanceLevel: 0,
    stepCount: 0,
    runtimeSeconds: 0,
  });

  // ── 冷却态（防止 FFF2 回推覆盖用户操作） ──
  const modeCooldown = ref(false);
  const levelCooldown = ref(false);

  // ── 实时费用 ──
  const currentCost = ref(0);
  const ratePerMinute = ref(0.50);
  const dailyCap = ref(120);

  // ── 连接步骤进度 ──
  const connectSteps = ref([
    { label: '握手', done: false },
    { label: '参数下发', done: false },
    { label: '模式配置', done: false },
    { label: '就绪', done: false },
  ]);

  // ── 计算属性 ──
  const activeLevel = computed(() =>
    mode.value === 'training' ? impedanceLevel.value : assistLevel.value
  );

  const formattedDuration = computed(() => {
    const sec = status.value.runtimeSeconds;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  });

  const hasFault = computed(() => status.value.errorCode !== 0);

  // ── Actions ──
  function setDevice(id, name) {
    deviceId.value = id;
    deviceName.value = name;
    connected.value = true;
  }

  function setConnected(val) {
    connected.value = val;
    if (!val) {
      outputState.value = 'idle';
      enabled.value = false;
      alive.value = false;
      online.value = false;
    }
  }

  function setMode(m) { mode.value = m; }
  function setOutputState(s) { outputState.value = s; }
  function setEnabled(v) { enabled.value = v; }
  function setControlsLocked(v) { controlsLocked.value = v; }
  function setAlive(v) { alive.value = v; }
  function setOnline(v) { online.value = v; }
  function setNeedsCalibration(v) { needsCalibration.value = v; }

  function addCommandLoading(key) {
    commandLoading.value = new Set([...commandLoading.value, key]);
  }
  function removeCommandLoading(key) {
    const s = new Set(commandLoading.value);
    s.delete(key);
    commandLoading.value = s;
  }
  function isCommandLoading(key) {
    return commandLoading.value.has(key);
  }

  // 更新设备状态（从 FFF2 解析结果）
  function updateStatus(data) {
    status.value = { ...status.value, ...data };
  }

  // 更新连接步骤
  function setConnectStep(index, done) {
    const steps = [...connectSteps.value];
    if (steps[index]) steps[index] = { ...steps[index], done };
    connectSteps.value = steps;
  }

  function resetConnectSteps() {
    connectSteps.value = connectSteps.value.map(s => ({ ...s, done: false }));
  }

  // 更新实时费用
  function updateCost(seconds) {
    const minutes = Math.ceil(seconds / 60);
    const cost = minutes * ratePerMinute.value;
    currentCost.value = dailyCap.value > 0 ? Math.min(cost, dailyCap.value) : cost;
  }

  // ── 租赁状态操作 ──
  function setLeaseInfo(info) {
    tradeNo.value = info.tradeNo || '';
    leaseDeviceSn.value = info.deviceSn || '';
    leaseStartTime.value = info.startTime || Date.now();
    leaseRate.value = info.rate || 100; // 默认 1元/分钟
    leaseFreeMinutes.value = info.freeMinutes || 0;
    leaseDeposit.value = info.deposit || 0;
    leaseRunning.value = true;
    if (info.deviceName) deviceName.value = info.deviceName;
    // 持久化
    uni.setStorageSync('leaseInfo', {
      tradeNo: tradeNo.value,
      deviceSn: leaseDeviceSn.value,
      startTime: leaseStartTime.value,
      rate: leaseRate.value,
      freeMinutes: leaseFreeMinutes.value,
      deposit: leaseDeposit.value,
      deviceName: deviceName.value,
    });
  }

  function updateLeaseCost(cost) {
    leaseCost.value = cost;
  }

  function endLease() {
    leaseRunning.value = false;
    tradeNo.value = '';
    leaseDeviceSn.value = '';
    leaseStartTime.value = 0;
    leaseCost.value = 0;
    uni.removeStorageSync('leaseInfo');
  }

  function restoreLeaseInfo() {
    const saved = uni.getStorageSync('leaseInfo');
    if (saved && saved.tradeNo) {
      tradeNo.value = saved.tradeNo;
      leaseDeviceSn.value = saved.deviceSn;
      leaseStartTime.value = saved.startTime;
      leaseRate.value = saved.rate || 100;
      leaseFreeMinutes.value = saved.freeMinutes || 0;
      leaseDeposit.value = saved.deposit || 0;
      if (saved.deviceName) deviceName.value = saved.deviceName;
      leaseRunning.value = true;
    }
  }

  // 重置状态
  function reset() {
    deviceId.value = null;
    deviceName.value = '';
    connected.value = false;
    mode.value = 'transparent';
    assistLevel.value = 1;
    impedanceLevel.value = 1;
    outputState.value = 'idle';
    enabled.value = false;
    controlsLocked.value = false;
    isStopping.value = false;
    commandLoading.value = new Set();
    alive.value = false;
    online.value = false;
    needsCalibration.value = false;
    status.value = {
      running: false, battery: 0, errorCode: 0,
      leftHipAngle: 0, rightHipAngle: 0,
      leftTorqueNm: 0, rightTorqueNm: 0,
      assistLevel: 0, impedanceLevel: 0,
      stepCount: 0, runtimeSeconds: 0,
    };
    currentCost.value = 0;
    resetConnectSteps();
    // 租赁状态不在这里重置，由 endLease 单独处理
  }

  return {
    // state
    deviceId, deviceName, connected,
    mode, assistLevel, impedanceLevel,
    outputState, enabled, controlsLocked, isStopping, commandLoading,
    alive, online, needsCalibration,
    tradeNo, leaseDeviceSn, leaseStartTime, leaseCost, leaseRunning,
    leaseRate, leaseFreeMinutes, leaseDeposit,
    status, modeCooldown, levelCooldown,
    currentCost, ratePerMinute, dailyCap,
    connectSteps,
    // computed
    activeLevel, formattedDuration, hasFault,
    // actions
    setDevice, setConnected,
    setMode, setOutputState, setEnabled, setControlsLocked,
    setAlive, setOnline, setNeedsCalibration,
    addCommandLoading, removeCommandLoading, isCommandLoading,
    updateStatus, setConnectStep, resetConnectSteps,
    updateCost, setLeaseInfo, updateLeaseCost, endLease, restoreLeaseInfo, reset,
  };
});
