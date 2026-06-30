<template>
	<view class="scanning-page">
		<!-- 动画区域 -->
		<view class="animation-area">
			<view class="radar">
				<view class="radar-ring"></view>
				<view class="radar-ring" style="animation-delay: 0.5s; width: 160px; height: 160px;"></view>
				<view class="radar-ring" style="animation-delay: 1s; width: 120px; height: 120px;"></view>
				<view class="device-icon">⬡</view>
			</view>
			<text class="hint-text">{{ hintText }}</text>
			<view class="blink-row" v-if="isConnecting">
				<view class="blink-dot"></view>
				<view class="blink-dot"></view>
				<view class="blink-dot"></view>
			</view>
		</view>

		<!-- 设备列表 -->
		<view class="device-list" v-if="devices.length > 0 && !isConnecting">
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
		<view class="help-section sci-card" v-if="!isConnecting">
			<text class="help-title">无法连接？</text>
			<text class="help-desc">• 请确认设备已开机</text>
			<text class="help-desc">• 靠近设备（5米内）</text>
			<text class="help-desc">• 确保设备未被其他手机连接</text>
			<view class="help-btn" @click="rescan">重新扫描</view>
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

const devices = ref([]);
const isConnecting = ref(false);
const hintText = ref('正在搜索外骨骼设备...');
const store = useDeviceStore();
let scanTimeout = null;

onMounted(async () => {
	setupNotifyHandlers();
	try {
		await initBluetooth();
		const result = await startScan(8);
		devices.value = result;
		if (result.length === 0) {
			uni.showToast({ title: '未发现设备，请确认设备已开机', icon: 'none', duration: 3000 });
		}
	} catch (e) {
		uni.showToast({ title: '蓝牙扫描失败: ' + e.message, icon: 'error' });
	}
});

onUnmounted(() => {
	if (scanTimeout) clearTimeout(scanTimeout);
});

async function onConnectDevice(dev) {
	isConnecting.value = true;
	hintText.value = '连接中...';

	const updateHint = (msg) => {
		hintText.value = msg;
		// 同时更新 loading 提示（如果正在显示）
		uni.showLoading({ title: msg, mask: true });
	};

	try {
		uni.showLoading({ title: '正在连接设备...', mask: true });
		const connected = await connectDevice(dev.deviceId, updateHint);
		const fullDev = { ...connected, name: dev.localName || dev.name || 'WZ-EXO-S3' };

		// 从本地存储获取用户身体参数
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
	uni.showLoading({ title: '扫描中...' });
	startScan(8).then(r => {
		devices.value = r;
		uni.hideLoading();
	}).catch(() => uni.hideLoading());
}

function cancel() {
	uni.closeBLEConnection({ deviceId: store.deviceId || '' });
	isConnecting.value = false;
	hintText.value = '正在搜索外骨骼设备...';
}
</script>

<style scoped lang="scss">
.scanning-page { @include page-base; padding: 20px 18px; display: flex; flex-direction: column; }

.animation-area { display: flex; flex-direction: column; align-items: center; padding: 40px 0 30px; }
.radar { width: 200px; height: 200px; position: relative; @include flex-row; justify-content: center; }
.radar-ring {
  position: absolute; width: 200px; height: 200px;
  border-radius: 50%; border: 2px solid $primaryColor; opacity: 0;
  animation: radar-expand 2s ease-out infinite;
}
@keyframes radar-expand {
  0% { transform: scale(0.5); opacity: 0.6; }
  100% { transform: scale(1.2); opacity: 0; }
}
.device-icon { font-size: 48px; color: $primaryColor; z-index: 2; animation: pulse 1.5s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
.hint-text { font-size: 16px; font-weight: 700; color: $textMainColor; margin-top: 20px; }
.blink-row { @include flex-row(6px); margin-top: 12px; }

.device-list { margin-top: 10px; }
.list-title { font-size: 13px; font-weight: 600; color: $textSubColor; margin-bottom: 10px; display: block; }
.device-item { @include flex-between; padding: 14px 18px; margin-bottom: 10px; border-radius: 20px; }
.device-name { font-weight: 700; font-size: 15px; color: $textMainColor; }
.device-id { font-size: 11px; color: $textSubColor; margin-top: 2px; }
.device-rssi { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.signal-bars { display: flex; gap: 2px; align-items: flex-end; }
.signal-bar { width: 4px; height: 8px; border-radius: 1px; background: $cardSoftBg;
  &:nth-child(2) { height: 12px; }
  &:nth-child(3) { height: 16px; }
  &:nth-child(4) { height: 20px; }
  &.active { background: $primaryColor; }
}
.rssi-text { font-size: 11px; font-weight: 600; color: $textSubColor; }

.help-section { margin-top: 20px; }
.help-title { font-weight: 800; font-size: 15px; color: $warningColor; display: block; margin-bottom: 10px; }
.help-desc { font-size: 13px; color: $textSubColor; line-height: 1.8; display: block; }
.help-btn { margin-top: 14px; padding: 10px 0; text-align: center; color: $primaryColor; font-weight: 700; font-size: 14px; border-radius: 12px; background: rgba(97, 32, 168, 0.08); }

.cancel-btn { margin-top: auto; padding: 16px; text-align: center; font-weight: 600; color: $textSubColor; font-size: 15px; margin-bottom: calc(env(safe-area-inset-bottom) + 10px); }
</style>
