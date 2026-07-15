<template>
	<view class="control-page">
		<!-- 背景 -->
		<!-- <view class="page-bg"></view> -->

		<!-- 可滚动内容 -->
		<scroll-view scroll-y class="scroll-content" :scroll-top="scrollTop" @scroll="onScroll">
			<view class="content-inner">
				<!-- 状态卡片 -->
				<CurrentStatusCard :enabled="store.enabled" :is-stopping="store.isStopping" :status="store.status"
					:accent="selectedMode.accent" :walk-speed-kmh="walkSpeedKmh" :command-loading="store.commandLoading"
					:on-emergency-stop="showEmergencyStopConfirm" :on-clear-fault="handleClearFault"
					:on-calibrate="showCalibrateDialog" />

				<!-- 中央仪表盘 -->
				<view class="dashboard-wrap">
					<view class="halo-wrap" :style="haloStyle">
						<view class="halo-ring"></view>
						<view class="halo-arc" :style="arcStyle"></view>
						<view class="halo-inner-ring"></view>
						<view class="halo-core"></view>
					</view>

					<!-- 产品图 -->
					<image class="exo-image" src="/static/exo_view1.png" mode="aspectFit" />

					<!-- 指标气泡 -->
					<MetricBubble class="bubble-top-left" :value="String(store.status.stepCount)" label="步数"
						:accent="selectedMode.accent" :progress="(store.status.stepCount / 10000).clamp(0, 1)"
						:animated="true" />
					<MetricBubble class="bubble-top-right" :value="formattedRuntime" label="使用时长"
						:accent="selectedMode.accent" :progress="(store.status.runtimeSeconds / 7200).clamp(0, 1)"
						:animated="true" />
					<MetricBubble class="bubble-bottom-left" :value="bottomLeftValue" :label="bottomLeftLabel"
						:accent="selectedMode.accent" :progress="bottomLeftProgress" :animated="true" />
					<MetricBubble class="bubble-bottom-right" :value="String(store.status.battery) + '%'" label="电量"
						:accent="selectedMode.accent" :progress="(store.status.battery / 100).clamp(0, 1)"
						:animated="true" />

					<!-- 模式标题和开关 -->
					<view class="dashboard-center">
						<text class="mode-title">{{ selectedMode.title }}</text>
						<text class="mode-subtitle">{{ selectedMode.subtitle }}</text>
						<WideModeSwitch class="mode-switch" :enabled="store.enabled" :is-stopping="store.isStopping"
							:is-loading="store.commandLoading.has('start') || store.commandLoading.has('stop')"
							:accent="selectedMode.accent" @change="onOutputChange" />
					</view>
				</view>

				<!-- 等级选择器 -->
				<LevelSelector v-if="store.mode !== 'transparent'" :label="store.mode === 'training' ? '阻抗等级' : '助力等级'"
					:level="activeLevel" :accent="selectedMode.accent" @change="onLevelChange" />

				<!-- 实时关节面板（暂时隐藏） -->
				<!-- <RealtimeJointPanel :status="store.status" :angle-window="angleWindow" :accent="selectedMode.accent" /> -->

				<!-- 租赁费用信息 -->
				<view v-if="activeTradeNo" class="lease-info-card">
					<view class="lease-info-row">
						<view class="lease-info-item">
							<text class="lease-info-value">¥{{ leaseInfo.actualCost.toFixed(2) }}</text>
							<text class="lease-info-label">当前费用</text>
						</view>
						<view class="lease-info-item">
							<text class="lease-info-value">{{ formatDuration(leaseInfo.duration) }}</text>
							<text class="lease-info-label">已用时长</text>
						</view>
						<view class="lease-info-item">
							<text class="lease-info-value">¥{{ (store.leaseRate ? store.leaseRate / 100 : 0).toFixed(2) }}/分钟</text>
							<text class="lease-info-label">费率</text>
						</view>
					</view>
				</view>

				<!-- 运动轨迹地图 -->
				<view v-if="trajectoryPoints.length > 0" class="trajectory-section">
					<text class="trajectory-title">📍 运动轨迹</text>
					<TrajectoryMap :points="trajectoryPoints" height="200px" :show-location="true" />
				</view>

				<!-- 归还设备按钮 -->
				<view v-if="activeTradeNo" class="return-section">
					<view class="return-btn" @click="onReturnDevice">
						<text class="return-icon">🔄</text>
						<text class="return-text">归还设备</text>
					</view>
				</view>

				<!-- 断开连接按钮 -->
				<view class="disconnect-section">
					<view class="disconnect-btn" @click="onDisconnect">
						<text class="disconnect-icon">🔌</text>
						<text class="disconnect-text">断开设备连接</text>
					</view>
				</view>

				<!-- 底部占位 -->
				<view style="height: 120px;"></view>
			</view>
		</scroll-view>

		<!-- 底部模式切换条 -->
		<view class="bottom-bar">
			<ModeSwitchBar :modes="modes" :selected-mode-id="store.mode" :loading-target-mode="loadingTargetMode"
				:enabled="!controlsLocked" :command-loading="store.commandLoading" @select="onModeSelect" />
		</view>

		<!-- 故障弹窗 -->
		<view v-if="store.hasFault" class="fault-overlay" @click="handleClearFault">
			<view class="fault-modal" @click.stop>
				<text class="fault-icon">&#xE6AC;</text>
				<text class="fault-title">运行异常</text>
				<text class="fault-desc">{{ faultDesc }}</text>
				<view class="fault-btn" @click="handleClearFault">清除故障</view>
			</view>
		</view>
	</view>
