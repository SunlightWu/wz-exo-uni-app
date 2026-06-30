<script>
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
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>