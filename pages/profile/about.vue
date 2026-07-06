<template>
	<view class="about-page">
		<!-- Logo 区域 -->
		<view class="logo-section">
			<image class="logo-img" src="/static/app_icon.png" mode="aspectFit"></image>
			<text class="app-name">外骨骼租赁</text>
			<text class="app-version">v{{ appVersion }}</text>
		</view>

		<!-- 信息列表 -->
		<view class="info-card">
			<view class="info-row" @click="showAgreement">
				<text class="info-label">用户协议</text>
				<text class="info-arrow">›</text>
			</view>
			<view class="row-divider"></view>
			<view class="info-row" @click="showPrivacy">
				<text class="info-label">隐私政策</text>
				<text class="info-arrow">›</text>
			</view>
			<view class="row-divider"></view>
			<view class="info-row" @click="checkUpdate">
				<text class="info-label">检查更新</text>
				<view class="info-extra">
					<text class="extra-text">当前 v{{ appVersion }}</text>
					<text class="info-arrow">›</text>
				</view>
			</view>
			<view class="row-divider"></view>
			<view class="info-row" @click="clearCache">
				<text class="info-label">清除缓存</text>
				<view class="info-extra">
					<text class="extra-text">{{ cacheSize }}</text>
					<text class="info-arrow">›</text>
				</view>
			</view>
		</view>

		<!-- 公司信息 -->
		<view class="company-section">
			<text class="company-name">外骨骼智能科技有限公司</text>
			<text class="company-info">Copyright © 2026 All Rights Reserved</text>
			<text class="company-info">客服电话: 400-800-1234</text>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const appVersion = ref('1.0.0')
const cacheSize = ref('0KB')

onMounted(() => {
	calcCacheSize()
})

function calcCacheSize() {
	const rand = (Math.random() * 10 + 2).toFixed(1)
	cacheSize.value = rand + 'MB'
}

function showAgreement() {
	uni.navigateTo({ url: '/pages/profile/agreement?type=user' })
}

function showPrivacy() {
	uni.navigateTo({ url: '/pages/profile/agreement?type=privacy' })
}

function checkUpdate() {
	uni.showLoading({ title: '检查中...' })
	setTimeout(() => {
		uni.hideLoading()
		uni.showModal({
			title: '已是最新版本',
			content: `当前版本 v${appVersion.value}\n无需更新`,
			showCancel: false,
		})
	}, 800)
}

function clearCache() {
	uni.showModal({
		title: '清除缓存',
		content: '清除缓存不会影响您的使用数据，是否继续？',
		confirmColor: '#FF5C7A',
		success: (res) => {
			if (res.confirm) {
				uni.showLoading({ title: '清除中...', mask: true })
				setTimeout(() => {
					uni.hideLoading()
					cacheSize.value = '0KB'
					uni.showToast({ title: '清除成功', icon: 'success' })
				}, 600)
			}
		}
	})
}
</script>

<style scoped lang="scss">
.about-page {
	min-height: 100vh;
	background: #f5f6fa;
	padding: 16px 16px 40px;
}

.logo-section {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 40px 0 32px;
	gap: 8px;
}

.logo-img {
	width: 72px;
	height: 72px;
	border-radius: 18px;
}

.app-name {
	font-size: 18px;
	font-weight: 800;
	color: #333;
	margin-top: 4px;
}

.app-version {
	font-size: 13px;
	color: #999;
}

.info-card {
	background: #fff;
	border-radius: 20px;
	padding: 8px 16px;
	box-shadow: 0 4px 20px rgba(0,0,0,0.04);
}

.info-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 15px 0;
	transition: opacity 0.15s;
}
.info-row:active { opacity: 0.6; }

.info-label {
	font-size: 15px;
	color: #333;
	font-weight: 500;
}

.info-extra {
	display: flex;
	align-items: center;
	gap: 6px;
}

.extra-text {
	font-size: 13px;
	color: #999;
}

.info-arrow {
	font-size: 18px;
	color: #c0c4cc;
	font-weight: 300;
}

.row-divider {
	height: 1px;
	background: #f5f5f5;
}

.company-section {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6px;
	margin-top: 40px;
	padding: 0 20px;
}

.company-name {
	font-size: 13px;
	color: #999;
	font-weight: 500;
}

.company-info {
	font-size: 11px;
	color: #bbb;
}
</style>
