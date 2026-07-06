<template>
	<view class="demo-page">
		<!-- 连接中 loading 页面 -->
		<view v-if="isConnecting" class="connecting-overlay">
			<view class="connecting-card">
				<view class="connecting-spinner">
					<image class="spinner-icon" src="/static/exo_view1.png" mode="aspectFit" />
				</view>
				<text class="connecting-title">正在连接设备</text>
				<text class="connecting-hint">{{ connectingStep }}</text>
				<view class="connecting-steps">
					<view class="step-item" :class="{ done: connectStepIndex > 0, active: connectStepIndex === 0 }">
						<view class="step-dot"></view>
						<text class="step-text">蓝牙连接</text>
					</view>
					<view class="step-item" :class="{ done: connectStepIndex > 1, active: connectStepIndex === 1 }">
						<view class="step-dot"></view>
						<text class="step-text">设备握手</text>
					</view>
					<view class="step-item" :class="{ done: connectStepIndex > 2, active: connectStepIndex === 2 }">
						<view class="step-dot"></view>
						<text class="step-text">参数同步</text>
					</view>
					<view class="step-item" :class="{ done: connectStepIndex > 3, active: connectStepIndex === 3 }">
						<view class="step-dot"></view>
						<text class="step-text">就绪</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 主内容 -->
		<view v-else>
			<view class="device-bar">
				<image class="device-icon-sm" src="/static/exo_view1.png" mode="aspectFit" />
				<text class="device-name">{{ deviceName }}</text>
			</view>

			<!-- 大号计时器 -->
			<view class="timer-card">
				<view class="timer-ring">
					<view class="timer-inner">
						<text class="timer-label">使用时长</text>
						<text class="timer-value">{{ formattedTime }}</text>
						<view class="timer-status" :class="{ running: isRunning }">
							<view class="status-dot"></view>
							<text class="status-text">{{ isRunning ? '运行中' : '已暂停' }}</text>
						</view>
					</view>
				</view>
			</view>

			<!-- 费用信息 -->
			<view class="cost-card">
				<view class="cost-row">
					<view class="cost-item">
						<text class="cost-label">当前费用</text>
						<text class="cost-num">¥{{ currentCost.toFixed(2) }}</text>
					</view>
					<view class="cost-divider"></view>
					<view class="cost-item">
						<text class="cost-label">已用时长</text>
						<text class="cost-num">{{ formatMinutes(elapsedSeconds) }}</text>
					</view>
					<view class="cost-divider"></view>
					<view class="cost-item">
						<text class="cost-label">费率</text>
						<text class="cost-num">¥{{ (hourlyRate / 100).toFixed(2) }}/小时</text>
					</view>
				</view>
				<view v-if="freeMinutes > 0" class="cost-hint">
					<text>前 {{ freeMinutes }} 分钟免费，已减免 ¥{{ freeDiscount.toFixed(2) }}</text>
				</view>
			</view>

			<!-- 运动轨迹 -->
			<view class="trajectory-section">
				<text class="section-title">📍 运动轨迹</text>
				<TrajectoryMap :points="trajectoryPoints" height="200px" :show-location="false" />
			</view>

			<!-- 结束体验 -->
			<view class="finish-section">
				<view class="finish-btn" @click="onFinish">
					<text>结束体验</text>
				</view>
			</view>

			<view style="height: 30px;"></view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import TrajectoryMap from '../../components/TrajectoryMap.vue';
import { api } from '../../services/api.js';
import { useDeviceStore } from '../../store/device.js';

const deviceName = ref('外骨骼设备');
const tradeNo = ref('');
const deviceSn = ref('');
const hourlyRate = ref(0);      // 小时费率（分）
const freeMinutes = ref(0);
const depositMoney = ref(0);    // 押金（分）
const isRunning = ref(true);
const elapsedSeconds = ref(0);
const trajectoryPoints = ref([]);

const deviceStore = useDeviceStore();

let timer = null;
let trajTimer = null;

let connectTimer = null;
let connectTimers = [];

// ── 模拟连接 loading ──
const isConnecting = ref(true);
const connectStepIndex = ref(0);
const connectingStep = ref('正在搜索设备...');

const CONNECT_STEPS = [
	{ delay: 1200, text: '正在搜索设备...' },
	{ delay: 1000, text: '蓝牙连接中...' },
	{ delay: 1200, text: '设备握手 (HELLO)...' },
	{ delay: 1000, text: '同步用户参数...' },
	{ delay: 600, text: '连接成功' },
];

