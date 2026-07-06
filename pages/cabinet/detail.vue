<template>
	<view class="cabinet-detail-page">
		<!-- 加载中 -->
		<view v-if="loading" class="loading-wrap">
			<u-loading-icon color="$primaryColor" size="36"></u-loading-icon>
			<text class="loading-text">加载中...</text>
		</view>

		<template v-else>
			<!-- 顶部信息 -->
			<view class="header-card">
				<view class="header-main">
					<u-icon name="map-fill" color="#8B5CF6" size="20"></u-icon>
					<view class="header-info">
						<text class="header-name">{{ cabinet.cabinetName || cabinet.name || '柜机' }}</text>
						<text class="header-meta">距离 {{ distance || '0m' }} · {{ cabinetStatusText }}</text>
					</view>
				</view>
				<image class="header-img" src="/static/cabinet-default.png" mode="aspectFill"></image>
			</view>

			<!-- 价格信息 -->
			<view class="price-bar">
				<text class="price-text">¥{{ feeRate }}/30分钟</text>
				<text class="price-dot">·</text>
				<text class="price-text">封顶¥{{ feeCap }}/天</text>
				<text class="price-dot">·</text>
				<view class="price-scan">
					<u-icon name="scan" color="#8B5CF6" size="14"></u-icon>
					<text>支持扫码租借</text>
				</view>
			</view>

			<!-- 可租柜机 -->
			<view class="slot-section">
				<view class="slot-section-title">
					<text class="slot-title-line"></text>
					<text class="slot-title-text">可租柜机</text>
					<text class="slot-title-line"></text>
				</view>

				<view class="slot-grid">
					<view
						v-for="slot in slotList"
						:key="slot.id"
						class="slot-item"
						:class="[
							slotStatusClass(slot.status),
							{ 'slot-selected': selectedSlot?.id === slot.id }
						]"
						@click="onSlotClick(slot)"
					>
						<!-- 选中对勾 -->
						<view v-if="selectedSlot?.id === slot.id" class="slot-check">✓</view>
						<!-- 编号 -->
						<text class="slot-num">{{ slot.slotNo }}</text>
						<!-- 设备图标 -->
						<view class="slot-icon-wrap">
							<image
								class="slot-icon"
								src="/static/exo_view1.png"
								mode="aspectFit"
								:class="{ 'slot-icon-gray': slot.status !== 'available' }"
							></image>
						</view>
						<!-- 状态 -->
						<view class="slot-status">
							<view class="slot-status-dot" :class="slotStatusDotClass(slot.status)"></view>
							<text class="slot-status-text">{{ slotStatusLabel(slot.status) }}</text>
						</view>
						<!-- 已选文字 -->
						<text v-if="selectedSlot?.id === slot.id" class="slot-selected-text">已选 {{ slot.slotNo }}号仓</text>
					</view>
				</view>

				<!-- 图例 -->
				<view class="slot-legend">
					<view class="legend-item">
						<view class="legend-dot legend-available"></view>
						<text>可租</text>
					</view>
					<view class="legend-item">
						<view class="legend-dot legend-rented"></view>
						<text>已租</text>
					</view>
					<view class="legend-item">
						<view class="legend-dot legend-maintain"></view>
						<text>维护</text>
					</view>
					<view class="legend-item">
						<view class="legend-dot legend-empty"></view>
						<text>空仓</text>
					</view>
				</view>
			</view>

			<!-- 选中设备信息 -->
			<view v-if="selectedSlot && selectedSlot.device" class="device-info-card">
				<image class="device-img" src="/static/exo_view1.png" mode="aspectFit"></image>
				<view class="device-info-main">
					<view class="info-row">
						<text class="info-label">设备型号：</text>
						<text class="info-value">{{ selectedSlot.device.deviceName || '轻量助行版' }}</text>
						<text class="info-label" style="margin-left: 16px;">设备编号：</text>
						<text class="info-value">{{ selectedSlot.device.deviceSn || 'EXO-0000' }}</text>
					</view>
					<view class="info-row">
						<text class="info-label">电量：</text>
						<view class="battery-bar">
							<view class="battery-fill" :style="{ width: (selectedSlot.device.battery || 80) + '%' }"></view>
						</view>
						<text class="info-value">{{ selectedSlot.device.battery || 80 }}%</text>
						<text class="info-label" style="margin-left: 16px;">预计续航：</text>
						<text class="info-value">{{ selectedSlot.device.endurance || '6小时' }}</text>
					</view>
					<view class="info-hint">
						<u-icon name="info-circle" color="#999" size="12"></u-icon>
						<text>取出后开始计费</text>
					</view>
				</view>
			</view>

			<!-- 协议勾选 -->
			<view class="agreement-bar">
				<view class="agree-check" :class="{ checked: agreed }" @click="agreed = !agreed">
					<u-icon v-if="agreed" name="checkbox-mark" color="#fff" size="12"></u-icon>
				</view>
				<text class="agree-text">我已阅读并同意《租赁协议》</text>
				<text class="agree-link" @click="showAgreement">查看租借规则 ›</text>
			</view>

			<!-- 确认租借按钮 -->
			<view class="confirm-section">
				<view
					class="confirm-btn"
					:class="{ disabled: !canConfirm }"
					@click="onConfirm"
				>
					<text>确认租借</text>
				</view>
			</view>

			<view style="height: 20px;"></view>
		</template>
	</view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { api } from '../../services/api.js';
