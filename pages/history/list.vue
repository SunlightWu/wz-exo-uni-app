<template>
	<view class="order-page">
		<!-- 顶部状态筛选 -->
		<view class="filter-bar">
			<view
				v-for="tab in filterTabs"
				:key="tab.value"
				class="filter-tab"
				:class="{ active: currentFilter === tab.value }"
				@click="onFilterChange(tab.value)"
			>
				<text class="filter-text">{{ tab.label }}</text>
			</view>
		</view>

		<!-- 订单列表 -->
		<scroll-view
			class="order-scroll"
			scroll-y
			:refresher-enabled="orders.length > 0"
			:refresher-triggered="refreshing"
			@refresherrefresh="onPullRefresh"
			@scrolltolower="onLoadMore"
			lower-threshold="100"
		>
			<view v-if="orders.length > 0" class="order-list">
				<view
					v-for="item in orders"
					:key="item.tradeNo"
					class="order-card"
					@click="onOrderClick(item)"
				>
					<!-- 头部：状态标签 + 支付金额 -->
					<view class="card-header">
						<view class="status-badge" :class="statusClass(item.status ?? item.state)">
							<text class="status-text">{{ statusLabel(item.status ?? item.state) }}</text>
						</view>
						<view class="header-right">
							<text class="header-cost-label">支付</text>
							<text class="header-cost">¥{{ (item.payMoney / 100).toFixed(2) }}</text>
						</view>
					</view>

					<!-- 中部：设备信息 -->
					<view class="card-body">
						<view class="body-row">
							<text class="body-label">设备</text>
							<text class="body-value">{{ item.deviceName || item.deviceSn }}</text>
						</view>
						<view class="body-row">
							<text class="body-label">租借</text>
							<text class="body-value">{{ formatDateTime(item.pickupTime) }}</text>
						</view>
						<view v-if="item.returnTime" class="body-row">
							<text class="body-label">归还</text>
							<text class="body-value">{{ formatDateTime(item.returnTime) }}</text>
						</view>
						<view class="body-row" v-if="item.payScene !== 'RISK_AUTH'">
							<text class="body-label">押金</text>
							<text class="body-value">¥{{ (item.depositMoney / 100).toFixed(2) }}</text>
						</view>
						<view v-else class="body-row">
							<text class="body-label">模式</text>
							<text class="body-value payscore-tag">支付分免押</text>
						</view>
					</view>

					<!-- 底部：编号 + 箭头 -->
					<view class="card-footer">
						<text class="trade-no">订单 {{ item.tradeNo }}</text>
						<u-icon v-if="(item.status ?? item.state) !== 0" name="arrow-right" color="#ccc" size="16"></u-icon>
					</view>
					<!-- 待付押金状态操作按钮 -->
					<view v-if="(item.status ?? item.state) === 0" class="card-actions">
						<view class="action-btn action-cancel" @click.stop="onCancelOrder(item)">
							<text>取消订单</text>
						</view>
						<view v-if="item.payScene === 'RISK_AUTH'" class="action-btn action-payscore" @click.stop="onContinueOrder(item)">
							<image class="action-payscore-icon" src="/static/payscore-logo.svg" mode="aspectFit"></image>
							<text>微信支付分免押租借</text>
						</view>
						<view v-else class="action-btn action-continue" @click.stop="onContinueOrder(item)">
							<text>付押金继续</text>
						</view>
					</view>
				</view>
			</view>

			<!-- 加载状态 -->
			<view v-if="orders.length > 0" class="load-status">
				<text v-if="loadingMore" class="load-text">加载中...</text>
				<text v-else-if="noMore" class="load-text">没有更多了</text>
			</view>

			<!-- 空状态 -->
			<view v-if="orders.length === 0 && !loading" class="empty-wrap">
				<image class="empty-img" src="/static/equipment-empty.png" mode="aspectFit"></image>
				<text class="empty-title">暂无订单记录</text>
				<view class="scan-btn" @click="goToIndex">
					<text class="scan-btn-text">去租借</text>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { api } from '../../services/api.js';
import { formatDateTime } from '../../utils/format.js';

const statusBarHeight = ref(20);
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

