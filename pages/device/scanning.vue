<template>
	<view class="scanning-page">
		<!-- 动画区域 -->
		<view class="animation-area">
			<view class="radar">
				<view class="radar-ring"></view>
				<view class="radar-ring" style="animation-delay: 0.5s; width: 160px; height: 160px;"></view>
				<view class="radar-ring" style="animation-delay: 1s; width: 120px; height: 120px;"></view>
				<image class="device-icon" src="/static/exo_view1.png" mode="aspectFit"></image>
			</view>
			<text class="hint-text">{{ hintText }}</text>
			<view class="blink-row" v-if="isConnecting">
				<view class="blink-dot"></view>
				<view class="blink-dot"></view>
				<view class="blink-dot"></view>
			</view>
		</view>

		<!-- 发现设备确认区（自动连接模式） -->
		<view class="found-device" v-if="showConfirm && foundDevice && !isConnecting">
			<!-- 设备名称 -->
			<view class="device-name-bar">
				<text class="found-name">{{ foundDevice.localName || foundDevice.name || '外骨骼设备' }}</text>
				<view class="found-signal">
					<view class="signal-bars">
						<view v-for="i in 4" :key="i" class="signal-bar" :class="{ active: (foundDevice.RSSI || -100) > -100 + i * 20 }"></view>
					</view>
					<text class="rssi-text">{{ foundDevice.RSSI || 0 }}dB</text>
				</view>
			</view>

			<!-- 费用信息 -->
			<view class="fee-card">
				<view class="fee-item">
					<text class="fee-label">租金</text>
					<view class="fee-value">
						<text class="fee-num">{{ feeInfo.rate > 0 ? (feeInfo.rate / 100).toFixed(2) : '1.00' }}</text>
						<text class="fee-unit">元/分钟</text>
					</view>
				</view>
				<view class="fee-divider"></view>
				<view class="fee-item">
					<text class="fee-label">押金</text>
					<view class="fee-value">
						<text class="fee-num">{{ feeInfo.deposit > 0 ? (feeInfo.deposit / 100).toFixed(2) : '0.00' }}</text>
						<text class="fee-unit">元</text>
					</view>
				</view>
				<view class="fee-divider"></view>
				<view class="fee-item">
					<text class="fee-label">免费时长</text>
					<view class="fee-value">
						<text class="fee-num">{{ feeInfo.freeMinutes || 0 }}</text>
						<text class="fee-unit">分钟</text>
					</view>
				</view>
			</view>

			<view class="action-bar">
				<view class="action-btn action-scan" @click="onConfirmConnect">确认使用</view>
			</view>
			<view class="cancel-link" @click="cancel">取消</view>
		</view>

		<!-- 设备列表（普通扫描模式） -->
		<view class="device-list" v-if="devices.length > 0 && !isConnecting && !isAutoMode">
			<text class="list-title">发现 {{ devices.length }} 台设备</text>
			<view v-for="dev in devices" :key="dev.deviceId" class="device-item glass-panel" @click="onConnectDevice(dev)">
				<view class="device-info">
					<text class="device-name">{{ dev.localName || dev.name || '外骨骼设备' }}</text>
					<text class="device-id">ID: {{ dev.deviceId.slice(0, 8) }}...</text>
				</view>
				<view class="device-rssi">
					<view class="signal-bars">
						<view v-for="i in 4" :key="i" class="signal-bar" :class="{ active: (dev.RSSI || -100) > -100 + i * 20 }"></view>
					</view>
					<text class="rssi-text">{{ dev.RSSI || 0 }}dB</text>
				</view>
			</view>
		</view>

		<!-- 帮助提示 -->
		<view class="help-section sci-card" v-if="!isConnecting && (!isAutoMode || devices.length > 0) && !showConfirm">
			<text class="help-title">{{ isAutoMode ? '未找到目标设备' : '无法连接？' }}</text>
			<text class="help-desc">• 请确认设备已开机</text>
			<text class="help-desc">• 靠近设备（5米内）</text>
			<text class="help-desc">• 确保设备未被其他手机连接</text>
			<view class="help-btn" @click="rescan">{{ isAutoMode ? '重新扫描匹配' : '重新扫描' }}</view>
		</view>

		<!-- 取消按钮 -->
		<view class="cancel-btn" @click="cancel" v-if="isConnecting">取消连接</view>
	</view>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { initBluetooth, startScan, connectDevice } from '../../services/ble.js';
