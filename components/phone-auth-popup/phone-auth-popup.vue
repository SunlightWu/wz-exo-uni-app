<template>
	<u-popup :show="visible" mode="bottom" :round="20" :mask-close-able="false" :closeable="false"
		:overlay="true" :overlay-opacity="0.65" :overlay-style="{ backgroundColor: 'rgba(20, 25, 45, 0.65)' }" @close="onForceClose">
		<view class="phone-auth-sheet">
			<!-- 拖拽条 -->
			<view class="sheet-handle"></view>

			<!-- 标题 -->
			<view class="sheet-header">
				<text class="sheet-title">手机号快捷登录</text>
			</view>
			<text class="sheet-subtitle">授权手机号以完成身份认证，开启外骨骼租赁服务</text>

			<!-- 功能说明 -->
			<view class="feature-card">
				<view class="feature-row">
					<view class="feature-icon icon-blue">
						<text class="icon-text">&#x1F512;</text>
					</view>
					<view class="feature-text">
						<text class="feature-label">身份认证</text>
						<text class="feature-desc">用于确认用户真实身份，保障账户安全</text>
					</view>
				</view>
				<view class="feature-row">
					<view class="feature-icon icon-orange">
						<text class="icon-text">&#x1F514;</text>
					</view>
					<view class="feature-text">
						<text class="feature-label">订单通知</text>
						<text class="feature-desc">租赁状态变更、结算提醒等消息推送</text>
					</view>
				</view>
				<view class="feature-row">
					<view class="feature-icon icon-green">
						<text class="icon-text">&#x1F6E1;</text>
					</view>
					<view class="feature-text">
						<text class="feature-label">隐私保护</text>
						<text class="feature-desc">手机号仅用于业务必要环节，绝不泄露</text>
					</view>
				</view>
			</view>

			<!-- 协议勾选 -->
			<view class="agreement-row" @click="toggleAgree">
				<view class="agree-check-wrap">
					<view class="agree-check" :class="{ checked: agreed }">
						<text v-if="agreed" class="check-icon">&#x2713;</text>
					</view>
				</view>
				<text class="agreement-text">
					已阅读并同意
					<text class="agreement-link" @click.stop="goAgreement('user')">《用户服务协议》</text>
					和
					<text class="agreement-link" @click.stop="goAgreement('privacy')">《隐私政策》</text>
				</text>
			</view>

			<!-- 微信手机号授权按钮 -->
			<button v-if="agreed" class="auth-btn" open-type="getPhoneNumber"
				@getphonenumber="onGetPhoneNumber" hover-class="auth-btn-hover">
				<text class="auth-btn-text">微信手机号快捷登录</text>
			</button>
			<view v-else class="auth-btn auth-btn-disabled">
				<text class="auth-btn-text">请先同意用户协议</text>
			</view>
		</view>
	</u-popup>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useUserStore } from '../../store/user.js';

const props = defineProps({
	show: {
		type: Boolean,
		default: false,
	},
});

const emit = defineEmits(['update:show', 'success', 'fail']);

const userStore = useUserStore();
const visible = ref(false);
const agreed = ref(false);

// 同步外部 show
watch(() => props.show, (val) => {
	visible.value = val;
}, { immediate: true });

function close() {
	visible.value = false;
	emit('update:show', false);
}

function onForceClose() {
	// 不允许关闭，强制保持弹出
	visible.value = true;
}

function toggleAgree() {
	agreed.value = !agreed.value;
}

function goAgreement(type) {
	const url = '/pages/profile/agreement';
	uni.navigateTo({ url });
}