onMounted(async () => {
	const sys = await uni.getSystemInfo();
	statusBarHeight.value = sys.statusBarHeight || 20;
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
	console.log('[OrderList] scrolltolower triggered');
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

function goToIndex() {
	uni.switchTab({ url: '/pages/index/index' });
}

// ── 取消订单 ──
async function onCancelOrder(item) {
	uni.showModal({
		title: '确认取消订单',
		content: '取消后需重新下单，是否继续？',
		confirmText: '确认取消',
		confirmColor: '#ff4d4f',
		cancelText: '再想想',
		success: async (res) => {
			if (res.confirm) {
				uni.showLoading({ title: '取消中...', mask: true });
				try {
					const result = await api.cancelOrder(item.tradeNo);
					if (result.code === 200 || result.code === 0) {
						uni.showToast({ title: '订单已取消', icon: 'success' });
						// 刷新列表
						loadOrders(false);
					} else {
						uni.showToast({ title: result.msg || '取消失败', icon: 'none' });
					}
				} catch (e) {
					console.error('[Cancel] 取消订单失败:', e.message);
					uni.showToast({ title: '网络异常，请重试', icon: 'none' });
				} finally {
					uni.hideLoading();
				}
			}
		},
	});
}

// ── 继续支付/授权 ──
async function onContinueOrder(item) {
	// 跳转到柜机详情页，进入继续支付模式
	// 订单列表已包含 deviceSn、pickupCabinetId、payScene 等关键字段
	const cabinetId = item.pickupCabinetId || '';
	if (!cabinetId) {
		uni.showToast({ title: '订单信息不完整', icon: 'none' });
		return;
	}
	uni.navigateTo({
		url: `/pages/cabinet/detail?continuePay=1&tradeNo=${item.tradeNo}&cabinetId=${cabinetId}&deviceSn=${item.deviceSn || ''}&payScene=${item.payScene || 'DEPOSIT_PAY'}`,
	});
}

</script>

<style scoped lang="scss">
.order-page {
	height: 100vh;
	background: #f5f6fa;
	display: flex;
	flex-direction: column;
}

.status-bar {
	background: #fff;
	flex-shrink: 0;
}

/* 筛选栏 */
.filter-bar {
	display: flex;
	align-items: center;
	justify-content: space-around;
	background: #fff;
	padding: 8px 16px;
	border-bottom: 1px solid #f0f0f0;
	flex-shrink: 0;
}

.filter-tab {
	display: flex;
	align-items: center;
	justify-content: center;
	flex: 1;
	padding: 6px 0;
	border-radius: 20px;
	transition: all 0.2s;
}

.filter-tab.active {
	background: rgba(48, 106, 252, 0.08);
}

.filter-text {
	font-size: 13px;
	color: #666;
	font-weight: 600;
}

.filter-tab.active .filter-text {
	color: $primaryColor;
	font-weight: 700;
}

/* 列表滚动区 */
.order-scroll {
	flex: 1;
	min-height: 0; /* 关键：允许 flex 子元素被压缩到 0 */
}

.order-list {
	padding: 12px 16px 20px;
}

/* 订单卡片 */
.order-card {
	background: #fff;
	border-radius: 16px;
	padding: 14px 16px;
	margin-bottom: 12px;
	box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
	transition: transform 0.15s;
}

.order-card:active {
	transform: scale(0.985);
	background: #fafafa;
}

/* 头部 */
.card-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12px;
}

.status-badge {
	padding: 3px 10px;
	border-radius: 8px;
}

.status-badge.active {
	background: rgba(48, 106, 252, 0.1);
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
	color: #28c76f;
}

.status-badge.pending .status-text {
	color: #f59e0b;
}

.status-badge.cancel .status-text {
	color: #999;
}

.header-right {
	display: flex;
	align-items: baseline;
	gap: 4px;
}

.header-cost-label {
	font-size: 11px;
	color: #999;
}

.header-cost {
	font-size: 18px;
	font-weight: 900;
	color: $primaryColor;
}

/* 内容 */
.card-body {
	border-top: 1px solid #f5f6fa;
	border-bottom: 1px solid #f5f6fa;
	padding: 10px 0;
}

.body-row {
	display: flex;
	align-items: center;
	padding: 3px 0;
}

.body-label {
	font-size: 12px;
	color: #999;
	width: 40px;
	flex-shrink: 0;
}

.body-value {
	font-size: 13px;
	font-weight: 600;
	color: #333;
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	text-align: right;
}

.payscore-tag {
	color: #07c160;
	font-size: 12px;
	font-weight: 700;
}

/* 底部 */
.card-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-top: 10px;
}

.trade-no {
	font-size: 11px;
	color: #ccc;
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
	justify-content: center;
	min-height: calc(100vh - 50px);
	gap: 10px;
}

.empty-img {
	width: 100px;
	height: 100px;
}

.empty-title {
	font-size: 14px;
	font-weight: 600;
	color: #999;
}

.scan-btn {
	margin-top: 20px;
	width: 180px;
	padding: 12px 0;
	background: $primaryColor;
	border-radius: 24px;
	text-align: center;
}

.scan-btn:active {
	opacity: 0.85;
}

.scan-btn-text {
	font-size: 15px;
	font-weight: 700;
	color: #fff;
}

.action-payscore-icon {
	width: 20px;
	height: 20px;
	flex-shrink: 0;
}

/* 操作按钮 */
.card-actions {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	gap: 10px;
	margin-top: 12px;
	padding-top: 12px;
	border-top: 1px solid #f5f6fa;
}

.action-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 8px 18px;
	border-radius: 20px;
	font-size: 13px;
	font-weight: 600;
	transition: all 0.2s;
}

.action-btn:active {
	transform: scale(0.96);
	opacity: 0.9;
}

/* 取消订单 */
.action-cancel {
	background: #fff;
	color: #666;
	border: 1px solid #e0e0e0;
}

/* 付押金继续 */
.action-continue {
	background: $primaryColor;
	color: #fff;
	box-shadow: 0 4px 12px rgba(48, 106, 252, 0.25);
}

/* 微信支付分免押租借 */
.action-payscore {
	background: linear-gradient(135deg, #07c160, #06ad56);
	color: #fff;
	gap: 4px;
	box-shadow: 0 4px 12px rgba(7, 193, 96, 0.25);
}
</style>