function simulateConnect() {
	// 恢复 elapsedSeconds 并处理连接逻辑
	if (deviceStore.leaseRunning && deviceStore.tradeNo === tradeNo.value) {
		// 已租赁过：恢复计时，跳过连接动画
		isConnecting.value = false;
		elapsedSeconds.value = Math.floor((Date.now() - deviceStore.leaseStartTime) / 1000);
		isRunning.value = true;
		startTimers();
		collectLocation();
		return;
	}

	// 首次进入：记录开始时间，播放连接动画
	deviceStore.setLeaseInfo({
		tradeNo: tradeNo.value,
		deviceSn: deviceSn.value,
		deviceName: deviceName.value,
		startTime: Date.now(),
		rate: hourlyRate.value,
		freeMinutes: freeMinutes.value,
		deposit: depositMoney.value,
	});

	isConnecting.value = true;
	connectStepIndex.value = 0;
	connectingStep.value = CONNECT_STEPS[0].text;
	connectTimers = [];

	let totalDelay = 0;
	CONNECT_STEPS.forEach((step, idx) => {
		totalDelay += step.delay;
		const t = setTimeout(() => {
			if (idx < CONNECT_STEPS.length - 1) {
				connectStepIndex.value = idx;
				connectingStep.value = step.text;
			} else {
				connectStepIndex.value = idx;
				connectingStep.value = step.text;
				const t2 = setTimeout(() => {
					isConnecting.value = false;
					startTimers();
					collectLocation();
				}, 500);
				connectTimers.push(t2);
			}
		}, totalDelay);
		connectTimers.push(t);
	});
}

function startTimers() {
	timer = setInterval(() => {
		if (isRunning.value) elapsedSeconds.value++;
	}, 1000);
	trajTimer = setInterval(collectLocation, 5000);
}

// 费用计算（hourlyRate 是小时费率/分）
const currentCost = computed(() => {
	const minutes = Math.floor(elapsedSeconds.value / 60);
	const billable = Math.max(0, minutes - freeMinutes.value);
	return (billable * hourlyRate.value) / 60 / 100;
});

const freeDiscount = computed(() => {
	const minutes = Math.floor(elapsedSeconds.value / 60);
	const usedFree = Math.min(minutes, freeMinutes.value);
	return (usedFree * hourlyRate.value) / 60 / 100;
});

const formattedTime = computed(() => {
	const h = Math.floor(elapsedSeconds.value / 3600);
	const m = Math.floor((elapsedSeconds.value % 3600) / 60);
	const s = elapsedSeconds.value % 60;
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
});

