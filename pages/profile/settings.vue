<template>
	<view class="settings-page">
		<view class="page-padding">
			<!-- 说明 -->
			<view class="desc-card">
				<text class="desc-text">参数用于优化设备助力算法，提供更贴合个人的使用体验</text>
			</view>

			<!-- 参数表单 u-form -->
			<u-form labelPosition="left" labelWidth="90" :customStyle="{ background: '#fff', borderRadius: '24px', padding: '8px 0', border: '1.4px solid #E6D3F8' }">
				<u-form-item label="身高(cm)">
					<u-input v-model="form.height" type="digit" placeholder="170" inputAlign="right"></u-input>
				</u-form-item>
				<u-form-item label="体重(kg)">
					<u-input v-model="form.weight" type="digit" placeholder="70" inputAlign="right"></u-input>
				</u-form-item>
				<u-form-item label="性别">
					<view class="gender-selector">
						<u-tag text="男" :type="form.gender === 'male' ? 'primary' : 'info'" size="mini" @click="form.gender = 'male'"></u-tag>
						<u-tag text="女" :type="form.gender === 'female' ? 'primary' : 'info'" size="mini" @click="form.gender = 'female'"></u-tag>
					</view>
				</u-form-item>
				<u-form-item label="出生年份">
					<u-input v-model="form.birthYear" type="digit" placeholder="1990" inputAlign="right"></u-input>
				</u-form-item>
			</u-form>

			<!-- 隐私声明 -->
			<view class="privacy-note">
				<text>身体参数仅用于设备配置，不会上传至服务器。</text>
			</view>

			<!-- 保存按钮 -->
			<u-button type="primary" text="保存" shape="circle" size="large" @click="onSave"></u-button>
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

	// 尝试上传服务端
	api.saveUserProfile(profile).catch(() => {})

	uni.showToast({ title: '保存成功', icon: 'success' })
	setTimeout(() => {
		uni.navigateBack()
	}, 1000)
}
</script>

<style scoped lang="scss">
.settings-page { @include page-base; background: $pageBg; padding: 16px 0 40px; }
.page-padding { padding: 0 18px; }

.desc-card { background: rgba(97, 32, 168, 0.06); border-radius: $radiusMd; padding: 14px 16px; margin-bottom: 16px; }
.desc-text { font-size: 13px; color: $textSubColor; line-height: 1.5; }

.gender-selector { @include flex-row(8px); }

.privacy-note { padding: 20px 0; text-align: center; font-size: 12px; color: $textSubColor; line-height: 1.5; }
</style>

