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
					<u-icon name="map-fill" color="#306afc" size="20"></u-icon>
					<view class="header-info">
						<text class="header-name">{{ cabinet.cabinetName || cabinet.name || '柜机' }}</text>
						<text class="header-meta">距离 {{ distance || '0m' }} · <text class="status-tag" :class="cabinetStatusClass">{{ cabinetStatusText }}</text></text>
						<text v-if="cabinet.address" class="header-address">{{ cabinet.address }}</text>
						<text class="header-cabinet-no">柜机编号：{{ cabinet.cabinetNo || cabinet.id || '-' }}</text>
					</view>
				</view>
				<image class="header-img" :src="cabinet.imageUrl ? BASE_URL + cabinet.imageUrl : (cabinet.image ? BASE_URL + cabinet.image : '/static/cabinet-placeholder.jpg')" mode="aspectFill"></image>
			</view>


			<!-- 可租柜机 -->
			<view class="slot-section">
				<view class="slot-section-title">
					<text class="slot-title-line"></text>
					<text class="slot-title-text">可租柜机</text>
					<text class="slot-title-line"></text>
				</view>

			<view class="slot-grid">
				<view v-for="slot in slotList" :key="slot.id" class="slot-item" :class="[
						slotStatusClass(slot.status),
						{ 'slot-selected': selectedSlot?.id === slot.id }
					]" @click="onSlotClick(slot)">
					<!-- 选中对勾 -->
					<view v-if="selectedSlot?.id === slot.id" class="slot-check">✓</view>
					<!-- 编号 -->
					<text class="slot-num">{{ slot.slotNo }}</text>
					<!-- 设备图标 -->
					<view class="slot-icon-wrap">
						<image v-if="slot.imageUrl" class="slot-icon" :src="BASE_URL + slot.imageUrl" mode="aspectFit"
							:class="{ 'slot-icon-gray': slot.status !== 'available' }"></image>
						<image v-else class="slot-icon slot-icon-empty" src="/static/equipment-empty.png" mode="aspectFit"></image>
					</view>
					<!-- 状态 -->
					<view class="slot-status">
						<view class="slot-status-dot" :class="slotStatusDotClass(slot.status)"></view>
						<text class="slot-status-text">{{ slotStatusLabel(slot.status) }}</text>
					</view>
					<!-- 已选文字 -->
					<!-- <text v-if="selectedSlot?.id === slot.id" class="slot-selected-text">已选 {{ slot.slotNo }}号仓</text> -->
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
				<image class="device-img" :src="BASE_URL + selectedSlot.device.imageUrl" mode="aspectFit"></image>
				<view class="device-info-main">
					<view class="info-row">
						<text class="info-label">设备型号</text>
						<text class="info-value">{{ selectedSlot.device.deviceName || '轻量助行版' }}</text>
					</view>
					<view class="info-row">
						<text class="info-label">设备编号</text>
						<text class="info-value">{{ selectedSlot.device.deviceSn || 'EXO-0000' }}</text>
					</view>
					<view class="info-row">
						<text class="info-label">设备状态</text>
						<text class="info-value"
							:style="{ color: selectedSlot.device.deviceStatus === 0 ? '#28c76f' : '#999' }">{{ selectedSlot.device.deviceStatus === 0 ? '空闲' : selectedSlot.device.deviceStatus === 1 ? '使用中' : '维护中' }}</text>
					</view>
					<view class="info-row">
						<text class="info-label">剩余电量</text>
						<view class="battery-wrap">
							<view class="battery-bar">
								<view class="battery-fill"
									:class="(selectedSlot.device.batteryLevel ?? selectedSlot.device.battery ?? 80) < 20 ? 'battery-low' : ''"
									:style="{ width: (selectedSlot.device.batteryLevel ?? selectedSlot.device.battery ?? 80) + '%' }">
								</view>
							</view>
							<text class="battery-text">{{ selectedSlot.device.batteryLevel ?? selectedSlot.device.battery ?? 80 }}%</text>
						</view>
					</view>
					<view class="info-hint">
						<u-icon name="info-circle" color="#999" size="12"></u-icon>
						<text>取出后开始计费</text>
					</view>
				</view>
			</view>

			<!-- 押金/免押模式切换 -->
			<!-- <view v-if="feeDeposit > 0" class="pay-mode-bar">
				<view
					class="pay-mode-btn"
					:class="{ active: payMode === 'deposit' }"
					@click="payMode = 'deposit'"
				>
					<u-icon name="rmb-circle" :color="payMode === 'deposit' ? '#306afc' : '#999'" size="14"></u-icon>
					<text>押金模式</text>
					<text class="pay-mode-hint">预付¥{{ feeDeposit }}</text>
				</view>
				<view
					class="pay-mode-btn"
					:class="{ active: payMode === 'free' }"
					@click="payMode = 'free'"
				>
					<u-icon name="bookmark" :color="payMode === 'free' ? '#28c76f' : '#999'" size="14"></u-icon>
					<text>免押模式</text>
					<text class="pay-mode-hint">信用免押</text>
				</view>
			</view> -->

			<!-- 费用明细卡 -->
			<view class="cost-summary-card">
				<view class="cost-row">
					<text class="cost-row-label">
						<u-icon name="rmb-circle-fill" color="#306afc" size="14"></u-icon>
						押金
					</text>
					<text class="cost-row-value" :class="actualDeposit > 0 ? 'cost-deposit' : 'cost-free'">
						{{ actualDeposit > 0 ? '¥' + actualDepositText : '免押金' }}
					</text>
				</view>
				<view class="cost-row">
					<text class="cost-row-label">
						<u-icon name="clock-fill" color="#f59e0b" size="14"></u-icon>
						租金
					</text>
					<text class="cost-row-value">¥{{ feeRate }}/小时</text>
				</view>
				<view class="cost-row" v-if="feeCap > 0">
					<text class="cost-row-label">
						<u-icon name="shield-fill" color="#8b5cf6" size="14"></u-icon>
						每日封顶
					</text>
					<text class="cost-row-value">¥{{ feeCap }}</text>
				</view>
				<view class="cost-row" v-if="feeFreeMinutes > 0">
					<text class="cost-row-label">
						<u-icon name="gift-fill" color="#07c160" size="14"></u-icon>
						免费时长
					</text>
					<text class="cost-row-value cost-free">{{ feeFreeMinutes }}分钟免费</text>
				</view>
				<view class="cost-divider-bar"></view>
				<view class="cost-row cost-total-row">
					<text class="cost-row-label cost-total-label">预付金额</text>
					<view class="cost-total-right">
						<text class="cost-total-amount" v-if="actualDeposit > 0">¥{{ actualDepositText }}</text>
						<text class="cost-total-amount cost-free" v-else>¥0（免押）</text>
						<text class="cost-total-hint">{{ payMode === 'payscore' ? '信用授权' : '押金可退' }}</text>
					</view>
				</view>
			</view>

			<!-- 协议勾选 -->
			<view class="agreement-bar" :style="{ marginTop: selectedSlot && selectedSlot.device ? '16px' : '24px' }">
				<view class="agree-check-wrap" @click="agreed = !agreed">
					<view class="agree-check" :class="{ checked: agreed }">
						<u-icon v-if="agreed" name="checkbox-mark" color="#fff" size="14"></u-icon>
					</view>
				</view>
				<text class="agree-text">{{ payMode === 'payscore' ? '使用微信支付分免押租借，即表示同意' : '我已阅读并同意' }}《租赁协议》</text>
				<text class="agree-link" @click="showAgreement">查看租借规则 ›</text>
			</view>
			<!-- 确认按钮区域 -->
			<view class="confirm-section">
				<!-- 支付分模式（默认） -->
				<template v-if="payMode === 'payscore'">
					<view class="confirm-btn payscore-btn" :class="{ disabled: !canConfirm }" @click="onConfirm">
						<image v-if="selectedSlot" class="confirm-btn-icon" src="/static/payscore-logo.svg" mode="aspectFit"></image>
						<text class="confirm-btn-text">{{ selectedSlot ? '微信支付分 | 550分及以上优享' : '请选择仓位' }}</text>
					</view>
					<view class="pay-mode-switch" @click="payMode = 'deposit'">
						<text class="pay-mode-switch-text">支付分未通过？使用押金支付 ›</text>
					</view>
				</template>
				<!-- 押金模式（降级） -->
				<template v-else>
					<view class="confirm-btn" :class="{ disabled: !canConfirm }" @click="onConfirm">
						<text class="confirm-btn-text">{{ selectedSlot ? '确认租借' : '请选择仓位' }}</text>
						<text v-if="selectedSlot" class="confirm-btn-sub">预付 ¥{{ actualDepositText }}</text>
					</view>
					<view class="pay-mode-switch" @click="payMode = 'payscore'">
						<text class="pay-mode-switch-text">免押金租借 使用微信支付分 ›</text>
					</view>
				</template>
			</view>

			<view style="height: calc(20px + env(safe-area-inset-bottom));"></view>
	</template>