</template>

<script setup>
	import {
		ref,
		computed,
		watch,
		onMounted,
		onUnmounted
	} from 'vue';
	import {
		useDeviceStore
	} from '../../store/device.js';
	import {
		startRunning,
		stopRunning,
		switchMode,
		changeLevel,
		clearFault,
		resetKeepAliveIdle,
		disconnectDevice,
	} from '../../services/device-service.js';
	import {
		faultCodeDescription,
		CMD
	} from '../../utils/protocol.js';
	import {
		sendCommand
	} from '../../services/exo-command.js';
	import {
		api
	} from '../../services/api.js';

	import CurrentStatusCard from '../../components/control/CurrentStatusCard.vue';
	import MetricBubble from '../../components/control/MetricBubble.vue';
	import WideModeSwitch from '../../components/control/WideModeSwitch.vue';
	import LevelSelector from '../../components/control/LevelSelector.vue';
	import TrajectoryMap from '../../components/TrajectoryMap.vue';
	// import RealtimeJointPanel from '../../components/control/RealtimeJointPanel.vue';
	import ModeSwitchBar from '../../components/control/ModeSwitchBar.vue';

	const store = useDeviceStore();
	const scrollTop = ref(0);
	const scrollOffset = ref(0);
	const loadingTargetMode = ref(null);
	const angleWindow = ref([]);
	const isDebugMode = ref(false);
	const calibrationShown = ref(false); // 本页面会话内已显示过校准弹窗
	let debugTapCount = 0;
	let debugTapTimer = null;
	let angleTimer = null;

	// ── 租赁状态 ──
	const leaseInfo = ref({
		actualCost: 0,
		duration: 0,
		rate: 0,
	});
	const activeTradeNo = ref('');
	let leaseTimer = null;

	// ── 轨迹采集 ──
	const trajectoryPoints = ref([]);
	let trajectoryTimer = null;
	const TRAJECTORY_INTERVAL = 5000; // 5秒采集一次

	// 开始采集轨迹
	function startTrajectoryCollection() {
		stopTrajectoryCollection();
		trajectoryPoints.value = [];
		// 立即采集一次
		collectLocation();
		// 定时采集
		trajectoryTimer = setInterval(collectLocation, TRAJECTORY_INTERVAL);
	}

	// 停止采集轨迹
	function stopTrajectoryCollection() {
		if (trajectoryTimer) {
			clearInterval(trajectoryTimer);
			trajectoryTimer = null;
		}
	}

	// 采集当前位置
	function collectLocation() {
		uni.getLocation({
			type: 'gcj02',
			success: (res) => {
				trajectoryPoints.value.push({
					latitude: res.latitude,
					longitude: res.longitude,
					timestamp: Date.now(),
				});
				// 本地缓存
				if (activeTradeNo.value) {
					uni.setStorageSync('trajectory_' + activeTradeNo.value, trajectoryPoints.value);
				}
			},
			fail: (err) => {
				console.warn('[Trajectory] 定位失败:', err.errMsg);
			},
		});
	}

	// 上传轨迹到后端
	async function uploadTrajectory() {
		if (!activeTradeNo.value || trajectoryPoints.value.length < 2) return;
		try {
			await api.uploadTrajectory(activeTradeNo.value, trajectoryPoints.value);
			console.log('[Trajectory] 轨迹上传成功');
		} catch (e) {
			console.error('[Trajectory] 轨迹上传失败:', e.message);
		}
	}

	// ── 模式定义 ──
	const modes = [{
			id: 'transparent',
			title: '透明模式',
			subtitle: 'TRANSPARENT',
			accent: '#43CDB7',
			haloFill: '#E7F7F4',
			haloOuter: '#CFF6EE',
			haloArc: '#B5E8E0',
			haloLine: '#BCEFE6',
		},
		{
			id: 'assist',
			title: '助力模式',
			subtitle: 'ASSIST',
			accent: '#746AF2',
			haloFill: '#F1EEFF',
			haloOuter: '#E2DCFF',
			haloArc: '#CFC5FF',
			haloLine: '#D7D0FF',
		},
		{
			id: 'training',
			title: '训练模式',
			subtitle: 'TRAINING',
			accent: '#D96AF0',
			haloFill: '#FFF0FD',
			haloOuter: '#F8D9FA',
			haloArc: '#F0B0F7',
			haloLine: '#F0C7F8',
		},
	];

	const selectedMode = computed(() => {
		return modes.find(m => m.id === store.mode) || modes[0];
	});

	const activeLevel = computed(() =>
		store.mode === 'training' ? store.impedanceLevel : store.assistLevel
	);

	const hasFault = computed(() => store.status.errorCode !== 0);
	const controlsLocked = computed(() =>
		store.isStopping || hasFault.value || store.commandLoading.size > 0
	);

	const faultDesc = computed(() => faultCodeDescription(store.status.errorCode));

	const formattedRuntime = computed(() => {
		const sec = store.status.runtimeSeconds || 0;
		const h = Math.floor(sec / 3600);
		const m = Math.floor((sec % 3600) / 60);
		const s = sec % 60;
		return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	});

	const bottomLeftValue = computed(() => {
		if (store.mode === 'transparent') {
			const avg = ((store.status.motor0TempC || 0) + (store.status.motor1TempC || 0)) / 2;
			return avg > 0 ? `${Math.round(avg)}°C` : '--';
		}
		return `${activeLevel.value * 10}%`;
	});

	const bottomLeftLabel = computed(() => {
		if (store.mode === 'transparent') return '电机温度';
		if (store.mode === 'training') return '阻抗量';
		return '助力量';
	});

	const bottomLeftProgress = computed(() => {
		if (store.mode === 'transparent') {
			const avg = ((store.status.motor0TempC || 0) + (store.status.motor1TempC || 0)) / 2;
			return (avg / 80).clamp(0, 1);
		}
		return (activeLevel.value / 10).clamp(0, 1);
	});

	const walkSpeedKmh = computed(() => {
		const steps = store.status.stepCount;
		const secs = store.status.runtimeSeconds;
		if (secs === 0) return 0;
		return (steps / secs * 0.7 * 3.6);
	});

	// ── 顶部栏透明度 ──
	const topBarOpacity = computed(() => {
		return (1.0 - scrollOffset.value / 60).clamp(0, 1);
	});

	function onScroll(e) {
		scrollOffset.value = e.detail.scrollTop || 0;
	}

	// ── Halo 样式 ──
	const haloStyle = computed(() => ({
		background: `radial-gradient(circle at 50% 56%, ${selectedMode.value.haloFill}A3, ${selectedMode.value.haloFill}57 58%, ${selectedMode.value.haloFill}14 100%)`,
	}));

	const arcStyle = computed(() => ({
		borderColor: selectedMode.value.haloArc + '9E',
	}));

	const haloRingColor = computed(() => selectedMode.value.haloOuter + '70');
	const haloLineColor1 = computed(() => selectedMode.value.haloLine + '8F');
	const haloLineColor2 = computed(() => selectedMode.value.haloLine + '57');

	// ── 输出开关变化 ──
	async function onOutputChange(value) {
		if (store.controlsLocked) return;
		resetKeepAliveIdle();
		if (value) {
			await startRunning();
			// 设备启动后开始采集轨迹
			startTrajectoryCollection();
		} else {
			uni.showModal({
				title: '确认停止',
				content: '确定要停止设备运行吗？',
				success: async (res) => {
					if (res.confirm) {
						await stopRunning();
						// 设备停止后停止采集轨迹
						stopTrajectoryCollection();
					} else {
						store.setEnabled(true);
					}
				},
			});
		}
	}

	// ── 等级变化 ──
	async function onLevelChange(value) {
		if (hasFault.value) return;
		resetKeepAliveIdle();
		const isTraining = store.mode === 'training';
		await changeLevel(value, isTraining);
	}

	// ── 模式切换 ──
	async function onModeSelect(mode) {
		if (mode.id === store.mode) return;
		if (store.enabled) {
			uni.showToast({
				title: '请先停止运行再切换模式',
				icon: 'none',
				duration: 2000
			});
			return;
		}
		resetKeepAliveIdle();
		loadingTargetMode.value = mode.id;
		try {
			await switchMode(mode.id);
		} finally {
			loadingTargetMode.value = null;
		}
	}

	// ── 清除故障 ──
	async function handleClearFault() {
		const confirmed = await new Promise(resolve => {
			uni.showModal({
				title: '清除故障',
				content: '确认清除当前故障并切换到透明模式吗？',
				confirmText: '确认清除',
				cancelText: '取消',
				success: (res) => resolve(res.confirm),
			});
		});
		if (!confirmed) return;
		await clearFault();
	}

	// ── 紧急停止 ──
	async function showEmergencyStopConfirm() {
		const confirmed = await new Promise(resolve => {
			uni.showModal({
				title: '紧急停止',
				content: '确认立即执行紧急停止吗？',
				confirmText: '紧急停止',
				confirmColor: '#FF5C7A',
				cancelText: '取消',
				success: (res) => resolve(res.confirm),
			});
		});
		if (!confirmed) return;
		store.setEnabled(false);
		await stopRunning();
	}

	// ── 校准 ──
	function showCalibrateDialog() {
		calibrationShown.value = true;
		uni.showModal({
			title: '零点校准',
			content: '执行零点校准前请确保设备处于静止状态。是否开始？',
			confirmText: '开始校准',
			cancelText: '取消',
			success: async (res) => {
				if (res.confirm) {
					try {
						await sendCommand(store.deviceId, CMD.calibrateZero);
						store.setNeedsCalibration(false);
						uni.showToast({
							title: '校准已启动',
							icon: 'success'
						});
					} catch (e) {
						uni.showToast({
							title: e.message || '校准失败',
							icon: 'none'
						});
					}
				} else {
					// 用户取消校准后，标记为已处理，避免重复弹窗
					store.setNeedsCalibration(false);
				}
			},
		});
	}

	// ── 调试热区 ──
	function handleDebugTap() {
		debugTapCount++;
		if (debugTapTimer) clearTimeout(debugTapTimer);
		debugTapTimer = setTimeout(() => {
			debugTapCount = 0;
		}, 2000);
		if (debugTapCount >= 5) {
			debugTapCount = 0;
			isDebugMode.value = true;
			uni.showToast({
				title: '调试模式已激活',
				icon: 'none'
			});
		}
	}

	// ── 关节角度历史 ──
	function pushAnglePoint() {
		const now = Date.now();
		angleWindow.value.push({
			timestampMs: now,
			leftHipAngle: store.status.leftHipAngle || 0,
			rightHipAngle: store.status.rightHipAngle || 0,
		});
		// 保留最近 15 秒
		const cutoff = now - 15000;
		angleWindow.value = angleWindow.value.filter(p => p.timestampMs >= cutoff);
	}

	// ── 断开连接 ──
	function onDisconnect() {
		uni.showModal({
			title: '断开连接',
			content: '确定要断开与设备的连接吗？',
			confirmText: '断开',
			confirmColor: '#FF5C7A',
			cancelText: '取消',
			success: async (res) => {
				if (res.confirm) {
					await disconnectDevice();
					uni.showToast({ title: '已断开连接', icon: 'success' });
					uni.reLaunch({ url: '/pages/index/index' });
				}
			},
		});
	}

	// ── 格式化时长 ──
	function formatDuration(seconds) {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = seconds % 60;
		return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	}

	// ── 查询租赁状态 ──
	async function fetchLeaseStatus() {
		if (!activeTradeNo.value) return;
		try {
			const res = await api.getLeaseStatusByTradeNo(activeTradeNo.value);
			if (res.code === 200 && res.data) {
				leaseInfo.value.actualCost = res.data.actualCost ?? res.data.cost ?? 0;
				leaseInfo.value.duration = res.data.duration || 0;
				store.updateLeaseCost(res.data.actualCost ?? res.data.cost ?? 0);
			}
		} catch (e) {
			console.error('获取租赁状态失败', e);
		}
	}

	// ── 归还设备 ──
	async function onReturnDevice() {
		if (store.enabled) {
			uni.showModal({
				title: '确认归还',
				content: '设备正在运行中，是否先停止并归还？',
				confirmText: '停止并归还',
				cancelText: '取消',
				success: async (res) => {
					if (res.confirm) {
						await stopRunning();
						doReturnDevice();
					}
				},
			});
		} else {
			doReturnDevice();
		}
	}

	async function doReturnDevice() {
		uni.showModal({
			title: '归还设备',
			content: '确定要归还设备吗？',
			confirmText: '归还',
			cancelText: '取消',
			success: async (res) => {
					if (!res.confirm) return;
					try {
						// 先停止轨迹采集并上传
						stopTrajectoryCollection();
						await uploadTrajectory();
						// 获取当前定位
						const loc = await new Promise((resolve) => {
							uni.getLocation({
								type: 'gcj02',
								success: (r) => resolve({ lng: r.longitude, lat: r.latitude }),
								fail: () => resolve({ lng: null, lat: null }),
							});
						});
						const returnParams = {};
						if (loc.lng != null) returnParams.lng = loc.lng;
						if (loc.lat != null) returnParams.lat = loc.lat;
						const result = await api.returnDevice(store.leaseDeviceSn, returnParams);
						if (result.code === 200) {
							const deposit = store.leaseDeposit;
							store.endLease();
							uni.removeStorageSync('activeTradeNo');
							uni.removeStorageSync('activeDeviceSn');
							// 清理本地轨迹缓存
							uni.removeStorageSync('trajectory_' + activeTradeNo.value);
							uni.setStorageSync('lastDepositRefund', deposit);
							const returnedTradeNo = result.data?.tradeNo || activeTradeNo.value;
							uni.redirectTo({ url: `/pages/device/completed?tradeNo=${returnedTradeNo}` });
						} else {
							uni.showToast({ title: result.msg || '归还失败', icon: 'none' });
						}
					} catch (e) {
						uni.showToast({ title: e.message || '归还失败', icon: 'none' });
					}
				},
		});
	}

	// ── 返回 ──
	function goBack() {
		uni.navigateBack();
	}

	onMounted(() => {
		angleTimer = setInterval(pushAnglePoint, 200);

		// 首次连接后自动提示零点校准（同一页面会话内只弹一次）
		if (store.needsCalibration && !calibrationShown.value) {
			setTimeout(() => {
				showCalibrateDialog();
			}, 600);
		}

		// 获取租赁订单号并启动定时查询
		activeTradeNo.value = uni.getStorageSync('activeTradeNo') || store.tradeNo || '';
		if (activeTradeNo.value) {
			fetchLeaseStatus();
			leaseTimer = setInterval(fetchLeaseStatus, 10000);
		}
	});

	onUnmounted(() => {
		if (angleTimer) clearInterval(angleTimer);
		if (debugTapTimer) clearTimeout(debugTapTimer);
		if (leaseTimer) clearInterval(leaseTimer);
	});
