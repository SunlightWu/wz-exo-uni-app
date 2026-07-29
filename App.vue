<script>
	import { api, setOnTokenExpired } from './services/api.js';
	import { forceShowPhoneAuth } from './composables/usePhoneAuth.js';

	// 免登录白名单页面路径
	const NO_LOGIN_PAGES = [
		'pages/index/index',
		'pages/profile/my',
		'pages/profile/about',
		'pages/profile/agreement',
		'pages/agreement/lease',
		'pages/cabinet/list',
		'pages/cabinet/detail',
	];

	export default {
		onLaunch: function() {
			console.log('App Launch')

			// 注册全局 token 失效回调
			// 当 api.js 检测到 401 或 40103 时，自动弹出手机号授权层
			setOnTokenExpired(() => {
				console.log('[App] Token 失效，弹出手机号授权层');
				// 清除本地登录态
				uni.removeStorageSync('token');
				uni.removeStorageSync('refreshToken');
				uni.removeStorageSync('phoneBound');
				// 跳回首页，首页 onMounted 检测到无 token 会自动弹出授权层
				const pages = getCurrentPages();
				const currentRoute = pages[pages.length - 1]?.route || '';
				if (currentRoute !== 'pages/index/index') {
					// 延迟跳转，让用户看到提示
					uni.showToast({ title: '登录已失效，请重新登录', icon: 'none', duration: 1500 });
					setTimeout(() => {
						uni.reLaunch({ url: '/pages/index/index' });
					}, 1500);
				} else {
					// 已在首页，直接弹出
					forceShowPhoneAuth();
				}
			});

			// 延迟注册路由拦截器，确保 uni 对象已初始化（微信小程序分包兼容）
			setTimeout(() => {
				if (typeof uni === 'undefined' || !uni.addInterceptor) return;
				// 全局路由守卫：拦截 navigateTo / switchTab / redirectTo
				['navigateTo', 'switchTab', 'redirectTo', 'reLaunch'].forEach(type => {
					uni.addInterceptor(type, {
						invoke(e) {
							const url = e.url || '';
							// 提取页面路径（去掉参数）
							const path = url.split('?')[0].replace(/^\//, '');
							// 检查是否在白名单中
							const isPublic = NO_LOGIN_PAGES.some(p => path === p || path.startsWith(p));
							if (isPublic) return; // 白名单放行

							// 检查登录态
							const token = uni.getStorageSync('token');
							if (!token) {
								// 跳转到首页，并提示
								uni.showToast({ title: '请先登录', icon: 'none', duration: 1500 });
								// 阻止原跳转，重定向到首页
								const tabBarPages = ['pages/index/index', 'pages/history/list', 'pages/profile/my'];
								if (tabBarPages.includes(path)) return; // tabBar 页面放行
								// 修改跳转目标
								e.url = '/pages/index/index';
							}
						},
					});
				});
			}, 0);
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