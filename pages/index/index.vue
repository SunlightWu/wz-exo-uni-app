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
				:markers="mapMarkers" :scale="mapScale" :enable-zoom="true" :enable-scroll="true" :show-location="false"
				@markertap="onMarkerTap" @callouttap="onMarkerTap" @regionchange="onRegionChange">
				<view class="locate-center">
					<image class="locate-center-img" src="/static/locate.png"></image>
				</view>
				<view class="map-badge">附近 {{ totalAvailable }} 台可租</view>
				<view class="map-tools">
					<view class="map-tool-btn" @tap="moveToMyLocation">
						<image class="map-tool-img" src="/static/position-icon.png"></image>
					</view>
				</view>
			</map>
		</view>
		<view style="height:240px" class="">

		</view>

		<!-- 租赁中悬浮状态卡片 -->
		<view v-if="deviceStore.leaseRunning" class="lease-float-card" @click="goToLeaseControl">
			<view class="lease-float-left">
				<u-icon name="play-right-fill" color="#306afc" size="18"></u-icon>
				<view class="lease-float-info">
					<text class="lease-float-title">{{ deviceStore.deviceName || '外骨骼设备' }}</text>
					<text class="lease-float-sub">使用中 · {{ leaseDuration }}</text>
				</view>
			</view>
			<view class="lease-float-right">
				<text class="lease-float-cost">¥{{ leaseCostDisplay }}</text>
				<view class="lease-float-btn">
					<text>继续</text>
					<u-icon name="arrow-right" color="#fff" size="12"></u-icon>
				</view>
			</view>
		</view>

		<!-- 待支付订单悬浮卡片 -->
		<view v-if="pendingOrder" class="pending-float-card" @click="goToPendingOrder">
			<view class="lease-float-left">
				<u-icon name="clock-fill" color="#f59e0b" size="18"></u-icon>
				<view class="lease-float-info">
					<text class="lease-float-title">{{ pendingOrder.deviceName || '外骨骼设备' }}</text>
					<text class="lease-float-sub">已归还 · 待支付</text>
				</view>
			</view>
			<view class="lease-float-right">
				<text class="lease-float-cost">¥{{ ((pendingOrder.payMoney || 0) / 100).toFixed(2) }}</text>
				<view class="pending-float-btn">
					<text>去支付</text>
					<u-icon name="arrow-right" color="#fff" size="12"></u-icon>
				</view>
			</view>
		</view>

		<!-- 底部抽屉：附近机柜列表 -->
		<BottomDrawer :min-height="240" :max-height="520" :expanded="drawerExpanded" @change="onDrawerChange">
			<view class="drawer-header">
				<view class="drawer-title-wrap">
					<text class="drawer-title">附近租借点</text>
					<text class="drawer-subtitle">为你推荐附近的可租借点</text>
				</view>
				<view class="list-mode-btn" @tap="goToCabinetList">
					<text>列表</text>
					<u-icon name="list-dot" color="#306afc" size="16"></u-icon>
				</view>
			</view>

			<scroll-view class="cabinet-scroll" scroll-y enhanced :show-scrollbar="false">
				<view v-for="item in cabinetList" :key="item.id" class="cabinet-card" @tap="goToCabinetDetail(item)">
					<!-- 左侧图片 -->
					<image class="cabinet-img" :src="item.imageUrl ? BASE_URL + item.imageUrl : (item.image ? BASE_URL + item.image : '/static/wz_logo.png')"
						mode="aspectFill"></image>

					<!-- 中间信息 -->
					<view class="cabinet-info">
						<text class="cabinet-name">{{ item.cabinetName || item.name || '柜机' }}</text>
						<view class="cabinet-meta-row">
							<u-icon name="map-pin" color="#999" size="12"></u-icon>
							<text class="cabinet-distance">约 {{ item.distanceText }}</text>
							<view class="cabinet-status-tag"
								:class="item.status === 'online' || item.status === 'OPEN' || item.status === 1 ? 'status-open' : 'status-close'">
								<text>{{ item.status === 'online' || item.status === 'OPEN' || item.status === 1 ? '营业中' : '休息中' }}</text>
							</view>
							<text v-if="item.businessHours" class="cabinet-hours">{{ item.businessHours }}</text>
						</view>
						<view class="cabinet-meta-row">
							<text class="cabinet-address">{{ item.address || item.location || '暂无地址信息' }}</text>
						</view>
						<view class="cabinet-price-row">
							<text class="cabinet-price">
								¥{{ (item.feeTemplate?.hourlyRate ? (item.feeTemplate.hourlyRate / 100).toFixed(2) : item.rate || item.hourlyRate || '1.50') }}/小时
							</text>
							<text v-if="item.feeTemplate?.dailyCap || item.dailyCap || item.cap" class="cabinet-cap">
								·
								24小时封顶¥{{ item.feeTemplate?.dailyCap ? (item.feeTemplate.dailyCap / 100).toFixed(2) : item.dailyCap || item.cap || '30.00' }}
							</text>
						</view>
					</view>

					<!-- 右侧数量 + 导航 -->
					<view class="cabinet-right">
						<view class="cabinet-count">
							<text
								class="cabinet-count-num">{{ item.availableDevices || item.availableDeviceCount || 0 }}</text>
							<text class="cabinet-count-label">可借</text>
						</view>
						<view class="nav-btn" @tap.stop="openNavigation(item)">
							<image src="/static/navigation.png" mode="aspectFit"></image>
						</view>
					</view>
				</view>

				<!-- 空状态 -->
				<view v-if="cabinetList.length === 0" class="empty-state">
					<image class="empty-img" src="/static/equipment-empty.png" mode="aspectFit"></image>
					<text class="empty-text">附近暂无可用机柜</text>
				</view>
			</scroll-view>
		</BottomDrawer>

		<!-- 手机号授权弹出层 -->
		<phone-auth-popup :show="showAuth" @success="onPhoneAuthSuccess" />
	</view>
