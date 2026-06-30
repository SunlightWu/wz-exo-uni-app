<template>
	<view class="my-page">
		<view class="page-padding">
			<!-- 统一的个人信息面板 -->
			<view class="profile-panel">
				<!-- 用户信息 / 登录入口 -->
				<!-- 已登录 -->
				<view v-if="isLoggedIn" class="user-row" @click="goTo('/pages/profile/settings')">
					<view class="avatar-wrap">
						<u-avatar
							:text="avatarChar"
							size="56"
							fontSize="22"
							bgColor="#D8CCFF"
						></u-avatar>
					</view>
					<view class="user-info">
						<text class="user-name">{{ userInfo.nickname || '微信用户' }}</text>
						<text class="user-stats">累计使用 {{ totalSessions }} 次 · {{ totalHours }} 小时</text>
					</view>
					<text class="user-arrow">›</text>
				</view>
				<!-- 未登录 - 微信授权入口 -->
				<view v-else class="user-row" @click="doLogin">
					<view class="avatar-wrap">
						<u-avatar text="?"
							size="56"
							fontSize="28"
							bgColor="#E6D3F8"
						></u-avatar>
					</view>
					<view class="user-info">
						<text class="user-name">点击授权微信信息</text>
						<text class="user-stats">获取头像和昵称，体验完整功能</text>
					</view>
					<text class="user-arrow">›</text>
				</view>

				<!-- 分割线 -->
				<view class="panel-divider"></view>

				<!-- 菜单列表 -->
				<view class="menu-list">
					<view class="menu-item" @click="goTo('/pages/profile/settings')">
						<text class="menu-label">身体参数</text>
						<text class="menu-arrow">›</text>
					</view>
					<view class="menu-item" @click="showPayment">
						<view class="menu-label-group">
							<text class="menu-label">支付方式</text>
							<text class="menu-sub">微信支付分 {{ creditScore }}</text>
						</view>
						<text class="menu-arrow">›</text>
					</view>
					<view class="menu-item" @click="showUsage">
						<text class="menu-label">使用须知</text>
						<text class="menu-arrow">›</text>
					</view>
					<view class="menu-item" @click="callService">
						<text class="menu-label">联系客服</text>
						<text class="menu-arrow">›</text>
					</view>
					<view class="menu-item menu-item-last" @click="showAbout">
						<view class="menu-label-group">
							<text class="menu-label">关于</text>
							<text class="menu-sub">v1.0.0</text>
						</view>
						<text class="menu-arrow">›</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { getUserInfo, wxLogin, isLoggedIn as checkLogin } from '../../services/auth.js';

const isLoggedIn = ref(checkLogin())
const userInfo = ref(getUserInfo() || { nickname: '体验用户' })
const loginLoading = ref(false)
const totalSessions = ref(12)
const totalHours = ref('8.4')
const creditScore = ref(680)

const avatarChar = computed(() => {
	return (userInfo.value.nickname || '微')[0]
})

onMounted(() => {
	// 从 storage 同步最新用户信息
	userInfo.value = getUserInfo()
	isLoggedIn.value = checkLogin()
})

async function doLogin() {
	if (loginLoading.value) return
	loginLoading.value = true
	try {
		uni.showLoading({ title: '正在获取微信信息...', mask: true })
		const result = await wxLogin()
		userInfo.value = result.user
		isLoggedIn.value = true
		uni.hideLoading()
		uni.showToast({ title: '登录成功', icon: 'success' })
	} catch (e) {
		uni.hideLoading()
		uni.showToast({ title: '登录失败，请重试', icon: 'none' })
	} finally {
		loginLoading.value = false
	}
}

function goTo(path) {
	uni.navigateTo({ url: path })
}
function showPayment() {
	uni.showToast({ title: `微信支付分: ${creditScore.value}`, icon: 'none' })
}
function showUsage() {
	uni.showModal({
		title: '使用须知',
		content: '1. 使用前请确认设备完好\n2. 如感不适请立即停止\n3. 设备仅限单人使用\n4. 使用结束后请按流程关机',
		showCancel: false,
	})
}
function callService() {
	uni.makePhoneCall({
		phoneNumber: '400-800-1234',
		fail: () => uni.showToast({ title: '客服: 400-800-1234', icon: 'none' }),
	})
}
function showAbout() {
	uni.showModal({
		title: '关于',
		content: '外骨骼租赁小程序 v1.0.0\n\n本小程序用于外骨骼设备的扫码租赁、实时控制和运动数据查看。',
		showCancel: false,
	})
}
</script>

<style scoped lang="scss">
.my-page { @include page-base; padding: 20px 0 40px; }
.page-padding { padding: 0 18px; }

.profile-panel { @include card-base; }
.user-row {
  @include flex-row(16px); padding: 18px 18px 16px;
  @include tap-active;
}
.user-info { flex: 1; }
.user-name { @include text-title; display: block; }
.user-stats { @include text-caption; margin-top: 5px; display: block; }
.user-arrow { font-size: 22px; color: $textSubColor; font-weight: 300; }

.panel-divider { @include divider(0 18px); }

.menu-list { padding: 4px 0; }
.menu-item {
  @include flex-row(12px); padding: 14px 18px;
  @include tap-active;
  &:last-child { border-bottom: none; }
}
.menu-label { flex: 1; font-size: 15px; font-weight: 600; color: $textMainColor; }
.menu-label-group { flex: 1; }
.menu-sub { @include text-caption; margin-top: 2px; display: block; }
.menu-arrow { font-size: 20px; color: $borderColor; font-weight: 300; }
</style>

