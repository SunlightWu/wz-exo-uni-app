<template>
	<view class="demo-page">
		<!-- 顶部渐变背景区 -->
		<view class="header-bg"></view>

		<!-- 大号计时器 -->
		<view class="timer-card">
			<view class="timer-ring">
				<view class="timer-inner">
					<text class="timer-label">使用时长</text>
					<text class="timer-value">{{ formattedTime }}</text>
					<view class="timer-status running">
						<view class="status-dot"></view>
						<text class="status-text">运行中</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 设备信息卡 -->
		<view class="info-card device-info-card">
			<view class="card-header">
				<u-icon name="setting-fill" color="#306afc" size="16"></u-icon>
				<text class="card-title">设备信息</text>
			</view>
			<view class="device-info-body">
				<view class="device-info-row">
					<u-icon name="tags" color="#999" size="14"></u-icon>
					<text class="device-info-label">设备编号</text>
					<text class="device-info-value mono">{{ deviceSn || 'EXO-0000' }}</text>
				</view>
				<view class="device-info-row">
					<u-icon name="file-text" color="#999" size="14"></u-icon>
					<text class="device-info-label">订单编号</text>
					<text class="device-info-value mono">{{ tradeNo || '-' }}</text>
				</view>
				<view class="device-info-row">
					<u-icon name="battery-half" color="#999" size="14"></u-icon>
					<text class="device-info-label">剩余电量</text>
					<view class="battery-wrap">
						<view class="battery-bar">
							<view class="battery-fill" :style="{ width: batteryLevel + '%' }"></view>
						</view>
						<text class="battery-text">{{ batteryLevel }}%</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 费用信息 -->
		<view class="cost-card">
			<view class="cost-row">
				<view class="cost-item">
					<view class="cost-icon-wrap" style="background: rgba(48,106,252,0.1);">
						<u-icon name="rmb-circle-fill" color="#306afc" size="20"></u-icon>
					</view>
					<text class="cost-num cost-num-primary">¥{{ currentCost.toFixed(2) }}</text>
					<text class="cost-label">当前费用</text>
				</view>
				<view class="cost-divider"></view>
				<view class="cost-item">
					<view class="cost-icon-wrap" style="background: rgba(245,158,11,0.1);">
						<u-icon name="clock-fill" color="#f59e0b" size="20"></u-icon>
					</view>
					<text class="cost-num">{{ formatMinutes(elapsedSeconds) }}</text>
					<text class="cost-label">已用时长</text>
				</view>
				<view class="cost-divider"></view>
				<view class="cost-item">
					<view class="cost-icon-wrap" style="background: rgba(139,92,246,0.1);">
						<u-icon name="tags-fill" color="#8b5cf6" size="20"></u-icon>
					</view>
					<text class="cost-num">¥{{ (hourlyRate / 100).toFixed(2) }}/小时</text>
					<text class="cost-label">费率</text>
				</view>
			</view>
			<!-- 计费进度条 -->
			<!-- <view v-if="freeMinutes > 0" class="billing-progress">
				<view class="progress-track">
					<view class="progress-fill" :style="{ width: progressPercent + '%' }" :class="{ 'progress-paid': elapsedSeconds > freeMinutes * 60 }"></view>
				</view>
				<view class="progress-labels">
					<text class="progress-label" :class="{ 'progress-active': elapsedSeconds <= freeMinutes * 60 }">免费期</text>
					<text class="progress-label" :class="{ 'progress-active': elapsedSeconds > freeMinutes * 60 }">计费期</text>
				</view>
			</view> -->
			<view v-if="freeMinutes > 0" class="cost-hint">
				<text v-if="elapsedSeconds <= freeMinutes * 60">免费剩余 {{ freeMinutes - Math.floor(elapsedSeconds / 60) }} 分钟</text>
				<text v-else>已进入计费期，当前第 {{ billableHoursText }}</text>
			</view>
			<view v-if="elapsedSeconds > freeMinutes * 60" class="cost-hint cost-rule-hint">
				<text>不足1小时按1小时计费</text>
			</view>
		</view>

		<!-- 运动轨迹 -->
		<view class="info-card">
			<view class="card-header">
				<u-icon name="map-fill" color="#306afc" size="16"></u-icon>
				<text class="card-title">运动轨迹</text>
			</view>
			<view v-if="trajectoryPoints.length > 0">
				<view class="track-map-wrap">
					<map
						id="trackMap"
						class="track-map"
						:latitude="trackCenter.lat"
						:longitude="trackCenter.lng"
						:scale="trackScale"
						:polyline="polylineOption"
						:markers="markersOption"
						:include-points="includePointsOption"
					></map>
				</view>
				<view class="track-stats">
					<text class="track-stat">共 {{ trajectoryPoints.length }} 个轨迹点</text>
					<!-- <text class="track-stat">已运动 {{ formatMinutes(elapsedSeconds) }}</text> -->
				</view>
			</view>
			<view v-else class="track-empty">
				<text class="track-empty-text">暂无轨迹数据</text>
			</view>
		</view>

		<!-- 结束体验 -->
		<view class="finish-section">
			<view class="finish-btn" @click="onFinish">
				<text>结束使用</text>
			</view>
		</view>

		<view style="height: calc(30px + env(safe-area-inset-bottom));"></view>
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
	import {
		api
	} from '../../services/api.js';
	import {
		parseDate
	} from '../../utils/format.js';
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
	const elapsedSeconds = ref(0);
	const trajectoryPoints = ref([]);
	const batteryLevel = ref(80); // 设备电量（模拟，后续可接入真实数据）

	const deviceStore = useDeviceStore();

	let timer = null;
	let trajTimer = null;

	function initLeaseSession() {
		if (deviceStore.leaseRunning && deviceStore.tradeNo === tradeNo.value) {
			elapsedSeconds.value = Math.floor((Date.now() - deviceStore.leaseStartTime) / 1000);
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
		// 基于基准时间计数，避免 setInterval 漂移
		const baseTime = Date.now() - elapsedSeconds.value * 1000;
		timer = setInterval(() => {
			elapsedSeconds.value = Math.floor((Date.now() - baseTime) / 1000);
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

	// 计费进度条百分比（以 2 倍免费时长为满格参考）
	const progressPercent = computed(() => {
		if (freeMinutes.value <= 0) return 0;
		const freeSeconds = freeMinutes.value * 60;
		const maxSeconds = freeSeconds * 2; // 满格参考
		const percent = (elapsedSeconds.value / maxSeconds) * 100;
		return Math.min(percent, 100);
	});

	const formattedTime = computed(() => {
		const h = Math.floor(elapsedSeconds.value / 3600);
		const m = Math.floor((elapsedSeconds.value % 3600) / 60);
		const s = elapsedSeconds.value % 60;
		return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	});

	// ── 轨迹地图相关计算属性 ──
	const validTrackPoints = computed(() => {
		return (trajectoryPoints.value || [])
			.map(p => ({
				...(p || {}),
				latitude: Number(p?.latitude),
				longitude: Number(p?.longitude),
			}))
			.filter(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
	});

	const trackCenter = computed(() => {
		const pts = validTrackPoints.value;
		if (pts.length === 0) return { lat: 29.54, lng: 106.45 };
		const lats = pts.map(p => p.latitude);
		const lngs = pts.map(p => p.longitude);
		return {
			lat: (Math.min(...lats) + Math.max(...lats)) / 2,
			lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
		};
	});

	const trackScale = computed(() => {
		const pts = validTrackPoints.value;
		if (pts.length <= 1) return 16;
		const lats = pts.map(p => p.latitude);
		const lngs = pts.map(p => p.longitude);
		const latRange = Math.max(...lats) - Math.min(...lats);
		const lngRange = Math.max(...lngs) - Math.min(...lngs);
		const maxRange = Math.max(latRange, lngRange);
		if (maxRange < 0.001) return 18;
		if (maxRange < 0.005) return 17;
		if (maxRange < 0.01) return 16;
		if (maxRange < 0.03) return 15;
		if (maxRange < 0.05) return 14;
		if (maxRange < 0.1) return 13;
		if (maxRange < 0.3) return 12;
		if (maxRange < 0.8) return 11;
		return 10;
	});

	const includePointsOption = computed(() => {
		return validTrackPoints.value.map(p => ({
			latitude: p.latitude,
			longitude: p.longitude,
		}));
	});

	const polylineOption = computed(() => {
		const pts = validTrackPoints.value;
		if (pts.length < 2) return [];
		return [{
			points: pts.map(p => ({ latitude: p.latitude, longitude: p.longitude })),
			color: '#306afc',
			width: 4,
			arrowLine: true,
		}];
	});

	const markersOption = computed(() => {
		const pts = validTrackPoints.value;
		if (pts.length === 0) return [];
		const markers = [];
		// 起点
		markers.push({
			id: 0,
			latitude: pts[0].latitude,
			longitude: pts[0].longitude,
			iconPath: '/static/marker-start.png',
			width: 32,
			height: 32,
			anchor: { x: 0.5, y: 1 },
			callout: {
				content: '起点',
				display: 'ALWAYS',
				fontSize: 11,
				borderRadius: 6,
				padding: 6,
				bgColor: '#fff',
				color: '#306afc',
				textAlign: 'center',
			},
		});
		// 终点
		if (pts.length > 1) {
			const last = pts[pts.length - 1];
			markers.push({
				id: 1,
				latitude: last.latitude,
				longitude: last.longitude,
				iconPath: '/static/marker-end.png',
				width: 32,
				height: 32,
				anchor: { x: 0.5, y: 1 },
				callout: {
					content: '终点',
					display: 'ALWAYS',
					fontSize: 11,
					borderRadius: 6,
					padding: 6,
					bgColor: '#fff',
					color: '#ef4444',
					textAlign: 'center',
				},
			});
		}
		return markers;
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
		uni.setNavigationBarTitle({ title: deviceName.value });
		tradeNo.value = query.tradeNo || '';
		deviceSn.value = query.deviceSn || '';
		cabinetId.value = query.cabinetId || '';
		hourlyRate.value = parseInt(query.hourlyRate) || 0;
		freeMinutes.value = parseInt(query.freeMinutes) || 0;
		depositMoney.value = parseInt(query.depositMoney) || 0;

		// 并行加载历史轨迹和初始化租赁会话
		await Promise.all([loadExistingTrajectory(), Promise.resolve().then(() => initLeaseSession())]);
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
		if (!deviceSn.value) return;
		// 使用统一的上报服务（内部包含去重）
		try {
			const result = await reportLocation(deviceSn.value);
			if (result.success && Number.isFinite(Number(result.latitude)) && Number.isFinite(Number(result.longitude))) {
				addTrajectoryPoint({
					latitude: result.latitude,
					longitude: result.longitude,
					timestamp: Date.now(),
				});
			} else {
				console.warn('[DemoControl] 定位上报失败或无有效坐标');
			}
		} catch (e) {
			console.warn('[DemoControl] 定位上报异常:', e.message);
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
		const timestampMs = typeof rawTime === 'number' ? rawTime : parseDate(rawTime).getTime();
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
						if(res.code === 200) {
							// 停止所有定时器，清除租赁状态和定位去重
							clearAllTimers();
							deviceStore.endLease();
							resetLocationDedup();
							uni.redirectTo({
								url: `/pages/device/completed?tradeNo=${res.data.tradeNo}&duration=${elapsedSeconds.value}`,
							});
							uni.hideLoading();
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
				} 
			},
		});
	}

	function onFeedback() {
		uni.navigateTo({
			url: '/pages/feedback/index?tradeNo=' + encodeURIComponent(tradeNo.value || '')
		});
	}
</script>

<style scoped lang="scss">
	.demo-page {
		min-height: 100vh;
		background: #f5f6fa;
		padding: 16px;
		position: relative;
		overflow: hidden;
	}

	/* 顶部渐变背景 */
	.header-bg {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 200px;
		background: linear-gradient(180deg, rgba(48, 106, 252, 0.08) 0%, transparent 100%);
		z-index: 0;
		pointer-events: none;
	}

	/* 大号计时器 */
	.timer-card {
		position: relative;
		z-index: 1;
		background: linear-gradient(180deg, #fff 0%, #f8faff 100%);
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
		gap: 4px;
	}

	.timer-label {
		font-size: 12px;
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
		background: rgba(48, 106, 252, 0.08);
	}

	.status-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #28C76F;
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.3; }
	}

	.status-text {
		font-size: 12px;
		color: $primaryColor;
		font-weight: 600;
	}

	/* 信息卡片 */
	.info-card {
		position: relative;
		z-index: 1;
		background: #fff;
		border-radius: 16px;
		padding: 14px 16px;
		margin-bottom: 16px;
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 10px;
	}

	.card-title {
		font-size: 15px;
		font-weight: 800;
		color: #333;
	}

	/* 设备信息卡 */
	.device-info-body {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.device-info-row {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.device-info-label {
		font-size: 13px;
		color: #999;
		width: 60px;
		flex-shrink: 0;
	}

	.device-info-value {
		font-size: 13px;
		color: #333;
		font-weight: 600;
		flex: 1;
		text-align: right;
	}

	.device-info-value.mono {
		font-family: monospace;
		font-size: 12px;
	}

	.battery-wrap {
		display: flex;
		align-items: center;
		gap: 6px;
		justify-content: flex-end;
		flex: 1;
	}

	.battery-bar {
		width: 60px;
		height: 14px;
		background: #f0f0f0;
		border-radius: 7px;
		overflow: hidden;
	}

	.battery-fill {
		height: 100%;
		background: linear-gradient(90deg, #28c76f, #48e08a);
		border-radius: 7px;
		transition: width 0.3s ease;
	}

	.battery-text {
		font-size: 12px;
		color: #666;
		font-weight: 600;
	}

	/* 费用卡片 */
	.cost-card {
		position: relative;
		z-index: 1;
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
		gap: 6px;
	}

	.cost-icon-wrap {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.cost-label {
		font-size: 11px;
		color: #999;
	}

	.cost-num {
		font-size: 16px;
		font-weight: 800;
		color: #333;
	}

	.cost-num-primary {
		color: $primaryColor;
		font-size: 18px;
	}

	.cost-divider {
		width: 1px;
		height: 40px;
		background: #f0f0f0;
	}

	/* 计费进度条 */
	.billing-progress {
		margin-top: 12px;
		padding-top: 12px;
		border-top: 1px solid #f5f6fa;
	}

	.progress-track {
		width: 100%;
		height: 8px;
		background: #f0f0f0;
		border-radius: 4px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #28c76f, #07c160);
		border-radius: 4px;
		transition: width 0.5s ease;
	}

	.progress-fill.progress-paid {
		background: linear-gradient(90deg, #306afc, #5d8eff);
	}

	.progress-labels {
		display: flex;
		justify-content: space-between;
		margin-top: 6px;
	}

	.progress-label {
		font-size: 11px;
		color: #bbb;
	}

	.progress-label.progress-active {
		color: #333;
		font-weight: 700;
	}

	.cost-hint {
		margin-top: 8px;
		text-align: center;
		font-size: 12px;
		color: #28C76F;
	}

	.cost-rule-hint {
		padding-top: 4px;
		color: #999;
		font-size: 11px;
	}

	/* 轨迹地图 */
	.track-map-wrap {
		width: 100%;
		height: 200px;
		border-radius: 8px;
		overflow: hidden;
		margin-bottom: 8px;
	}

	.track-map {
		width: 100%;
		height: 100%;
	}

	.track-stats {
		display: flex;
		justify-content: space-between;
	}

	.track-stat {
		font-size: 12px;
		color: #999;
	}

	.track-empty {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 80px;
	}

	.track-empty-text {
		font-size: 13px;
		color: #ccc;
	}

	/* 结束按钮区域 */
	.finish-section {
		position: relative;
		z-index: 1;
		margin-top: 8px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.finish-btn {
		width: 100%;
		height: 52px;
		background: linear-gradient(135deg, $primaryColor, $primaryLight);
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 16px;
		font-weight: 700;
		color: #fff;
		box-shadow: 0 4px 16px rgba(48, 106, 252, 0.3);
	}

	.finish-btn:active {
		opacity: 0.85;
	}

	.feedback-btn {
		width: 100%;
		height: 44px;
		background: #fff;
		border: 1px solid #e0e0e0;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 14px;
		font-weight: 600;
		color: #666;
	}

	.feedback-btn:active {
		background: #f8f8f8;
	}
</style>