function formatMinutes(seconds) {
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${m}分${s}秒`;
}

onMounted(() => {
	const pages = getCurrentPages();
	const page = pages[pages.length - 1];
	const query = page.options || page.$page?.options || page.$route?.query || {};
	deviceName.value = query.name || '外骨骼设备';
	tradeNo.value = query.tradeNo || '';
	deviceSn.value = query.deviceSn || '';
	hourlyRate.value = parseInt(query.hourlyRate) || 0;
	freeMinutes.value = parseInt(query.freeMinutes) || 0;
	depositMoney.value = parseInt(query.depositMoney) || 0;

	// 启动模拟连接
	simulateConnect();
});

onUnmounted(() => {
	clearAllTimers();
});

function clearAllTimers() {
	if (timer) { clearInterval(timer); timer = null; }
	if (trajTimer) { clearInterval(trajTimer); trajTimer = null; }
	connectTimers.forEach(t => clearTimeout(t));
	connectTimers = [];
}

async function collectLocation() {
	if (!isRunning.value) return;
	uni.getLocation({
		type: 'gcj02',
		success: async (res) => {
			trajectoryPoints.value.push({
				latitude: res.latitude,
				longitude: res.longitude,
				timestamp: Date.now(),
			});
			// 上报轨迹到后端
			if (deviceSn.value) {
				try {
					await api.reportTrajectory({
						deviceSn: deviceSn.value,
						longitude: res.longitude,
						latitude: res.latitude,
						batteryLevel: 80,
						signalStrength: 4,
						deviceStatus: 1,
					});
				} catch (e) {
					console.warn('[Trajectory] 上报失败:', e.message);
				}
			}
		},
		fail: () => {},
	});
}

function onFinish() {
	const minutes = Math.floor(elapsedSeconds.value / 60);
	const cost = currentCost.value;
	uni.showModal({
		title: '结束体验',
		content: `已使用 ${formatMinutes(elapsedSeconds.value)}，费用 ¥${cost.toFixed(2)}，确认结束？`,
		confirmText: '确认结束',
		cancelText: '继续使用',
		confirmColor: '#8B5CF6',
		success: async (res) => {
				if (!res.confirm) return;
				// 停止所有定时器，防止跳转后还在上报
				clearAllTimers();
				uni.showLoading({ title: '正在归还设备...', mask: true });
				try {
					// 调用真实归还接口
					if (deviceSn.value) {
						await api.returnDevice(deviceSn.value);
					}
					// 跳转到费用确认页（关闭当前页，防止返回）
					uni.redirectTo({
						url: `/pages/device/completed?tradeNo=${tradeNo.value}&duration=${elapsedSeconds.value}`,
					});
				} catch (e) {
					uni.showToast({ title: e.message || '归还失败', icon: 'none' });
				} finally {
					uni.hideLoading();
				}
			},
	});
}
</script>

<style scoped lang="scss">
.demo-page {
	min-height: 100vh;
	background: #f5f6fa;
	padding: 16px;
}

/* ── 连接中 loading ── */
.connecting-overlay {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 80vh;
}

.connecting-card {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 20px;
	padding: 40px 32px;
}

.connecting-spinner {
	position: relative;
	width: 100px;
	height: 100px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.spinner-icon {
	width: 50px;
	height: 50px;
	z-index: 2;
}

.connecting-title {
	font-size: 18px;
	font-weight: 800;
	color: #333;
}

.connecting-hint {
	font-size: 14px;
	color: #999;
}

.connecting-steps {
	display: flex;
	flex-direction: column;
	gap: 12px;
	width: 200px;
	margin-top: 8px;
}

.step-item {
	display: flex;
	align-items: center;
	gap: 10px;
	opacity: 0.35;
	transition: all 0.3s;
}

.step-item.active {
	opacity: 1;
}

.step-item.done {
	opacity: 0.6;
}

.step-dot {
	width: 10px;
	height: 10px;
	border-radius: 50%;
	background: #ddd;
	flex-shrink: 0;
	transition: background 0.3s;
}

.step-item.active .step-dot {
	background: #8B5CF6;
	box-shadow: 0 0 8px rgba(139, 92, 246, 0.4);
}

.step-item.done .step-dot {
	background: #28C76F;
}

.step-text {
	font-size: 14px;
	color: #666;
	font-weight: 500;
}

/* 设备名称 */
.device-bar {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-bottom: 16px;
}

.device-icon-sm {
	width: 36px;
	height: 36px;
	border-radius: 8px;
}

.device-name {
	font-size: 16px;
	font-weight: 800;
	color: #333;
}

/* 大号计时器 */
.timer-card {
	background: #fff;
	border-radius: 20px;
	padding: 24px;
	margin-bottom: 16px;
	display: flex;
	justify-content: center;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}

.timer-ring {
	width: 220px;
	height: 220px;
	border-radius: 50%;
	border: 3px solid #f0f0f0;
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
}

.timer-ring::before {
	content: '';
	position: absolute;
	inset: -3px;
	border-radius: 50%;
	border: 3px solid transparent;
	border-top-color: $primaryColor;
	border-right-color: $primaryColor;
	animation: ring-rotate 3s linear infinite;
}

@keyframes ring-rotate {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

.timer-inner {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6px;
}

.timer-label {
	font-size: 13px;
	color: #999;
	font-weight: 600;
}

.timer-value {
	font-size: 42px;
	font-weight: 900;
	color: $primaryColor;
	font-variant-numeric: tabular-nums;
	letter-spacing: 2px;
}

.timer-status {
	display: flex;
	align-items: center;
	gap: 5px;
	padding: 4px 12px;
	border-radius: 999px;
	background: #f5f6fa;
}

.timer-status.running {
	background: rgba(139, 92, 246, 0.08);
}

.status-dot {
	width: 7px;
	height: 7px;
	border-radius: 50%;
	background: #ccc;
}

.timer-status.running .status-dot {
	background: #28C76F;
	animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
	0%, 100% { opacity: 1; }
	50% { opacity: 0.3; }
}

.status-text {
	font-size: 12px;
	color: #999;
	font-weight: 600;
}

.timer-status.running .status-text {
	color: $primaryColor;
}

/* 费用卡片 */
.cost-card {
	background: #fff;
	border-radius: 16px;
	padding: 18px;
	margin-bottom: 16px;
	box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.cost-row {
	display: flex;
	align-items: center;
	justify-content: space-around;
}

.cost-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 5px;
}

.cost-label {
	font-size: 12px;
	color: #999;
}

.cost-num {
	font-size: 18px;
	font-weight: 800;
	color: #333;
}

.cost-divider {
	width: 1px;
	height: 30px;
	background: #f0f0f0;
}

.cost-hint {
	margin-top: 10px;
	padding-top: 10px;
	border-top: 1px solid #f5f6fa;
	text-align: center;
	font-size: 12px;
	color: #28C76F;
}

/* 轨迹 */
.trajectory-section {
	margin-bottom: 16px;
}

.section-title {
	font-size: 14px;
	font-weight: 700;
	color: #333;
	margin-bottom: 10px;
	display: block;
}

/* 结束按钮 */
.finish-section {
	margin-top: 8px;
}

.finish-btn {
	width: 100%;
	height: 48px;
	background: linear-gradient(135deg, $primaryColor, $primaryLight);
	border-radius: 12px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 15px;
	font-weight: 700;
	color: #fff;
	box-shadow: 0 4px 16px rgba(139, 92, 246, 0.3);
}
</style>
