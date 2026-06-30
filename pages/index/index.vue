<template>
	<view class="index-page">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

		<!-- 顶部品牌栏 -->
		<view class="top-bar">
			<text class="brand-name">外骨骼租赁</text>
		</view>

		<!-- 地图区域 -->
		<view class="map-area">
			<map :key="mapKey" ref="mapEl" class="map-view" :latitude="mapCenter.lat" :longitude="mapCenter.lng"
				:markers="mapMarkers" :scale="mapScale" show-location :enable-zoom="true" :enable-scroll="true"
				@markertap="onMarkerTap" @updated="onMapUpdated">
				<cover-view class="map-badge">{{ totalAvailable }} 台可租</cover-view>
				<cover-view class="map-tools">
					<cover-view class="map-tool-btn">
						<cover-image class="map-tool-img" src="/static/operator-icon.png"></cover-image>
					</cover-view>
					<cover-view class="map-tool-btn">
						<cover-image class="map-tool-img" src="/static/search-icon.png"></cover-image>
					</cover-view>
					<cover-view class="map-tool-btn" @click="moveToMyLocation">
						<cover-image class="map-tool-img" src="/static/position-icon.png"></cover-image>
					</cover-view>
				</cover-view>
			</map>
		</view>

		<!-- 底部自定义导航栏 -->
		<view class="custom-tabbar">
			<view class="tab-item" @click="goToNearby">
				<image class="tab-img" src="/static/nearby-devices-icon.png" mode="aspectFit"></image>
				<text class="tab-label">附近设备</text>
			</view>
			<!-- 核心操作按钮 — 突出悬浮 -->
			<view class="scan-main-btn" @click="onScan">
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
	</view>
</template>

<script setup>
	import {
		ref,
		computed,
		onMounted
	} from 'vue';
	import {
		api
	} from '../../services/api.js';

	const statusBarHeight = ref(20)