</view>
</template>

<script setup>
	import {
		ref,
		computed,
		onMounted
	} from 'vue';
	import {
		api,
		BASE_URL
	} from '../../services/api.js';
	import {
		parseDeviceQr
	} from '../../utils/qr-parser.js';

	const loading = ref(true);
	const cabinet = ref({});
	const distance = ref('');
	const selectedSlot = ref(null);
	const agreed = ref(false);
	const payMode = ref('payscore'); // 'payscore' | 'deposit'

	let cabinetId = '';

	onMounted(async () => {
		const pages = getCurrentPages();
		const page = pages[pages.length - 1];
		const query = page.options || page.$route?.query || {};
		cabinetId = query.id || '';
		const lat = parseFloat(query.lat) || 0;
		const lng = parseFloat(query.lng) || 0;
		const userLat = parseFloat(query.userLat) || 0;
		const userLng = parseFloat(query.userLng) || 0;

		if (lat && lng && userLat && userLng) {
			const d = haversine(userLat, userLng, lat, lng);
			distance.value = d >= 1000 ? (d / 1000).toFixed(1) + 'km' : Math.round(d) + 'm';
		}

		if (cabinetId) {
			await loadCabinetDetail(cabinetId);
		} else {
			loading.value = false;
			uni.showToast({
				title: '机柜ID缺失',
				icon: 'none'
			});
		}
	});

	async function loadCabinetDetail(id) {
		loading.value = true;
		try {
			const detailRes = await api.getCabinetDetail(id);
			if ((detailRes.code === 0 || detailRes.code === 200) && detailRes.data) {
				cabinet.value = detailRes.data;
			// 默认选中第一个可用设备
			const firstAvailable = slotList.value.find(s => s.status === 'available');
			if (firstAvailable && !selectedSlot.value) {
				selectedSlot.value = firstAvailable;
			}
			}
		} catch (err) {
			console.error('[CabinetDetail] 加载失败:', err.message || err);
			uni.showToast({
				title: '加载失败',
				icon: 'none'
			});
		} finally {
			loading.value = false;
		}
	}

	// 生成柜机格子数据（基于后端返回的 slots 数组）
	const slotList = computed(() => {
		const slots = cabinet.value.slots || [];
		return slots.map((slot) => {
			const hasDevice = !!slot.deviceSn;
			return {
				id: slot.deviceSn || `empty-${slot.slotNo}`,
				slotNo: String(slot.slotNo).padStart(2, '0'),
				status: hasDevice ? mapDeviceStatus(slot.deviceStatus) : 'empty',
				device: hasDevice ? slot : null,
				imageUrl: slot.imageUrl || '',
			};
		});
	});

	function mapDeviceStatus(status) {
		if (status === '空闲' || status === 'IDLE' || status === 0) return 'available';
		if (status === '使用中' || status === 'IN_USE' || status === 1) return 'rented';
		if (status === '维护' || status === 'MAINTENANCE' || status === 2) return 'maintain';
		return 'empty';
	}

	function slotStatusClass(status) {
		const map = {
			available: 'slot-available',
			rented: 'slot-rented',
			maintain: 'slot-maintain',
			empty: 'slot-empty'
		};
		return map[status] || '';
	}

	function slotStatusDotClass(status) {
		const map = {
			available: 'dot-available',
			rented: 'dot-rented',
			maintain: 'dot-maintain',
			empty: 'dot-empty'
		};
		return map[status] || '';
	}

	function slotStatusLabel(status) {
		const map = {
			available: '可租',
			rented: '已租',
			maintain: '维护中',
			empty: '空仓'
		};
		return map[status] || '未知';
	}

	function onSlotClick(slot) {
		if (slot.status !== 'available') {
			uni.showToast({
				title: '该仓位暂不可租',
				icon: 'none'
			});
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
				uni.showToast({
					title: '请选择设备',
					icon: 'none'
				});
			} else if (!agreed.value) {
				uni.showToast({
					title: '请同意租赁协议',
					icon: 'none'
				});
			}
			return;
		}

		// 校验用户与柜机距离（不超过20米）
		uni.showLoading({ title: '正在校验距离...', mask: true });
		try {
			const loc = await new Promise((resolve) => {
				uni.getLocation({
					type: 'gcj02',
					success: (r) => resolve({ lat: r.latitude, lng: r.longitude }),
					fail: () => resolve(null),
				});
			});
			if (!loc) {
				uni.showToast({ title: '定位失败，请开启定位权限后重试', icon: 'none', duration: 2500 });
				return;
			}
			const cabinetLat = cabinet.value.latitude || 0;
			const cabinetLng = cabinet.value.longitude || 0;
			if (!cabinetLat || !cabinetLng) {
				uni.showToast({ title: '柜机位置信息缺失，无法校验距离', icon: 'none' });
				return;
			}
			const dist = haversine(loc.lat, loc.lng, cabinetLat, cabinetLng);
			if (dist > 20) {
				uni.showToast({ title: '距离柜机过远，请在20米范围内租借', icon: 'none', duration: 2500 });
				return;
			}
		} finally {
			uni.hideLoading();
		}

		const dev = selectedSlot.value.device;
		uni.showLoading({
			title: '获取设备信息...',
			mask: true
		});
		try {
			// 1. 扫码获取设备信息
			const scanRes = await api.scanDevice(dev.deviceSn);
			if (!(scanRes.code === 200 || scanRes.code === 0) || !scanRes.data) {
				uni.showToast({
					title: scanRes.msg || '设备信息获取失败',
					icon: 'none'
				});
				return;
			}
			const d = scanRes.data;

			// 2. 创建订单（传完整参数）
			uni.showLoading({
				title: '创建订单...',
				mask: true
			});
			const feeTemplate = cabinet.value.feeTemplate || {};
			const confirmRes = await api.confirmLease({
				deviceSn: d.deviceSn,
				pickupCabinetId: cabinet.value.id,
				feeTemplateId: d.feeTemplateId || feeTemplate.id || 1,
				payType: 1,
				payScene: payMode.value === 'payscore' ? 'RISK_AUTH' : 'DEPOSIT_PAY',
			});
			if (!(confirmRes.code === 200 || confirmRes.code === 0) || !confirmRes.data) {
				uni.showToast({
					title: confirmRes.msg || '创建订单失败',
					icon: 'none'
				});
				return;
			}
			const order = confirmRes.data;
			const tradeNo = order.tradeNo;
			const depositMoney = order.depositMoney || 0;
			const riskAmount = order.riskAmount || 0;

			// 3. 押金模式：需要微信支付押金；免押模式：跳过支付直接确认
			if (payMode.value === 'deposit' && depositMoney > 0) {
				uni.showLoading({
					title: '正在发起支付...',
					mask: true
				});
				const amount = Number((depositMoney / 100).toFixed(2));
				const openId = uni.getStorageSync('openId') || '';
				const payRes = await api.createPayment({
					tradeNo,
					amount,
					payScene: 'DEPOSIT_PAY',
					openId,
					description: '外骨骼租赁押金',
				});
				console.log('[Pay] createPayment:', payRes);
				if (!(payRes.code === 200 || payRes.code === 0) || !payRes.data) {
					uni.showToast({
						title: payRes.msg || '支付发起失败',
						icon: 'none'
					});
					return;
				}
				const payData = payRes.data;

				// 4. 拉起微信支付
				let payNo = payData.payNo || '';
				uni.showLoading({
					title: '等待支付完成...',
					mask: true
				});

				// 构造支付参数（兼容不同后端字段命名）
				const payParams = {
					timeStamp: String(payData.timeStamp || payData.timestamp || ''),
					nonceStr: payData.nonceStr || '',
					package: payData.package || payData.packAge || '',
					signType: payData.signType || 'RSA',
					paySign: payData.paySign || '',
				};
				console.log('[Pay] requestPayment params:', payParams);

				// #ifdef MP-WEIXIN
				// 微信小程序：使用 wx.requestPayment，不需要 provider
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
				console.log('[Pay] requestPayment result:', wxPayRes);
				if (!wxPayRes.success) {
					const errMsg = '支付失败';
					uni.showToast({
						title: errMsg,
						icon: 'none',
						duration: 3000
					});
					return;
				}

				// 5. 主动查询微信侧订单状态
				if (payNo) {
					uni.showLoading({ title: '查询支付状态...', mask: true });
					const wxStatusRes = await api.getWechatStatus(payNo);
					console.log('[Pay] wechat-status:', wxStatusRes);
					if (wxStatusRes.data === 'SUCCESS') {
						// 微信确认支付成功，继续流程
					} else {
						uni.hideLoading();
						uni.showModal({
							title: '支付状态确认',
							content: '暂未查询到支付成功信息，请稍后重试或检查微信支付记录。',
							confirmText: '重新查询',
							cancelText: '取消',
							success: async (modalRes) => {
								if (modalRes.confirm) {
									// 用户点击重新查询，重新走查询逻辑
									uni.showLoading({ title: '查询支付状态...', mask: true });
									const retryRes = await api.getWechatStatus(payNo);
									console.log('[Pay] wechat-status retry:', retryRes);
									if (retryRes.data === 'SUCCESS') {
										uni.hideLoading();
										uni.showToast({ title: '支付确认成功', icon: 'success' });
										// 手动继续后续流程
										await continueAfterPaySuccess(tradeNo, d, feeTemplate, dev);
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

				// 6. 主动确认支付（通知后端支付成功）
				if (payNo) {
					uni.showLoading({ title: '确认支付...', mask: true });
					const confirmRes = await api.paymentConfirm(payNo);
					if (!(confirmRes.code === 200 || confirmRes.code === 0)) {
						uni.showToast({ title: confirmRes.msg || '支付确认失败', icon: 'none' });
						return;
					}
				}

				// 7. 押金确认取件
				await continueAfterPaySuccess(tradeNo, d, feeTemplate, dev);
			} else if (payMode.value === 'payscore') {
				// 微信支付分免押模式
				uni.showLoading({ title: '正在发起免押授权...', mask: true });
				const openId = uni.getStorageSync('openId') || '';
				const depositAmount = Number((depositMoney / 100).toFixed(2)) || Number(feeDeposit.value) || 500;
				const riskRes = await api.createPreAuthRisk({
					tradeNo,
					amount: depositAmount,
					openId,
					description: '外骨骼租赁押金',
				});
				console.log('[PayScore] createPreAuthRisk:', riskRes);
				if (!(riskRes.code === 200 || riskRes.code === 0) || !riskRes.data) {
					uni.showToast({ title: riskRes.msg || '免押授权发起失败', icon: 'none' });
					return;
				}
				const riskData = riskRes.data;
				const riskPayNo = riskData.payNo || '';

				// 拉起微信支付分确认页
				uni.hideLoading();
				const wxBizRes = await new Promise((resolve) => {
					wx.openBusinessView({
						businessType: 'wxpayScoreUse',
						extraData: { package: riskData.packAge || riskData.package || '' },
						success: (res) => resolve({ success: true, data: res }),
						fail: (err) => resolve({ success: false, error: err }),
					});
				});
				console.log('[PayScore] openBusinessView result:', wxBizRes);

				if (!wxBizRes.success) {
					uni.showToast({ title: '授权已取消，可使用押金租借', icon: 'none', duration: 2500 });
					payMode.value = 'deposit';
					return;
				}

				// 轮询查询免押确认结果（最多6次，间隔1.5s）
				uni.showLoading({ title: '正在确认授权...', mask: true });
				let authConfirmed = false;
				for (let i = 0; i < 6; i++) {
					await new Promise(r => setTimeout(r, 1500));
					const confirmRes = await api.confirmRiskAuth(riskPayNo);
					console.log(`[PayScore] confirmRiskAuth attempt ${i + 1}:`, confirmRes);
					if ((confirmRes.code === 200 || confirmRes.code === 0) && confirmRes.data === 1) {
						authConfirmed = true;
						break;
					}
				}

				if (!authConfirmed) {
					uni.hideLoading();
					uni.showModal({
						title: '授权确认中',
						content: '暂未确认授权结果，请稍后在订单列表中继续操作，或使用押金租借。',
						confirmText: '使用押金租借',
						cancelText: '我知道了',
						success: (modalRes) => {
							if (modalRes.confirm) {
								payMode.value = 'deposit';
							}
						},
					});
					return;
				}

				// 授权成功，确认取件
				uni.showLoading({ title: '正在确认...', mask: true });
				const confirmPayRes = await api.depositConfirm(tradeNo);
				if (!(confirmPayRes.code === 200 || confirmPayRes.code === 0)) {
					uni.showToast({ title: confirmPayRes.msg || '确认失败', icon: 'none' });
					return;
				}
			}

			// 8. 跳转到设备控制页
			const rate = d.hourlyRate || feeTemplate.hourlyRate || 0;
			const freeMin = d.freeMinutes || feeTemplate.freeMinutes || 0;
			const deposit = d.depositMoney || feeTemplate.depositMoney || 0;
			const cabinetIdVal = cabinet.value.id || cabinet.value.cabinetNo || '';
			uni.navigateTo({
				url: `/pages/device/demo-control?tradeNo=${tradeNo}&deviceSn=${d.deviceSn}&name=${encodeURIComponent(dev.deviceName || '外骨骼设备')}&hourlyRate=${rate}&freeMinutes=${freeMin}&depositMoney=${deposit}&cabinetId=${cabinetIdVal}`
			});
	} catch (e) {
			uni.showToast({
				title: e.message || '请求失败',
				icon: 'none'
			});
		} finally {
			uni.hideLoading();
		}
	}

	async function continueAfterPaySuccess(tradeNo, d, feeTemplate, dev) {
		uni.showLoading({ title: '正在确认...', mask: true });
		const confirmPayRes = await api.depositConfirm(tradeNo);
		if (!(confirmPayRes.code === 200 || confirmPayRes.code === 0)) {
			uni.showToast({ title: confirmPayRes.msg || '确认失败', icon: 'none' });
			return;
		}
	}

	function showAgreement() {
		uni.navigateTo({
			url: '/pages/agreement/lease'
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

	const cabinetStatusClass = computed(() => {
		const s = cabinet.value.status;
		return s === 'online' || s === 'OPEN' || s === 1 ? 'tag-open' : 'tag-close';
	});

	// feeTemplate 中的金额单位为分，转换为元展示
	const feeRate = computed(() => {
		const rate = cabinet.value.feeTemplate?.hourlyRate || cabinet.value.rate || 0;
		return rate > 0 ? (rate / 100).toFixed(2) : '1.50';
	});

	const feeCap = computed(() => {
		const cap = cabinet.value.feeTemplate?.dailyCap || cabinet.value.dailyCap || 0;
		return cap > 0 ? (cap / 100).toFixed(2) : '30.00';
	});

	const feeDeposit = computed(() => {
		const deposit = cabinet.value.feeTemplate?.depositMoney || 0;
		return deposit > 0 ? (deposit / 100).toFixed(2) : '0.00';
	});

	const actualDeposit = computed(() => {
		return payMode.value === 'payscore' ? 0 : Number(feeDeposit.value);
	});

	const actualDepositText = computed(() => {
		return actualDeposit.value > 0 ? actualDeposit.value.toFixed(2) : '0.00';
	});

	const feeFreeMinutes = computed(() => {
		return cabinet.value.feeTemplate?.freeMinutes || 0;
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
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
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
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.status-tag {
		font-size: 10px;
		padding: 2px 8px;
		border-radius: 10px;
		font-weight: 700;
	}

	.status-tag.tag-open {
		background: rgba(40, 199, 111, 0.12);
		color: #28c76f;
	}

	.status-tag.tag-close {
		background: rgba(153, 153, 153, 0.1);
		color: #999;
	}

	.header-address {
		font-size: 11px;
		color: #666;
		margin-top: 2px;
		line-height: 1.4;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 220px;
	}

	.header-cabinet-no {
		font-size: 10px;
		color: #bbb;
		margin-top: 2px;
	}

	.header-img {
		width: 72px;
		height: 72px;
		border-radius: 12px;
		background: #f5f6fa;
		flex-shrink: 0;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
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
		color: #306afc;
		font-weight: 600;
	}

	/* 可租柜机 */
	.slot-section {
		background: #fff;
		border-radius: 16px;
		margin: 12px 16px 0;
		padding: 16px;
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
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
		border: 1px dashed #e8e8e8;
	}

	.slot-item.slot-selected {
		border-color: #306afc;
		background: rgba(48, 106, 252, 0.08);
		box-shadow: 0 0 0 3px rgba(48, 106, 252, 0.12);
		transform: scale(1.04);
		z-index: 1;
	}

	.slot-item.slot-rented,
	.slot-item.slot-maintain {
		opacity: 0.7;
	}

	.slot-item:active:not(.slot-empty):not(.slot-rented):not(.slot-maintain) {
		transform: scale(0.96);
	}

	.slot-check {
		position: absolute;
		top: 4px;
		right: 4px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #306afc;
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
		position: absolute;
		left: 6px;
		top: 3px;
	}

	.slot-icon-wrap {
		width: 50px;
		height: 66px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.slot-icon {
		width: 100%;
		height: 100%;
	}

	.slot-icon-gray {
		opacity: 0.4;
		filter: grayscale(100%);
	}

	.slot-icon-empty {
		width: 60%;
		height: 60%;
	}

	.slot-status {
		position: absolute;
		bottom: 1px;
		display: flex;
		align-items: center;
		gap: 3px;
	}

	.slot-status-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
	}

	.dot-available {
		background: #22c55e;
	}

	.dot-rented {
		background: #9ca3af;
	}

	.dot-maintain {
		background: #f97316;
	}

	.dot-empty {
		background: #d1d5db;
	}

	.slot-status-text {
		font-size: 10px;
		color: #666;
	}

	.slot-selected-text {
		font-size: 9px;
		color: #306afc;
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

	.legend-available {
		background: #22c55e;
	}

	.legend-rented {
		background: #9ca3af;
	}

	.legend-maintain {
		background: #f97316;
	}

	.legend-empty {
		background: #e5e7eb;
		border: 1px solid #d1d5db;
	}

	/* 设备信息卡片 */
	.device-info-card {
		background: #fff;
		border-radius: 16px;
		margin: 12px 16px 0;
		padding: 16px;
		display: flex;
		align-items: flex-start;
		gap: 12px;
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
		position: relative;
		overflow: hidden;
	}

	.device-info-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 16px;
		right: 16px;
		height: 3px;
		background: #306afc;
		border-radius: 0 0 2px 2px;
	}

	.device-img {
		width: 72px;
		height: 72px;
		flex-shrink: 0;
		border-radius: 8px;
		background: #f8f8f8;
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
		justify-content: space-between;
		gap: 8px;
	}

	.info-label {
		font-size: 12px;
		color: #999;
		flex-shrink: 0;
	}

	.info-value {
		font-size: 13px;
		font-weight: 700;
		color: #333;
	}

	.battery-wrap {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.battery-bar {
		width: 60px;
		height: 14px;
		background: #e5e7eb;
		border-radius: 7px;
		overflow: hidden;
		position: relative;
	}

	.battery-fill {
		height: 100%;
		background: #22c55e;
		border-radius: 7px;
		transition: width 0.3s;
	}

	.battery-fill.battery-low {
		background: #ef4444;
	}

	.battery-text {
		font-size: 12px;
		font-weight: 700;
		color: #333;
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

	.agree-check-wrap {
		padding: 6px;
		margin: -6px;
		flex-shrink: 0;
	}

	.agree-check {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		border: 2px solid #ccc;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: all 0.2s;
	}

	.agree-check.checked {
		background: #306afc;
		border-color: #306afc;
	}

	.agree-text {
		font-size: 12px;
		color: #666;
		flex: 1;
	}

	.agree-link {
		font-size: 12px;
		color: #306afc;
		font-weight: 600;
		flex-shrink: 0;
	}

	/* 确认按钮 */
	.confirm-section {
		margin: 12px 16px 0;
	}

	.confirm-btn {
		width: 100%;
		height: 52px;
		background: #306afc;
		border-radius: 12px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1px;
		color: #fff;
		box-shadow: 0 4px 12px rgba(48, 106, 252, 0.3);
		transition: opacity 0.2s;
	}

	.confirm-btn.payscore-btn {
		flex-direction: row;
		gap: 6px;
	}

	.confirm-btn.disabled {
		background: #d1d5db;
		color: #fff;
	}

	.confirm-btn.payscore-btn {
		background: linear-gradient(135deg, #07c160, #06ad56);
		box-shadow: 0 4px 12px rgba(7, 193, 96, 0.3);
	}

	.confirm-btn.payscore-btn.disabled {
		background: #d1d5db;
		box-shadow: none;
	}

	.confirm-btn-icon {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
		margin-right: 6px;
	}

	.pay-mode-switch {
		text-align: center;
		margin-top: 10px;
	}

	.pay-mode-switch-text {
		font-size: 12px;
		color: #999;
	}

	.pay-mode-switch-text:active {
		color: #306afc;
	}

	.confirm-btn:active:not(.disabled) {
		opacity: 0.85;
	}

	.confirm-btn-text {
		font-size: 15px;
		font-weight: 700;
	}

	.confirm-btn-sub {
		font-size: 11px;
		opacity: 0.85;
		margin-top: 2px;
	}

	/* ===== 模式切换 ===== */
	.pay-mode-bar {
		display: flex;
		gap: 12px;
		margin: 12px 16px 0;
	}

	.pay-mode-btn {
		flex: 1;
		background: #fff;
		border-radius: 12px;
		padding: 12px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		border: 2px solid transparent;
		transition: all 0.2s;
	}

	.pay-mode-btn.active {
		border-color: #306afc;
		background: rgba(48, 106, 252, 0.04);
	}

	.pay-mode-btn text {
		font-size: 14px;
		font-weight: 700;
		color: #333;
	}

	.pay-mode-btn .pay-mode-hint {
		font-size: 11px;
		font-weight: 400;
		color: #999;
	}

	.pay-mode-btn.active .pay-mode-hint {
		color: #306afc;
	}

	/* ===== 费用明细卡 ===== */
	.cost-summary-card {
		background: #fff;
		border-radius: 16px;
		margin: 12px 16px 0;
		padding: 14px 16px;
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
	}

	.cost-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 7px 0;
	}

	.cost-row-label {
		font-size: 13px;
		color: #666;
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.cost-row-value {
		font-size: 13px;
		font-weight: 700;
		color: #333;
	}

	.cost-row-value.cost-deposit {
		color: #306afc;
		font-size: 14px;
	}

	.cost-row-value.cost-free {
		color: #28c76f;
	}

	.cost-divider-bar {
		height: 1px;
		background: #f0f0f0;
		margin: 4px 0;
	}

	.cost-total-row {
		padding: 10px 0 4px;
	}

	.cost-total-label {
		font-size: 14px;
		color: #333;
		font-weight: 700;
	}

	.cost-total-right {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.cost-total-amount {
		font-size: 18px;
		font-weight: 900;
		color: #306afc;
	}

	.cost-total-amount.cost-free {
		color: #28c76f;
		font-size: 15px;
	}

	.cost-total-hint {
		font-size: 11px;
		color: #999;
	}
</style>