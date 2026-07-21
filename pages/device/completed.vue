<template>
	<view class="completed-page">
		<!-- 顶部状态 -->
		<view class="status-header">
			<view class="status-icon-wrap" :style="{ background: statusConfig.bg }">
				<u-icon :name="statusConfig.icon" :color="statusConfig.color" size="48"></u-icon>
			</view>
			<text class="status-title">{{ statusConfig.title }}</text>
			<text class="status-subtitle">{{ statusConfig.subtitle }}</text>
		</view>

		<!-- 费用概览 -->
		<view class="cost-overview">
			<view v-if="orderData.payScene === 'RISK_AUTH'" class="cost-payscore-badge">
				<image class="payscore-badge-icon" src="/static/payscore-logo.svg" mode="aspectFit"></image>
				<text class="payscore-badge-text">微信支付分免押</text>
			</view>
			<view class="cost-main">
				<text class="cost-label">{{ orderData.status === 3 ? '实付租金' : '应付金额' }}</text>
				<text class="cost-amount">¥{{ ((orderData.payMoney || orderData.incomeMoney || 0) / 100).toFixed(2) }}</text>
			</view>
			<view v-if="orderData.payScene !== 'RISK_AUTH' && orderData.depositMoney > 0" class="cost-deposit">
				<text>押金 ¥{{ (orderData.depositMoney / 100).toFixed(2) }}</text>
				<text v-if="orderData.status === 3" class="cost-refund">已退还</text>
			</view>
			<view v-else-if="orderData.payScene === 'RISK_AUTH'" class="cost-deposit">
				<text>信用授权 · 用后扣款</text>
			</view>
		</view>

		<!-- 订单详情 -->
		<view class="info-card">
			<view class="card-header">
				<u-icon name="file-text-fill" color="#306afc" size="16"></u-icon>
				<text class="card-title">订单详情</text>
			</view>
			<view class="info-row">
				<text class="info-label">订单编号</text>
				<text class="info-value mono">{{ orderData.tradeNo || '-' }}</text>
			</view>
			<view class="info-row">
				<text class="info-label">订单状态</text>
				<text class="info-value" :style="{ color: statusConfig.color }">{{ statusConfig.label }}</text>
			</view>
			<view class="info-row">
				<text class="info-label">设备名称</text>
				<text class="info-value">{{ orderData.deviceName || '-' }}</text>
			</view>
			<view class="info-row">
				<text class="info-label">设备编号</text>
				<text class="info-value mono">{{ orderData.deviceSn || '-' }}</text>
			</view>
			<view class="info-row">
				<text class="info-label">使用时间</text>
				<text class="info-value highlight">{{ formatDurationFull(orderData.pickupTime, orderData.returnTime) }}</text>
			</view>
			<view class="info-row">
				<text class="info-label">开始</text>
				<text class="info-value">{{ formatDateTime(orderData.pickupTime) }}</text>
			</view>
			<view class="info-row">
				<text class="info-label">结束</text>
				<text class="info-value">{{ formatDateTime(orderData.returnTime) }}</text>
			</view>
			<view class="info-row">
				<text class="info-label">取机柜</text>
				<text class="info-value">{{ orderData.pickupCabinetId ? '#' + orderData.pickupCabinetId : '-' }}</text>
			</view>
			<view class="info-row">
				<text class="info-label">还机柜</text>
				<text class="info-value">{{ orderData.returnCabinetId ? '#' + orderData.returnCabinetId : '-' }}</text>
			</view>
		</view>

		<!-- 费用明细 -->
		<view class="info-card">
			<view class="card-header">
				<u-icon name="rmb-circle-fill" color="#306afc" size="16"></u-icon>
				<text class="card-title">费用明细</text>
			</view>
			<view class="info-row" v-if="orderData.payScene !== 'RISK_AUTH'">
				<text class="info-label">押金</text>
				<text class="info-value">¥{{ (orderData.depositMoney / 100).toFixed(2) }}</text>
			</view>
			<view class="info-row">
				<text class="info-label">实际租金</text>
				<text class="info-value">¥{{ ((orderData.payMoney || 0) / 100).toFixed(2) }}</text>
			</view>
			<view class="info-row">
				<text class="info-label">实付金额</text>
				<text class="info-value">¥{{ ((orderData.incomeMoney || 0) / 100).toFixed(2) }}</text>
			</view>
			<view class="cost-divider"></view>
			<view class="info-row total">
				<text class="info-label">费用合计</text>
				<text class="info-value total-price">¥{{ ((orderData.payMoney || orderData.incomeMoney || 0) / 100).toFixed(2) }}</text>
			</view>
		</view>

		<!-- 使用轨迹 -->
		<view class="info-card" v-if="trackPoints.length > 0">
			<view class="card-header">
				<u-icon name="map-fill" color="#306afc" size="16"></u-icon>
				<text class="card-title">使用轨迹</text>
			</view>
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
				<text class="track-stat">共 {{ trackPoints.length }} 个轨迹点</text>
				<text class="track-stat">时长 {{ formatDurationFull(orderData.pickupTime, orderData.returnTime) }}</text>
			</view>
		</view>
		<view v-else-if="trackLoaded" class="info-card">
			<view class="card-header">
				<u-icon name="map-fill" color="#306afc" size="16"></u-icon>
				<text class="card-title">使用轨迹</text>
			</view>
			<view class="track-empty">
				<text class="track-empty-text">暂无轨迹数据</text>
			</view>
		</view>

		<!-- 按钮组 -->
		<view class="action-group">
			<view v-if="orderData.status === 2 && orderData.payMoney > 0" class="btn-primary" @click="doSettlePay">
				<text>支付租金 ¥{{ ((orderData.payMoney || 0) / 100).toFixed(2) }}</text>
			</view>
			<view class="btn-primary btn-secondary" @click="goHome">
				<text>返回首页</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { reactive, computed, ref, onMounted, nextTick } from 'vue';
