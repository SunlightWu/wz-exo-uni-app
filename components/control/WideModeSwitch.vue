<template>
	<view
		class="wide-mode-switch"
		:class="{ enabled: props.enabled, blocked: props.blocked }"
		:style="switchStyle"
		@click="onTap"
	>
		<view class="switch-knob" :style="knobStyle">
			<view v-if="props.isLoading" class="knob-loading">
				<view class="spinner" :style="{ borderColor: props.accent }"></view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
	enabled: { type: Boolean, default: false },
	isStopping: { type: Boolean, default: false },
	isLoading: { type: Boolean, default: false },
	accent: { type: String, default: '#6120A8' },
});

const emit = defineEmits(['change']);

const blocked = computed(() => props.isStopping || props.isLoading);

const switchStyle = computed(() => ({
	backgroundColor: props.enabled ? props.accent : 'rgba(255,255,255,0.86)',
	boxShadow: props.enabled ? `0 4px 14px ${props.accent}59` : 'none',
}));

const knobStyle = computed(() => ({
	transform: props.enabled ? 'translateX(60px)' : 'translateX(0)',
}));

function onTap() {
	if (blocked.value) return;
	emit('change', !props.enabled);
}
</script>

<style scoped>
.wide-mode-switch {
	width: 100px;
	height: 40px;
	border-radius: 20px;
	position: relative;
	padding: 4px;
	transition: background-color 260ms cubic-bezier(0.215, 0.61, 0.355, 1),
		box-shadow 260ms cubic-bezier(0.215, 0.61, 0.355, 1);
}

.wide-mode-switch.blocked {
	opacity: 0.7;
}

.switch-knob {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	background: #fff;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
	transition: transform 280ms cubic-bezier(0.34, 1.2, 0.64, 1);
	display: flex;
	align-items: center;
	justify-content: center;
}

.knob-loading {
	width: 100%;
	height: 100%;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.65);
	display: flex;
	align-items: center;
	justify-content: center;
}

.spinner {
	width: 16px;
	height: 16px;
	border: 2px solid transparent;
	border-top-color: currentColor;
	border-radius: 50%;
	animation: spin 0.8s linear infinite;
}

@keyframes spin {
	0% { transform: rotate(0deg); }
	100% { transform: rotate(360deg); }
}
</style>