const locating = ref(false)
	let mapContext = null

	// 地图相关
	const mapScale = ref(14)
	const mapCenter = ref({
		lat: 39.9042,
		lng: 116.4074
	}) // 默认北京
	const mapKey = ref(0) // 强制刷新地图

	// 用户位置
	const myLocation = ref({
		lat: 39.9042,
		lng: 116.4074
	})
	const locationText = ref('定位')

	// 附近设备点（含真实经纬度）
	const nearbyPoints = ref([{
			id: 1,
			name: 'CDC康复中心',
			lat: 39.9060,
			lng: 116.4145,
			distance: 320,
			available: 3,
			priceMin: 0.50
		},
		{
			id: 2,
			name: '奥森公园南门',
			lat: 40.0150,
			lng: 116.3907,
			distance: 1200,
			available: 2,
			priceMin: 0.50
		},
		{
			id: 3,
			name: '朝阳大悦城',
			lat: 39.9219,
			lng: 116.4690,
			distance: 2500,
			available: 5,
			priceMin: 0.40
		},
		{
			id: 4,
			name: '海淀医院',
			lat: 39.9670,
			lng: 116.3035,
			distance: 3800,
			available: 1,
			priceMin: 0.60
		},
		{
			id: 5,
			name: '望京SOHO',
			lat: 40.0020,
			lng: 116.4797,
			distance: 5200,
			available: 4,
			priceMin: 0.45
		},
	]);

	const totalAvailable = computed(() => nearbyPoints.value.reduce((sum, p) => sum + p.available, 0));

	// 地图 markers（用户位置 + 设备点）
	const mapMarkers = computed(() => {
		const markers = [];
		// 设备点 markers
		for (const p of nearbyPoints.value) {
			markers.push({
				id: p.id,
				latitude: p.lat,
				longitude: p.lng,
				iconPath: '/static/marker-device.png',
				width: 32,
				height: 40,
				label: {
					content: p.name,
					color: '#28123E',
					fontSize: 11,
					borderRadius: 4,
					bgColor: 'rgba(255,255,255,0.92)',
					padding: 3,
					textAlign: 'center',
					anchorY: -8,
				},
				callout: {
					content: `${p.name}\n可租${p.available}台 · ¥${p.priceMin.toFixed(2)}/min`,
					fontSize: 12,
					borderRadius: 8,
					padding: 8,
					display: 'BYCLICK',
				},
			});
		}
		// 我的位置 marker
		markers.push({
			id: 0,
			latitude: myLocation.value.lat,
			longitude: myLocation.value.lng,
			iconPath: '/static/marker-me.png',
			width: 24,
			height: 24,
			callout: {
				content: '我的位置',
				fontSize: 11,
				borderRadius: 8,
				padding: 4,
				display: 'ALWAYS',
			},
		});
		return markers;
	});

	onMounted(() => {
		statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 20;
		// 延迟获取 mapContext（需等 DOM 渲染完）
		setTimeout(() => {
			mapContext = uni.createMapContext('mapEl', null);
		}, 200);
		getLocation();
	});

	function onMapUpdated() {
		// map 渲染完成后，如果有 mapContext，尝试 moveToLocation
		if (mapContext && myLocation.value.lat !== 39.9042) {
			mapContext.moveToLocation();
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
					fail: () => resolve({
						authSetting: {}
					})
				});
			});
			// 未授权 → 主动请求
			if (!setting.authSetting || !setting.authSetting['scope.userLocation']) {
				await new Promise((resolve, reject) => {
					uni.authorize({
						scope: 'scope.userLocation',
						success: resolve,
						fail: () => {
							// 用户拒绝 → 引导打开设置
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
			// 权限被拒，使用默认位置
			handleLocationFail();
			return;
		}

		// 2. 开始获取位置
		uni.getLocation({
			type: 'gcj02',
			timeout: 10000,
			success: (res) => {
				myLocation.value = {
					lat: res.latitude,
					lng: res.longitude
				};
				mapCenter.value = {
					lat: res.latitude,
					lng: res.longitude
				};
				mapScale.value = 15;
				updateDistances(res.latitude, res.longitude);
				locating.value = false;
				// 逆地理编码获取地址名称
				reverseGeocode(res.latitude, res.longitude);
				// 强制地图移动到当前位置
				if (mapContext) {
					mapContext.moveToLocation();
				} else {
					mapKey.value++;
				}
				uni.showToast({
					title: '已定位到当前位置',
					icon: 'success',
					duration: 1500
				});
			},
			fail: (err) => {
				console.error('getLocation fail:', err);
				handleLocationFail();
			},
		});
	}

	function handleLocationFail() {
		locationText.value = '北京市 · 朝阳区';
		mapCenter.value = {
			lat: 39.9042,
			lng: 116.4074
		};
		mapScale.value = 13;
		locating.value = false;
		uni.showToast({
			title: '使用默认位置（北京）',
			icon: 'none',
			duration: 2000
		});
	}

	// 逆地理编码 — 通过腾讯地图 API 获取地址名称
	// 使用前需在腾讯位置服务 https://lbs.qq.com 申请 Key，配置于 project.config.json
	const MAP_KEY = 'YOUR_TENCENT_MAP_KEY'; // TODO: 替换为真实 Key

	function reverseGeocode(lat, lng) {
		// 显示定位中，等 API 返回真实地址
		locationText.value = '定位中...';

		// 未配置 Key 时直接显示区级友好信息
		if (MAP_KEY === 'YOUR_TENCENT_MAP_KEY') {
			locationText.value = '定位成功';
			return;
		}

		// 用腾讯地图逆地理编码 API 查地址
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
					// 显示到区/街道一级：如 "北京市朝阳区" 或 "朝阳区望京街道"
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

	// 根据用户位置更新距离
	function updateDistances(myLat, myLng) {
		// Haversine 公式计算两点距离（米）
		function haversine(lat1, lng1, lat2, lng2) {
			const R = 6371000;
			const dLat = (lat2 - lat1) * Math.PI / 180;
			const dLng = (lng2 - lng1) * Math.PI / 180;
			const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(
				dLng / 2) ** 2;
			return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
		}
		nearbyPoints.value = nearbyPoints.value.map(p => ({
			...p,
			distance: haversine(myLat, myLng, p.lat, p.lng),
		}));
		// 按距离排序
		nearbyPoints.value.sort((a, b) => a.distance - b.distance);
	}

	// 回到我的位置
	function moveToMyLocation() {
		mapCenter.value = {
			...myLocation.value
		};
	}

	function onMarkerTap(e) {
		const id = e.detail?.markerId || e.markerId;
		if (!id || id === 0) return;
		const point = nearbyPoints.value.find(p => p.id === id);
		if (point) onPointTap(point);
	}

	function formatDistance(d) {
		return d >= 1000 ? (d / 1000).toFixed(1) + 'km' : d + 'm';
	}

	function onScan() {
		uni.scanCode({
			onlyFromCamera: true,
			success: (res) => {
				const sn = res.result;
				uni.navigateTo({
					url: `/pages/lease/confirm?sn=${encodeURIComponent(sn)}`
				});
			},
			fail: (err) => {
				if (err.errMsg.includes('cancel')) return;
				uni.showToast({
					title: '请扫描外骨骼设备二维码',
					icon: 'none',
					duration: 2000
				});
			},
		});
	}

	function goToScanning() {
		uni.navigateTo({
			url: '/pages/device/scanning'
		})
	}

	function goToNearby() {
		// 滑动到设备列表区域（或跳转独立页）
		uni.navigateTo({
			url: '/pages/device/scanning'
		})
	}

	function goToProfile() {
		uni.navigateTo({
			url: '/pages/profile/my'
		})
	}

	function onPointTap(point) {
		uni.showActionSheet({
			itemList: [`${point.name} · 可租${point.available}台`],
			success: () => {
				uni.navigateTo({
					url: `/pages/lease/confirm?sn=mock-${point.id}`
				});
			},
		});
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
	.status-bar { background: $pageBg; flex-shrink: 0; }

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
		background: #f1f2f6;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 8px;
		margin-bottom: 8px;
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
		background: linear-gradient(135deg, #00C9A7, #00c9a7);
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 40px;
		box-shadow: 0 -4px 20px rgba(0, 201, 167, 0.35);
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
</style>