<template>
	<view class="top-device-bar">
		<view class="bar-inner">
			<view class="back-btn" @click="onBack">
				<text class="back-icon">‹</text>
			</view>
			<text class="device-name">{{ props.deviceName }}</text>
			<view class="right-area">
				<view class="battery-wrap">
					<text class="battery-icon">⚡</text>
					<text class="battery-text">{{ props.battery }}%</text>
				</view>
				<view
					v-if="props.onDebugTap"
					class="debug-hotspot"
					@click="props.onDebugTap"
				></view>
			</view>
		</view>
	</view>
</template>

<script setup>
const props = defineProps({
	deviceName: { type: String, default: 'WZ_EXO_S3' },
	battery: { type: Number, default: 0 },
	onBack: { type: Function, default: () => {} },
	onDebugTap: { type: Function, default: null },
});
</script>

<style scoped>
.top-device-bar {
	height: 44px;
	padding: 0 18px;
	background: rgba(252, 253, 255, 0.85);
	backdrop-filter: blur(12px);
	-webkit-backdrop-filter: blur(12px);
}

.bar-inner {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 100%;
	position: relative;
}

.back-btn {
	width: 36px;
	height: 36px;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.62);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 2;
}

.back-btn:active {
	opacity: 0.7;
}

.back-icon {
	font-size: 20px;
	color: #333;
}

.device-name {
	position: absolute;
	left: 50%;
	transform: translateX(-50%);
	font-size: 19px;
	font-weight: 900;
	color: #333;
	max-width: 200px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.right-area {
	display: flex;
	align-items: center;
	gap: 4px;
	position: relative;
	z-index: 2;
}

.battery-wrap {
	display: flex;
	align-items: center;
	gap: 4px;
}

.battery-icon {
	font-size: 16px;
	color: #999;
}

.battery-text {
	font-size: 12px;
	font-weight: 700;
	color: #999;
}

.debug-hotspot {
	width: 72px;
	height: 44px;
	position: absolute;
	right: 0;
	top: 0;
}
</style>
