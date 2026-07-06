<template>
	<view class="profile-page">
		<!-- 顶部绿色渐变背景（包含状态栏、导航栏、用户信息） -->
		<view class="header-bg">
			<!-- 状态栏占位 -->
			<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

			<!-- 自定义导航栏 -->
			<view class="custom-nav">
				<view class="nav-back" @click="goBack">
					<u-icon name="arrow-left" color="#fff" size="22"></u-icon>
				</view>
				<text class="nav-title">我的</text>
				<view class="nav-placeholder"></view>
			</view>

			<view class="header-content">
				<!-- 用户信息 -->
				<view class="user-header">
					<view class="avatar-box" @click="onAvatarTap">
						<image v-if="userInfo.avatar" class="avatar-img" :src="userInfo.avatar" mode="aspectFill">
						</image>
						<view v-else class="avatar-default">
							<u-icon name="account-fill" color="$primaryColor" size="32"></u-icon>
						</view>
						<view v-if="!userInfo.avatar || !userInfo.nickname || userInfo.nickname === '微信用户'" class="avatar-hint">点击完善资料</view>
					</view>
					<view class="user-meta">
						<text class="nickname-text">{{ userInfo.nickname || '微信用户' }}</text>
					</view>
				</view>
			</view>

			<!-- 装饰圆 -->
			<view class=" deco-circle deco-1"></view>
			<view class="deco-circle deco-2"></view>
		</view>

		<!-- 白色内容区 -->
		<view class="content-card">
			<!-- 统计概览 -->
			<view class="stats-row">
				<view class="stat-item">
					<text class="stat-num">{{ totalSessions }}</text>
					<text class="stat-label">累计使用</text>
				</view>
				<view class="stat-divider"></view>
				<view class="stat-item">
					<text class="stat-num">{{ totalHours }}</text>
					<text class="stat-label">累计时长(h)</text>
				</view>
				<view class="stat-divider"></view>
				<view class="stat-item">
					<text class="stat-num">{{ totalSteps }}</text>
					<text class="stat-label">累计步数</text>
				</view>
			</view>

			<view class="section-divider"></view>

			<!-- 功能菜单 -->
			<view class="menu-list">
				<!-- 押金 -->
				<view class="menu-item" @click="goTo('/pages/profile/deposit')">
					<view class="menu-icon-wrap" style="background: rgba(139,92,246,0.10);">
						<u-icon name="rmb-circle-fill" color="$primaryColor" size="22"></u-icon>
					</view>
					<view class="menu-body">
						<text class="menu-title">押金</text>
						<text v-if="!depositPaid" class="menu-badge unpaid">未充押金</text>
						<text v-else class="menu-badge paid">已缴纳</text>
					</view>
					<u-icon name="arrow-right" color="#c0c4cc" size="16"></u-icon>
				</view>

				<!-- 我的订单 -->
				<view class="menu-item" @click="goTo('/pages/history/list')">
					<view class="menu-icon-wrap" style="background: rgba(93,142,240,0.10);">
						<u-icon name="order" color="#5D8EF0" size="22"></u-icon>
					</view>
					<view class="menu-body">
						<text class="menu-title">我的订单</text>
					</view>
					<view class="menu-extra">
						<text v-if="activeOrderCount > 0" class="menu-dot">{{ activeOrderCount }}</text>
						<u-icon name="arrow-right" color="#c0c4cc" size="16"></u-icon>
					</view>
				</view>

				<!-- 我的卡券 -->
				<!-- 		<view class="menu-item" @click="goTo('/pages/profile/coupon')">
					<view class="menu-icon-wrap" style="background: rgba(255,159,67,0.10);">
						<u-icon name="coupon-fill" color="#FF9F43" size="22"></u-icon>
					</view>
					<view class="menu-body">
						<text class="menu-title">我的卡券</text>
					</view>
					<view class="menu-extra">
						<text v-if="couponCount > 0" class="menu-tag">{{ couponCount }}张</text>
						<u-icon name="arrow-right" color="#c0c4cc" size="16"></u-icon>
					</view>
				</view> -->

				<view class="item-divider"></view>

				<!-- 身体参数 -->
				<view class="menu-item" @click="goTo('/pages/profile/settings')">
					<view class="menu-icon-wrap" style="background: rgba(116,106,242,0.10);">
						<u-icon name="man-add-fill" color="#746AF2" size="22"></u-icon>
					</view>
					<view class="menu-body">
						<text class="menu-title">身体参数</text>
					</view>
					<u-icon name="arrow-right" color="#c0c4cc" size="16"></u-icon>
				</view>

				<view class="item-divider"></view>

				<!-- 客服中心 -->
				<view class="menu-item" @click="callService">
					<view class="menu-icon-wrap" style="background: rgba(40,18,62,0.08);">
						<u-icon name="server-fill" color="#666" size="22"></u-icon>
					</view>
					<view class="menu-body">
						<text class="menu-title">客服中心</text>
					</view>
					<u-icon name="arrow-right" color="#c0c4cc" size="16"></u-icon>
				</view>
				<view class="item-divider"></view>
				<!-- 使用须知 -->
				<view class="menu-item" @click="showUsage">
					<view class="menu-icon-wrap" style="background: rgba(40,18,62,0.08);">
						<u-icon name="file-text-fill" color="#666" size="22"></u-icon>
					</view>
					<view class="menu-body">
						<text class="menu-title">使用须知</text>
					</view>
					<u-icon name="arrow-right" color="#c0c4cc" size="16"></u-icon>
				</view>
				<view class="item-divider"></view>
				<!-- 关于 -->
				<view class="menu-item" @click="goTo('/pages/profile/about')">
					<view class="menu-icon-wrap" style="background: rgba(40,18,62,0.08);">
						<u-icon name="info-circle-fill" color="#666" size="22"></u-icon>
					</view>
					<view class="menu-body">
						<text class="menu-title">关于</text>
						<text class="menu-version">v{{ appVersion }}</text>
					</view>
					<u-icon name="arrow-right" color="#c0c4cc" size="16"></u-icon>
				</view>
			</view>
		</view>

		<!-- 资料编辑面板 -->
		<view v-if="showEditPanel" class="edit-overlay" @click="closeEditPanel">
			<view class="edit-panel" @click.stop>
				<view class="edit-header">
					<text class="edit-title">完善资料</text>
					<text class="edit-close" @click="closeEditPanel">✕</text>
				</view>
				<view class="edit-body">
					<!-- 头像选择 -->
					<button class="edit-avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
						<image v-if="userInfo.avatar" class="edit-avatar-img" :src="userInfo.avatar" mode="aspectFill"></image>
						<view v-else class="edit-avatar-placeholder">
							<u-icon name="plus" color="$primaryColor" size="24"></u-icon>
							<text class="edit-avatar-text">选择头像</text>
						</view>
					</button>
					<!-- 昵称输入 -->
					<view class="edit-field">
						<text class="edit-label">昵称</text>
						<input
							type="nickname"
							class="edit-input"
							placeholder="请输入昵称"
							:value="editNickname"
							@blur="onNicknameBlur"
						/>
					</view>
				</view>
				<view class="edit-footer">
					<button class="edit-save-btn" @click="saveProfile">保存</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
	import {
		ref,
		onMounted
	} from 'vue';
	import {
		getUserInfo
	} from '../../services/auth.js';
	import {
		api
	} from '../../services/api.js';

	const statusBarHeight = ref(20)
	const userInfo = ref({
		nickname: '微信用户',
		avatar: ''
	})
	// 资料编辑面板
	const showEditPanel = ref(false)
	const editNickname = ref('')
	const totalSessions = ref(12)
	const totalHours = ref('8.4')
	const totalSteps = ref(32470)
	const depositPaid = ref(false)
	const activeOrderCount = ref(0)
	const couponCount = ref(2)
	const appVersion = ref('1.0.0')

	onMounted(async () => {
		const sys = await uni.getSystemInfo()
		statusBarHeight.value = sys.statusBarHeight || 20

		// 检查登录态
		const token = uni.getStorageSync('token')

		// 尝试获取本地缓存的微信用户信息
		const wxUser = uni.getStorageSync('wxUserInfo')
		if (wxUser) {
			userInfo.value.avatar = wxUser.avatarUrl || ''
			userInfo.value.nickname = wxUser.nickName || '微信用户'
		}

		// 微信静默登录：无 token 时自动登录
		if (!token) {
			await doWxLogin()
		}

		// 已登录时从后端拉取最新用户信息
		if (uni.getStorageSync('token')) {
			await fetchMemberInfo()
		}

		// 加载统计数据
		loadStats()
		// 检查押金状态
		loadDepositStatus()
		// 检查进行中订单
		checkActiveOrder()
		// 检查卡券
		loadCoupons()
	})

	// ── 微信静默登录 ──
	// 调用真实后端：POST http://192.168.108.183:8080/member/xcx/login
	// 请求体：{ code, avatarUrl?, nickName? }
	async function doWxLogin() {
		try {
			const loginRes = await new Promise((resolve, reject) => {
				uni.login({ provider: 'weixin', success: resolve, fail: reject })
			})

			// 组装请求体：如有本地缓存的用户信息一并带上
			const wxUser = uni.getStorageSync('wxUserInfo') || {}
			const payload = {
				code: loginRes.code,
				avatarUrl: wxUser.avatarUrl || '',
				nickName: wxUser.nickName || '',
			}

			const result = await api.wxXcxLogin(payload)
			if (result.code === 200 && result.data) {
				const d = result.data
				// 保存双 token
				uni.setStorageSync('token', d.token)
				if (d.refreshToken) {
					uni.setStorageSync('refreshToken', d.refreshToken)
				}
				// 保存会员ID
				if (d.memberId) {
					uni.setStorageSync('memberId', String(d.memberId))
				}
				// 后端返回用户信息则更新本地（兼容 null）
				if (d.nickname || d.avatar) {
					userInfo.value.nickname = d.nickname || userInfo.value.nickname
					userInfo.value.avatar = d.avatar || userInfo.value.avatar
					uni.setStorageSync('wxUserInfo', {
						nickName: d.nickname || '',
						avatarUrl: d.avatar || '',
					})
				}
			} else {
				console.error('[WxLogin] 后端返回错误:', result.msg || '未知错误')
			}
		} catch (err) {
			console.error('[WxLogin] 静默登录失败:', err.message || err)
		}
	}

	// ── 从后端拉取会员信息 ──
	async function fetchMemberInfo() {
		try {
			const result = await api.getMemberInfo()
			if (result.code === 200 && result.data) {
				const d = result.data
				userInfo.value.nickname = d.nickname || userInfo.value.nickname
				userInfo.value.avatar = d.avatar || userInfo.value.avatar
				// 同步保存到本地
				uni.setStorageSync('wxUserInfo', {
					nickName: d.nickname || '',
					avatarUrl: d.avatar || '',
				})
			}
		} catch (err) {
			console.error('[Member] 获取会员信息失败:', err.message || err)
		}
	}

	// ── 打开资料编辑面板 ──
	function onAvatarTap() {
		editNickname.value = userInfo.value.nickname === '微信用户' ? '' : userInfo.value.nickname
		showEditPanel.value = true
	}

	// ── 选择头像（微信规范：button open-type="chooseAvatar"） ──
	function onChooseAvatar(e) {
		const avatarUrl = e.detail.avatarUrl || ''
		if (avatarUrl) {
			userInfo.value.avatar = avatarUrl
			uni.setStorageSync('wxUserInfo', {
				nickName: userInfo.value.nickname,
				avatarUrl,
			})
		}
	}

	// ── 昵称输入完成 ──
	function onNicknameBlur(e) {
		const nickName = e.detail.value || ''
		if (nickName) {
			editNickname.value = nickName
		}
	}

	// ── 关闭编辑面板 ──
	function closeEditPanel() {
		showEditPanel.value = false
	}

	// ── 保存资料并同步后端 ──
	async function saveProfile() {
		const nickName = editNickname.value || userInfo.value.nickname
		const avatarUrl = userInfo.value.avatar
		if (!nickName && !avatarUrl) {
			uni.showToast({ title: '请填写头像或昵称', icon: 'none' })
			return
		}
		userInfo.value.nickname = nickName || '微信用户'
		uni.setStorageSync('wxUserInfo', { nickName, avatarUrl })
		showEditPanel.value = false

		// 同步到后端
		const token = uni.getStorageSync('token')
		if (token && avatarUrl) {
			try {
				await api.updateXcxProfile({
					nickName,
					avatarUrl,
					gender: 0,
					country: '',
					province: '',
					city: '',
					language: 'zh_CN',
				})
				uni.showToast({ title: '资料已更新', icon: 'success' })
			} catch (e) {
				console.error('[Profile] 更新后端失败:', e.message)
				uni.showToast({ title: '本地已保存', icon: 'success' })
			}
		} else {
			uni.showToast({ title: '已保存', icon: 'success' })
		}
	}

	function loadStats() {
		const sessions = uni.getStorageSync('totalSessions')
		const hours = uni.getStorageSync('totalHours')
		const steps = uni.getStorageSync('totalSteps')
		if (sessions) totalSessions.value = sessions
		if (hours) totalHours.value = hours
		if (steps) totalSteps.value = steps
	}

	function loadDepositStatus() {
		const status = uni.getStorageSync('depositStatus')
		if (status === 'paid') depositPaid.value = true
	}

	function checkActiveOrder() {
		const lease = uni.getStorageSync('currentLease')
		if (lease) activeOrderCount.value = 1
	}

	function loadCoupons() {
		const coupons = uni.getStorageSync('userCoupons')
		if (coupons && Array.isArray(coupons)) {
			couponCount.value = coupons.length
		}
	}

	function goBack() {
		uni.navigateBack()
	}

	function showMore() {
		uni.showActionSheet({
			itemList: ['分享', '刷新'],
			success: (res) => {
				if (res.tapIndex === 1) {
					uni.showToast({
						title: '已刷新',
						icon: 'success'
					})
				}
			}
		})
	}

	function goTo(path) {
		uni.navigateTo({
			url: path
		})
	}

	function callService() {
		uni.showActionSheet({
			itemList: ['拨打客服电话', '在线客服'],
			success: (res) => {
				if (res.tapIndex === 0) {
					uni.makePhoneCall({
						phoneNumber: '400-800-1234',
						fail: () => uni.showToast({
							title: '客服: 400-800-1234',
							icon: 'none'
						}),
					})
				} else {
					uni.showToast({
						title: '在线客服功能开发中',
						icon: 'none'
					})
				}
			}
		})
	}

	function showUsage() {
		uni.showModal({
			title: '使用须知',
			content: '1. 使用前请确认设备完好\n2. 如感不适请立即停止\n3. 设备仅限单人使用\n4. 使用结束后请按流程关机\n5. 费用按实际使用时长计算',
			showCancel: false,
		})
	}