</script>

<script>
	Number.prototype.clamp = function(min, max) {
		return Math.max(min, Math.min(max, this));
	};
</script>

<style scoped>
	/* ── 根容器 ── */
	.control-page {
		position: relative;
		width: 100vw;
		height: 100vh;
		overflow: hidden;
		background: #f5f6fa;
	}

	/* ── 固定背景 ── */
	.page-bg {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(135deg, #FCFDFF 0%, #F2FBF8 50%, #F8F4FF 100%);
		z-index: 0;
	}

	/* ── 滚动区域 ── */
	.scroll-content {
		position: relative;
		width: 100%;
		height: 100vh;
		z-index: 1;
	}

	.content-inner {
		padding: 18px;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	/* ── 中央仪表盘 ── */
	.dashboard-wrap {
		position: relative;
		width: 100%;
		height: 372px;
	}

	/* 光晕容器 */
	.halo-wrap {
		position: absolute;
		top: 16px;
		left: 50%;
		transform: translateX(-50%);
		width: 280px;
		height: 280px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1;
	}

	/* 外环 */
	.halo-ring {
		position: absolute;
		width: 100%;
		height: 100%;
		border-radius: 50%;
		border: 1.5px solid rgba(188, 239, 230, 0.44);
	}

	/* 弧线 */
	.halo-arc {
		position: absolute;
		width: 100%;
		height: 100%;
		border-radius: 50%;
		border: 3px solid;
		border-color: rgba(181, 232, 224, 0.62);
		transform: rotate(-45deg);
	}

	/* 内环 */
	.halo-inner-ring {
		position: absolute;
		width: 72%;
		height: 72%;
		border-radius: 50%;
		border: 1px solid rgba(188, 239, 230, 0.35);
	}

	/* 核心 */
	.halo-core {
		position: absolute;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: rgba(67, 205, 183, 0.25);
	}

	/* 产品图 */
	.exo-image {
		position: absolute;
		top: 26px;
		left: 50%;
		transform: translateX(-50%);
		width: 260px;
		height: 260px;
		z-index: 2;
	}

	/* 指标气泡定位 */
	.bubble-top-left {
		position: absolute;
		top: 20px;
		left: 0;
		z-index: 3;
	}

	.bubble-top-right {
		position: absolute;
		top: 20px;
		right: 0;
		z-index: 3;
	}

	.bubble-bottom-left {
		position: absolute;
		bottom: 100px;
		left: 0;
		z-index: 3;
	}

	.bubble-bottom-right {
		position: absolute;
		bottom: 100px;
		right: 0;
		z-index: 3;
	}

	/* 仪表盘底部：模式标题和开关 */
	.dashboard-center {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		z-index: 3;
	}

	.mode-title {
		font-size: 20px;
		font-weight: 700;
		color: #333;
		line-height: 1.3;
	}

	.mode-subtitle {
		font-size: 11px;
		color: #999;
		letter-spacing: 2px;
		margin-top: 2px;
	}

	.mode-switch {
		margin-top: 12px;
	}

	/* ── 底部模式条 ── */
	.bottom-bar {
		position: fixed;
		left: 14px;
		right: 14px;
		bottom: calc(env(safe-area-inset-bottom) + 14px);
		z-index: 100;
	}

	/* ── 故障弹窗 ── */
	.fault-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 200;
	}

	.fault-modal {
		width: 280px;
		background: #FFFFFF;
		border-radius: 20px;
		padding: 32px 24px;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.fault-icon {
		font-size: 48px;
		line-height: 1;
		color: #FF5C7A;
		margin-bottom: 16px;
	}

	.fault-title {
		font-size: 18px;
		font-weight: 600;
		color: #333;
		margin-bottom: 8px;
	}

	.fault-desc {
		font-size: 14px;
		color: #999;
		text-align: center;
		margin-bottom: 24px;
		line-height: 1.5;
	}

	.fault-btn {
		width: 100%;
		height: 48px;
		background: #FF5C7A;
		border-radius: 12px;
		color: #FFFFFF;
		font-size: 16px;
		font-weight: 600;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* ── 租赁信息卡片 ── */
	.lease-info-card {
		background: #fff;
		border-radius: 16px;
		padding: 16px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
	}

	.lease-info-row {
		display: flex;
		justify-content: space-around;
		align-items: center;
	}

	.lease-info-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}

	.lease-info-value {
		font-size: 18px;
		font-weight: 800;
		color: #1DB5A6;
	}

	.lease-info-label {
		font-size: 12px;
		color: #999;
		font-weight: 600;
	}

	/* ── 运动轨迹 ── */
	.trajectory-section {
		margin: 16px 0 8px;
	}

	.trajectory-title {
		font-size: 14px;
		font-weight: 700;
		color: $textMainColor;
		margin-bottom: 10px;
		display: block;
	}

	/* ── 归还设备按钮 ── */
	.return-section {
		display: flex;
		justify-content: center;
		margin-top: 8px;
	}

	.return-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 12px 28px;
		border-radius: 999px;
		background: rgba(29, 181, 166, 0.08);
		border: 1px solid rgba(29, 181, 166, 0.25);
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
		transition: all 0.2s;
	}

	.return-btn:active {
		background: rgba(29, 181, 166, 0.15);
		transform: scale(0.97);
	}

	.return-icon {
		font-size: 16px;
	}

	.return-text {
		font-size: 14px;
		font-weight: 600;
		color: #1DB5A6;
	}

	/* ── 断开连接按钮 ── */
	.disconnect-section {
		display: flex;
		justify-content: center;
		margin-top: 8px;
	}

	.disconnect-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 12px 28px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.72);
		border: 1px solid rgba(255, 92, 122, 0.18);
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
		transition: all 0.2s;
	}

	.disconnect-btn:active {
		background: rgba(255, 92, 122, 0.08);
		transform: scale(0.97);
	}

	.disconnect-icon {
		font-size: 16px;
	}

	.disconnect-text {
		font-size: 14px;
		font-weight: 600;
		color: #FF5C7A;
	}
</style>