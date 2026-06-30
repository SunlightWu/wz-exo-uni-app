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
  const assistLevel = ref(3);
  const impedanceLevel = ref(3);

  // ── 运行状态 ──
  const outputState = ref('idle');    // idle | starting | running | stopping
  const enabled = ref(false);
  const controlsLocked = ref(false);
  const isStopping = ref(false);
  const commandLoading = ref(new Set());

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
    }
  }

  function setMode(m) { mode.value = m; }
  function setOutputState(s) { outputState.value = s; }
  function setEnabled(v) { enabled.value = v; }
  function setControlsLocked(v) { controlsLocked.value = v; }

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

  // 重置状态
  function reset() {
    deviceId.value = null;
    deviceName.value = '';
    connected.value = false;
    mode.value = 'transparent';
    assistLevel.value = 3;
    impedanceLevel.value = 3;
    outputState.value = 'idle';
    enabled.value = false;
    controlsLocked.value = false;
    isStopping.value = false;
    commandLoading.value = new Set();
    status.value = {
      running: false, battery: 0, errorCode: 0,
      leftHipAngle: 0, rightHipAngle: 0,
      leftTorqueNm: 0, rightTorqueNm: 0,
      assistLevel: 0, impedanceLevel: 0,
      stepCount: 0, runtimeSeconds: 0,
    };
    currentCost.value = 0;
    resetConnectSteps();
  }

  return {
    // state
    deviceId, deviceName, connected,
    mode, assistLevel, impedanceLevel,
    outputState, enabled, controlsLocked, isStopping, commandLoading,
    status, modeCooldown, levelCooldown,
    currentCost, ratePerMinute, dailyCap,
    connectSteps,
    // computed
    activeLevel, formattedDuration, hasFault,
    // actions
    setDevice, setConnected,
    setMode, setOutputState, setEnabled, setControlsLocked,
    addCommandLoading, removeCommandLoading, isCommandLoading,
    updateStatus, setConnectStep, resetConnectSteps,
    updateCost, reset,
  };
});
