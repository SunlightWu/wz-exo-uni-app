<template>
	<view class="cabinet-page">
		<!-- 柜机列表 -->
		<scroll-view scroll-y class="cabinet-list" @scrolltolower="loadMore" refresher-enabled
			:refresher-triggered="refreshing" @refresherrefresh="onRefresh">

			<view v-for="item in cabinetList" :key="item.id" class="cabinet-card" @tap="goToCabinetDetail(item)">
				<!-- 左侧图片 -->
				<image class="cabinet-img"
					:src="item.imageUrl ? BASE_URL + item.imageUrl : (item.image ? BASE_URL + item.image : '/static/wz_logo.png')"
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
			<view v-if="cabinetList.length === 0 && !loading" class="empty-state">
				<image class="empty-img" src="/static/equipment-empty.png" mode="aspectFit"></image>
				<text class="empty-text">附近暂无可用机柜</text>
				<view class="empty-btn" @tap="onRefresh">刷新</view>
			</view>

			<!-- 加载状态 -->
			<view v-if="loading && cabinetList.length > 0" class="load-status">加载中...</view>
			<view v-if="!hasMore && cabinetList.length > 0" class="load-status">没有更多了</view>
		</scroll-view>
	</view>
</template>

<script setup>
	import { ref, computed } from 'vue';
	import { api, BASE_URL } from '../../services/api.js';

	const statusBarHeight = ref(20);
	const cabinets = ref([]);
	const loading = ref(false);
	const refreshing = ref(false);
	const hasMore = ref(true);
	const pageNum = ref(1);
	const pageSize = 20;
	let currentLat = 39.9042;
	let currentLng = 116.4074;

	// 带距离计算的柜机列表
	const cabinetList = computed(() => {
		return cabinets.value.map(c => {
			const lat = c.latitude ?? c.lat ?? 0;
			const lng = c.longitude ?? c.lng ?? 0;
			const d = haversine(currentLat, currentLng, lat, lng);
			const distanceText = d >= 1000 ? (d / 1000).toFixed(1) + 'km' : Math.round(d) + 'm';
			return {
				...c,
				id: c.id ?? c.cabinetNo,
				distance: d,
				distanceText,
			};
		}).sort((a, b) => a.distance - b.distance);
	});

	function haversine(lat1, lng1, lat2, lng2) {
		const R = 6371000;
		const dLat = (lat2 - lat1) * Math.PI / 180;
		const dLng = (lng2 - lng1) * Math.PI / 180;
		const a = Math.sin(dLat / 2) ** 2 +
			Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
		return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	}

	async function init() {
		const sys = await uni.getSystemInfo();
		statusBarHeight.value = sys.statusBarHeight || 20;

		// 获取传入的位置参数
		const pages = getCurrentPages();
		const page = pages[pages.length - 1];
		const query = page.options || page.$route?.query || {};
		const lat = parseFloat(query.lat) || 0;
		const lng = parseFloat(query.lng) || 0;

		if (lat && lng) {
			currentLat = lat;
			currentLng = lng;
		}

		fetchCabinets(true);
	}

	async function fetchCabinets(reset = false) {
		if (loading.value) return;
		loading.value = true;
		try {
			const params = {
				lng: currentLng,
				lat: currentLat,
				radius: 10000,
			};
			// 如果支持分页则带上分页参数
			if (pageNum.value > 1) {
				params.pageNum = pageNum.value;
				params.pageSize = pageSize;
			}
			const result = await api.getNearbyCabinets(params);
			if (result.code === 0 || result.code === 200) {
				const list = result.data || [];
				if (reset) {
					cabinets.value = list;
				} else {
					cabinets.value.push(...list);
				}
				// 判断是否还有更多数据
				hasMore.value = list.length >= pageSize;
			} else {
				uni.showToast({ title: result.msg || '获取失败', icon: 'none' });
			}
		} catch (err) {
			console.error('[CabinetList] 获取柜机失败:', err.message || err);
			uni.showToast({ title: '网络异常', icon: 'none' });
		} finally {
			loading.value = false;
			refreshing.value = false;
		}
	}

	function onRefresh() {
		refreshing.value = true;
		pageNum.value = 1;
		hasMore.value = true;
		fetchCabinets(true);
	}

	function loadMore() {
		if (!hasMore.value || loading.value) return;
		pageNum.value++;
		fetchCabinets(false);
	}

	function goToCabinetDetail(item) {
		const id = item.id ?? item.cabinetNo;
		const lat = item.latitude || item.lat || 0;
		const lng = item.longitude || item.lng || 0;
		uni.navigateTo({
			url: `/pages/cabinet/detail?id=${id}&lat=${lat}&lng=${lng}&userLat=${currentLat}&userLng=${currentLng}`,
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
				uni.showToast({ title: '无法打开导航', icon: 'none' });
			}
		});
	}

	function goBack() {
		uni.navigateBack();
	}

	// 页面显示时初始化（兼容直接进入和 navigateTo）
	const onShow = () => {
		if (cabinets.value.length === 0) {
			init();
		}
	};
	// 兼容首次进入
	import { onMounted } from 'vue';
	onMounted(() => {
		init();
	});
</script>

<style scoped lang="scss">
	.cabinet-page {
		@include page-base;
		display: flex;
		flex-direction: column;
		height: 100vh;
		padding-bottom: 0;
	}

	.status-bar {
		background: #fff;
		flex-shrink: 0;
	}

	.nav-bar {
		@include flex-between;
		padding: 10px 16px;
		background: #fff;
		flex-shrink: 0;
		border-bottom: 1px solid #f5f5f5;
	}

	.nav-back {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.nav-back:active {
		opacity: 0.7;
	}

	.nav-title {
		font-size: 17px;
		font-weight: 800;
		color: $textMainColor;
	}

	.cabinet-list {
		flex: 1;
		min-height: 0;
		padding: 12px 0;
	}

	/* 机柜卡片 —— 与首页一致 */
	.cabinet-card {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px;
		background: #fff;
		border-radius: 16px;
		margin-bottom: 10px;
		margin-left: 16px;
		margin-right: 16px;
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
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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
		padding: 60px 20px;
		gap: 12px;
	}

	.empty-img {
		width: 100px;
		height: 100px;
	}

	.empty-text {
		font-size: 14px;
		color: #999;
	}

	.empty-btn {
		margin-top: 16px;
		padding: 10px 32px;
		background: $primaryColor;
		color: #fff;
		font-size: 14px;
		font-weight: 700;
		border-radius: 12px;
	}

	.empty-btn:active {
		opacity: 0.85;
	}

	/* 加载状态 */
	.load-status {
		text-align: center;
		padding: 16px 0;
		font-size: 12px;
		color: #999;
	}
</style>
