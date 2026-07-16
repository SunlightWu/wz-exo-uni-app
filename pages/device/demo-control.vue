<template>
	<view class="demo-page">
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
			<view class="cost-hint cost-rule-hint">
				<text>不足1小时按1小时计费</text>
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
				<text>结束使用</text>
			</view>
		</view>

		<view style="height: 30px;"></view>
	</view>
</template>

<script>
	export default {
		onBackPress() {
			uni.switchTab({ url: '/pages/index/index' });
			return true;
		}
	}
</script>

<script setup>
	import {
		ref,
		computed,
		onMounted,
		onUnmounted
	} from 'vue';
	import TrajectoryMap from '../../components/TrajectoryMap.vue';
	import {
		api
	} from '../../services/api.js';
	import {
		reportLocation,
		resetLocationDedup
	} from '../../services/location.js';
	import {
		useDeviceStore
	} from '../../store/device.js';

	const deviceName = ref('外骨骼设备');
	const tradeNo = ref('');
	const deviceSn = ref('');
	const cabinetId = ref('');
	const hourlyRate = ref(0); // 小时费率（分）
	const freeMinutes = ref(0);
	const depositMoney = ref(0); // 押金（分）
	const isRunning = ref(true);
	const elapsedSeconds = ref(0);
	const trajectoryPoints = ref([]);

	const deviceStore = useDeviceStore();

	let timer = null;
	let trajTimer = null;

	function initLeaseSession() {
		if (deviceStore.leaseRunning && deviceStore.tradeNo === tradeNo.value) {
			elapsedSeconds.value = Math.floor((Date.now() - deviceStore.leaseStartTime) / 1000);
			isRunning.value = true;
			startTimers();
			collectLocation();
			return;
		}

		deviceStore.setLeaseInfo({
			tradeNo: tradeNo.value,
			deviceSn: deviceSn.value,
			deviceName: deviceName.value,
			startTime: Date.now(),
			rate: hourlyRate.value,
			freeMinutes: freeMinutes.value,
			deposit: depositMoney.value,
		});
		startTimers();
		collectLocation();
	}

	function startTimers() {
		if (timer || trajTimer) return;
		timer = setInterval(() => {
			if (isRunning.value) elapsedSeconds.value++;
		}, 1000);
		trajTimer = setInterval(collectLocation, 5000);
	}

	// 费用计算（hourlyRate 是小时费率，单位：分/小时）
	// 计费规则：免费期一过即按1小时计，不足1小时按1小时算
	const currentCost = computed(() => {
		const totalSeconds = elapsedSeconds.value;
		const freeSeconds = freeMinutes.value * 60;
		if (totalSeconds <= freeSeconds) return 0;
		const billableSeconds = totalSeconds - freeSeconds;
		const billableMinutes = billableSeconds / 60;
		const billableHours = Math.ceil(billableMinutes / 60);
		return (billableHours * hourlyRate.value) / 100;
	});

	const freeDiscount = computed(() => {
		const totalSeconds = elapsedSeconds.value;
		const freeSeconds = freeMinutes.value * 60;
		if (totalSeconds <= freeSeconds) return 0;
		const usedFreeSeconds = Math.min(totalSeconds, freeSeconds);
		// 免费部分按免费时长 × 小时费率计算（不按小时阶梯）
		return (usedFreeSeconds / 60 * hourlyRate.value) / 60 / 100;
	});

	const billableHoursText = computed(() => {
		const totalSeconds = elapsedSeconds.value;
		const freeSeconds = freeMinutes.value * 60;
		if (totalSeconds <= freeSeconds) return '0小时';
		const billableSeconds = totalSeconds - freeSeconds;
		const billableMinutes = billableSeconds / 60;
		const hours = Math.ceil(billableMinutes / 60);
		return `${hours}小时`;
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

	onMounted(async () => {
		const pages = getCurrentPages();
		const page = pages[pages.length - 1];
		const query = page.options || page.$page?.options || page.$route?.query || {};
		deviceName.value = decodeURIComponent(query.name || '') || '外骨骼设备';
		tradeNo.value = query.tradeNo || '';
		deviceSn.value = query.deviceSn || '';
		cabinetId.value = query.cabinetId || '';
		hourlyRate.value = parseInt(query.hourlyRate) || 0;
		freeMinutes.value = parseInt(query.freeMinutes) || 0;
		depositMoney.value = parseInt(query.depositMoney) || 0;

		await loadExistingTrajectory();

		initLeaseSession();
	});

	onUnmounted(() => {
		clearAllTimers();
	});

	function clearAllTimers() {
		if (timer) {
			clearInterval(timer);
			timer = null;
		}
		if (trajTimer) {
			clearInterval(trajTimer);
			trajTimer = null;
		}
	}

	async function collectLocation() {
		if (!isRunning.value || !deviceSn.value) return;
		// 使用统一的上报服务（内部包含去重）
		const result = await reportLocation(deviceSn.value);
		if (result.success && Number.isFinite(Number(result.latitude)) && Number.isFinite(Number(result.longitude))) {
			addTrajectoryPoint({
				latitude: result.latitude,
				longitude: result.longitude,
				timestamp: Date.now(),
			});
		}
	}

	async function loadExistingTrajectory() {
		if (!tradeNo.value) return;
		try {
			const res = await api.getOrderTrack(tradeNo.value);
			console.log('[DemoControl] getOrderTrack:', res);
			if ((res.code === 200 || res.code === 0) && res.data) {
				const rawPoints = extractTrackPoints(res.data);
				const points = rawPoints
					.map(normalizeTrackPoint)
					.filter(Boolean);
				trajectoryPoints.value = mergeTrajectoryPoints([], points, true);
				console.log('[DemoControl] 已恢复历史轨迹点:', trajectoryPoints.value.length);
			}
		} catch (e) {
			console.warn('[DemoControl] 恢复历史轨迹失败:', e.message || e);
		}
	}

	function extractTrackPoints(data) {
		if (Array.isArray(data)) return data;
		if (Array.isArray(data.points)) return data.points;
		if (Array.isArray(data.records)) return data.records;
		if (Array.isArray(data.list)) return data.list;
		return [];
	}

	function normalizeTrackPoint(point) {
		if (!point) return null;
		const latitude = Number(point.latitude ?? point.lat);
		const longitude = Number(point.longitude ?? point.lng);
		if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
		const rawTime = point.timestamp || point.reportTime || point.createTime || point.time || Date.now();
		const timestampMs = typeof rawTime === 'number' ? rawTime : new Date(rawTime).getTime();
		return {
			...point,
			latitude,
			longitude,
			timestamp: rawTime,
			timestampMs: Number.isFinite(timestampMs) ? timestampMs : Date.now(),
		};
	}

	function addTrajectoryPoint(point) {
		const normalized = normalizeTrackPoint(point);
		if (!normalized) return;
		const last = trajectoryPoints.value[trajectoryPoints.value.length - 1];
		if (last && sameLocation(last, normalized)) return;
		trajectoryPoints.value = mergeTrajectoryPoints(trajectoryPoints.value, [normalized], false);
	}

	function mergeTrajectoryPoints(existing, incoming, sortByTime = false) {
		const merged = [];
		const seen = new Set();
		[...(existing || []), ...(incoming || [])].forEach((point, index) => {
			const normalized = normalizeTrackPoint(point);
			if (!normalized) return;
			const key = `${normalized.latitude.toFixed(6)},${normalized.longitude.toFixed(6)},${normalized.timestampMs}`;
			if (seen.has(key)) return;
			seen.add(key);
			merged.push({ ...normalized, orderIndex: point.orderIndex ?? index });
		});
		if (sortByTime) {
			merged.sort((a, b) => {
				if (a.timestampMs !== b.timestampMs) return a.timestampMs - b.timestampMs;
				return a.orderIndex - b.orderIndex;
			});
		}
		return merged;
	}

	function sameLocation(a, b) {
		return Number(a.latitude).toFixed(6) === Number(b.latitude).toFixed(6)
			&& Number(a.longitude).toFixed(6) === Number(b.longitude).toFixed(6);
	}

	function onFinish() {
		const minutes = Math.floor(elapsedSeconds.value / 60);
		const cost = currentCost.value;
		const billableText = billableHoursText.value;
		uni.showModal({
			title: '结束体验',
			content: `已使用 ${formatMinutes(elapsedSeconds.value)}，计费 ${billableText}，费用 ¥${cost.toFixed(2)}，确认结束？`,
			confirmText: '确认结束',
			cancelText: '继续使用',
			confirmColor: '#306afc',
			success: async (res) => {
				if (!res.confirm) return;
				uni.showLoading({
					title: '正在归还设备...',
					mask: true
				});
				try {
					// 获取当前定位
					const loc = await new Promise((resolve) => {
						uni.getLocation({
							type: 'gcj02',
							success: (r) => resolve({ lng: r.longitude, lat: r.latitude }),
							fail: () => resolve({ lng: null, lat: null }),
						});
					});
					const returnParams = {};
					if (cabinetId.value) returnParams.returnCabinetId = cabinetId.value;
					if (loc.lng != null) returnParams.lng = loc.lng;
					if (loc.lat != null) returnParams.lat = loc.lat;
					// 调用真实归还接口
					if (deviceSn.value) {
						const res = await api.returnDevice(deviceSn.value, returnParams);
						console.log(res,'===');
							// 跳转到费用确认页（关闭当前页，防止返回）
						if(res.code == 200) {
							// 停止所有定时器，清除租赁状态和定位去重
							clearAllTimers();
							deviceStore.endLease();
							resetLocationDedup();
							uni.redirectTo({
								url: `/pages/device/completed?tradeNo=${res.data.tradeNo}&duration=${elapsedSeconds.value}`,
							});
						}else {
							uni.showToast({
								title: res.msg || '归还失败',
								icon: 'none'
							});
						}
					}
					
				} catch (e) {
					uni.showToast({
						title: e.message || '归还失败',
						icon: 'none'
					});
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
		from {
			transform: rotate(0deg);
		}

		to {
			transform: rotate(360deg);
		}
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

		0%,
		100% {
			opacity: 1;
		}

		50% {
			opacity: 0.3;
		}
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

	.cost-rule-hint {
		padding-top: 4px;
		border-top: none;
		color: #999;
		font-size: 11px;
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