async function onGetPhoneNumber(e) {
	const detail = e.detail || {};
	if (!detail || detail.errMsg !== 'getPhoneNumber:ok') {
		console.warn('[PhoneAuth] 用户拒绝手机号授权:', detail.errMsg);
		uni.showToast({ title: '手机号授权是使用租赁服务的必要条件', icon: 'none', duration: 2000 });
		return;
	}
	if (!detail.encryptedData || !detail.iv) {
		uni.showToast({ title: '授权信息获取失败，请重试', icon: 'none' });
		return;
	}

	uni.showLoading({ title: '登录中...', mask: true });
	try {
		const success = await userStore.phoneLogin(detail.encryptedData, detail.iv);
		if (success) {
			uni.hideLoading();
			uni.showToast({ title: '登录成功', icon: 'success', duration: 1000 });
			emit('success');
			close();
		} else {
			uni.hideLoading();
			uni.showToast({ title: '登录失败，请重试', icon: 'none' });
		}
	} catch (err) {
		console.error('[PhoneAuth] 授权异常:', err);
		uni.hideLoading();
		uni.showToast({ title: '登录失败，请重试', icon: 'none' });
		emit('fail', err);
	}
}
</script>

<style lang="scss" scoped>
// ── 弹出层主体 ──
.phone-auth-sheet {
	padding: 0 32rpx calc(32rpx + env(safe-area-inset-bottom));

	.sheet-handle {
		width: 64rpx;
		height: 8rpx;
		background: rgba(0, 0, 0, 0.1);
		border-radius: 4rpx;
		margin: 16rpx auto 0;
	}

	.sheet-header {
		margin-top: 32rpx;
	}

	.sheet-title {
		font-size: 36rpx;
		font-weight: 600;
		color: #171717;
		line-height: 1.3;
	}

	.sheet-subtitle {
		display: block;
		font-size: 26rpx;
		color: #8e8e93;
		margin-top: 8rpx;
		margin-bottom: 32rpx;
		line-height: 1.5;
	}
}

// 功能说明卡片
.feature-card {
	background: #f5f6fa;
	border-radius: 16rpx;
	padding: 28rpx;
}

.feature-row {
	display: flex;
	align-items: flex-start;
	gap: 20rpx;
}

.feature-row+.feature-row {
	margin-top: 28rpx;
}

.feature-icon {
	width: 64rpx;
	height: 64rpx;
	border-radius: 16rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.icon-blue {
	background: rgba(48, 106, 252, 0.1);
}

.icon-orange {
	background: rgba(245, 158, 11, 0.1);
}

.icon-green {
	background: rgba(7, 193, 96, 0.1);
}

.icon-text {
	font-size: 28rpx;
}

.feature-text {
	flex: 1;
}

.feature-label {
	font-size: 28rpx;
	font-weight: 500;
	color: #171717;
	line-height: 1.4;
	display: block;
}

.feature-desc {
	font-size: 24rpx;
	color: #8e8e93;
	margin-top: 4rpx;
	line-height: 1.4;
	display: block;
}

// 协议
.agreement-row {
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin-top: 32rpx;
	margin-bottom: 28rpx;
}

.agree-check-wrap {
	padding: 8rpx;
	margin: -8rpx;
}

.agree-check {
	width: 36rpx;
	height: 36rpx;
	border-radius: 6rpx;
	border: 2rpx solid #d1d5db;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	background: #fff;
}

.agree-check.checked {
	background: #306afc;
	border-color: #306afc;
}

.check-icon {
	color: #fff;
	font-size: 22rpx;
	font-weight: 600;
	line-height: 1;
}

.agreement-text {
	font-size: 24rpx;
	color: #8e8e93;
	line-height: 1.5;
}

.agreement-link {
	color: #306afc;
	font-weight: 500;
}

// 授权按钮
.auth-btn {
	width: 100%;
	height: 104rpx;
	border: none;
	border-radius: 16rpx;
	background: linear-gradient(135deg, #07c160, #06ad56);
	color: #fff;
	font-size: 32rpx;
	font-weight: 600;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 8rpx 24rpx rgba(7, 193, 96, 0.3);

	// 重置 button 默认样式
	padding: 0;
	margin: 0;
	line-height: 1;

	&::after {
		border: none;
	}
}

.auth-btn-text {
	color: #fff;
	font-size: 32rpx;
	font-weight: 600;
}

.auth-btn-hover {
	opacity: 0.9;
	transform: scale(0.98);
}

.auth-btn-disabled {
	background: #d1d5db;
	box-shadow: none;
}
</style>