import { onLoad, onUnload } from '@dcloudio/uni-app';
import { api } from '../../services/api.js';
import { formatDateTime, formatDurationFull } from '../../utils/format.js';
import { useDeviceStore } from '../../store/device.js';

const deviceStore = useDeviceStore();

const trackPoints = ref([]);
const trackLoaded = ref(false);

const orderData = reactive({
	tradeNo: '',
	deviceSn: '',
	deviceName: '',
	memberId: '',
	depositMoney: 0,
	riskAmount: 0,
	payMoney: 0,
	incomeMoney: 0,
	hourlyRate: 0,
	freeMinutes: 0,
	payType: 1,
	payScene: '',
	feeTemplateId: 0,
	status: 3,
	pickupCabinetId: 0,
	returnCabinetId: 0,
	pickupTime: '',
	returnTime: '',
	createTime: '',
	longitude: 0,
	latitude: 0,
	depositRefund: 0,
})

const statusConfig = computed(() => {
	const map = {
		0: { label: '待付押金', title: '等待支付', subtitle: '请完成押金支付后开始使用', icon: 'clock-fill', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
		1: { label: '租赁中', title: '正在使用', subtitle: '设备租借中，请安全使用', icon: 'play-right-fill', color: '#306afc', bg: 'rgba(48,106,252,0.1)' },
		2: { label: '已归还待结算', title: '已归还', subtitle: '待支付租金，结算后完成', icon: 'clock-fill', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
		3: { label: '已完成', title: '使用结束', subtitle: '订单已完成，感谢您的使用', icon: 'checkmark-circle-fill', color: '#28c76f', bg: 'rgba(40,199,111,0.1)' },
		4: { label: '已取消', title: '订单已取消', subtitle: '订单已被取消', icon: 'close-circle-fill', color: '#999', bg: 'rgba(153,153,153,0.1)' },
		5: { label: '故障中止', title: '故障中止', subtitle: '设备故障，订单已中止', icon: 'warning-fill', color: '#ff4d4f', bg: 'rgba(255,77,79,0.1)' },
		6: { label: '丢失赔付', title: '丢失赔付', subtitle: '设备丢失，赔付已完结', icon: 'info-circle-fill', color: '#ff4d4f', bg: 'rgba(255,77,79,0.1)' },
	};
	return map[orderData.status] || map[3];
});

// 轨迹地图相关
const validTrackPoints = computed(() => {
	return (trackPoints.value || [])
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
		title: '起点',
		iconPath: '/static/marker-start.png',
		width: 24,
		height: 24,
		callout: { content: '起点', display: 'ALWAYS', fontSize: 10, borderRadius: 4, padding: 4, bgColor: '#fff' },
	});
	// 终点
	if (pts.length > 1) {
		const last = pts[pts.length - 1];
		markers.push({
			id: 1,
			latitude: last.latitude,
			longitude: last.longitude,
			title: '终点',
			iconPath: '/static/marker-end.png',
			width: 24,
			height: 24,
			callout: { content: '终点', display: 'ALWAYS', fontSize: 10, borderRadius: 4, padding: 4, bgColor: '#fff' },
		});
	}
	return markers;
});

