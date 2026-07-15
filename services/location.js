import { api } from './api.js';

// 上一次上报的坐标（模块级闭包，全局单例）
let lastReportedLocation = null;

/**
 * 上报设备轨迹（带坐标去重）
 * @param {string} deviceSn 设备序列号
 * @returns {Promise<{success: boolean, skipped?: boolean, error?: string}>}
 */
export async function reportLocation(deviceSn) {
	if (!deviceSn) {
		console.warn('[Location] 缺少 deviceSn，跳过上报');
		return { success: false, error: '缺少 deviceSn' };
	}

	return new Promise((resolve) => {
		uni.getLocation({
			type: 'gcj02',
			success: async (res) => {
				const lat = parseFloat(res.latitude.toFixed(6));
				const lng = parseFloat(res.longitude.toFixed(6));

				// 去重：与上一次坐标相同则跳过
				if (lastReportedLocation && lastReportedLocation.lat === lat && lastReportedLocation.lng === lng) {
					console.log('[Location] 坐标未变动，跳过上报');
					resolve({ success: true, skipped: true, latitude: lat, longitude: lng });
					return;
				}

				lastReportedLocation = { lat, lng };

				try {
					await api.reportTrajectory({
						deviceSn,
						longitude: lng,
						latitude: lat,
						batteryLevel: 80,
						signalStrength: 4,
						deviceStatus: 1,
					});
					console.log('[Location] 轨迹上报成功');
					resolve({ success: true, latitude: lat, longitude: lng });
				} catch (e) {
					console.warn('[Location] 轨迹上报失败:', e.message);
					resolve({ success: false, error: e.message });
				}
			},
			fail: (err) => {
				console.warn('[Location] 获取定位失败:', err.errMsg || err.message);
				resolve({ success: false, error: err.errMsg || '获取定位失败' });
			},
		});
	});
}

/**
 * 重置去重状态（如设备切换、订单结束后调用）
 */
export function resetLocationDedup() {
	lastReportedLocation = null;
	console.log('[Location] 去重状态已重置');
}
