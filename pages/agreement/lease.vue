<template>
	<view class="lease-agreement-page">
		<scroll-view class="agreement-scroll" scroll-y enhanced :show-scrollbar="false">
			<text class="agreement-title">外骨骼共享设备租赁服务协议</text>
			<text class="agreement-date">更新日期：2026年07月08日</text>

			<view class="agreement-content">
				<text class="section-text">甲方（出租方/设备所有权人）：________________________</text>
				<text class="section-text">乙方（承租方/用户）：完成实名认证、自主扫码租赁的自然人</text>
				<text class="section-text" style="margin-top: 12px;">为规范外骨骼助力设备共享租赁服务，明确双方权利义务，甲方作为外骨骼设备合法所有权人，依法提供自助扫码租赁服务。乙方自愿申请租赁甲方设备，自愿接受本协议全部条款，乙方点击"同意并下单"、扫码开机、取走设备即视为本协议生效。甲乙双方本着自愿、真实、合法的原则，达成如下协议，双方共同严格遵守。</text>

				<text class="section-title">第一条 租赁标的物及订单效力</text>
				<text class="section-text">1. 租赁标的物为甲方所有的外骨骼助力机器人设备（含主机、电池、绑带、传感器、柜体配件及全部附属配件，以设备SN编号、平台订单记录为准）。</text>
				<text class="section-text">2. 乙方在租赁页面生成的电子订单、设备记录、计费记录、后台操作日志，均为本协议有效组成部分，与本协议具有同等法律效力。</text>
				<text class="section-text">3. 若订单信息与本协议条款存在差异，以甲方平台后台订单公示内容为准。</text>

				<text class="section-title">第二条 设备交付、验收与风险责任划分</text>
				<text class="section-text">1. 本租赁为用户自助核验、自助借还模式。乙方扫码开机、成功取走设备，即视为：乙方已现场完整查验设备外观、功能、电量、配件齐全，确认设备完好无故障、无破损、可正常使用，甲方完成全部交付义务。</text>
				<text class="section-text">2. 设备交付后至甲方系统核验归还完成前，设备的全部保管风险、使用风险、损毁风险、丢失风险、被盗风险全部由乙方全权承担。</text>
				<text class="section-text">3. 甲方仅保证设备出厂符合质量标准、日常例行维保。因乙方违规操作、不当穿戴、摔倒、磕碰、进水、暴晒、私自拆卸、超场景使用、攀爬、陡坡、湿滑路面使用等人为原因造成的设备损坏、人身损伤、第三方财产损失，全部由乙方自行承担，甲方不承担任何赔偿责任。</text>
				<text class="section-text">4. 租赁期间设备发生非甲方质量问题的故障、损坏、缺失，一律认定为乙方保管及使用不当，由乙方承担全额赔付责任。</text>

				<text class="section-title">第三条 计费规则、租金、押金及支付约定</text>
				<text class="section-text">1. 租金标准、计费时长、单日封顶价格、免押规则、预授权规则均以甲方小程序实时公示及订单页面为准。</text>
				<text class="section-text">2. 计费起算点：扫码开柜/开机成功即刻起算租金；计费终止点：设备归还入柜、系统核验成功为止。</text>
				<text class="section-text">3. 乙方同意甲方及合作支付平台可根据订单规则，自动进行预授权冻结、租金结算、逾期扣款、维修费扣款、丢失买断扣款。乙方承诺保证支付账户状态正常、余额充足，不得恶意拒付、逃单。</text>
				<text class="section-text">4. 免押服务仅为甲方赠与性风控权益，甲方有权根据用户信用情况、租赁行为，随时取消免押资格、要求乙方缴纳押金，乙方不得异议。</text>
				<text class="section-text">5. 租赁产生的全部税费、平台服务费、运维成本均包含在租金体系内，乙方无任何理由要求减免、抵扣、退费。</text>

				<text class="section-title">第四条 设备归还规范与逾期责任</text>
				<text class="section-text">1. 乙方需在订单租期届满前，将设备及全部配件完好归还至甲方指定点位、指定机柜，完成系统核验。</text>
				<text class="section-text">2. 归还标准：设备无进水、无开裂、无断裂、无变形、无私自改装、无配件缺失、无严重污渍及人为损伤；正常轻微使用磨损除外。</text>
				<text class="section-text">3. 逾期未归还责任：租期届满未归还的，系统自动持续计收续租租金，直至设备成功归还或赔付完结，同时乙方需承担逾期违约金（按当日租金50%/日计算）。</text>
				<text class="section-text">4. 乙方归还设备不合格、配件缺失、人为损坏的，甲方有权拒绝完成归还核验、持续计费，同时有权向乙方收取维修费用、配件重置费用。</text>

				<text class="section-title">第五条 设备损毁、丢失、无法归还的赔付规则</text>
				<text class="section-text">1. 发生以下情形之一，视为乙方设备灭失、无法归还，乙方需全额承担设备买断赔偿款（买断价格以甲方平台公示的设备重置总价为准）：</text>
				<text class="section-text">（1）设备遗失、被盗、丢失、遗弃；</text>
				<text class="section-text">（2）设备进水、重度摔损、结构断裂、主板烧毁，无法修复或修复成本接近新机价值；</text>
				<text class="section-text">（3）乙方私自拆解、改装、更换配件、刷机破解设备系统；</text>
				<text class="section-text">（4）逾期超过72小时未归还且无合理说明、未主动联系甲方报备。</text>
				<text class="section-text">2. 甲方有权根据设备实际损坏情况，单方核定维修费用、配件费用、重置费用，乙方无条件认可甲方核验结果，不得无理抗辩。</text>
				<text class="section-text">3. 乙方完成赔付、买断扣款后，不免除其逾期违约责任，甲方仍可追讨逾期租金及违约金。</text>

				<text class="section-title">第六条 双方权利与义务</text>
				<text class="sub-section-title">一、甲方权利义务</text>
				<text class="section-text">1. 甲方合法拥有设备所有权、运营权、定价权、点位管理权。</text>
				<text class="section-text">2. 甲方负责设备日常常规维保，保证设备出厂合规，仅对设备原生质量问题承担保修责任。</text>
				<text class="section-text">3. 甲方有权对乙方违规使用、恶意损坏、逃单、逾期不还等行为进行风控限制、拉黑封禁、信用报备、依法追责。</text>
				<text class="section-text">4. 甲方有权随时调整租金规则、免押政策、归还点位，调整后平台公示即生效，无需单独告知单个用户。</text>
				<text class="sub-section-title">二、乙方权利义务</text>
				<text class="section-text">1. 乙方保证自身身体健康，无高血压、心脏病、关节疾病、眩晕症、残疾等不适合穿戴外骨骼设备的情况，乙方隐瞒健康状况产生的一切人身损害后果由乙方自行全权承担。</text>
				<text class="section-text">2. 乙方严禁在高危场景使用设备：陡坡、悬崖、湿滑路面、台阶、无人野区、车流密集道路，严禁奔跑、跳跃、剧烈运动。</text>
				<text class="section-text">3. 乙方不得转租、转借、抵押、侵占、拆解、改装租赁设备，一经发现，甲方立即终止租赁、收回设备，并追究乙方全部侵权损失。</text>
				<text class="section-text">4. 设备使用中出现异常，乙方仅可停止使用并联系甲方报备，不得私自拆机维修，否则按人为损坏赔付。</text>

				<text class="section-title">第七条 违约责任</text>
				<text class="section-text">1. 乙方任何违约行为，甲方有权单方面解除租赁关系、终止服务、收回设备、冻结账号、追收全部欠款。</text>
				<text class="section-text">2. 因乙方违约、损坏设备、逃单、拒不赔付导致甲方维权的，乙方需全额承担甲方支出的律师费、诉讼费、保全费、公告费、差旅费、鉴定费、维权杂费等全部成本。</text>
				<text class="section-text">3. 乙方恶意逃单、恶意损坏设备、侵占设备的，甲方有权上报征信、留存证据、依法追究民事及刑事责任。</text>

				<text class="section-title">第八条 不可抗力与责任豁免</text>
				<text class="section-text">1. 不可抗力仅指法定不可预见、不可避免、不可克服的自然灾害及政府强制措施。</text>
				<text class="section-text">2. 因不可抗力导致设备损毁的，乙方仍需配合甲方完成设备回收、报备，不得借机逃费。因乙方保管不当导致的损毁，不适用不可抗力免责。</text>

				<text class="section-title">第九条 个人信息与电子协议效力</text>
				<text class="section-text">1. 乙方同意甲方留存其实名认证信息、租赁记录、操作日志、设备使用记录，用于风控核验、纠纷举证、维权使用。</text>
				<text class="section-text">2. 本协议为电子合同，乙方扫码下单、勾选同意、取机使用即视为亲笔签署，合法有效，对乙方具有法律约束力。</text>
				<text class="section-text">3. 甲方平台后台数据、设备IoT记录、开关机记录、定位记录、视频记录，均为双方纠纷处理的唯一有效证据，乙方自愿予以认可。</text>

				<text class="section-title">第十条 争议解决</text>
				<text class="section-text">双方发生争议，优先协商解决；协商不成的，由甲方住所地人民法院管辖，乙方放弃管辖异议权利。</text>

				<text class="section-title">第十一条 其他约定</text>
				<text class="section-text">1. 本协议未尽事宜，甲方平台公示规则、用户须知、安全告知书均为本协议有效组成部分。</text>
				<text class="section-text">2. 本协议条款无论部分是否无效，不影响其余条款对乙方的约束力。</text>
			</view>
		</scroll-view>
	</view>
</template>

<script setup>
import { onMounted } from 'vue';

onMounted(() => {
	// 设置导航标题
	uni.setNavigationBarTitle({ title: '租赁协议' });
})
</script>

<style scoped lang="scss">
.lease-agreement-page {
	min-height: 100vh;
	background: #f5f6fa;
	padding: 16px 18px 40px;
	box-sizing: border-box;
}

.agreement-scroll {
	max-height: calc(100vh - 56px);
}

.agreement-title {
	font-size: 20px;
	font-weight: 800;
	color: #333;
	display: block;
	margin-bottom: 6px;
	line-height: 1.4;
}

.agreement-date {
	font-size: 12px;
	color: #999;
	display: block;
	margin-bottom: 20px;
}

.agreement-content {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.section-title {
	font-size: 15px;
	font-weight: 700;
	color: #333;
	display: block;
	margin-top: 12px;
	margin-bottom: 4px;
}

.sub-section-title {
	font-size: 14px;
	font-weight: 700;
	color: #444;
	display: block;
	margin-top: 8px;
}

.section-text {
	font-size: 13px;
	color: #666;
	line-height: 1.8;
	display: block;
	white-space: pre-line;
}
</style>