<script>
	import { api } from './services/api.js';

	export default {
		onLaunch: function() {
			console.log('App Launch')
			const token = uni.getStorageSync('token')
			if (!token) {
				console.log('未登录，需要登录')
			}
		},
		onShow: function() {
			console.log('App Show')
			// 从后台回到前台时，若存在租赁中状态，立即补报一次位置
			this.reportLocationIfLeasing();
		},
		onHide: function() {
			console.log('App Hide')
		},
		methods: {
			reportLocationIfLeasing() {
				const leaseInfo = uni.getStorageSync('leaseInfo');
				if (!leaseInfo || !leaseInfo.deviceSn) return;
				uni.getLocation({
					type: 'gcj02',
					success: async (res) => {
						try {
							await api.reportTrajectory({
								deviceSn: leaseInfo.deviceSn,
								longitude: res.longitude,
								latitude: res.latitude,
								batteryLevel: 80,
								signalStrength: 4,
								deviceStatus: 1,
							});
							console.log('[App] 后台恢复定位上报成功');
						} catch (e) {
							console.warn('[App] 后台恢复定位上报失败:', e.message);
						}
					},
					fail: () => {
						console.warn('[App] 后台恢复定位获取失败');
					},
				});
			},
		},
	}
</script>

<style>
	/*每个页面公共css */
</style>
