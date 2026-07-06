<template>
	<view class="settings-page">
		<!-- 说明 -->
		<view class="desc-card">
			<text class="desc-text">参数用于优化设备助力算法，提供更贴合个人的使用体验</text>
		</view>

		<!-- 参数表单 -->
		<view class="form-card">
			<view class="form-item">
				<text class="form-label">身高</text>
				<view class="form-input-wrap">
					<input
						class="form-input"
						type="digit"
						v-model="form.height"
						placeholder="170"
						placeholder-class="input-placeholder"
					/>
					<text class="form-unit">cm</text>
				</view>
			</view>
			<view class="form-divider"></view>
			<view class="form-item">
				<text class="form-label">体重</text>
				<view class="form-input-wrap">
					<input
						class="form-input"
						type="digit"
						v-model="form.weight"
						placeholder="70"
						placeholder-class="input-placeholder"
					/>
					<text class="form-unit">kg</text>
				</view>
			</view>
			<view class="form-divider"></view>
			<view class="form-item">
				<text class="form-label">性别</text>
				<view class="gender-selector">
					<view
						class="gender-tag"
						:class="{ active: form.gender === 'male' }"
						@click="form.gender = 'male'"
					>
						<text class="gender-text">男</text>
					</view>
					<view
						class="gender-tag"
						:class="{ active: form.gender === 'female' }"
						@click="form.gender = 'female'"
					>
						<text class="gender-text">女</text>
					</view>
				</view>
			</view>
			<view class="form-divider"></view>
			<view class="form-item">
				<text class="form-label">出生年份</text>
				<view class="form-input-wrap">
					<input
						class="form-input"
						type="number"
						v-model="form.birthYear"
						placeholder="1990"
						placeholder-class="input-placeholder"
					/>
				</view>
			</view>
		</view>

		<!-- 隐私声明 -->
		<view class="privacy-note">
			<text class="privacy-text">身体参数仅用于设备配置，不会上传至服务器。</text>
		</view>

		<!-- 保存按钮 -->
		<view class="save-section">
			<view class="save-btn" @click="onSave">
				<text class="save-btn-text">保存</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { reactive, onMounted } from 'vue';
import { api } from '../../services/api.js';

const form = reactive({
	height: 170,
	weight: 70,
	gender: 'male',
	birthYear: 1990,
})

onMounted(() => {
	// 加载已保存的参数
	const saved = uni.getStorageSync('userProfile')
	if (saved) {
		Object.assign(form, saved)
	}
})

function onSave() {
	const age = new Date().getFullYear() - parseInt(form.birthYear || 1990)
	const profile = {
		height: parseInt(form.height) || 170,
		weight: parseInt(form.weight) || 70,
		gender: form.gender,
		age: Math.max(1, age),
	}

	// 保存到本地
	uni.setStorageSync('userProfile', profile)

	// 尝试上传服务端（当前后端暂无此接口）
	// api.updateXcxProfile(profile).catch(() => {})

	uni.showToast({ title: '保存成功', icon: 'success' })
	setTimeout(() => {
		uni.navigateBack()
	}, 1000)
}
</script>

<style scoped lang="scss">
.settings-page {
	min-height: 100vh;
	background: #f5f6fa;
	padding: 16px 0 40px;
}

.desc-card {
	margin: 0 16px 16px;
	background: rgba(139, 92, 246, 0.08);
	border-radius: 16px;
	padding: 14px 16px;
}

.desc-text {
	font-size: 13px;
	color: #666;
	line-height: 1.6;
}

/* 表单卡片 */
.form-card {
	margin: 0 16px;
	background: #fff;
	border-radius: 20px;
	padding: 8px 20px;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}

.form-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 0;
}

.form-label {
	font-size: 15px;
	font-weight: 600;
	color: #333;
	flex-shrink: 0;
	width: 80px;
}

.form-input-wrap {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 4px;
}

.form-input {
	font-size: 15px;
	font-weight: 500;
	color: #333;
	text-align: right;
	flex: 1;
}

.form-unit {
	font-size: 13px;
	color: #999;
	font-weight: 500;
	flex-shrink: 0;
}

.form-divider {
	height: 1px;
	background: #f0f0f0;
}

.input-placeholder {
	color: #ccc;
}

/* 性别选择 */
.gender-selector {
	display: flex;
	align-items: center;
	gap: 10px;
}

.gender-tag {
	padding: 6px 20px;
	border-radius: 20px;
	background: #f5f6fa;
	border: 1.5px solid transparent;
	transition: all 0.2s;
}

.gender-tag.active {
	background: rgba(139, 92, 246, 0.12);
	border-color: $primaryColor;
}

.gender-text {
	font-size: 14px;
	font-weight: 600;
	color: #999;
}

.gender-tag.active .gender-text {
	color: $primaryColor;
}

/* 隐私声明 */
.privacy-note {
	padding: 24px 20px 0;
	text-align: center;
}

.privacy-text {
	font-size: 12px;
	color: #999;
	line-height: 1.5;
}

/* 保存按钮 */
.save-section {
	margin: 24px 16px 0;
}

.save-btn {
	background: $primaryColor;
	border-radius: 28px;
	padding: 15px 0;
	text-align: center;
	transition: opacity 0.15s;
}

.save-btn:active {
	opacity: 0.8;
}

.save-btn-text {
	font-size: 16px;
	font-weight: 700;
	color: #fff;
}
</style>