import { parseDeviceQr } from '../../utils/qr-parser.js';

const loading = ref(true);
const cabinet = ref({});
const devices = ref([]);
const distance = ref('');
const selectedSlot = ref(null);
const agreed = ref(false);

let cabinetNo = '';

onMounted(async () => {
	const pages = getCurrentPages();
	const page = pages[pages.length - 1];
	const query = page.options || page.$route?.query || {};
	cabinetNo = query.cabinetNo || '';
	const lat = parseFloat(query.lat) || 0;
	const lng = parseFloat(query.lng) || 0;
	const userLat = parseFloat(query.userLat) || 0;
	const userLng = parseFloat(query.userLng) || 0;

	if (lat && lng && userLat && userLng) {
		const d = haversine(userLat, userLng, lat, lng);
		distance.value = d >= 1000 ? (d / 1000).toFixed(1) + 'km' : Math.round(d) + 'm';
	}

	if (cabinetNo) {
		await loadCabinetDetail(cabinetNo);
	} else {
		loading.value = false;
		uni.showToast({ title: '柜机编号缺失', icon: 'none' });
	}
});

async function loadCabinetDetail(no) {
	loading.value = true;
	try {
		const detailRes = await api.getCabinetDetail(no);
		if ((detailRes.code === 0 || detailRes.code === 200) && detailRes.data) {
			cabinet.value = detailRes.data;
		}
		const devicesRes = await api.getCabinetDevices(no);
		if ((devicesRes.code === 0 || devicesRes.code === 200) && devicesRes.data) {
			devices.value = devicesRes.data;
		}
	} catch (err) {
		console.error('[CabinetDetail] 加载失败:', err.message || err);
		uni.showToast({ title: '加载失败', icon: 'none' });
	} finally {
		loading.value = false;
	}
}

// 生成柜机格子数据（最多12个格子，按设备状态填充）
const slotList = computed(() => {
	const list = [];
	const maxSlots = 12;
	for (let i = 0; i < maxSlots; i++) {
		const dev = devices.value[i];
		if (dev) {
			list.push({
				id: dev.deviceSn || i,
				slotNo: String(i + 1).padStart(2, '0'),
				status: mapDeviceStatus(dev.status),
				device: dev,
			});
		} else {
			list.push({
				id: `empty-${i}`,
				slotNo: String(i + 1).padStart(2, '0'),
				status: 'empty',
				device: null,
			});
		}
	}
	return list;
});

function mapDeviceStatus(status) {
	if (status === '空闲' || status === 'IDLE' || status === 0) return 'available';
	if (status === '使用中' || status === 'IN_USE' || status === 1) return 'rented';
	if (status === '维护' || status === 'MAINTENANCE' || status === 2) return 'maintain';
	return 'empty';
}

function slotStatusClass(status) {
	const map = { available: 'slot-available', rented: 'slot-rented', maintain: 'slot-maintain', empty: 'slot-empty' };
	return map[status] || '';
}