import { connectAndConfigure, setupNotifyHandlers } from '../../services/device-service.js';
import { useDeviceStore } from '../../store/device.js';
import { api } from '../../services/api.js';

const devices = ref([]);
const isConnecting = ref(false);
const hintText = ref('正在搜索外骨骼设备...');
const store = useDeviceStore();
let scanTimeout = null;

// 自动连接模式参数
const isAutoMode = ref(false);
const targetSn = ref('');
const targetMac = ref('');
const targetName = ref('');

// 发现设备后展示确认
const showConfirm = ref(false);
const foundDevice = ref(null);

// 费用信息
const feeInfo = ref({ rate: 0, deposit: 0, freeMinutes: 0 });

onMounted(async () => {
	// 读取页面参数
	const pages = getCurrentPages();
	const page = pages[pages.length - 1];
	const query = page.options || page.$route?.query || {};
	targetSn.value = query.sn || '';
	targetMac.value = query.mac || '';
	targetName.value = query.name || '';
	isAutoMode.value = !!(targetMac.value || targetName.value);

	setupNotifyHandlers();
	try {
		await initBluetooth();
		if (isAutoMode.value) {
			// 自动连接模式：先扫描匹配，展示确认
			await tryAutoConnect();
		} else {
			// 普通扫描模式
			startScan(5, (dev) => {
				if (!devices.value.find(d => d.deviceId === dev.deviceId)) {
					devices.value.push(dev);
					devices.value.sort((a, b) => (b.RSSI || -100) - (a.RSSI || -100));
				}
			}).then(result => {
				devices.value = result;
				if (result.length === 0) {
					uni.showToast({ title: '未发现设备，请确认设备已开机', icon: 'none', duration: 3000 });
				}
			});
		}
	} catch (e) {
		uni.showToast({ title: '蓝牙初始化失败: ' + e.message, icon: 'error' });
	}
});

onUnmounted(() => {
	if (scanTimeout) clearTimeout(scanTimeout);
	startScan.stopEarly && startScan.stopEarly();
});

// ── 自动连接：扫码后扫描匹配，展示确认 ──
async function tryAutoConnect() {
	hintText.value = '正在定位设备...';
	isConnecting.value = true;

	const updateHint = (msg) => { hintText.value = msg; };
	let matchedDevice = null;

	// 步骤1: Android 尝试直接用 MAC 作为 deviceId 连接
	// #ifdef APP-PLUS
	if (uni.getSystemInfoSync().platform === 'android' && targetMac.value) {
		try {
			updateHint('正在直连设备...');
			await connectDevice(targetMac.value, updateHint);
			matchedDevice = { deviceId: targetMac.value, name: targetName.value || '外骨骼设备' };
		} catch (e) {
			console.log('[AutoConnect] MAC 直连失败，尝试扫描匹配:', e.message);
		}
	}
	// #endif

	// 步骤2: 扫描匹配（iOS 或 Android 直连失败）
	if (!matchedDevice) {
		updateHint('正在扫描匹配设备...');
		const scanResult = await startScan(4, (dev) => {
			if (matchDevice(dev)) {
				startScan.stopEarly();
			}
		});
		matchedDevice = scanResult.find(matchDevice);
	}

	isConnecting.value = false;

	if (!matchedDevice) {
		hintText.value = '未找到目标设备';
		uni.showToast({ title: '未找到设备，请确认二维码正确', icon: 'none', duration: 3000 });
		return;
	}

	// 获取设备费用信息
	try {
		const res = await api.scanDevice(targetSn.value);
		if (res.code === 0 || res.code === 200) {
			const data = res.data || {};
			feeInfo.value = {
				rate: data.rate || 0,
				deposit: data.deposit || 0,
				freeMinutes: data.freeMinutes || 0,
			};
		}
	} catch (e) {
		console.warn('[AutoConnect] 获取费用信息失败:', e.message);
	}

	// 展示设备确认，不立即连接
	foundDevice.value = matchedDevice;
	showConfirm.value = true;
	hintText.value = '已找到设备';
}