onLoad((query) => {
	const no = query?.tradeNo || '';
	if (no) {
		loadOrderDetail(no);
	} else {
		uni.showToast({ title: '缺少订单号', icon: 'none' });
	}
})

onMounted(() => {
	uni.vibrateShort({ type: 'medium' });
});

// 页面卸载时确保清除租赁状态（防止用户通过返回按钮离开而未点"返回首页"）
onUnload(() => {
	if ([3, 4, 5, 6].includes(orderData.status)) {
		deviceStore.endLease();
	}
});

async function loadOrderDetail(tradeNo) {
	try {
		const res = await api.getLeaseStatusByTradeNo(tradeNo);
		if ((res.code === 200 || res.code === 0) && res.data) {
			const d = res.data;
			orderData.tradeNo = d.tradeNo || '';
			orderData.deviceSn = d.deviceSn || '';
			orderData.deviceName = d.deviceName || '';
			orderData.memberId = d.memberId || '';
			orderData.depositMoney = d.depositMoney || 0;
			orderData.riskAmount = d.riskAmount || 0;
			orderData.payMoney = d.payMoney || 0;
			orderData.incomeMoney = d.incomeMoney || 0;
			orderData.hourlyRate = d.hourlyRate || 0;
			orderData.freeMinutes = d.freeMinutes || 0;
			orderData.payType = d.payType || 1;
			orderData.payScene = d.payScene || '';
			orderData.feeTemplateId = d.feeTemplateId || 0;
			orderData.status = d.status ?? 3;
			orderData.pickupCabinetId = d.pickupCabinetId || 0;
			orderData.returnCabinetId = d.returnCabinetId || 0;
			orderData.pickupTime = d.pickupTime || '';
			orderData.returnTime = d.returnTime || '';
			orderData.createTime = d.createTime || '';
			orderData.longitude = d.longitude || 0;
			orderData.latitude = d.latitude || 0;

			// 押金退还
			if (orderData.depositMoney > 0 && orderData.payMoney > 0) {
				const refund = orderData.depositMoney - orderData.payMoney;
				orderData.depositRefund = refund > 0 ? refund / 100 : 0;
			}

			// 已归还待结算且无待支付金额，自动结算
			if (orderData.status === 2 && orderData.payMoney <= 0 && !isAutoSettling) {
				isAutoSettling = true;
				console.log('[AutoSettle] 待结算且无待支付金额，自动结算');
				uni.showLoading({ title: '正在结算...', mask: true });
				try {
					const settleRes = await api.settleOrder(tradeNo);
					if (settleRes.code === 200 || settleRes.code === 0) {
						uni.hideLoading();
						await loadOrderDetail(tradeNo);
					} else {
						uni.hideLoading();
						console.warn('[AutoSettle] 自动结算失败:', settleRes.msg);
					}
				} catch (e) {
					uni.hideLoading();
					console.error('[AutoSettle] 自动结算异常:', e);
				} finally {
					isAutoSettling = false;
				}
			}

			// 订单已结束（已完成/已取消/故障/丢失），清除全局租赁状态
			if ([3, 4, 5, 6].includes(orderData.status)) {
				deviceStore.endLease();
				console.log('[Completed] 订单已结束，清除租赁状态');
			}

			// 加载轨迹
			loadTrack(tradeNo);
		}
	} catch (e) {
		console.error('获取订单详情失败', e);
		uni.showToast({ title: '获取订单详情失败', icon: 'none' });
	}
}

async function loadTrack(tradeNo) {
	try {
		const res = await api.getOrderTrack(tradeNo);
		console.log('[Track] getOrderTrack:', res);
		if ((res.code === 200 || res.code === 0) && res.data) {
			// 兼容数组和对象
			if (Array.isArray(res.data)) {
				trackPoints.value = res.data;
			} else if (res.data.points && Array.isArray(res.data.points)) {
				trackPoints.value = res.data.points;
			} else if (res.data.records && Array.isArray(res.data.records)) {
				trackPoints.value = res.data.records;
			} else {
				trackPoints.value = [];
			}
		} else {
			trackPoints.value = [];
		}
	} catch (e) {
		console.error('[Track] 获取轨迹失败:', e);
		trackPoints.value = [];
	} finally {
		trackLoaded.value = true;
		nextTick(() => {
			fitTrackMapToPoints();
		});
	}
}

