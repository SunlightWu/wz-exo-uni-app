<template>
	<view class="index-page">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

		<!-- 顶部品牌栏 -->
		<view class="top-bar">
			<text class="brand-name">外骨骼租赁</text>
		</view>

		<!-- 地图区域 -->
		<view class="map-area">
			<map id="mapEl" ref="mapEl" class="map-view" :latitude="mapCenter.lat" :longitude="mapCenter.lng"
				:markers="mapMarkers" :scale="mapScale" :enable-zoom="true" :enable-scroll="true"
				:show-location="true"
				@markertap="onMarkerTap" @regionchange="onRegionChange">
				<view class="locate-center">
					<image class="locate-center-img" src="/static/locate.png"></image>
				</view>
				<view class="map-badge">{{ totalAvailable }} 台可租</view>
				<view class="map-tools">
					<view class="map-tool-btn" @tap="moveToMyLocation">
						<image class="map-tool-img" src="/static/position-icon.png"></image>
					</view>
				</view>
			</map>
		</view>

		<!-- 底部自定义导航栏 -->
		<view class="custom-tabbar">
			<view class="tab-item" @click="goToNearby">
				<image class="tab-img" src="/static/nearby-devices-icon.png" mode="aspectFit"></image>
				<text class="tab-label">附近设备</text>
			</view>
			<!-- 核心操作按钮 — 突出悬浮 -->
			<!-- 已连接：显示设备信息 + 进入控制 -->
			<view v-if="deviceStore.connected || deviceStore.leaseRunning" class="scan-main-btn" @click="goToControl">
				<view class="scan-inner">
					<image class="exo-icon" src="/static/exo_view1.png" mode="aspectFit"></image>
					<view class="connected-info">
						<text class="connected-name">{{ deviceStore.deviceName || '外骨骼设备' }}</text>
						<text class="connected-hint">{{ deviceStore.connected ? '点击进入控制' : '点击继续体验' }}</text>
					</view>
				</view>
			</view>
			<!-- 未连接：扫码租赁 -->
			<view v-else class="scan-main-btn" @click="onScan">
				<view class="scan-inner">
					<image class="scan-icon" src="/static/scan-icon.png" mode="aspectFit"></image>
					<text class="scan-text">扫码租赁</text>
				</view>
			</view>
			<view class="tab-item" @click="goToProfile">
				<image class="tab-img" src="/static/icon-person.png" mode="aspectFit"></image>
				<text class="tab-label">个人中心</text>
			</view>
		</view>

		<!-- 柜机详情面板 -->
		<view v-if="showDetailPanel" class="detail-panel-overlay" @click="closeDetailPanel">
			<view class="detail-panel" @click.stop>
				<view class="dp-header">
					<text class="dp-title">{{ selectedCabinet?.cabinetName || selectedCabinet?.name || '柜机详情' }}</text>
					<text class="dp-close" @click="closeDetailPanel">✕</text>
				</view>
				<view class="dp-info">
					<text class="dp-no">编号：{{ selectedCabinet?.cabinetNo || '-' }}</text>
					<text class="dp-address">地址：{{ selectedCabinet?.address || '-' }}</text>
					<view class="dp-stats">
						<text class="dp-stat">总设备：{{ selectedCabinet?.totalDevices || selectedCabinet?.totalDeviceCount || 0 }}</text>
						<text class="dp-stat dp-available">可租：{{ selectedCabinet?.availableDevices || selectedCabinet?.availableDeviceCount || 0 }}</text>
					</view>
				</view>
				<!-- 收费信息 -->
				<view class="dp-fee">
					<view class="dp-fee-item">
						<text class="dp-fee-label">租金</text>
						<text class="dp-fee-num">{{ dpFeeRate }}</text>
						<text class="dp-fee-unit">元/分钟</text>
					</view>
					<view class="dp-fee-divider"></view>
					<view class="dp-fee-item">
						<text class="dp-fee-label">押金</text>
						<text class="dp-fee-num">{{ dpFeeDeposit }}</text>
						<text class="dp-fee-unit">元</text>
					</view>
					<view class="dp-fee-divider"></view>
					<view class="dp-fee-item">
						<text class="dp-fee-label">免费时长</text>
						<text class="dp-fee-num">{{ dpFeeFreeMinutes }}</text>
						<text class="dp-fee-unit">分钟</text>
					</view>
				</view>
				<!-- 导航按钮 -->
				<view class="dp-nav-btn" @click="goToCabinetDetail">
					<text class="dp-nav-text">查看详情 / 导航</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
	import {
		ref,
		computed,
		onMounted
	} from 'vue';
	import {
		useDeviceStore
	} from '../../store/device.js';
	import {
		api
	} from '../../services/api.js';
	import {
		parseDeviceQr
	} from '../../utils/qr-parser.js';
	import { logout } from '../../services/auth.js';

	const deviceStore = useDeviceStore();

	const statusBarHeight = ref(20)
	const locating = ref(false)
	let mapContext = null

	// 标志：跳过由程序触发的 regionchange（如 moveToLocation 后），只响应用户手势
	let skipNextRegionChange = false
	const mapScale = ref(18)
	const mapCenter = ref({
		lat: 39.9042,
		lng: 116.4074
	}) // 默认北京

	// 用户位置（查询中心点）
	const myLocation = ref({
		lat: 39.9042,
		lng: 116.4074
	})
	const locationText = ref('定位')

	// 附近柜机列表（真实接口）
	const cabinets = ref([]);

	// 柜机详情面板
	const showDetailPanel = ref(false);
	const selectedCabinet = ref(null);

	const totalAvailable = computed(() => cabinets.value.reduce((sum, c) => sum + (c.availableDevices || c.availableDeviceCount || 0), 0));

	// 地图 markers（柜机点）
	const mapMarkers = computed(() => {
		const markers = [];
		for (const c of cabinets.value) {
			const lat = c.latitude ?? c.lat;
			const lng = c.longitude ?? c.lng;
			const available = c.availableDevices || c.availableDeviceCount || 0;
			const name = c.cabinetName || c.name || '柜机';
			markers.push({
				id: c.id ?? c.cabinetNo,
				latitude: lat,
				longitude: lng,
				iconPath: '/static/marker-device.png',
				width: 32,
				height: 40,
				callout: {
					content: `可租 ${available} 台`,
					color: '#333',
					fontSize: 12,
					borderRadius: 8,
					bgColor: '#fff',
					padding: 6,
					display: 'ALWAYS',
					textAlign: 'center',
				},
			});
		}
		return markers;
	});

	onMounted(async () => {
		const sys = await uni.getSystemInfo()
		statusBarHeight.value = sys.statusBarHeight || 20
		// 恢复租赁状态（防止返回首页丢失）
		deviceStore.restoreLeaseInfo();
		// 延迟创建 mapContext 并定位，确保 map 完全渲染
		setTimeout(() => {
			mapContext = uni.createMapContext('mapEl', null);
			getLocation();
		}, 400);

		// 首页静默登录：无 token 时自动登录
		const token = uni.getStorageSync('token')
		if (!token) {
			await doSilentLogin()
		}
	});

	// 地图区域变化：只在拖动结束时获取中心点并查询柜机
	function onRegionChange(e) {
		if (skipNextRegionChange) {
			skipNextRegionChange = false;
			return;
		}
		const type = e.type || (e.detail && e.detail.type) || '';
		if (type === 'end') {
			if (mapContext) {
				mapContext.getCenterLocation({
					success: (res) => {
						const lat = res.latitude;
						const lng = res.longitude;
						myLocation.value = { lat, lng };
						mapCenter.value = { lat, lng };
						fetchNearbyCabinets(lng, lat);
					},
				});
			}
		}
	}

	// 获取当前位置（带权限检测）
	async function getLocation() {
		locating.value = true;
		locationText.value = '定位中...';

		// 1. 先检查授权状态
		try {
			const setting = await new Promise((resolve) => {
				uni.getSetting({
					success: resolve,
					fail: () => resolve({ authSetting: {} })
				});
			});
			if (!setting.authSetting || !setting.authSetting['scope.userLocation']) {
				await new Promise((resolve, reject) => {
					uni.authorize({
						scope: 'scope.userLocation',
						success: resolve,
						fail: () => {
							uni.showModal({
								title: '需要定位权限',
								content: '定位用于在地图上显示您的当前位置和附近设备，请授权。',
								success: (r) => {
									if (r.confirm) {
										uni.openSetting({});
									}
								},
							});
							reject(new Error('定位未授权'));
						},
					});
				});
			}
		} catch (e) {
			handleLocationFail();
			return;
		}

		// 2. 开始获取位置
		uni.getLocation({
			type: 'gcj02',
			timeout: 10000,
			success: async (res) => {
				const lat = res.latitude;
				const lng = res.longitude;
				myLocation.value = { lat, lng };
				mapCenter.value = { lat, lng };
				mapScale.value = 18;
				locating.value = false;
				reverseGeocode(lat, lng);
				// 移动地图到当前位置（mapContext 已确保创建）
				if (mapContext) {
					skipNextRegionChange = true;
					mapContext.moveToLocation({ latitude: lat, longitude: lng });
				}
				await fetchNearbyCabinets(lng, lat);
			},
			fail: (err) => {
				console.error('getLocation fail:', err);
				handleLocationFail();
			},
		});
	}

	function handleLocationFail() {
		locationText.value = '北京市 · 朝阳区';
		mapCenter.value = { lat: 39.9042, lng: 116.4074 };
		mapScale.value = 18;
		locating.value = false;
		uni.showToast({
			title: '使用默认位置（北京）',
			icon: 'none',
			duration: 2000
		});
	}

	// 逆地理编码 — 通过腾讯地图 API 获取地址名称
	const MAP_KEY = 'YOUR_TENCENT_MAP_KEY'; // TODO: 替换为真实 Key

	function reverseGeocode(lat, lng) {
		locationText.value = '定位中...';
		if (MAP_KEY === 'YOUR_TENCENT_MAP_KEY') {
			locationText.value = '定位成功';
			return;
		}
		uni.request({
			url: 'https://apis.map.qq.com/ws/geocoder/v1/',
			data: {
				key: MAP_KEY,
				location: `${lat},${lng}`,
				get_poi: 0,
			},
			success: (res) => {
				if (res.data && res.data.status === 0 && res.data.result) {
					const comp = res.data.result.address_component;
					const district = comp.district ? `${comp.city || ''}${comp.district}` : '';
					const street = comp.street || '';
					locationText.value = street ? `${district}${street}` : district || res.data.result.address;
				} else {
					locationText.value = '定位成功';
				}
			},
			fail: () => {
				locationText.value = '定位成功';
			},
		});
	}

	// 获取附近柜机
	async function fetchNearbyCabinets(lng, lat) {
		try {
			const result = await api.getNearbyCabinets({ lng, lat, radius: 5000 });
			if (result.code === 0 || result.code === 200) {
				cabinets.value = result.data || [];
			} else {
				console.warn('[Index] 获取附近柜机失败:', result.msg);
			}
		} catch (err) {
			console.error('[Index] 获取附近柜机异常:', err.message || err);
		}
	}

	// 回到我的位置
	function moveToMyLocation() {
		locating.value = true;
		locationText.value = '定位中...';
		uni.getLocation({
			type: 'gcj02',
			timeout: 8000,
			success: (res) => {
				const lat = res.latitude;
				const lng = res.longitude;
				locating.value = false;
				myLocation.value = { lat, lng };
				mapCenter.value = { lat, lng };
				mapScale.value = 18; // 重置缩放比例
				// 移动地图到当前位置
				if (mapContext) {
					skipNextRegionChange = true;
					mapContext.moveToLocation({ latitude: lat, longitude: lng });
				}
				fetchNearbyCabinets(lng, lat);
			},
			fail: () => {
				locating.value = false;
				uni.showToast({ title: '定位失败', icon: 'none' });
			},
		});
	}

	function onMarkerTap(e) {
		const id = e.detail?.markerId || e.markerId;
		if (!id || id === 0) return;
		const cabinet = cabinets.value.find(c => (c.id ?? c.cabinetNo) === id);
		if (cabinet) openCabinetDetail(cabinet);
	}

	function formatDistance(d) {
		return d >= 1000 ? (d / 1000).toFixed(1) + 'km' : d + 'm';
	}

	// ── 柜机详情面板 ──
	function openCabinetDetail(cabinet) {
		selectedCabinet.value = cabinet;
		showDetailPanel.value = true;
	}

	function closeDetailPanel() {
		showDetailPanel.value = false;
		selectedCabinet.value = null;
	}

	const dpFeeRate = computed(() => {
		const rate = selectedCabinet.value?.rate || 0;
		return rate > 0 ? (rate / 100).toFixed(2) : '1.00';
	});
	const dpFeeDeposit = computed(() => {
		const deposit = selectedCabinet.value?.deposit || 0;
		return deposit > 0 ? (deposit / 100).toFixed(2) : '0.00';
	});
	const dpFeeFreeMinutes = computed(() => {
		return selectedCabinet.value?.freeMinutes || 0;
	});

	function goToCabinetDetail() {
		const c = selectedCabinet.value;
		if (!c) return;
		closeDetailPanel();
		const no = c.cabinetNo || c.id;
		const lat = c.latitude || c.lat || 0;
		const lng = c.longitude || c.lng || 0;
		const userLat = myLocation.value.lat;
		const userLng = myLocation.value.lng;
		uni.navigateTo({
			url: `/pages/cabinet/detail?cabinetNo=${no}&lat=${lat}&lng=${lng}&userLat=${userLat}&userLng=${userLng}`,
		});
	}

	// ── 扫码：支持设备二维码自动连接 & 纯SN租赁 ──
	async function onScan() {
		uni.scanCode({
			onlyFromCamera: true,
			success: async (res) => {
				const qr = parseDeviceQr(res.result);
				if (qr.sn && qr.mac) {
					// 真实流程：scan → confirm → demo-control
					uni.showLoading({ title: '获取设备信息...', mask: true });
					try {
						const scanRes = await api.scanDevice(qr.sn);
						if ((scanRes.code === 200 || scanRes.code === 0) && scanRes.data) {
							const d = scanRes.data;
							// 确认租借
							const confirmRes = await api.confirmLease({ deviceSn: d.deviceSn });
							if (confirmRes.code === 200 || confirmRes.code === 0) {
								uni.navigateTo({
									url: `/pages/device/demo-control?tradeNo=${d.tradeNo}&deviceSn=${d.deviceSn}&name=${encodeURIComponent(qr.name || '外骨骼设备')}&hourlyRate=${d.hourlyRate || 0}&freeMinutes=${d.freeMinutes || 0}&depositMoney=${d.depositMoney || 0}`
								});
							} else {
								uni.showToast({ title: confirmRes.msg || '租借确认失败', icon: 'none' });
							}
						} else {
							uni.showToast({ title: scanRes.msg || '设备信息获取失败', icon: 'none' });
						}
					} catch (e) {
						uni.showToast({ title: e.message || '请求失败', icon: 'none' });
					} finally {
						uni.hideLoading();
					}
				} else if (qr.sn) {
					// 纯 SN：走租赁确认流程
					uni.navigateTo({
						url: `/pages/lease/confirm?sn=${encodeURIComponent(qr.sn)}`
					});
				} else {
					uni.showToast({ title: '无效二维码', icon: 'none' });
				}
			},
			fail: (err) => {
				if (err.errMsg.includes('cancel')) return;
				uni.showToast({ title: '请扫描设备二维码', icon: 'none', duration: 2000 });
			},
		});
	}



	function goToScanning() {
		uni.navigateTo({
			url: '/pages/device/scanning'
		})
	}

	function goToNearby() {
		const lat = myLocation.value.lat;
		const lng = myLocation.value.lng;
		uni.navigateTo({
			url: `/pages/cabinet/list?lat=${lat}&lng=${lng}`
		})
	}

	function goToProfile() {
		uni.navigateTo({
			url: '/pages/profile/my'
		})
	}

	function goToControl() {
		if (deviceStore.connected) {
			uni.navigateTo({ url: '/pages/device/control' });
		} else if (deviceStore.leaseRunning) {
			const sn = deviceStore.leaseDeviceSn || '';
			uni.navigateTo({
				url: `/pages/device/demo-control?tradeNo=${deviceStore.tradeNo}&deviceSn=${sn}&name=${encodeURIComponent(deviceStore.deviceName || '外骨骼设备')}&hourlyRate=${deviceStore.leaseRate}&freeMinutes=${deviceStore.leaseFreeMinutes}&depositMoney=${deviceStore.leaseDeposit}`
			});
		}
	}

	// ── 首页静默登录 ──
	async function doSilentLogin() {
		try {
			const loginRes = await new Promise((resolve, reject) => {
				uni.login({ provider: 'weixin', success: resolve, fail: reject })
			})
			const result = await api.wxXcxLogin({ code: loginRes.code })
			if (result.code === 200 && result.data) {
				uni.setStorageSync('token', result.data.token)
				if (result.data.refreshToken) {
					uni.setStorageSync('refreshToken', result.data.refreshToken)
				}
				if (result.data.memberId) {
					uni.setStorageSync('memberId', String(result.data.memberId))
				}
				console.log('[Index] 静默登录成功')
			}
		} catch (err) {
			console.error('[Index] 静默登录失败:', err.message || err)
		}
	}

	function showUsage() {
		uni.showModal({
			title: '使用须知',
			content: '1. 使用前请确认设备完好\n2. 如感不适请立即停止\n3. 设备仅限单人使用\n4. 使用结束后请按流程关机\n5. 费用按实际使用时长计算',
			showCancel: false,
		});
	}

	function callService() {
		uni.makePhoneCall({
			phoneNumber: '400-800-1234',
			fail: () => {
				uni.showToast({
					title: '客服电话: 400-800-1234',
					icon: 'none'
				});
			},
		});
	}
