<template>
	<GlassPanel padding="14px 16px 18px 18px" :radius="24" :accent="cardColor">
		<view class="status-card">
			<text class="status-label" :style="{ color: cardColor }">当前状态</text>
			<view class="status-row">
				<view class="status-icon-wrap">
					<view
						class="status-icon"
						:style="{ color: cardColor }"
						:class="{ blink: hasFault }"
					>
						<text v-if="hasFault">⚠</text>
						<text v-else-if="isStopping">⏸</text>
						<text v-else-if="enabled">▶</text>
						<text v-else>○</text>
					</view>
				</view>
				<view class="status-text">
					<text class="status-title">{{ title }}</text>
					<text class="status-detail">{{ detail }}</text>
				</view>
				<view class="action-btn-wrap">
					<view
						v-if="hasFault && onClearFault"
						class="action-btn"
						:style="{ background: 'rgba(255,92,122,0.12)', color: '#FF5C7A' }"
						@click="onClearFault"
					>
						<text class="action-icon">✕</text>
					</view>
					<view
						v-else-if="enabled"
						class="action-btn"
						:style="{ background: 'rgba(255,92,122,0.12)', color: '#FF5C7A' }"
						@click="onEmergencyStop"
					>
						<text class="action-icon">⚠</text>
					</view>
					<view
						v-else-if="!isStopping && onCalibrate"
						class="action-btn"
						:style="{ background: 'rgba(116,106,242,0.12)', color: '#746AF2' }"
						@click="onCalibrate"
					>
						<text class="action-icon">⟳</text>
					</view>
					<view v-else class="action-placeholder"></view>
				</view>
			</view>
		</view>
	</GlassPanel>
</template>

<script setup>
import { computed } from 'vue';
import GlassPanel from './GlassPanel.vue';

const props = defineProps({
	enabled: { type: Boolean, default: false },
	isStopping: { type: Boolean, default: false },
	status: { type: Object, default: () => ({ mode: 'transparent', errorCode: 0 }) },
	accent: { type: String, default: '#6120A8' },
	walkSpeedKmh: { type: Number, default: 0 },
	commandLoading: { type: Set, default: () => new Set() },
	onEmergencyStop: { type: Function, default: () => {} },
	onClearFault: { type: Function, default: null },
	onCalibrate: { type: Function, default: null },
});

const hasFault = computed(() => props.status.errorCode !== 0);

const modeLabelMap = {
	transparent: '透明模式',
	assist: '助力模式',
	training: '训练模式',
};

const title = computed(() => {
	if (hasFault.value) return '运行异常';
	if (props.isStopping) return '停止中';
	const modeName = modeLabelMap[props.status.mode] || '透明模式';
	if (props.enabled) return `${modeName}已运行`;
	return `${modeName}待机中`;
});

const detail = computed(() => {
	if (hasFault.value) {
		return props.status.errorMessage || '请检查设备状态';
	}
	if (props.isStopping) return '正在平滑降功率...';
	return props.enabled ? `${props.walkSpeedKmh.toFixed(1)} km/h` : '等待启动指令';
});

const cardColor = computed(() => {
	if (hasFault.value) return '#FF5C7A';
	if (props.isStopping) return '#FFA726';
	return props.accent;
});
</script>

<style scoped>
.status-card {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.status-label {
	font-size: 13px;
	font-weight: 900;
}

.status-row {
	display: flex;
	align-items: center;
	gap: 16px;
}

.status-icon-wrap {
	flex-shrink: 0;
}

.status-icon {
	font-size: 40px;
	line-height: 1;
}

.status-icon.blink {
	animation: blink 600ms ease-in-out infinite alternate;
}

@keyframes blink {
	0% { opacity: 1; }
	100% { opacity: 0.15; }
}

.status-text {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 6px;
	min-width: 0;
}

.status-title {
	font-size: 20px;
	font-weight: 900;
	color: #333;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.status-detail {
	font-size: 13px;
	font-weight: 800;
	color: #999;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.action-btn-wrap {
	flex-shrink: 0;
}

.action-btn {
	width: 52px;
	height: 52px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: opacity 0.2s;
}

.action-btn:active {
	opacity: 0.7;
}

.action-icon {
	font-size: 28px;
}

.action-placeholder {
	width: 52px;
	height: 52px;
}
</style>
