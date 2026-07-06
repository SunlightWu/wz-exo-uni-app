<template>
	<view class="cabinet-page">

		<!-- 柜机列表 -->
		<scroll-view scroll-y class="cabinet-list" @scrolltolower="loadMore" refresher-enabled
			:refresher-triggered="refreshing" @refresherrefresh="onRefresh">
			<view v-if="cabinets.length === 0 && !loading" class="empty-state">
				<u-icon name="map" color="#ddd" size="64"></u-icon>
				<text class="empty-title">附近暂无柜机</text>
				<text class="empty-desc">尝试刷新或更换位置查看</text>
				<view class="empty-btn" @click="onRefresh">刷新</view>
			</view>

			<view v-for="cabinet in cabinets" :key="cabinet.id ?? cabinet.cabinetNo" class="cabinet-card"
				@click="onCabinetClick(cabinet)">
				<view class="cabinet-main">
					<view class="cabinet-icon-wrap">
						<u-icon name="map-fill" color="$primaryColor" size="24"></u-icon>
					</view>
					<view class="cabinet-info">
						<text class="cabinet-name">{{ cabinet.cabinetName || cabinet.name || '柜机' }}</text>
						<text class="cabinet-no">编号：{{ cabinet.cabinetNo || '-' }}</text>
						<text class="cabinet-address">{{ cabinet.address || '-' }}</text>
					</view>
				</view>
				<view class="cabinet-meta">
					<view class="cabinet-stat">
						<text class="stat-num available">{{ cabinet.availableDevices || cabinet.availableDeviceCount || 0 }}</text>
						<text class="stat-label">可租</text>
					</view>
					<view class="cabinet-stat">
						<text class="stat-num">{{ cabinet.totalDevices || cabinet.totalDeviceCount || 0 }}</text>
						<text class="stat-label">总设备</text>
					</view>
				</view>
			</view>

			<view v-if="loading" class="loading-more">加载中...</view>
			<view v-if="!hasMore && cabinets.length > 0" class="no-more">没有更多了</view>
		</scroll-view>
	</view>
</template>

<script setup>
	import { ref, onMounted } from 'vue';
	import { api } from '../../services/api.js';

	const statusBarHeight = ref(20);
	const cabinets = ref([]);
	const loading = ref(false);
	const refreshing = ref(false);
	const hasMore = ref(true);
	const pageNum = ref(1);
	const pageSize = 20;
	let currentLng = 116.4074;
	let currentLat = 39.9042;

	onMounted(async () => {
		const sys = await uni.getSystemInfo();
		statusBarHeight.value = sys.statusBarHeight || 20;

		// 优先使用传入的位置参数，避免重复定位
		const pages = getCurrentPages();
		const page = pages[pages.length - 1];
		const query = page.options || page.$route?.query || {};
		const lat = parseFloat(query.lat) || 0;
		const lng = parseFloat(query.lng) || 0;

		if (lat && lng) {
			currentLat = lat;
			currentLng = lng;
			fetchCabinets(true);
		}
	});

	async function fetchCabinets(reset = false) {
		if (loading.value) return;
		loading.value = true;
		try {
			const result = await api.getNearbyCabinets({
				lng: currentLng,
				lat: currentLat,
				radius: 10000,
			});
			if (result.code === 0 || result.code === 200) {
				const list = result.data || [];
				console.log(list,'list');
				if (reset) {
					cabinets.value = list;
				} else {
					cabinets.value.push(...list);
				}
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

	function onCabinetClick(cabinet) {
		const no = cabinet.cabinetNo || cabinet.id;
		const lat = cabinet.latitude || cabinet.lat || 0;
		const lng = cabinet.longitude || cabinet.lng || 0;
		uni.navigateTo({
			url: `/pages/cabinet/detail?cabinetNo=${no}&lat=${lat}&lng=${lng}&userLat=${currentLat}&userLng=${currentLng}`,
		});
	}

	function onScan() {
		uni.scanCode({
			onlyFromCamera: true,
			success: (res) => {
				const sn = res.result;
				uni.navigateTo({
					url: `/pages/lease/confirm?sn=${encodeURIComponent(sn)}`,
				});
			},
			fail: (err) => {
				if (err.errMsg.includes('cancel')) return;
				uni.showToast({ title: '请扫描设备二维码', icon: 'none' });
			},
		});
	}

	function goBack() {
		uni.navigateBack();
	}
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

	.custom-nav {
		@include flex-between;
		padding: 10px 16px;
		background: #fff;
		flex-shrink: 0;
	}

	.nav-back {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		@include tap-active;
	}

	.nav-title {
		font-size: 17px;
		font-weight: 800;
		color: $textMainColor;
	}

	.nav-scan {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		@include tap-active;
	}

	.cabinet-list {
		flex: 1;
		min-height: 0;
		padding: 12px 0;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 80px 20px;
		gap: 12px;
	}

	.empty-title {
		font-size: 16px;
		font-weight: 700;
		color: $textMainColor;
	}

	.empty-desc {
		font-size: 13px;
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
		@include tap-active;
	}

	.cabinet-card {
		background: #fff;
		border-radius: 16px;
		padding: 16px;
		margin: 0 16px 12px;
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
		display: flex;
		align-items: center;
		justify-content: space-between;
		@include tap-active;
	}

	.cabinet-main {
		display: flex;
		align-items: center;
		gap: 12px;
		flex: 1;
		min-width: 0;
	}

	.cabinet-icon-wrap {
		width: 44px;
		height: 44px;
		border-radius: 12px;
		background: rgba(139, 92, 246, 0.10);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.cabinet-info {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.cabinet-name {
		font-size: 15px;
		font-weight: 700;
		color: $textMainColor;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.cabinet-no {
		font-size: 12px;
		color: #999;
	}

	.cabinet-address {
		font-size: 12px;
		color: #666;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.cabinet-meta {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-shrink: 0;
		padding-left: 8px;
	}

	.cabinet-stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}

	.stat-num {
		font-size: 16px;
		font-weight: 800;
		color: $textMainColor;
	}

	.stat-num.available {
		color: $primaryColor;
	}

	.stat-label {
		font-size: 11px;
		color: #999;
	}

	.loading-more,
	.no-more {
		text-align: center;
		padding: 16px 0;
		font-size: 12px;
		color: #999;
	}
</style>