</script>

<style scoped lang="scss">
	.index-page {
		@include page-base;
		display: flex;
		flex-direction: column;
		height: 100vh;
		padding-bottom: 0;
	}

	.status-bar {
		background: $pageBg;
		flex-shrink: 0;
	}

	.top-bar {
		@include flex-between;
		padding: 10px 18px;
		flex-shrink: 0;
	}

	.brand-name {
		font-size: 20px;
		font-weight: 900;
		color: $textMainColor;
		letter-spacing: 1px;
	}

	.top-actions {
		@include flex-row(4px);
		@include pill;
	}

	.locate-sm {
		width: 14px;
		height: 14px;
	}

	.locate-text {
		@include text-caption;
		font-size: 11px;
	}

	.map-area {
		flex: 1;
		min-height: 0;
		margin: 8px 18px;
		border-radius: $radiusXl;
		overflow: hidden;
		position: relative;
		border: 1.4px solid #fff;
	}

	.map-view {
		width: 100%;
		height: 100%;
	}

	/* 中心定位图标：view 在 map 内部，CSS absolute 定位相对于 map 容器 */
	.locate-center {
		position: absolute;
		top: 50%;
		left: 50%;
		margin-top: -18px;
		margin-left: -18px;
		width: 36px;
		height: 36px;
		pointer-events: none;
	}
	.locate-center-img {
		width: 36px;
		height: 36px;
	}
	.locate-label {
		position: absolute;
		top: 36px;
		left: 50%;
		transform: translateX(-50%);
		font-size: 11px;
		color: $primaryColor;
		font-weight: 700;
		white-space: nowrap;
		background: rgba(255,255,255,0.9);
		padding: 2px 8px;
		border-radius: 8px;
		margin-top: 2px;
	}

	.map-badge {
		position: absolute;
		top: 10px;
		right: 10px;
		z-index: 10;
		background: $primaryColor;
		color: #fff;
		padding: 4px 12px;
		border-radius: 12px;
		font-size: 12px;
		font-weight: 700;
	}

	.map-tools {
		position: absolute;
		bottom: 12px;
		left: 12px;
		z-index: 10;
		display: flex;
		flex-direction: column;
		margin-bottom: 8px;
	}

	.map-tool-btn {
		width: 40px;
		height: 40px;
		border-radius: 12px;
		background:#f0f4fa;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 8px;
		margin-bottom: 8px;
		border: 1.4px solid #fff;
	}

	.map-tool-img {
		width: 24px;
		height: 24px;
	}

	.custom-tabbar {
		flex-shrink: 0;
		height: 80px;
		padding: 10px 0;
		display: flex;
		align-items: center;
		justify-content: space-around;
		padding-bottom: calc(16px + env(safe-area-inset-bottom));
	}

	.tab-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 8px 16px;
		@include tap-active;
	}

	.tab-img {
		width: 26px;
		height: 26px;
	}

	.tab-label {
		@include text-caption;
		margin-top: 4px;
		color: #000;
	}


	.scan-main-btn {
		width: 50%;
		height: 66px;
		background: linear-gradient(135deg, $primaryColor, $primaryLight);
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 40px;
		box-shadow: 0 -4px 20px rgba(139, 92, 246, 0.35);
		@include tap-active;
	}

	.scan-inner {
		display: flex;
		gap: 5px;
		align-items: center;
	}

	.scan-icon {
		width: 26px;
		height: 26px;
	}

	.scan-text {
		font-size: 18px;
		color: #000;
		font-weight: 800;
	}

	/* 已连接状态：复用 scan-main-btn 尺寸，统一布局 */
	.exo-icon {
		width: 30px;
		height: 30px;
		border-radius: 6px;
		flex-shrink: 0;
	}

	.connected-info {
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 0;
	}

	.connected-name {
		font-size: 15px;
		font-weight: 800;
		color: #fff;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.connected-hint {
		font-size: 11px;
		color: rgba(255, 255, 255, 0.8);
	}

	/* ── 柜机详情面板 ── */
	.detail-panel-overlay {
		position: fixed;
		inset: 0;
		z-index: 100;
		background: rgba(0, 0, 0, 0.35);
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
	}

	.detail-panel {
		background: #fff;
		border-radius: 24px 24px 0 0;
		padding: 20px 18px;
		padding-bottom: calc(20px + env(safe-area-inset-bottom));
		max-height: 70vh;
		display: flex;
		flex-direction: column;
		animation: dp-slide-up 0.25s ease-out;
	}

	@keyframes dp-slide-up {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}

	.dp-header {
		@include flex-between;
		margin-bottom: 12px;
	}

	.dp-title {
		font-size: 17px;
		font-weight: 800;
		color: $textMainColor;
	}

	.dp-close {
		font-size: 18px;
		color: #999;
		padding: 4px 8px;
		line-height: 1;
	}

	.dp-info {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-bottom: 14px;
		padding-bottom: 14px;
		border-bottom: 1px solid #f0f0f0;
	}

	.dp-no {
		font-size: 13px;
		color: #666;
	}

	.dp-address {
		font-size: 13px;
		color: #666;
	}

	.dp-stats {
		display: flex;
		gap: 16px;
		margin-top: 4px;
	}

	.dp-stat {
		font-size: 13px;
		color: #666;
	}

	.dp-available {
		color: $primaryColor;
		font-weight: 700;
	}

	/* 收费信息 */
	.dp-fee {
		display: flex;
		align-items: center;
		justify-content: space-around;
		padding: 16px 0;
		margin-top: 8px;
		border-top: 1px solid #f0f0f0;
	}

	.dp-fee-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}

	.dp-fee-label {
		font-size: 12px;
		color: #999;
	}

	.dp-fee-num {
		font-size: 20px;
		font-weight: 800;
		color: $primaryColor;
	}

	.dp-fee-unit {
		font-size: 11px;
		color: #666;
	}

	.dp-fee-divider {
		width: 1px;
		height: 32px;
		background: #f0f0f0;
	}

	/* 导航按钮 */
	.dp-nav-btn {
		margin-top: 12px;
		padding: 14px;
		background: linear-gradient(135deg, $primaryColor, $primaryLight);
		border-radius: 12px;
		text-align: center;
		@include tap-active;
	}

	.dp-nav-text {
		font-size: 15px;
		font-weight: 700;
		color: #fff;
	}
</style>