</script>

<style scoped lang="scss">
	.profile-page {
		min-height: 100vh;
		background: #f5f6fa;
		padding-bottom: 0;
	}

	/* ===== 顶部渐变背景 ===== */
	.header-bg {
		position: relative;
		background: linear-gradient(135deg, $primaryColor 0%, $primaryLight 50%, #5DE0D0 100%);
		padding-bottom: 60px;
		overflow: hidden;
	}

	/* 状态栏占位 */
	.status-bar {
		background: transparent;
		flex-shrink: 0;
	}

	/* 自定义导航栏 */
	.custom-nav {
		position: relative;
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 44px;
		padding: 0 8px;
	}

	.nav-back {
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: opacity 0.15s;
	}

	.nav-back:active {
		opacity: 0.6;
	}

	.nav-title {
		font-size: 17px;
		font-weight: 700;
		color: #fff;
		flex: 1;
		text-align: center;
	}

	.nav-placeholder {
		width: 44px;
		height: 44px;
	}

	/* 装饰圆 */
	.deco-circle {
		position: absolute;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.06);
	}

	.deco-1 {
		width: 200px;
		height: 200px;
		top: -60px;
		right: -40px;
	}

	.deco-2 {
		width: 140px;
		height: 140px;
		bottom: 20px;
		left: -30px;
	}

	.header-content {
		position: relative;
		z-index: 1;
		padding: 0 16px 24px;
	}

	/* 用户信息 */
	.user-header {
		display: flex;
		align-items: center;
		gap: 16px;
		margin-top: 16px;
		padding: 0 8px;
	}

	.avatar-box {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: visible;
		flex-shrink: 0;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		position: relative;
	}

	.avatar-img {
		width: 100%;
		height: 100%;
	}

	.avatar-default {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.user-meta {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.nickname-text {
		font-size: 18px;
		font-weight: 700;
		color: #fff;
	}

	/* ===== 白色内容卡片 ===== */
	.content-card {
		position: relative;
		z-index: 2;
		margin: -40px 0 0;
		background: #fff;
		border-radius: 20px;
		padding: 20px 16px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
	}

	/* 统计行 */
	.stats-row {
		display: flex;
		align-items: center;
		justify-content: space-around;
		padding: 8px 0;
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		flex: 1;
	}

	.stat-num {
		font-size: 20px;
		font-weight: 900;
		color: $primaryColor;
	}

	.stat-label {
		font-size: 12px;
		color: #999;
		font-weight: 500;
	}

	.stat-divider {
		width: 1px;
		height: 28px;
		background: #eee;
	}

	.section-divider {
		height: 1px;
		background: #f0f0f0;
		margin: 16px 0;
	}

	/* 菜单列表 */
	.menu-list {
		display: flex;
		flex-direction: column;
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 14px 4px;
		transition: opacity 0.15s;
	}

	.menu-item:active {
		opacity: 0.6;
		background: rgba(0, 0, 0, 0.02);
		border-radius: 12px;
	}

	.menu-icon-wrap {
		width: 40px;
		height: 40px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.menu-body {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.menu-title {
		font-size: 15px;
		font-weight: 600;
		color: #333;
	}

	.menu-badge {
		font-size: 11px;
		font-weight: 600;
		padding: 1px 8px;
		border-radius: 8px;
	}

	.menu-badge.unpaid {
		color: #FF9F43;
		background: rgba(255, 159, 67, 0.12);
	}

	.menu-badge.paid {
		color: $primaryColor;
		background: rgba(139, 92, 246, 0.12);
	}

	.menu-version {
		font-size: 12px;
		color: #bbb;
		font-weight: 400;
	}

	.menu-extra {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.menu-dot {
		min-width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #FF5C7A;
		color: #fff;
		font-size: 11px;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 5px;
	}

	.menu-tag {
		font-size: 12px;
		color: #999;
		font-weight: 500;
	}

	.item-divider {
		height: 1px;
		background: #f5f5f5;
		margin-left: 54px;
	}

	/* ── 资料编辑面板 ── */
	.edit-overlay {
		position: fixed;
		inset: 0;
		z-index: 200;
		background: rgba(0, 0, 0, 0.4);
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
	}

	.edit-panel {
		background: #fff;
		border-radius: 24px 24px 0 0;
		padding: 20px 20px;
		padding-bottom: calc(20px + env(safe-area-inset-bottom));
		animation: edit-slide-up 0.25s ease-out;
	}

	@keyframes edit-slide-up {
		from { transform: translateY(100%); }
		to { transform: translateY(0); }
	}

	.edit-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 20px;
	}

	.edit-title {
		font-size: 18px;
		font-weight: 800;
		color: #28123E;
	}

	.edit-close {
		font-size: 18px;
		color: #999;
		padding: 4px 8px;
		line-height: 1;
	}

	.edit-body {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 20px;
		margin-bottom: 20px;
	}

	.edit-avatar-btn {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		padding: 0;
		margin: 0;
		border: 2px dashed $primaryColor;
		background: #f0fdf9;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.edit-avatar-btn::after {
		border: none;
	}

	.edit-avatar-img {
		width: 80px;
		height: 80px;
		border-radius: 50%;
	}

	.edit-avatar-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}

	.edit-avatar-text {
		font-size: 11px;
		color: $primaryColor;
	}

	.edit-field {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.edit-label {
		font-size: 14px;
		font-weight: 600;
		color: #28123E;
	}

	.edit-input {
		width: 100%;
		height: 44px;
		padding: 0 12px;
		border: 1px solid #e5e5e5;
		border-radius: 12px;
		font-size: 15px;
		color: #28123E;
		background: #fafafa;
	}

	.edit-footer {
		display: flex;
		justify-content: center;
	}

	.edit-save-btn {
		width: 100%;
		height: 48px;
		line-height: 48px;
		background: linear-gradient(135deg, $primaryColor, $primaryLight);
		color: #fff;
		font-size: 16px;
		font-weight: 700;
		border-radius: 12px;
		border: none;
	}

	.edit-save-btn::after {
		border: none;
	}

	/* 头像提示 */
	.avatar-hint {
		position: absolute;
		bottom: -18px;
		left: 50%;
		transform: translateX(-50%);
		font-size: 10px;
		color: rgba(255,255,255,0.9);
		white-space: nowrap;
		background: rgba(0,0,0,0.3);
		padding: 2px 8px;
		border-radius: 8px;
	}
</style>