// ── 用户点击确认后连接 ──
async function onConfirmConnect() {
	if (!foundDevice.value) return;

	// 演示模式：不真正连接蓝牙，直接跳转到模拟使用页
	const devName = foundDevice.value.localName || foundDevice.value.name || targetName.value || '外骨骼设备';
	const rate = feeInfo.value.rate || 100;
	const freeMin = feeInfo.value.freeMinutes || 0;

	uni.redirectTo({
		url: `/pages/device/demo-control?name=${encodeURIComponent(devName)}&rate=${rate}&freeMinutes=${freeMin}`
	});
}

// 匹配设备：按广播名或 MAC
function matchDevice(dev) {
	const devName = (dev.localName || dev.name || '').toUpperCase();
	const target = targetName.value.toUpperCase();
	if (target && (devName.includes(target) || target.includes(devName))) return true;
	if (targetMac.value && dev.deviceId.toUpperCase().replace(/:/g, '') === targetMac.value.toUpperCase().replace(/:/g, '')) return true;
	return false;
}

async function onConnectDevice(dev) {
	isConnecting.value = true;
	hintText.value = '连接中...';

	const updateHint = (msg) => {
		hintText.value = msg;
		uni.showLoading({ title: msg, mask: true });
	};

	try {
		uni.showLoading({ title: '正在连接设备...', mask: true });
		const connected = await connectDevice(dev.deviceId, updateHint);
		const fullDev = { ...connected, name: dev.localName || dev.name || 'WZ-EXO-S3' };

		const userProfile = uni.getStorageSync('userProfile') || {};
		await connectAndConfigure(fullDev, userProfile, updateHint);
		uni.hideLoading();
		uni.showToast({ title: '连接成功', icon: 'success' });
		uni.redirectTo({ url: '/pages/device/control' });
	} catch (e) {
		uni.hideLoading();
		console.error('[BLE] 连接失败:', e);
		uni.showModal({
			title: '连接失败',
			content: e.message || '请重试',
			showCancel: false,
		});
	} finally {
		isConnecting.value = false;
		hintText.value = '正在搜索外骨骼设备...';
	}
}

function rescan() {
	devices.value = [];
	showConfirm.value = false;
	foundDevice.value = null;
	if (isAutoMode.value) {
		tryAutoConnect();
	} else {
		uni.showLoading({ title: '扫描中...' });
		startScan(5, (dev) => {
			if (!devices.value.find(d => d.deviceId === dev.deviceId)) {
				devices.value.push(dev);
				devices.value.sort((a, b) => (b.RSSI || -100) - (a.RSSI || -100));
			}
		}).then(r => {
			devices.value = r;
			uni.hideLoading();
		}).catch(() => uni.hideLoading());
	}
}

function cancel() {
	uni.closeBLEConnection({ deviceId: store.deviceId || '' });
	isConnecting.value = false;
	showConfirm.value = false;
	hintText.value = isAutoMode.value ? '正在定位设备...' : '正在搜索外骨骼设备...';
	uni.navigateBack();
}
</script>

<style scoped>
.scanning-page {
  min-height: 100vh;
  background: #f5f6fa;
  padding: 20px 18px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.animation-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 0 30px;
}

