<template>
	<view class="order-page">
		<!-- 顶部状态筛选 -->
		<scroll-view class="filter-bar" scroll-x :show-scrollbar="false">
			<view
				v-for="tab in filterTabs"
				:key="tab.value"
				class="filter-tab"
				:class="{ active: currentFilter === tab.value }"
				@click="onFilterChange(tab.value)"
			>
				<text class="filter-text">{{ tab.label }}</text>
				<view v-if="currentFilter === tab.value" class="filter-indicator"></view>
			</view>
		</scroll-view>

		<!-- 订单列表 -->
		<scroll-view
			class="order-scroll"
			scroll-y
			:refresher-enabled="true"
			:refresher-triggered="refreshing"
			@refresherrefresh="onPullRefresh"
			@scrolltolower="onLoadMore"
		>
			<view class="order-list">
				<view
					v-for="item in orders"
					:key="item.tradeNo"
					class="order-card"
					@click="onOrderClick(item)"
				>
					<!-- 顶部：状态 + 编号 -->
					<view class="card-header">
						<view class="status-badge" :class="statusClass(item.status ?? item.state)">
							<text class="status-text">{{ statusLabel(item.status ?? item.state) }}</text>
						</view>
						<text class="trade-no">{{ item.tradeNo }}</text>
					</view>

					<!-- 中部：设备信息 -->
					<view class="card-body">
						<view class="body-row">
							<text class="body-label">设备</text>
							<text class="body-value">{{ item.deviceName || item.deviceSn }}</text>
						</view>
						<view class="body-row">
							<text class="body-label">租借时间</text>
							<text class="body-value">{{ formatDateTime(item.pickupTime) }}</text>
						</view>
						<view v-if="item.returnTime" class="body-row">
							<text class="body-label">归还时间</text>
							<text class="body-value">{{ formatDateTime(item.returnTime) }}</text>
						</view>
						<view class="body-row">
							<text class="body-label">押金</text>
							<text class="body-value highlight">¥{{ (item.depositMoney / 100).toFixed(2) }}</text>
						</view>
					</view>

					<!-- 底部：费用 -->
					<view class="card-footer">
						<view class="footer-info">
							<text class="footer-label">支付金额</text>
							<text class="footer-cost">¥{{ (item.payMoney / 100).toFixed(2) }}</text>
						</view>
						<text class="footer-arrow">›</text>
					</view>
				</view>
			</view>

			<!-- 加载状态 -->
			<view class="load-status">
				<text v-if="loadingMore" class="load-text">加载中...</text>
				<text v-else-if="noMore" class="load-text">没有更多了</text>
			</view>

			<!-- 空状态 -->
			<view v-if="orders.length === 0 && !loading" class="empty-wrap">
				<text class="empty-icon">📋</text>
				<text class="empty-title">暂无订单记录</text>
			</view>
		</scroll-view>
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { api } from '../../services/api.js';

const orders = ref([]);
const loading = ref(true);
const refreshing = ref(false);
const loadingMore = ref(false);
const noMore = ref(false);

const pageNum = ref(1);
const pageSize = 10;
const currentFilter = ref('');

const filterTabs = [
	{ label: '全部', value: '' },
	{ label: '租赁中', value: '1' },
	{ label: '待结算', value: '2' },
	{ label: '已完成', value: '3' },
	{ label: '已取消', value: '4' },
];

onMounted(() => {
	loadOrders();
});

// 从订单详情返回后刷新列表
let isFirstShow = true;
onShow(() => {
	if (isFirstShow) {
		isFirstShow = false;
		return;
	}
	loadOrders();
});

async function loadOrders(append = false) {
	if (!append) {
		loading.value = true;
		pageNum.value = 1;
		noMore.value = false;
	} else {
		loadingMore.value = true;
	}
	try {
		const params = { pageNum: pageNum.value, pageSize };
		if (currentFilter.value) {
			params.status = currentFilter.value;
		}
		const res = await api.getMyOrders(params);
		if (res.code === 200 || res.code === 0) {
			const records = res.data?.records || res.data?.list || res.data || [];
			if (append) {
				orders.value = [...orders.value, ...records];
			} else {
				orders.value = records;
			}
			// 判断是否还有更多
			const total = res.data?.total || 0;
			if (records.length < pageSize || orders.value.length >= total) {
				noMore.value = true;
			}
		}
	} catch (e) {
		console.error('获取订单列表失败:', e.message);
		if (!append) orders.value = [];
	} finally {
		loading.value = false;
		loadingMore.value = false;
	}
}

function onPullRefresh() {
	refreshing.value = true;
	loadOrders(false).finally(() => {
		refreshing.value = false;
	});
}

function onLoadMore() {
	if (loadingMore.value || noMore.value) return;
	pageNum.value++;
	loadOrders(true);
}

function onFilterChange(value) {
	currentFilter.value = value;
	loadOrders(false);
}

function statusLabel(status) {
	const map = {
		0: '待付押金',
		1: '租赁中',
		2: '待结算',
		3: '已完成',
		4: '已取消',
		5: '故障中止',
		6: '丢失赔付',
	};
	return map[status] || '未知';
}