</template>

<script setup>
	import {
		ref,
		computed,
		onMounted,
		onUnmounted
	} from 'vue';
	import {
		onShow,
		onHide
	} from '@dcloudio/uni-app';
	import {
		useDeviceStore
	} from '../../store/device.js';
	import {
		useUserStore
	} from '../../store/user.js';
	import {
		api,
		BASE_URL
	} from '../../services/api.js';
	import {
		reportLocation,
		resetLocationDedup
	} from '../../services/location.js';
import { parseDate } from '../../utils/format.js';
	import { usePhoneAuth } from '../../composables/usePhoneAuth.js';
	import {
		parseDeviceQr
	} from '../../utils/qr-parser.js';
	import {
		logout
	} from '../../services/auth.js';
	import BottomDrawer from '../../components/BottomDrawer.vue';

	const deviceStore = useDeviceStore();
	const userStore = useUserStore();
	const { showAuth, ensurePhoneBound, onAuthSuccess } = usePhoneAuth();

	// 包装 onAuthSuccess：登录成功后初始化页面数据
	async function onPhoneAuthSuccess() {
		onAuthSuccess()
		uni.showTabBar()
		await initPageData()
	}

	const statusBarHeight = ref(20)
	const locating = ref(false)
	let mapContext = null
	const pendingOrder = ref(null)

	// 标志：跳过由程序触发的 regionchange（如 moveToLocation 后），只响应用户手势
	let skipRegionCount = 0 // 允许跳过多次程序触发的 regionchange（如 moveToLocation 后），只响应用户手势
	let fetchNearbyTimer = null // 防抖定时器
	const SEARCH_RADIUS = 2000 // 搜索半径（米）
	const mapScale = ref(14) // 默认缩放，主动定位时根据半径调整，拖动时不改变
	const mapCenter = ref({
		lat: 39.9042,
		lng: 116.4074
	}) // 默认北京

	// 根据搜索半径计算合适的地图缩放等级
	function calcScaleByRadius(radiusMeters) {
		if (radiusMeters <= 100) return 18;
		if (radiusMeters <= 300) return 17;
		if (radiusMeters <= 500) return 16;
		if (radiusMeters <= 1000) return 15;
		if (radiusMeters <= 2000) return 14;
		if (radiusMeters <= 5000) return 12;
		if (radiusMeters <= 10000) return 11;
		if (radiusMeters <= 20000) return 10;
		return 9;
	}

	// 用户位置（查询中心点）
	const myLocation = ref({
		lat: 39.9042,
		lng: 116.4074
	})
	const locationText = ref('定位')

	// 附近柜机列表（真实接口）
	const cabinets = ref([]);
	const drawerExpanded = ref(false);



	const totalAvailable = computed(() => cabinets.value.reduce((sum, c) => sum + (c.availableDevices || c
		.availableDeviceCount || 0), 0));

	// 租赁中时长与费用（实时计算）
	const leaseDuration = ref('00:00');
	const leaseCostDisplay = ref('0.00');
	let leaseTimer = null;

	function updateLeaseFloat() {
		if (!deviceStore.leaseRunning || !deviceStore.leaseStartTime) return;
		const elapsed = Math.floor((Date.now() - deviceStore.leaseStartTime) / 1000);
		const h = Math.floor(elapsed / 3600);
		const m = Math.floor((elapsed % 3600) / 60);
		const s = elapsed % 60;
		leaseDuration.value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
		// 费用计算：与 demo-control 保持一致（不足1小时按1小时计）
		const minutes = Math.floor(elapsed / 60);
		const billableMinutes = Math.max(0, minutes - (deviceStore.leaseFreeMinutes || 0));
		let cost = 0;
		if (billableMinutes > 0) {
			const billableHours = Math.ceil(billableMinutes / 60);
			cost = (billableHours * (deviceStore.leaseRate || 0)) / 100;
		}
		leaseCostDisplay.value = cost.toFixed(2);
	}

	// 带距离和补充字段的柜机列表
	const cabinetList = computed(() => {
		const list = cabinets.value.map(c => {
			const lat = c.latitude ?? c.lat ?? 0;
			const lng = c.longitude ?? c.lng ?? 0;
			const userLat = myLocation.value.lat;
			const userLng = myLocation.value.lng;
			const d = haversine(userLat, userLng, lat, lng);
			const distanceText = d >= 1000 ? (d / 1000).toFixed(1) + 'km' : Math.round(d) + 'm';
			return {
				...c,
				id: c.id ?? c.cabinetNo,
				lat,
				lng,
				distance: d,
				distanceText,
			};
		});
		// 按距离排序
		list.sort((a, b) => a.distance - b.distance);
		return list;
	});

	function haversine(lat1, lng1, lat2, lng2) {
		const R = 6371000;
		const dLat = (lat2 - lat1) * Math.PI / 180;
		const dLng = (lng2 - lng1) * Math.PI / 180;
		const a = Math.sin(dLat / 2) ** 2 +
			Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
		return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	}

	function onDrawerChange(expanded) {
		drawerExpanded.value = expanded;
	}

	function goToCabinetDetail(item) {
		const id = item.id;
		const lat = item.latitude || item.lat || 0;
		const lng = item.longitude || item.lng || 0;
		const userLat = myLocation.value.lat;
		const userLng = myLocation.value.lng;
		uni.navigateTo({
			url: `/pages/cabinet/detail?id=${id}&lat=${lat}&lng=${lng}&userLat=${userLat}&userLng=${userLng}`,
		});
	}

	function goToCabinetList() {
		uni.navigateTo({
			url: `/pages/cabinet/list?lat=${myLocation.value.lat}&lng=${myLocation.value.lng}`,
		});
	}

	function openNavigation(item) {
		const lat = item.latitude || item.lat || 0;
		const lng = item.longitude || item.lng || 0;
		const name = item.cabinetName || item.name || '机柜位置';
		uni.openLocation({
			latitude: lat,
			longitude: lng,
			name,
			address: item.address || '',
			fail: () => {
				uni.showToast({
					title: '无法打开导航',
					icon: 'none'
				});
			}
		});
	}

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
				iconPath: "/static/empty_trans.png",
				width: 1,
				height: 1,
				// 锚点底部对齐，让气泡箭头对准位置
				anchor: {
					x: 0.5,
					y: 1
				},
				callout: {
					content: `${available}台可借`,
					color: '#ffffff',
					fontSize: 12,
					borderRadius: 12,
					borderColor: '#306afc',
					bgColor: '#306afc',
					padding: 8,
					display: 'ALWAYS',
					textAlign: 'center',
					anchorY: 1,
					// 精准上移，气泡尖压住透明小点，完全遮挡
					offsetY: -25,
					// 关闭callout自带边框
					borderWidth: 0
				}
			});
		}
		return markers;
	});

	// 定位上报定时器
	let locationTimer = null;

	// ── 通用订单查询 ──
	async function checkLeaseOrders(status, onFound) {
		try {
			const res = await api.getMyOrders({
				status,
				pageNum: 1,
				pageSize: 1
			});
			if ((res.code === 200 || res.code === 0) && res.data) {
				const records = res.data.records || res.data.list || [];
				if (records.length > 0) {
					onFound && onFound(records[0]);
					return true;
				}
			}
		} catch (e) {
			console.warn(`[Index] 查询订单(status=${status})失败:`, e.message);
		}
		return false;
	}

	async function checkActiveLease() {
		const found = await checkLeaseOrders(1, (order) => {
			const startTime = order.pickupTime ? parseDate(order.pickupTime).getTime() : Date.now();
			deviceStore.setLeaseInfo({
				tradeNo: order.tradeNo || '',
				deviceSn: order.deviceSn || '',
				startTime,
				rate: order.hourlyRate || 0,
				freeMinutes: order.freeMinutes || 0,
				deposit: order.depositMoney || 0,
				deviceName: order.deviceName || '外骨骼设备',
			});
			console.log('[Index] 恢复进行中的订单:', order.tradeNo);
		});
		if (!found) {
			// API 无进行中订单时，清除可能过期的本地状态
			deviceStore.endLease();
		}
		return found || deviceStore.leaseRunning;
	}

	async function checkPendingPayment() {
		const found = await checkLeaseOrders(2, (order) => {
			pendingOrder.value = order;
			console.log('[Index] 发现待支付订单:', order.tradeNo);
		});
		if (!found) {
			pendingOrder.value = null;
		}
		return found;
	}

	async function startLeaseServices() {
		// 安全启动：先停止旧 timer 避免重复
		stopLeaseServices();
		// 启动悬浮卡片定时刷新
		updateLeaseFloat();
		leaseTimer = setInterval(updateLeaseFloat, 1000);
		// 启动定位上报（每 5 秒一次，内部自动去重）
		if (deviceStore.leaseDeviceSn) {
			locationTimer = setInterval(() => {
				reportLocation(deviceStore.leaseDeviceSn);
			}, 5000);
		}
	}

	function stopLeaseServices() {
		if (leaseTimer) {
			clearInterval(leaseTimer);
			leaseTimer = null;
		}
		if (locationTimer) {
			clearInterval(locationTimer);
			locationTimer = null;
		}
	}

	onMounted(async () => {
		const sys = await uni.getSystemInfo()
		statusBarHeight.value = sys.statusBarHeight || 20

		// ── 第一步：检查登录态 ──
		// 无 token → 弹出手机号授权层，登录成功前不执行后续逻辑
		if (!userStore.token) {
			uni.hideTabBar()
			showAuth.value = true
			return // 登录成功后由 onAuthSuccess 触发后续初始化
		}

		// ── 第二步：已登录，拉取会员信息并初始化 ──
		await initPageData()
	})

	// 首页初始化逻辑（登录成功后也会调用）
	async function initPageData() {
		const [loginDone, hasActiveLease, hasPendingPayment] = await Promise.all([
			(async () => {
				if (userStore.token) {
					await userStore.fetchMemberInfo()
				}
				return true
			})(),
			checkActiveLease(),
			checkPendingPayment(),
		]);

		if (hasActiveLease) {
			await startLeaseServices();
		}

		// 延迟创建 mapContext 并定位（不阻塞页面初始渲染）
		setTimeout(() => {
			mapContext = uni.createMapContext('mapEl', null);
			getLocation();
		}, 400);
	}

	let isFirstShow = true;

	onShow(async () => {
		// 首次 onShow 在 onMounted 之后触发，不重复查询订单
		// 仅需确保 timer 已启动（onMounted 到 onShow 间隔可能很短）
		if (isFirstShow) {
			isFirstShow = false;
			if (deviceStore.leaseRunning && !leaseTimer) {
				await startLeaseServices();
			}
			return;
		}
		// 非首次显示：刷新柜机列表
		if (myLocation.value && myLocation.value.lat) {
			fetchNearbyCabinets(myLocation.value.lng, myLocation.value.lat);
		} else {
			getLocation();
		}
		// 从其他页面返回时，重新检查订单状态（可能有变化）
		if (!deviceStore.leaseRunning) {
			const hasActiveLease = await checkActiveLease();
			if (hasActiveLease) {
				await startLeaseServices();
			}
		} else if (!leaseTimer) {
			await startLeaseServices();
		}
		await checkPendingPayment();
	});

	onHide(() => {
		// 页面隐藏时停止定位上报（节省电量），但保持计时器
		if (locationTimer) {
			clearInterval(locationTimer);
			locationTimer = null;
		}
	});

	onUnmounted(() => {
		stopLeaseServices();
	});

	// 地图区域变化：只在拖动结束时获取中心点并查询柜机（带防抖）
	// 注意：拖动时不修改 mapCenter，避免地图跳动；只更新查询中心并拉取数据
	function onRegionChange(e) {
		if (skipRegionCount > 0) {
			skipRegionCount--;
			return;
		}
		const type = e.type || (e.detail && e.detail.type) || '';
		if (type === 'end') {
			// 防抖：300ms 内多次 end 只取最后一次
			if (fetchNearbyTimer) clearTimeout(fetchNearbyTimer);
			fetchNearbyTimer = setTimeout(() => {
				if (mapContext) {
					mapContext.getCenterLocation({
						success: (res) => {
							const lat = res.latitude;
							const lng = res.longitude;
							myLocation.value = {
								lat,
								lng
							};
							// 拖动后不修改 mapCenter，让定位钉保持在屏幕中央
							fetchNearbyCabinets(lng, lat);
						},
					});
				}
			}, 300);
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
				myLocation.value = {
					lat,
					lng
				};
				mapCenter.value = {
					lat,
					lng
				};
				mapScale.value = calcScaleByRadius(SEARCH_RADIUS);
				locating.value = false;
				reverseGeocode(lat, lng);
				// 移动地图到当前位置（mapContext 已确保创建）
				if (mapContext) {
					skipRegionCount += 2;
					mapContext.moveToLocation({
						latitude: lat,
						longitude: lng
					});
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
		mapCenter.value = {
			lat: 39.9042,
			lng: 116.4074
		};
		mapScale.value = calcScaleByRadius(SEARCH_RADIUS);
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

	// 获取附近柜机（带请求级防抖，1秒内只发一次真实请求）
	let lastFetchTime = 0;
	let lastFetchLng = 0;
	let lastFetchLat = 0;

	async function fetchNearbyCabinets(lng, lat) {
		const now = Date.now();
		// 距离上次请求不足 1 秒，且坐标接近（<0.0001° ≈ 10m），跳过
		if (now - lastFetchTime < 1000 &&
			Math.abs(lng - lastFetchLng) < 0.0001 &&
			Math.abs(lat - lastFetchLat) < 0.0001) {
			console.log('[Index] 跳过重复 nearby 请求');
			return;
		}
		lastFetchTime = now;
		lastFetchLng = lng;
		lastFetchLat = lat;
		try {
			const result = await api.getNearbyCabinets({
				lng,
				lat,
				radius: SEARCH_RADIUS
			});
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
				myLocation.value = {
					lat,
					lng
				};
				mapCenter.value = {
					lat,
					lng
				};
				mapScale.value = calcScaleByRadius(SEARCH_RADIUS); // 重置缩放比例
				// 移动地图到当前位置
				if (mapContext) {
					skipRegionCount += 2;
					mapContext.moveToLocation({
						latitude: lat,
						longitude: lng
					});
				}
				fetchNearbyCabinets(lng, lat);
			},
			fail: () => {
				locating.value = false;
				uni.showToast({
					title: '定位失败',
					icon: 'none'
				});
			},
		});
	}

	function onMarkerTap(e) {
		const markerId = e.detail?.markerId || e.markerId;
		if (!markerId || markerId === 0) return;
		// markerId 可能是 number/string，兼容处理
		const cabinet = cabinets.value.find(c => String(c.id ?? c.cabinetNo) === String(markerId));
		if (!cabinet) return;
		const id = cabinet.id ?? cabinet.cabinetNo;
		const lat = cabinet.latitude || cabinet.lat || 0;
		const lng = cabinet.longitude || cabinet.lng || 0;
		const userLat = myLocation.value.lat;
		const userLng = myLocation.value.lng;
		uni.navigateTo({
			url: `/pages/cabinet/detail?id=${id}&lat=${lat}&lng=${lng}&userLat=${userLat}&userLng=${userLng}`,
		});
	}

	async function goToScanning() {
		if (!await ensurePhoneBound()) return;
		uni.navigateTo({
			url: '/pages/device/scanning'
		})
	}

	async function goToLeaseControl() {
		if (!await ensurePhoneBound()) return;
		if (!deviceStore.leaseRunning) return;
		const sn = deviceStore.leaseDeviceSn || '';
		const rate = deviceStore.leaseRate || 0;
		const freeMin = deviceStore.leaseFreeMinutes || 0;
		const deposit = deviceStore.leaseDeposit || 0;
		const name = encodeURIComponent(deviceStore.deviceName || '外骨骼设备');
		uni.navigateTo({
			url: `/pages/device/demo-control?tradeNo=${deviceStore.tradeNo}&deviceSn=${sn}&name=${name}&hourlyRate=${rate}&freeMinutes=${freeMin}&depositMoney=${deposit}`
		});
	}

	async function goToPendingOrder() {
		if (!await ensurePhoneBound()) return;
		if (!pendingOrder.value?.tradeNo) return;
		uni.navigateTo({
			url: `/pages/device/completed?tradeNo=${pendingOrder.value.tradeNo}`,
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
		background: rgba(255, 255, 255, 0.9);
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
		background: #f0f4fa;
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

	/* ===== 底部抽屉内容样式 ===== */
	.drawer-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;
		padding: 0 4px;
	}

	.drawer-title-wrap {
		display: flex;
		align-items: baseline;
		gap: 8px;
	}

	.drawer-title {
		font-size: 16px;
		font-weight: 800;
		color: $textMainColor;
	}

	.drawer-subtitle {
		font-size: 12px;
		color: $textSubColor;
	}

	.list-mode-btn {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 12px;
		color: $primaryColor;
		font-weight: 600;
		padding: 4px 8px;
		border-radius: 8px;
		background: rgba(48, 106, 252, 0.08);
	}

	.cabinet-scroll {
		height: 100%;
	}

	/* 机柜卡片 */
	.cabinet-card {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px;
		background: #fff;
		border-radius: 16px;
		margin-bottom: 10px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
		border: 1px solid rgba(0, 0, 0, 0.04);
		transition: transform 0.15s;
	}

	.cabinet-card:active {
		transform: scale(0.985);
		background: #fafafa;
	}

	.cabinet-img {
		width: 72px;
		height: 72px;
		border-radius: 12px;
		background: #f5f6fa;
		flex-shrink: 0;
		object-fit: cover;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
	}

	.cabinet-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	.cabinet-name {
		font-size: 15px;
		font-weight: 800;
		color: $textMainColor;
		@include text-ellipsis;
	}

	.cabinet-meta-row {
		display: flex;
		align-items: center;
		gap: 4px;
		overflow: hidden;
	}

	.cabinet-distance {
		font-size: 11px;
		color: #666;
		flex-shrink: 0;
	}

	.cabinet-status-tag {
		font-size: 10px;
		padding: 2px 8px;
		border-radius: 10px;
		font-weight: 700;
		flex-shrink: 0;
	}

	.cabinet-status-tag.status-open {
		background: rgba(40, 199, 111, 0.12);
		color: #28c76f;
	}

	.cabinet-status-tag.status-close {
		background: rgba(153, 153, 153, 0.1);
		color: #999;
	}

	.cabinet-hours {
		font-size: 10px;
		color: #999;
		flex-shrink: 0;
	}

	.cabinet-address {
		font-size: 11px;
		color: #999;
		@include text-ellipsis;
		flex: 1;
	}

	.cabinet-price-row {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.cabinet-price {
		font-size: 14px;
		font-weight: 800;
		color: $dangerColor;
	}

	.cabinet-cap {
		font-size: 11px;
		color: #999;
	}

	/* 右侧 */
	.cabinet-right {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
		min-width: 48px;
	}

	.cabinet-count {
		display: flex;
		flex-direction: column;
		align-items: center;
		background: rgba(48, 106, 252, 0.06);
		padding: 6px 10px;
		border-radius: 10px;
	}

	.cabinet-count-num {
		font-size: 22px;
		font-weight: 900;
		color: $primaryColor;
		line-height: 1;
	}

	.cabinet-count-label {
		font-size: 10px;
		color: $textSubColor;
		margin-top: 2px;
	}

	.nav-btn {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(48, 106, 252, 0.08);
		border-radius: 50%;
	}

	.nav-btn image {
		width: 20px;
		height: 20px;
	}

	.nav-btn:active {
		opacity: 0.8;
	}

	/* 空状态 */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 40px 20px;
		gap: 8px;
	}

	.empty-img {
		width: 100px;
		height: 100px;
	}

	.empty-text {
		font-size: 13px;
		color: #999;
	}

	/* 租赁中悬浮卡片 */
	.lease-float-card {
		position: fixed;
		bottom: 260px;
		left: 16px;
		right: 16px;
		z-index: 100;
		background: #fff;
		border-radius: 16px;
		padding: 14px 16px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		box-shadow: 0 4px 20px rgba(48, 106, 252, 0.18);
		border: 1.5px solid rgba(48, 106, 252, 0.12);
		transition: transform 0.15s;
	}

	.lease-float-card:active {
		transform: scale(0.98);
	}

	.lease-float-left {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.lease-float-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.lease-float-title {
		font-size: 15px;
		font-weight: 800;
		color: $textMainColor;
	}

	.lease-float-sub {
		font-size: 12px;
		color: $textSubColor;
	}

	.lease-float-right {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.lease-float-cost {
		font-size: 16px;
		font-weight: 800;
		color: $dangerColor;
	}

	.lease-float-btn {
		background: $primaryColor;
		color: #fff;
		font-size: 12px;
		font-weight: 700;
		padding: 6px 12px;
		border-radius: 20px;
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.lease-float-btn:active {
		opacity: 0.8;
	}

	/* 待支付订单悬浮卡片 */
	.pending-float-card {
		position: fixed;
		bottom: 260px;
		left: 16px;
		right: 16px;
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: linear-gradient(135deg, #fff 0%, #fffbf0 100%);
		border-radius: 16px;
		padding: 14px 16px;
		box-shadow: 0 4px 20px rgba(245, 158, 11, 0.18);
		border: 1.5px solid rgba(245, 158, 11, 0.12);
		transition: transform 0.15s;
	}

	.pending-float-card:active {
		transform: scale(0.98);
	}

	.pending-float-btn {
		background: #f59e0b;
		color: #fff;
		font-size: 12px;
		font-weight: 700;
		padding: 6px 12px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.pending-float-btn:active {
		opacity: 0.8;
	}
</style>