function fitTrackMapToPoints() {
	const points = includePointsOption.value;
	if (points.length === 0) return;
	try {
		const mapContext = uni.createMapContext('trackMap');
		if (mapContext && typeof mapContext.includePoints === 'function') {
			mapContext.includePoints({
				points,
				padding: [40, 40, 40, 40],
			});
		}
	} catch (e) {
		console.warn('[Track] 自动适配轨迹视野失败:', e);
	}
}

let isAutoSettling = false;

async function doSettlePay() {
	if (!orderData.tradeNo || orderData.payMoney <= 0) {
		uni.showToast({ title: '暂无待支付租金', icon: 'none' });
		return;
	}
	uni.showLoading({ title: '发起支付...', mask: true });
	try {
		const amount = Number((orderData.payMoney / 100).toFixed(2));
		const openId = uni.getStorageSync('openId') || '';
		const payRes = await api.createPayment({
			tradeNo: orderData.tradeNo,
			amount,
			payScene: 'LEASE_DEDUCT',
			openId,
			description: '外骨骼租赁结算扣费',
		});
		console.log('[Settle] createPayment:', payRes);
		if (!(payRes.code === 200 || payRes.code === 0) || !payRes.data) {
			uni.showToast({ title: payRes.msg || '支付发起失败', icon: 'none' });
			return;
		}
		const payData = payRes.data;

		// 拉起微信支付
		let payNo = payData.payNo || '';
		uni.showLoading({ title: '等待支付完成...', mask: true });

		const payParams = {
			timeStamp: String(payData.timeStamp || payData.timestamp || ''),
			nonceStr: payData.nonceStr || '',
			package: payData.package || payData.packAge || '',
			signType: payData.signType || 'RSA',
			paySign: payData.paySign || '',
		};
		console.log('[Settle] requestPayment params:', payParams);

		// #ifdef MP-WEIXIN
		const wxPayRes = await new Promise((resolve) => {
			wx.requestPayment({
				...payParams,
				success: (res) => resolve({ success: true, data: res }),
				fail: (err) => resolve({ success: false, error: err }),
			});
		});
		// #endif
		// #ifndef MP-WEIXIN
		const wxPayRes = await new Promise((resolve) => {
			uni.requestPayment({
				provider: 'wxpay',
				...payParams,
				success: (res) => resolve({ success: true, data: res }),
				fail: (err) => resolve({ success: false, error: err }),
			});
		});
		// #endif
		console.log('[Settle] requestPayment result:', wxPayRes);
		if (!wxPayRes.success) {
			const errMsg = wxPayRes.error?.errMsg || wxPayRes.error?.message || '支付失败';
			uni.showToast({ title: errMsg, icon: 'none', duration: 3000 });
			return;
		}

		// 主动查询微信侧订单状态
		if (payNo) {
			uni.showLoading({ title: '查询支付状态...', mask: true });
			const wxStatusRes = await api.getWechatStatus(payNo);
			console.log('[Settle] wechat-status:', wxStatusRes);
			if (wxStatusRes.data === 'SUCCESS') {
				// 继续
			} else {
				uni.hideLoading();
				uni.showModal({
					title: '支付状态确认',
					content: '暂未查询到支付成功信息，请稍后重试或检查微信支付记录。',
					confirmText: '重新查询',
					cancelText: '取消',
					success: async (modalRes) => {
						if (modalRes.confirm) {
							uni.showLoading({ title: '查询支付状态...', mask: true });
							const retryRes = await api.getWechatStatus(payNo);
							if (retryRes.data === 'SUCCESS') {
								uni.hideLoading();
								uni.showToast({ title: '支付确认成功', icon: 'success' });
								await continueSettle(orderData.tradeNo, payNo);
							} else {
								uni.hideLoading();
								uni.showToast({ title: '仍未查询到支付成功，请稍后再试', icon: 'none', duration: 3000 });
							}
						}
					},
				});
				return;
			}
		}

		// 主动确认支付
		if (payNo) {
			uni.showLoading({ title: '确认支付...', mask: true });
			const confirmRes = await api.paymentConfirm(payNo);
			if (!(confirmRes.code === 200 || confirmRes.code === 0)) {
				uni.showToast({ title: confirmRes.msg || '支付确认失败', icon: 'none' });
				return;
			}
		}

		// 调用 settle 接口完成订单
		await continueSettle(orderData.tradeNo, payNo);
	} catch (e) {
		console.error('[Settle] error:', e);
		uni.showToast({ title: e.message || '请求失败', icon: 'none' });
	} finally {
		uni.hideLoading();
	}
}