.radar {
  width: 200px;
  height: 200px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.radar-ring {
  position: absolute;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  border: 2px solid $primaryColor;
  opacity: 0;
  animation: radar-expand 2s ease-out infinite;
}

@keyframes radar-expand {
  0% { transform: scale(0.5); opacity: 0.8; }
  100% { transform: scale(1.5); opacity: 0; }
}

.device-icon {
  width: 80px;
  height: 80px;
  z-index: 2;
}

.hint-text {
  margin-top: 20px;
  font-size: 15px;
  color: #666;
  font-weight: 500;
}

.blink-row {
  margin-top: 12px;
  display: flex;
  gap: 6px;
}

.blink-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: $primaryColor;
  animation: blink 1.4s ease-in-out infinite;
}

.blink-dot:nth-child(2) { animation-delay: 0.2s; }
.blink-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes blink {
  0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1.2); }
}

/* 发现设备确认区 */
.found-device {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 16px;
	padding: 10px 0 20px;
}

/* 设备名称 */
.device-name-bar {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 10px;
}

.found-name {
	font-size: 18px;
	font-weight: 800;
	color: $textMainColor;
}

.found-signal {
	display: flex;
	align-items: center;
	gap: 6px;
}

.signal-bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 16px;
}

.signal-bar {
  width: 4px;
  background: #e0e0e0;
  border-radius: 2px;
}

.signal-bar:nth-child(1) { height: 4px; }
.signal-bar:nth-child(2) { height: 8px; }
.signal-bar:nth-child(3) { height: 12px; }
.signal-bar:nth-child(4) { height: 16px; }

.signal-bar.active {
  background: $primaryColor;
}

.rssi-text {
  font-size: 12px;
  color: #999;
}

/* 费用信息 — 对齐柜机详情页 */
.fee-card {
	background: #fff;
	border-radius: 16px;
	padding: 20px 16px;
	box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
	display: flex;
	align-items: center;
	justify-content: space-around;
	width: 100%;
	box-sizing: border-box;
}

.fee-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6px;
}

.fee-label {
	font-size: 12px;
	color: #999;
}

.fee-value {
	display: flex;
	align-items: baseline;
	gap: 2px;
}

.fee-num {
	font-size: 22px;
	font-weight: 800;
	color: $primaryColor;
}

.fee-unit {
	font-size: 12px;
	color: #666;
}

.fee-divider {
	width: 1px;
	height: 36px;
	background: #f0f0f0;
}

/* 操作按钮 — 对齐柜机详情页 */
.action-bar {
	width: 100%;
	padding: 0 16px;
	box-sizing: border-box;
}

.action-btn {
	width: 100%;
	height: 48px;
	border-radius: 12px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 15px;
	font-weight: 700;
}

.action-scan {
	background: linear-gradient(135deg, $primaryColor, $primaryLight);
	color: #fff;
}

.cancel-link {
	font-size: 14px;
	color: #999;
	padding: 8px;
}

.device-list {
  margin-top: 10px;
}

.list-title {
  font-size: 14px;
  color: #999;
  margin-bottom: 10px;
  display: block;
}

.device-item {
  padding: 14px 16px;
  border-radius: 14px;
  background: #fff;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.device-name {
  font-size: 15px;
  font-weight: 700;
  color: $textMainColor;
}

.device-id {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

.device-rssi {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.help-section {
  margin-top: auto;
  padding: 16px;
  border-radius: 16px;
  background: #fff;
}

.help-title {
  font-size: 14px;
  font-weight: 700;
  color: $textMainColor;
  margin-bottom: 8px;
  display: block;
}

.help-desc {
  font-size: 12px;
  color: #999;
  display: block;
  margin-bottom: 4px;
}

.help-btn {
  margin-top: 12px;
  padding: 10px;
  border-radius: 10px;
  background: $primaryColor;
  color: #fff;
  text-align: center;
  font-size: 14px;
  font-weight: 700;
}

.cancel-btn {
  margin-top: 16px;
  padding: 12px;
  border-radius: 10px;
  background: #f0f0f0;
  color: #666;
  text-align: center;
  font-size: 14px;
}
</style>
