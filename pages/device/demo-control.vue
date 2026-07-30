<template>
	<view class="demo-page">
		<!-- 固定顶部：自定义导航栏（不随页面滚动） -->
		<view class="fixed-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
			<view class="custom-nav">
				<view class="nav-back" @click="onNavBack">
					<u-icon name="arrow-left" color="#fff" size="20"></u-icon>
				</view>
				<text class="nav-title">{{ deviceName }}</text>
				<view class="nav-placeholder"></view>
			</view>
		</view>

		<!-- 顶部通透渐变区（hero 计时器，跟随滚动） -->
		<view class="hero-section" :style="{ marginTop: (statusBarHeight + 44) + 'px' }">
			<!-- Hero 计时器卡片 -->
			<view class="hero-card">
				<view class="hero-top-row">
					<view class="hero-status">
						<view class="status-dot"></view>
						<text class="status-text">运行中</text>
					</view>
				</view>
				<text class="hero-timer">{{ formattedTime }}</text>
			</view>
		</view>

		<!-- 设备信息卡（顶部压在 hero 下方，形成堆叠） -->
		<view class="info-card device-card">
			<view class="card-title-row">
				<view class="title-bar"></view>
				<text class="card-title">设备信息</text>
			</view>
			<view class="device-rows">
				<view class="device-row">
					<text class="row-label">设备编号</text>
					<text class="row-value mono">{{ deviceSn || 'EXO-0000' }}</text>
				</view>
				<view class="device-row">
					<text class="row-label">订单编号</text>
					<text class="row-value mono">{{ tradeNo || '-' }}</text>
				</view>
				<view class="device-row">
					<text class="row-label">剩余电量</text>
					<view class="battery-wrap">
						<view class="battery-bar">
							<view class="battery-fill" :style="{ width: batteryLevel + '%' }"></view>
						</view>
						<text class="battery-text">{{ batteryLevel }}%</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 费用信息卡 -->
		<view class="info-card cost-card">
			<view class="card-title-row">
				<view class="title-bar"></view>
				<text class="card-title">费用信息</text>
			</view>
			<view class="cost-row">
				<view class="cost-item">
					<text class="cost-label">当前费用</text>
					<text class="cost-num cost-num-primary">¥{{ currentCost.toFixed(2) }}</text>
				</view>
				<view class="cost-divider"></view>
				<view class="cost-item">
					<text class="cost-label">{{ isFreePeriod ? '免费剩余' : '计费时长' }}</text>
					<text class="cost-num" :class="isFreePeriod ? 'cost-num-free' : 'cost-num-bill'">
						{{ isFreePeriod ? freeRemainingText : billableDurationText }}
					</text>
				</view>
				<view class="cost-divider"></view>
				<view class="cost-item">
					<text class="cost-label">费率</text>
					<text class="cost-num cost-num-muted">¥{{ (hourlyRate / 100).toFixed(2) }}/时</text>
				</view>
			</view>
			<!-- 分段式计费进度 -->
			<view v-if="freeMinutes > 0" class="phase-section">
				<!-- 状态徽章 -->
				<view class="phase-badge-row">
					<view class="phase-badge" :class="isFreePeriod ? 'phase-badge-free' : 'phase-badge-bill'">
						<view class="badge-dot" :class="isFreePeriod ? 'badge-dot-free' : 'badge-dot-bill'"></view>
						<text>{{ isFreePeriod ? '免费中 · 剩余 ' + freeRemainingText : '计费中 · 已计费 ' + billableDurationText }}</text>
					</view>
				</view>
				<!-- 分段进度条 -->
				<view class="segment-bar">
					<view class="segment segment-free">
						<view class="segment-fill fill-free" :style="{ width: freeFillPercent + '%' }"></view>
					</view>
					<view class="segment segment-bill">
						<view class="segment-fill fill-bill" :style="{ width: billFillPercent + '%' }"></view>
					</view>
				</view>
				<!-- 分段标签 -->
				<view class="segment-labels">
					<view class="seg-label">
						<text class="seg-label-title" :class="{ 'active-free': isFreePeriod }">免费期</text>
						<text class="seg-label-time">{{ freeMinutes }}分钟 · {{ isFreePeriod ? '已用 ' + freeUsedText : '已用完' }}</text>
					</view>
					<view class="seg-label">
						<text class="seg-label-title" :class="{ 'active-bill': !isFreePeriod }">计费期</text>
						<text class="seg-label-time">{{ !isFreePeriod ? '计费 ' + billableDurationText : '不足1小时按1小时计' }}</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 运动轨迹卡（左移缩进，与费用卡形成 Z 字错位） -->
		<view class="info-card track-card">
			<view class="card-title-row">
				<view class="title-bar"></view>
				<text class="card-title">运动轨迹</text>
			</view>
			<view v-if="trajectoryPoints.length > 0">
				<view class="track-map-wrap">
					<map id="trackMap" class="track-map" :latitude="trackCenter.lat" :longitude="trackCenter.lng"
						:scale="trackScale" :polyline="polylineOption" :markers="markersOption"
						:include-points="includePointsOption"></map>
				</view>
				<view class="track-stats">
					<text class="track-stat">共 {{ trajectoryPoints.length }} 个轨迹点</text>
				</view>
			</view>
			<view v-else class="track-empty">
				<text class="track-empty-text">暂无轨迹数据</text>
			</view>
		</view>

		<!-- 底部结束按钮 -->
		<view class="finish-section">
			<view class="finish-btn" @click="onFinish">
				<text>结束使用</text>
			</view>
		</view>

		<view class="safe-area-bottom"></view>
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
	const statusBarHeight = ref(20);

	const deviceStore = useDeviceStore();

	let timer = null;
	let trajTimer = null;
	let refreshTimer = null;
	let deviceInfoLoaded = false;

	function initLeaseSession() {
		if (deviceStore.leaseRunning && deviceStore.tradeNo === tradeNo.value) {
			startTimers();
			collectLocation();
			return;
		}

		deviceStore.setLeaseInfo({
			tradeNo: tradeNo.value,
			deviceSn: deviceSn.value,
			deviceName: deviceName.value,
			startTime: Date.now() - elapsedSeconds.value * 1000,
			rate: hourlyRate.value,
			freeMinutes: freeMinutes.value,
			deposit: depositMoney.value,
		});
		startTimers();
		collectLocation();
	}

	// 调用接口获取设备租赁实时信息
	async function loadLeaseDevice() {
		if (!tradeNo.value) return;
		try {
			const res = await api.getLeaseDevice(tradeNo.value);
			console.log('[DemoControl] 租赁设备信息:', res);
			if ((res.code === 200 || res.code === 0) && res.data) {
				const d = res.data;
				deviceName.value = d.deviceName || '外骨骼设备';
				deviceSn.value = d.deviceSn || '';
				hourlyRate.value = d.hourlyRate || 0;
				freeMinutes.value = d.freeMinutes || 0;
				depositMoney.value = d.depositMoney || 0;
				batteryLevel.value = d.batteryLevel ?? 80;
				cabinetId.value = d.pickupCabinetId || '';
				// 首次加载：基于 pickupTime 计算 elapsedSeconds
				if (!deviceInfoLoaded && d.pickupTime) {
					const startMs = parseDate(d.pickupTime).getTime();
					if (!isNaN(startMs)) {
						elapsedSeconds.value = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
					}
				}
				deviceInfoLoaded = true;
			}
		} catch (e) {
			console.warn('[DemoControl] 获取设备信息失败:', e.message || e);
		}
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
	const isFreePeriod = computed(() => elapsedSeconds.value <= freeMinutes.value * 60);

	// 免费段填充百分比
	const freeFillPercent = computed(() => {
		if (freeMinutes.value <= 0) return 0;
		const freeSeconds = freeMinutes.value * 60;
		const percent = (elapsedSeconds.value / freeSeconds) * 100;
		return Math.min(percent, 100);
	});

	// 计费段填充百分比（以1小时为满格参考）
	const billFillPercent = computed(() => {
		const freeSeconds = freeMinutes.value * 60;
		if (elapsedSeconds.value <= freeSeconds) return 0;
		const billableSeconds = elapsedSeconds.value - freeSeconds;
		const percent = (billableSeconds / 3600) * 100;
		return Math.min(percent, 100);
	});

	// 免费剩余时长 MM:SS
	const freeRemainingText = computed(() => {
		const freeSeconds = freeMinutes.value * 60;
		const remaining = Math.max(0, freeSeconds - elapsedSeconds.value);
		return formatClock(remaining);
	});

	// 免费已用时长 MM:SS
	const freeUsedText = computed(() => {
		const freeSeconds = freeMinutes.value * 60;
		const used = Math.min(elapsedSeconds.value, freeSeconds);
		return formatClock(used);
	});

	// 计费时长 MM:SS
	const billableDurationText = computed(() => {
		const freeSeconds = freeMinutes.value * 60;
		const billable = Math.max(0, elapsedSeconds.value - freeSeconds);
		return formatClock(billable);
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

	function formatClock(seconds) {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	}

	onMounted(async () => {
		// 获取状态栏高度
		const sys = await uni.getSystemInfo();
		statusBarHeight.value = sys.statusBarHeight || 20;

		const pages = getCurrentPages();
		const page = pages[pages.length - 1];
		const query = page.options || page.$page?.options || page.$route?.query || {};
		tradeNo.value = query.tradeNo || '';

		if (!tradeNo.value) {
			uni.showToast({ title: '缺少订单号', icon: 'none' });
			return;
		}

		// 调用接口获取设备租赁实时信息
		await loadLeaseDevice();

		// 初始化租赁会话（启动计时器、定位上报）
		initLeaseSession();

		// 加载历史轨迹
		await loadExistingTrajectory();

		// 定时刷新设备信息（电量、费用同步）
		refreshTimer = setInterval(loadLeaseDevice, 30000);
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
		if (refreshTimer) {
			clearInterval(refreshTimer);
			refreshTimer = null;
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

	function onNavBack() {
		uni.switchTab({ url: '/pages/index/index' });
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
						console.log(res, '===');
						// 跳转到费用确认页（关闭当前页，防止返回）
						if (res.code === 200) {
							// 停止所有定时器，清除租赁状态和定位去重
							clearAllTimers();
							deviceStore.endLease();
							resetLocationDedup();
							uni.redirectTo({
								url: `/pages/device/completed?tradeNo=${res.data.tradeNo}&duration=${elapsedSeconds.value}`,
							});
							uni.hideLoading();
						} else {
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
		background: $pageBg;
		position: relative;
		overflow: hidden;
	}

	/* ── 固定顶部导航栏（不随页面滚动） ── */
	.fixed-nav {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 100;
		background: linear-gradient(180deg, #306afc 0%, #5d8eff 100%);
	}

	/* ── 顶部通透渐变区（从导航栏底部色平滑过渡到页面背景） ── */
	.hero-section {
		position: relative;
		background: linear-gradient(180deg, #5d8eff 0%, #8eb0ff 40%, #f0f4fa 100%);
		padding: 0 16px;
		z-index: 2;
	}

	/* 自定义导航栏 */
	.custom-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 44px;
		position: relative;
		z-index: 3;
	}

	.nav-back {
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.nav-back:active {
		opacity: 0.6;
	}

	.nav-title {
		font-size: 17px;
		font-weight: 700;
		color: #fff;
		flex: 1;
		text-align: center;
	}

	.nav-placeholder {
		width: 44px;
		flex-shrink: 0;
	}

	/* ── Hero 计时器卡片 ── */
	.hero-card {
		position: relative;
		padding: 20px 0px 44px;
		z-index: 1;
	}

	/* 顶部运行中状态 */
	.hero-top-row {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		margin-bottom: 12px;
	}

	.hero-status {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 12px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.2);
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
		color: #fff;
		font-weight: 600;
	}

	/* 居中大号计时器 */
	.hero-timer {
		display: block;
		font-size: 48px;
		font-weight: 900;
		color: #fff;
		font-variant-numeric: tabular-nums;
		letter-spacing: 2px;
		text-align: center;
		line-height: 1.2;
	}

	/* ── 通用卡片 ── */
	.info-card {
		background: $cardBg;
		border-radius: $radiusMd;
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
		padding: 16px;
		position: relative;
		z-index: 3;
	}

	/* 卡片标题行 */
	.card-title-row {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 14px;
	}

	.title-bar {
		width: 4px;
		height: 16px;
		background: $primaryColor;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.card-title {
		font-size: 16px;
		font-weight: 800;
		color: $textMainColor;
	}

	/* ── 设备信息卡（顶部压入 hero 下方） ── */
	.device-card {
		margin: -28px 16px 12px;
		z-index: 4;
		box-shadow: 0 4px 20px rgba(48, 106, 252, 0.1);
	}

	.device-rows {
		display: flex;
		flex-direction: column;
	}

	.device-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 44px;
		border-bottom: 1px solid #f0f0f0;
	}

	.device-row:last-child {
		border-bottom: none;
	}

	.row-label {
		font-size: 13px;
		color: $textSubColor;
		font-weight: 600;
	}

	.row-value {
		font-size: 14px;
		color: $textMainColor;
		font-weight: 700;
	}

	.row-value.mono {
		font-family: monospace;
		font-size: 13px;
	}

	.battery-wrap {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.battery-bar {
		width: 60px;
		height: 12px;
		background: #f0f0f0;
		border-radius: 6px;
		overflow: hidden;
	}

	.battery-fill {
		height: 100%;
		background: linear-gradient(90deg, #28c76f, #48e08a);
		border-radius: 6px;
		transition: width 0.3s ease;
	}

	.battery-text {
		font-size: 13px;
		color: $textMainColor;
		font-weight: 700;
	}

	/* ── 费用信息卡 ── */
	.cost-card {
		margin: 0 16px 12px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
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
		flex: 1;
	}

	.cost-label {
		font-size: 12px;
		color: $textSubColor;
		font-weight: 600;
	}

	.cost-num {
		font-size: 16px;
		font-weight: 800;
		color: $textMainColor;
		font-variant-numeric: tabular-nums;
	}

	.cost-num-primary {
		color: $primaryColor;
		font-size: 22px;
		font-weight: 900;
	}

	.cost-num-muted {
		font-size: 14px;
		color: $textSubColor;
		font-weight: 700;
	}

	.cost-num-free {
		color: #07c160;
		font-size: 16px;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
	}

	.cost-num-bill {
		color: $primaryColor;
		font-size: 16px;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
	}

	.cost-divider {
		width: 1px;
		height: 36px;
		background: #f0f0f0;
		flex-shrink: 0;
	}

	/* 分段式计费进度 */
	.phase-section {
		margin-top: 14px;
		padding-top: 14px;
		border-top: 1px solid #f5f6fa;
	}

	.phase-badge-row {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 12px;
	}

	.phase-badge {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 5px 14px;
		border-radius: 999px;
		font-size: 13px;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.phase-badge-free {
		background: rgba(7, 193, 96, 0.10);
		color: #07c160;
	}

	.phase-badge-bill {
		background: rgba(48, 106, 252, 0.10);
		color: $primaryColor;
	}

	.badge-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.badge-dot-free {
		background: #07c160;
	}

	.badge-dot-bill {
		background: $primaryColor;
	}

	.segment-bar {
		display: flex;
		height: 10px;
		border-radius: 5px;
		overflow: hidden;
		gap: 2px;
		background: #f0f0f0;
	}

	.segment {
		height: 100%;
		position: relative;
		flex: 1;
	}

	.segment-free {
		background: rgba(7, 193, 96, 0.12);
	}

	.segment-bill {
		background: rgba(48, 106, 252, 0.12);
	}

	.segment-fill {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		border-radius: 5px;
		transition: width 0.5s ease;
	}

	.fill-free {
		background: linear-gradient(90deg, #28c76f, #07c160);
	}

	.fill-bill {
		background: linear-gradient(90deg, #5d8eff, #306afc);
	}

	.segment-labels {
		display: flex;
		margin-top: 8px;
	}

	.seg-label {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}

	.seg-label-title {
		font-size: 11px;
		font-weight: 600;
		color: #bbb;
	}

	.seg-label-title.active-free {
		color: #07c160;
		font-weight: 700;
	}

	.seg-label-title.active-bill {
		color: $primaryColor;
		font-weight: 700;
	}

	.seg-label-time {
		font-size: 11px;
		color: $textSubColor;
		font-variant-numeric: tabular-nums;
	}

	/* ── 运动轨迹卡 ── */
	.track-card {
		margin: 0 16px 12px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
	}

	.track-map-wrap {
		width: 100%;
		height: 200px;
		border-radius: 12px;
		overflow: hidden;
		margin-bottom: 8px;
	}

	.track-map {
		width: 100%;
		height: 100%;
	}

	.track-stats {
		display: flex;
		justify-content: center;
	}

	.track-stat {
		font-size: 12px;
		color: $textSubColor;
		font-weight: 600;
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

	/* ── 底部按钮 ── */
	.finish-section {
		margin: 0 16px 12px;
		position: relative;
		z-index: 3;
	}

	.finish-btn {
		width: 100%;
		height: 52px;
		background: $primaryColor;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 16px;
		font-weight: 700;
		color: #fff;
		box-shadow: 0 4px 12px rgba(48, 106, 252, 0.3);
	}

	.finish-btn:active {
		opacity: 0.85;
		transform: scale(0.98);
	}

	.safe-area-bottom {
		height: calc(30px + env(safe-area-inset-bottom));
	}
</style>