function slotStatusDotClass(status) {
	const map = { available: 'dot-available', rented: 'dot-rented', maintain: 'dot-maintain', empty: 'dot-empty' };
	return map[status] || '';
}

function slotStatusLabel(status) {
	const map = { available: '可租', rented: '已租', maintain: '维护中', empty: '空仓' };
	return map[status] || '未知';
}

function onSlotClick(slot) {
	if (slot.status !== 'available') {
		uni.showToast({ title: '该仓位暂不可租', icon: 'none' });
		return;
	}
	selectedSlot.value = slot;
}

const canConfirm = computed(() => {
	return selectedSlot.value && selectedSlot.value.status === 'available' && agreed.value;
});

async function onConfirm() {
	if (!canConfirm.value) {
		if (!selectedSlot.value) {
			uni.showToast({ title: '请选择设备', icon: 'none' });
		} else if (!agreed.value) {
			uni.showToast({ title: '请同意租赁协议', icon: 'none' });
		}
		return;
	}
	const dev = selectedSlot.value.device;
	uni.showLoading({ title: '获取设备信息...', mask: true });
	try {
		const scanRes = await api.scanDevice(dev.deviceSn);
		if ((scanRes.code === 200 || scanRes.code === 0) && scanRes.data) {
			const d = scanRes.data;
			const confirmRes = await api.confirmLease({ deviceSn: d.deviceSn });
			if (confirmRes.code === 200 || confirmRes.code === 0) {
				uni.navigateTo({
					url: `/pages/device/demo-control?tradeNo=${d.tradeNo}&deviceSn=${d.deviceSn}&name=${encodeURIComponent(dev.deviceName || '外骨骼设备')}&hourlyRate=${d.hourlyRate || 0}&freeMinutes=${d.freeMinutes || 0}&depositMoney=${d.depositMoney || 0}`
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
}

function showAgreement() {
	uni.showModal({
		title: '租赁协议',
		content: '1. 租借设备需支付押金，归还后退还。\n2. 按时计费，不足30分钟按30分钟计。\n3. 设备损坏需照价赔偿。\n4. 请妥善保管设备。',
		showCancel: false,
	});
}

function haversine(lat1, lng1, lat2, lng2) {
	const R = 6371000;
	const dLat = (lat2 - lat1) * Math.PI / 180;
	const dLng = (lng2 - lng1) * Math.PI / 180;
	const a = Math.sin(dLat / 2) ** 2 +
		Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const cabinetStatusText = computed(() => {
	const s = cabinet.value.status;
	return s === 'online' || s === 'OPEN' || s === 1 ? '营业中' : '休息中';
});

const feeRate = computed(() => {
	const rate = cabinet.value.rate || devices.value[0]?.rate || 0;
	return rate > 0 ? (rate / 100).toFixed(0) : '2';
});

const feeCap = computed(() => {
	return cabinet.value.dailyCap || 20;
});
</script>

<style scoped lang="scss">
.cabinet-detail-page {
	min-height: 100vh;
	background: #f5f6fa;
}

.loading-wrap {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 120px 20px;
	gap: 12px;
}

.loading-text {
	font-size: 14px;
	color: #999;
}

/* 顶部信息卡片 */
.header-card {
	background: #fff;
	margin: 12px 16px 0;
	border-radius: 16px;
	padding: 16px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}

.header-main {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	flex: 1;
}

.header-info {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.header-name {
	font-size: 16px;
	font-weight: 800;
	color: #333;
}

.header-meta {
	font-size: 12px;
	color: #999;
}

.header-img {
	width: 64px;
	height: 64px;
	border-radius: 10px;
	background: #f5f6fa;
	flex-shrink: 0;
}

/* 价格信息 */
.price-bar {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 14px 0;
}

.price-text {
	font-size: 13px;
	color: #666;
	font-weight: 600;
}

.price-dot {
	font-size: 13px;
	color: #ccc;
}

.price-scan {
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 13px;
	color: #8B5CF6;
	font-weight: 600;
}

/* 可租柜机 */
.slot-section {
	background: #fff;
	border-radius: 16px;
	margin: 0 16px;
	padding: 16px;
	box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}

.slot-section-title {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 10px;
	margin-bottom: 16px;
}

.slot-title-line {
	width: 24px;
	height: 1px;
	background: #ddd;
}

.slot-title-text {
	font-size: 14px;
	font-weight: 700;
	color: #333;
}

/* 网格 */
.slot-grid {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 10px;
}

.slot-item {
	position: relative;
	background: #f8f8f8;
	border-radius: 12px;
	padding: 8px 4px;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
	border: 2px solid transparent;
	transition: all 0.2s;
}

.slot-item.slot-available {
	background: #f0fdf4;
}

.slot-item.slot-rented {
	background: #f5f5f5;
}

.slot-item.slot-maintain {
	background: #fff7ed;
}

.slot-item.slot-empty {
	background: #fafafa;
	border: 2px dashed #e0e0e0;
}

.slot-item.slot-selected {
	border-color: #3b82f6;
	background: #eff6ff;
}

.slot-check {
	position: absolute;
	top: 4px;
	right: 4px;
	width: 16px;
	height: 16px;
	border-radius: 50%;
	background: #3b82f6;
	color: #fff;
	font-size: 10px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.slot-num {
	font-size: 11px;
	color: #999;
	font-weight: 600;
}

.slot-icon-wrap {
	width: 40px;
	height: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.slot-icon {
	width: 36px;
	height: 28px;
}

.slot-icon-gray {
	opacity: 0.4;
	filter: grayscale(100%);
}

.slot-status {
	display: flex;
	align-items: center;
	gap: 3px;
}

.slot-status-dot {
	width: 6px;
	height: 6px;
	border-radius: 50%;
}

.dot-available { background: #22c55e; }
.dot-rented { background: #9ca3af; }
.dot-maintain { background: #f97316; }
.dot-empty { background: #d1d5db; }

.slot-status-text {
	font-size: 10px;
	color: #666;
}

.slot-selected-text {
	font-size: 9px;
	color: #3b82f6;
	font-weight: 600;
}

/* 图例 */
.slot-legend {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 16px;
	margin-top: 14px;
	padding-top: 12px;
	border-top: 1px solid #f0f0f0;
}

.legend-item {
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 11px;
	color: #999;
}

.legend-dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
}

.legend-available { background: #22c55e; }
.legend-rented { background: #9ca3af; }
.legend-maintain { background: #f97316; }
.legend-empty { background: #e5e7eb; border: 1px solid #d1d5db; }

/* 设备信息卡片 */
.device-info-card {
	background: #fff;
	border-radius: 16px;
	margin: 12px 16px 0;
	padding: 16px;
	display: flex;
	align-items: flex-start;
	gap: 12px;
	box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}

.device-img {
	width: 60px;
	height: 60px;
	flex-shrink: 0;
}

.device-info-main {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.info-row {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 2px;
}

.info-label {
	font-size: 12px;
	color: #999;
}

.info-value {
	font-size: 12px;
	font-weight: 700;
	color: #333;
}

.battery-bar {
	width: 40px;
	height: 10px;
	background: #e5e7eb;
	border-radius: 5px;
	overflow: hidden;
	position: relative;
}

.battery-fill {
	height: 100%;
	background: #22c55e;
	border-radius: 5px;
	transition: width 0.3s;
}

.info-hint {
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 11px;
	color: #999;
}

/* 协议 */
.agreement-bar {
	display: flex;
	align-items: center;
	gap: 8px;
	margin: 16px 16px 0;
	padding: 0 4px;
}

.agree-check {
	width: 16px;
	height: 16px;
	border-radius: 50%;
	border: 2px solid #ccc;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	transition: all 0.2s;
}

.agree-check.checked {
	background: #3b82f6;
	border-color: #3b82f6;
}

.agree-text {
	font-size: 12px;
	color: #666;
	flex: 1;
}

.agree-link {
	font-size: 12px;
	color: #3b82f6;
	font-weight: 600;
	flex-shrink: 0;
}

/* 确认按钮 */
.confirm-section {
	margin: 12px 16px 0;
}

.confirm-btn {
	width: 100%;
	height: 48px;
	background: #3b82f6;
	border-radius: 12px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 15px;
	font-weight: 700;
	color: #fff;
	transition: opacity 0.2s;
}

.confirm-btn.disabled {
	background: #d1d5db;
	color: #fff;
}

.confirm-btn:active:not(.disabled) {
	opacity: 0.85;
}
</style>