async function continueSettle(tradeNo, payNo) {
	uni.showLoading({ title: '正在结算...', mask: true });
	const settleRes = await api.settleOrder(tradeNo);
	if (settleRes.code === 200 || settleRes.code === 0) {
		uni.showToast({ title: '支付成功', icon: 'success' });
		await loadOrderDetail(tradeNo);
	} else {
		uni.showToast({ title: settleRes.msg || '结算失败', icon: 'none' });
	}
}

function goHome() {
	deviceStore.endLease();
	uni.switchTab({ url: '/pages/index/index' });
}
</script>

<style scoped lang="scss">
.completed-page {
	min-height: 100vh;
	background: $pageBg;
	padding: 24px 16px 40px;
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
}

/* 顶部状态 */
.status-header {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 8px 0 4px;
}

.status-icon-wrap {
	width: 72px;
	height: 72px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 14px;
}

.status-title {
	font-size: 22px;
	font-weight: 900;
	color: $textMainColor;
}

.status-subtitle {
	font-size: 13px;
	color: $textSubColor;
	margin-top: 6px;
}

/* 费用概览 */
.cost-overview {
	margin-top: 16px;
	background: linear-gradient(135deg, #306afc 0%, #5d8eff 100%);
	border-radius: $radiusMd;
	padding: 20px;
	display: flex;
	flex-direction: column;
	align-items: center;
	color: #fff;
}

.cost-payscore-badge {
	display: flex;
	align-items: center;
	gap: 6px;
	background: rgba(255, 255, 255, 0.2);
	padding: 4px 12px;
	border-radius: 20px;
	margin-bottom: 10px;
}

.payscore-badge-icon {
	width: 20px;
	height: 20px;
	flex-shrink: 0;
}

.payscore-badge-text {
	font-size: 12px;
	font-weight: 600;
	color: #fff;
}

.cost-main {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.cost-label {
	font-size: 13px;
	opacity: 0.85;
}

.cost-amount {
	font-size: 36px;
	font-weight: 900;
	margin-top: 4px;
}

.cost-deposit {
	font-size: 12px;
	opacity: 0.75;
	margin-top: 6px;
	display: flex;
	gap: 8px;
}

.cost-refund {
	opacity: 0.9;
	background: rgba(255, 255, 255, 0.2);
	padding: 1px 8px;
	border-radius: 10px;
}

/* 信息卡片 */
.info-card {
	margin-top: 12px;
	background: #fff;
	border-radius: $radiusMd;
	padding: 14px 16px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
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
	color: $textMainColor;
}

.info-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	font-size: 14px;
	padding: 7px 0;
	border-bottom: 1px solid #f8f8f8;
}

.info-row:last-child {
	border-bottom: none;
}

.info-label {
	color: #999;
}

.info-value {
	color: #333;
	font-weight: 600;
	max-width: 60%;
	text-align: right;
	word-break: break-all;
}

.info-value.mono {
	font-family: monospace;
	font-size: 12px;
}

.info-value.highlight {
	color: $primaryColor;
	font-weight: 800;
}

.info-value.total-price {
	color: $dangerColor;
	font-size: 16px;
	font-weight: 800;
}

.info-row.total {
	font-size: 15px;
	font-weight: 800;
	padding: 10px 0;
}

.info-row.total .info-label {
	color: $textMainColor;
}

.cost-divider {
	height: 1px;
	background: #eee;
	margin: 6px 0;
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

/* 按钮组 */
.action-group {
	margin-top: 24px;
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.btn-primary {
	width: 100%;
	height: 48px;
	background: $primaryColor;
	border-radius: 12px;
	color: #fff;
	font-size: 15px;
	font-weight: 700;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: opacity 0.15s;
}

.btn-primary:active {
	opacity: 0.8;
}

.btn-secondary {
	background: #fff;
	color: #666;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
</style>