function statusClass(status) {
	if (status === 1) return 'active';
	if (status === 3) return 'done';
	if (status === 2) return 'pending';
	return 'cancel';
}

function onOrderClick(item) {
	const status = item.status ?? item.state;
	if (status === 1) {
		// 租赁中 → 跳转到控制页继续体验
		const rate = item.hourlyRate || 0;
		const freeMin = item.freeMinutes || 0;
		const deposit = item.depositMoney || 0;
		const name = encodeURIComponent(item.deviceName || '外骨骼设备');
		uni.navigateTo({
			url: `/pages/device/demo-control?tradeNo=${item.tradeNo}&deviceSn=${item.deviceSn || ''}&name=${name}&hourlyRate=${rate}&freeMinutes=${freeMin}&depositMoney=${deposit}`
		});
	} else {
		// 其他状态 → 跳转到订单详情
		uni.navigateTo({ url: `/pages/device/completed?tradeNo=${item.tradeNo}` });
	}
}

function formatDateTime(dt) {
	if (!dt) return '--';
	const d = new Date(dt);
	if (isNaN(d.getTime())) return dt;
	const pad = (n) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

</script>

<style scoped lang="scss">
.order-page {
	min-height: 100vh;
	background: #f5f6fa;
	display: flex;
	flex-direction: column;
}

/* 筛选栏 */
.filter-bar {
	display: flex;
	white-space: nowrap;
	background: #fff;
	padding: 0 8px;
	border-bottom: 1px solid #f0f0f0;
	position: sticky;
	top: 0;
	z-index: 10;
}

.filter-tab {
	display: inline-flex;
	flex-direction: column;
	align-items: center;
	padding: 12px 16px 8px;
	position: relative;
}

.filter-text {
	font-size: 14px;
	color: #666;
	font-weight: 600;
	transition: color 0.2s;
}

.filter-tab.active .filter-text {
	color: $primaryColor;
	font-weight: 700;
}

.filter-indicator {
	position: absolute;
	bottom: 0;
	width: 20px;
	height: 3px;
	background: $primaryColor;
	border-radius: 2px;
}

/* 列表滚动区 */
.order-scroll {
	flex: 1;
}

.order-list {
	padding: 12px 16px 20px;
}

/* 订单卡片 */
.order-card {
	background: #fff;
	border-radius: 16px;
	padding: 16px;
	margin-bottom: 12px;
	box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
	transition: opacity 0.15s;
}

.order-card:active {
	opacity: 0.7;
}

/* 头部 */
.card-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 14px;
}

.status-badge {
	padding: 4px 12px;
	border-radius: 8px;
}

.status-badge.active {
	background: rgba(139, 92, 246, 0.1);
}

.status-badge.done {
	background: rgba(40, 199, 111, 0.1);
}

.status-badge.pending {
	background: rgba(245, 158, 11, 0.1);
}

.status-badge.cancel {
	background: rgba(153, 153, 153, 0.1);
}

.status-text {
	font-size: 12px;
	font-weight: 700;
}

.status-badge.active .status-text {
	color: $primaryColor;
}

.status-badge.done .status-text {
	color: #28C76F;
}

.status-badge.pending .status-text {
	color: #f59e0b;
}

.status-badge.cancel .status-text {
	color: #999;
}

.trade-no {
	font-size: 12px;
	color: #bbb;
	font-family: monospace;
}

/* 内容 */
.card-body {
	border-top: 1px solid #f5f6fa;
	border-bottom: 1px solid #f5f6fa;
	padding: 12px 0;
}

.body-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 4px 0;
}

.body-label {
	font-size: 13px;
	color: #999;
}

.body-value {
	font-size: 13px;
	font-weight: 600;
	color: #333;
}

.body-value.highlight {
	color: $primaryColor;
	font-weight: 700;
}

/* 底部 */
.card-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-top: 12px;
}

.footer-info {
	display: flex;
	align-items: center;
	gap: 6px;
}

.footer-label {
	font-size: 12px;
	color: #999;
}

.footer-cost {
	font-size: 16px;
	font-weight: 800;
	color: $primaryColor;
}

.footer-arrow {
	font-size: 20px;
	color: #ccc;
	font-weight: 300;
}

/* 加载状态 */
.load-status {
	display: flex;
	justify-content: center;
	padding: 16px 0 30px;
}

.load-text {
	font-size: 13px;
	color: #bbb;
}

/* 空状态 */
.empty-wrap {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding-top: 120px;
	gap: 10px;
}

.empty-icon {
	font-size: 52px;
}

.empty-title {
	font-size: 15px;
	font-weight: 600;
	color: #999;
}

.scan-btn {
	margin-top: 16px;
	width: 200px;
	padding: 14px 0;
	background: $primaryColor;
	border-radius: 28px;
	text-align: center;
}

.scan-btn:active {
	opacity: 0.8;
}

.scan-btn-text {
	font-size: 16px;
	font-weight: 700;
	color: #fff;
}
</style>
