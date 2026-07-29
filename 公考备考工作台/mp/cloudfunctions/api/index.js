// 公考备考工作台 · 云函数 api（数据逻辑层）
// 单一云函数，按 event.action 路由，前端用 wx.cloud.callFunction 调用
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const COL = {
  profile: 'profile', progress: 'progress', errors: 'errors', shenlun: 'shenlun',
  politics: 'politics', mocks: 'mocks', questionbank: 'questionbank'
};

// ---------- 工具 ----------
function todayStr(d) {
  d = d || new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function daysBetween(a, b) {
  const ms = new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00');
  return Math.floor(ms / 86400000);
}
function addDays(str, n) {
  const d = new Date(str + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return todayStr(d);
}

// ---------- 内容库（行测知识点，按模块轮换，70 条） ----------
const MODULE_ORDER = ['资料分析', '言语理解', '判断推理', '常识判断', '数量关系'];
const LIB = { knowledge: [
  { module: '资料分析', title: '基期量 / 现期量', points: ['现期量 = 基期量 ×(1+增长率)', '基期量 = 现期量 ÷(1+增长率)', '隔年基期：先算 r=r₁+r₂+r₁×r₂，再代入除法', '坑点：r 为负分母写(1−|r|)；%↔倍数换算；年末 vs 月均时间陷阱'], drill: ['基期量 15 题，强制练截位直除，12min 内', '目标正确率≥70%'] },
  { module: '资料分析', title: '增长率（同比 / 环比）', points: ['增长率 = (现期−基期)÷基期', '同比：与上年同期比；环比：与相邻上期比', '隔年增长率 r=r₁+r₂+r₁×r₂', '坑点：避免把"量"误算成百分点'], drill: ['增长率 15 题', '目标≥70%'] },
  { module: '资料分析', title: '增长量计算与比较', points: ['增长量 = 现期−基期 = 基期×r', '已知现期与 r：增长量 ≈ 现期÷(1+r)×r', '比较：现期大且 r 大 → 增长量大', '坑点：增长量有正负；比较看"量"非"率"'], drill: ['增长量 12 题', '目标≥70%'] },
  { module: '资料分析', title: '比重问题（现期 / 基期）', points: ['现期比重 = 部分÷整体', '基期比重 ≈ 现期比重×(1+b)/(1+a)', '比重变化方向由部分增速 a 与整体增速 b 决定', '坑点：部分与整体易混；单位不一致'], drill: ['比重 15 题', '目标≥70%'] },
  { module: '资料分析', title: '比重变化（上升 / 下降）', points: ['a>b → 比重上升；a<b → 下降', '变化量 = 现期比重×(a−b)/(1+a)', '优先定性判方向，再算定量', '坑点：上升≠上升多；不超过|a−b|个百分点'], drill: ['比重变化 10 题'] },
  { module: '资料分析', title: '倍数与平均数', points: ['A 是 B 的 n 倍：n=A÷B', '平均数 = 总量÷份数', '坑点："多 n 倍"= 是(n+1)倍'], drill: ['倍数/平均数 12 题'] },
  { module: '资料分析', title: '平均数增长率', points: ['公式：(a−b)/(1+b)，a 总量增速、b 份数增速', '问"平均…增长百分之几"即用此式', '坑点：分子分母别颠倒；r 带符号'], drill: ['平均数增长率 8 题'] },
  { module: '资料分析', title: '拉动增长率与贡献率', points: ['拉动增长 = 部分增量÷整体基期', '贡献率 = 部分增量÷总增量', '常用于产业/区域拉动', '坑点：分母不同（基期 vs 总增量）'], drill: ['拉动/贡献率 6 题'] },
  { module: '资料分析', title: '进出口与贸易顺差', points: ['贸易顺差 = 出口−进口（为正）', '贸易逆差 = 进口−出口', '进出口总额 = 进口+出口', '坑点：同比/环比别混；顺差逆差方向'], drill: ['进出口 8 题'] },
  { module: '资料分析', title: '指数问题', points: ['指数=100 为基准；>100 增长', '增长率 = (指数−100)%', '指数之比 ≈ 实际量之比', '坑点：指数本身不是增长率'], drill: ['指数 6 题'] },
  { module: '资料分析', title: '年均增长', points: ['年均增长量 = (末−初)÷年份差', '年均增长率：初期×(1+r)^n=末期', '年份差 = 末期年−初期年', '坑点：五年规划按 4 年差计算'], drill: ['年均增长 8 题'] },
  { module: '资料分析', title: '速算技巧 · 截位直除', points: ['选项差距大截 2 位，小截 3 位', '一步除法截分母，多步截分子分母', '先估数量级再选', '坑点：先判选项差距再决定截位精度'], drill: ['截位直除 20 题限时', '目标≥80%'] },
  { module: '资料分析', title: '速算技巧 · 分数比较与差分', points: ['横向/纵向比：分子大分母小→大', '差分法：大分数−小分数=差分，与中分数比', '特殊值：1/2、1/3、1/6、1/7、1/8、1/9、1/12', '坑点：差分后回归比较逻辑'], drill: ['分数比较 15 题'] },
  { module: '资料分析', title: '综合判断题技巧', points: ['先做易判的（直接读数/排序）', 'C 位正确率偏高，难选时优先验 C/D', '注意"能够从上述资料推出"全真才选', '坑点：概念偷换、单位、时间范围'], drill: ['综合 5 题模考节奏练'] },
  { module: '言语理解', title: '逻辑填空 · 对应法', points: ['解释类对应：即、也就是说、比如', '转折对应：但/可是/然而（前后语义相反）', '因果对应：导致/使得', '并列对应：顿号/同句式（语义相近或递进）', '色彩：感情色彩、语体色彩'], drill: ['逻辑填空 15 题', '目标≥65%'] },
  { module: '言语理解', title: '逻辑填空 · 实词辨析', points: ['看搭配：固定搭配优先', '看语义侧重：侧重点不同', '看程度轻重：轻重有别', '看感情色彩：褒贬中', '坑点：望文生义、形近误用'], drill: ['实词辨析 15 题'] },
  { module: '言语理解', title: '逻辑填空 · 成语辨析', points: ['语义侧重、适用对象、感情色彩', '易混成语对比记（如 一蹴而就 vs 立竿见影）', '注意望文生义成语', '坑点：褒贬误用、语义重复'], drill: ['成语 12 题'] },
  { module: '言语理解', title: '逻辑填空 · 感情色彩', points: ['褒义/贬义/中性先定调', '文段感情倾向决定选词色彩', '消极语境选贬义或中性偏负', '坑点：色彩与文意冲突'], drill: ['色彩辨析 10 题'] },
  { module: '言语理解', title: '中心理解 · 行文脉络', points: ['总—分—总：首句观点+尾句结论', '转折后为重点', '因果尾句：因此/所以', '对策尾句：应该/需要/必须', '坑点：转折前、例子、原因非重点'], drill: ['中心理解 15 题', '目标≥65%'] },
  { module: '言语理解', title: '中心理解 · 转折因果重点', points: ['转折（但/然而）：重点在后', '因果（因为/所以）：结论在后', '递进（甚至/更）：重点在后', '必要条件（只有…才…）：条件重要', '坑点：非重点干扰项'], drill: ['转折因果 12 题'] },
  { module: '言语理解', title: '细节判断 · 陷阱识别', points: ['偷换概念/时态/语气', '无中生有、绝对化（全部/都/必然）', '强加因果、混淆范围', '做法：选项回原文一一比对'], drill: ['细节题 15 题', '目标≥65%'] },
  { module: '言语理解', title: '语句排序 · 首句特征', points: ['首句：引出话题/概念/背景', '非首句：结论词(因此)、指代(这/那)、转折后', '对比选项定首句', '坑点：把非首句当首句'], drill: ['语句排序 10 题', '目标≥60%'] },
  { module: '言语理解', title: '语句排序 · 捆绑与顺序', points: ['捆绑：相同话题/指代词/关联词', '顺序：时间、空间、逻辑（现象→本质）', '尾句：总结/对策优先', '坑点：忽视首尾呼应、指代错位'], drill: ['排序捆绑 10 题'] },
  { module: '言语理解', title: '标题填入', points: ['新闻类：概括最重要事实', '议论文：抓观点/对策', '说明文：抓说明对象特征', '坑点：标题需"生动且准确"，勿过度引申'], drill: ['标题填入 8 题'] },
  { module: '言语理解', title: '词句理解', points: ['代词指代：就近原则+话题一致', '词语理解：结合语境本义+引申', '常考比喻义、情感倾向', '坑点：脱离语境望文生义'], drill: ['词句理解 8 题'] },
  { module: '言语理解', title: '承接叙述', points: ['尾句推下文：接着尾句话题', '排除：前文已讲、无关、跳跃', '话题一致原则', '坑点：选"新话题"而非"总结前文"'], drill: ['承接叙述 6 题'] },
  { module: '言语理解', title: '关联词 · 重点位置', points: ['转折（但/然而）：重点在后', '因果（因为/所以）：结论在后', '递进（甚至/更）：重点在后', '让步（虽然…但是…）：强调后', '条件（只有…才…）：后推前'], drill: ['关联词辨析 10 题'] },
  { module: '言语理解', title: '篇章阅读策略', points: ['先题后文，题文对照', '定位关键句再比对', '宏观题（主旨）放最后', '坑点：细枝末节干扰、时间分配'], drill: ['篇章阅读 2 篇'] },
  { module: '判断推理', title: '图形推理 · 位置规律', points: ['平移：方向+步数（恒定/递增）', '旋转：顺/逆时针+角度', '翻转：上下翻/左右翻', '坑点：位置与样式叠加混淆'], drill: ['图推 10 题（位置类）'] },
  { module: '判断推理', title: '图形推理 · 属性规律', points: ['对称性：轴/中心/轴+中心', '曲直性：全直/全曲/曲+直', '开闭性：开放/封闭', '坑点：对称轴数量与方向'], drill: ['图推 10 题（属性类）'] },
  { module: '判断推理', title: '图形推理 · 数量规律', points: ['点（交点）、线（直线/笔画）、角', '面（封闭区域）、素（元素个数/种类）', '笔画数：奇点数÷2=笔画数', '坑点：一笔画判定、凌乱图优先数'], drill: ['图推 10 题（数量类）'] },
  { module: '判断推理', title: '图形推理 · 样式规律', points: ['遍历：缺啥补啥', '加减同异：叠加/相减/求同/求异', '黑白运算：按位置定规则', '坑点：加减同异与黑白运算混淆'], drill: ['图推 10 题（样式类）'] },
  { module: '判断推理', title: '图形推理 · 立体（折纸盒）', points: ['相对面不相邻、相邻面看公共边', '时针法判旋转', '找特殊面定位', '坑点：公共边/公共点特征'], drill: ['折纸盒 8 题'] },
  { module: '判断推理', title: '类比推理 · 外延关系', points: ['全同/并列（矛盾/反对）/包含（种属/组成）/交叉', '并列看同级，包含看种属还是组成', '坑点：种属 vs 组成混淆'], drill: ['类比 15 题'] },
  { module: '判断推理', title: '类比推理 · 内涵关系', points: ['属性（必然/或然）、功能、因果', '顺承、目的、场所', '常识积累是关键', '坑点：二级辨析（必然/或然）'], drill: ['类比 10 题'] },
  { module: '判断推理', title: '类比推理 · 语义与语法', points: ['近义/反义/象征', '语法：主谓/动宾/偏正', '感情色彩二级辨析', '坑点：词义程度差异'], drill: ['类比 8 题'] },
  { module: '判断推理', title: '定义判断 · 核心要素法', points: ['找主体/客体/方式/目的/条件', '选项逐一比对要素', '优先排"明显不符"项', '坑点：要件缺失、张冠李戴'], drill: ['定义 12 题'] },
  { module: '判断推理', title: '逻辑判断 · 翻译推理', points: ['前推后：如果…就…（A→B）', '后推前：只有…才…（B→A）', '逆否等价：A→B ⇔ ¬B→¬A', '德·摩根：¬(A且B)=¬A或¬B'], drill: ['翻译推理 10 题'] },
  { module: '判断推理', title: '逻辑判断 · 真假推理', points: ['找矛盾（必有一真一假）', '反对关系（上反对/下反对）', '从确定信息入手', '坑点：矛盾与反对混淆'], drill: ['真假推理 8 题'] },
  { module: '判断推理', title: '逻辑判断 · 加强削弱', points: ['加强：搭桥/ 举例/ 解释原因/ 重复论证', '削弱：拆桥/ 反例/ 另有他因/ 否定前提', '坑点：无关项、力度不足项干扰'], drill: ['加强削弱 12 题'] },
  { module: '判断推理', title: '逻辑判断 · 组合排列', points: ['排除法、代入法、最大信息优先', '列表/连线辅助', '确定性信息切入', '坑点：条件叠加遗漏'], drill: ['组合排列 8 题'] },
  { module: '判断推理', title: '逻辑判断 · 日常结论与论证', points: ['日常结论：慎选绝对化、无中生有', '论证结构：找论点和论据', '类比/枚举论证力度弱', '坑点：过度推断'], drill: ['日常结论 8 题'] },
  { module: '常识判断', title: '宪法 · 国家机构', points: ['全国人大是最高国家权力机关', '国务院是最高行政机关', '全国人大常委会有立法权', '监察委、法院、检察院独立行使职权', '坑点：权力机关 vs 行政机关'], drill: ['宪法机构 10 题'] },
  { module: '常识判断', title: '宪法 · 公民基本权利', points: ['平等权、政治权利和自由', '人身自由、宗教信仰自由', '社会经济文化权利', '坑点：权利与权力区分'], drill: ['公民权利 8 题'] },
  { module: '常识判断', title: '民法典 · 总则与物权', points: ['自然人（完全/限制/无行为能力）', '法人分类', '物权：所有权/用益物权/担保物权', '坑点：善意取得要件'], drill: ['民法典 10 题'] },
  { module: '常识判断', title: '民法典 · 合同与侵权', points: ['要约、承诺、违约责任', '侵权责任：过错/无过错/公平', '免责事由', '坑点：违约 vs 侵权竞合'], drill: ['合同侵权 8 题'] },
  { module: '常识判断', title: '行政法 · 许可与处罚', points: ['行政许可设定权限', '行政处罚种类（警告→拘留）', '听证、复议、诉讼', '坑点：处罚 vs 强制措施'], drill: ['行政法 8 题'] },
  { module: '常识判断', title: '刑法 · 犯罪构成', points: ['主体、主观、客体、客观四要件', '故意/过失、正当防卫', '犯罪既遂/未遂/中止', '坑点：正当防卫限度'], drill: ['刑法 8 题'] },
  { module: '常识判断', title: '时政 · 新质生产力', points: ['特点：创新主导、高附加值、绿色低碳', '核心：科技创新（原创性、颠覆性）', '产业：战略性新兴产业、未来产业', '适用：申论经济/科技话题素材'], drill: ['记为规范表达，用于申论'] },
  { module: '常识判断', title: '时政 · 高质量发展', points: ['首要任务、扩大内需、现代化产业体系', '科技创新引领、区域协调发展', '绿色低碳转型', '适用：申论经济话题'], drill: ['记为规范表达'] },
  { module: '常识判断', title: '党史 · 重要会议', points: ['一大（建党）、遵义会议（转折）', '十一届三中全会（改革开放）', '十九大/二十大（新时代/新征程）', '坑点：会议与内容对应'], drill: ['党史会议 8 题'] },
  { module: '常识判断', title: '文史 · 诸子百家', points: ['儒（孔子/孟子）、道（老子/庄子）', '墨（兼爱非攻）、法（韩非）', '兵（孙子）、杂家', '坑点：主张对应人物'], drill: ['诸子百家 8 题'] },
  { module: '常识判断', title: '科技 · 重大成就', points: ['航天：空间站、嫦娥、天问', '深海：奋斗者号', '超算、芯片自主、AI 大模型', '坑点：分清首飞/首次/累计'], drill: ['科技成就 10 题'] },
  { module: '常识判断', title: '科技 · 生活常识', points: ['物理：光的折射/反射、声速', '化学：金属活动性、酸碱', '生物：细胞、遗传', '坑点：常见现象原理解释'], drill: ['生活常识 8 题'] },
  { module: '常识判断', title: '地理 · 中国地理', points: ['地形三级阶梯、四大高原', '气候（季风/非季风）、河流', '资源分布（煤铁石油）', '坑点：南北方分界线'], drill: ['中国地理 8 题'] },
  { module: '常识判断', title: '经济 · 宏观经济', points: ['GDP、CPI、PPI 含义', '货币政策（降准降息）、财政政策', '通货膨胀/紧缩', '坑点：政策工具区分'], drill: ['宏观经济 8 题'] },
  { module: '数量关系', title: '工程问题 · 赋值法', points: ['赋值总量为时间公倍数', '效率 = 总量÷时间', '合作效率 = 效率和', '坑点：单位"1"与具体量混淆'], drill: ['工程 8 题'] },
  { module: '数量关系', title: '工程问题 · 效率统筹', points: ['交替合作：算周期总量', '最优安排：效率高的先做', '多人合作分段', '坑点：周期边界'], drill: ['效率统筹 6 题'] },
  { module: '数量关系', title: '行程问题 · 相遇追及', points: ['s = v × t', '相遇：s和=(v1+v2)×t', '追及：s差=(v1−v2)×t', '坑点：环形跑道、上下坡'], drill: ['行程 8 题'] },
  { module: '数量关系', title: '行程问题 · 流水行船', points: ['顺水：v顺=船速+水速', '逆水：v逆=船速−水速', '静水速度=(v顺+v逆)/2', '坑点：水速方向'], drill: ['流水行船 6 题'] },
  { module: '数量关系', title: '利润问题', points: ['利润 = 售价 − 成本', '利润率 = 利润÷成本', '打折 = 售价÷原价', '坑点：提价+降价叠加、单位一致'], drill: ['利润 6 题'] },
  { module: '数量关系', title: '容斥原理（两 / 三集合）', points: ['两集合：A+B−A∩B = 总数−都不', '三集合：A+B+C−两两交+三者交 = 总数−都不', '判定法：先归类再画图', '坑点："都不"是否计入'], drill: ['容斥 6 题'] },
  { module: '数量关系', title: '排列组合 · 基础', points: ['分类用加法、分步用乘法', 'A(n,m) 排列、C(n,m) 组合', '特殊元素优先法', '坑点：是否考虑顺序'], drill: ['排列组合 6 题'] },
  { module: '数量关系', title: '概率问题', points: ['概率 = 满足条件的数÷总数', '古典概型、独立事件相乘', '分类相加、分步相乘', '坑点：事件互斥/独立混淆'], drill: ['概率 4 题'] },
  { module: '数量关系', title: '几何问题 · 面积周长', points: ['常用面积/体积公式', '割补法、等积变形', '相似比平方→面积比', '坑点：单位换算'], drill: ['几何 4 题'] },
  { module: '数量关系', title: '年龄问题', points: ['年龄差不变', '代入法/方程法', '注意"几年后"差值', '坑点：时间错位'], drill: ['年龄 4 题'] },
  { module: '数量关系', title: '星期与日期问题', points: ['平年365、闰年366；2月判断', '星期每7天循环', '过 n 天 = 今天+n mod 7', '坑点：闰年2月29日'], drill: ['日期 4 题'] },
  { module: '数量关系', title: '数列问题（等差 / 等比）', points: ['等差：a_n=a₁+(n−1)d，和=n(a₁+a_n)/2', '等比：a_n=a₁q^(n−1)', '求和公式记牢', '坑点：项数计算'], drill: ['数列 4 题'] },
  { module: '数量关系', title: '溶液浓度问题', points: ['浓度 = 溶质÷溶液', '混合：溶质守恒', '十字交叉法', '坑点：浓度百分比换算'], drill: ['浓度 4 题'] },
  { module: '数量关系', title: '经济统筹（方案优化）', points: ['单价最低优先', '分段计费分界点', '最值问题', '坑点：边界条件'], drill: ['统筹 4 题'] }
] };

// ---------- 申论素材池（内置，按日轮播） ----------
const SEED_SLAW = [
  { oral: '大家都不愿管', standard: '主体责任缺失 / 监管缺位', topic: '基层治理' },
  { oral: '花钱请人干活', standard: '购买公共服务 / 市场化运作', topic: '公共服务' },
  { oral: '把数据打通', standard: '数据共享 / 信息互通', topic: '数字政府' },
  { oral: '老办法不管用', standard: '治理方式滞后 / 机制僵化', topic: '治理' },
  { oral: '一起商量着办', standard: '多元共治 / 协商共治', topic: '基层治理' },
  { oral: '老百姓的事有人管', standard: '网格化管理 / 接诉即办', topic: '基层治理' },
  { oral: '干部不作为', standard: '履职不力 / 懒政怠政', topic: '干部作风' },
  { oral: '上面千条线下面一根针', standard: '基层负担过重 / 权责不匹配', topic: '基层治理' },
  { oral: '一村一品', standard: '特色产业发展 / 差异化定位', topic: '乡村振兴' },
  { oral: '土特产变金疙瘩', standard: '农产品深加工 / 价值链延伸', topic: '乡村振兴' },
  { oral: '年轻人不愿回村', standard: '人才外流 / 乡村空心化', topic: '乡村振兴' },
  { oral: '绿水青山变金山银山', standard: '生态价值转化 / 绿色发展', topic: '生态环保' },
  { oral: '一刀切', standard: '粗放式管理 / 缺乏精准施策', topic: '治理' },
  { oral: '运动式整治', standard: '常态化长效化机制缺失', topic: '治理' },
  { oral: '数据孤岛', standard: '信息壁垒 / 系统不联通', topic: '数字政府' },
  { oral: '跑断腿', standard: '办事流程繁琐 / 多头跑', topic: '营商环境' },
  { oral: '一窗通办', standard: '集成服务 / 一站式办理', topic: '营商环境' },
  { oral: '说话不算数', standard: '政策不连续 / 契约精神缺失', topic: '营商环境' },
  { oral: '老人办事难', standard: '适老化改造 / 数字鸿沟', topic: '民生保障' },
  { oral: '看病贵', standard: '医疗资源不均衡 / 保障不足', topic: '民生保障' },
  { oral: '上学远', standard: '教育资源不均衡 / 布局不合理', topic: '教育发展' },
  { oral: '就业难', standard: '结构性就业矛盾 / 技能错配', topic: '民生保障' },
  { oral: '面子工程', standard: '脱离实际 / 重显绩轻潜绩', topic: '干部作风' },
  { oral: '拍脑袋决策', standard: '决策科学化民主化不足', topic: '治理' },
  { oral: '推诿扯皮', standard: '部门协同不畅 / 责任空转', topic: '治理' },
  { oral: '重处罚轻服务', standard: '执法理念偏差 / 服务缺位', topic: '法治建设' },
  { oral: '谁犯错谁担责', standard: '权责一致 / 终身追责', topic: '法治建设' },
  { oral: '老手艺没人学', standard: '非遗传承断层 / 活态传承不足', topic: '文化传承' },
  { oral: '文化搭台经济唱戏', standard: '文旅融合 / 以文塑旅', topic: '文化传承' },
  { oral: '网红打卡', standard: '文旅 IP 打造 / 流量变现', topic: '文化传承' },
  { oral: '卡脖子', standard: '核心技术受制于人 / 自主创新不足', topic: '科技创新' },
  { oral: '产学研脱节', standard: '成果转化不畅 / 协同创新不足', topic: '科技创新' },
  { oral: '唯论文唯帽子', standard: '评价体系单一 / 功利导向', topic: '教育发展' },
  { oral: '应急时手忙脚乱', standard: '应急预案缺失 / 处置能力不足', topic: '应急管理' },
  { oral: '隐患当没事', standard: '风险意识薄弱 / 排查不彻底', topic: '应急管理' },
  { oral: '脱贫又返贫', standard: '防返贫动态监测不足', topic: '共同富裕' },
  { oral: '数字扶贫', standard: '数字赋能 / 精准帮扶', topic: '共同富裕' },
  { oral: '先污染后治理', standard: '发展方式粗放 / 绿色转型滞后', topic: '生态环保' },
  { oral: '垃圾分类摆样子', standard: '习惯未养成 / 配套不到位', topic: '生态环保' },
  { oral: '办事不求人', standard: '阳光政务 / 规范用权', topic: '法治建设' },
  { oral: '接地气', standard: '贴近群众 / 务实管用', topic: '治理' }
];
const SEED_SLQU = [
  { text: '为政之要，惟在得人。', topic: '人才干部', pos: '开头/分论点' },
  { text: '民惟邦本，本固邦宁。', topic: '民生', pos: '开头' },
  { text: '天下之事，不难于立法，而难于法之必行。', topic: '法治落实', pos: '分析/对策' },
  { text: '苟日新，日日新，又日新。', topic: '改革创新', pos: '分论点' },
  { text: '绿水青山就是金山银山。', topic: '生态', pos: '分论点' },
  { text: '治国有常，而利民为本。', topic: '民生', pos: '开头' },
  { text: '宰相必起于州部，猛将必发于卒伍。', topic: '用人基层', pos: '分论点' },
  { text: '惟改革者进，惟创新者强，惟改革创新者胜。', topic: '改革', pos: '结尾' },
  { text: '利民之事，丝发必兴；厉民之事，毫末必去。', topic: '为民服务', pos: '对策' },
  { text: '不谋全局者，不足谋一域。', topic: '系统思维', pos: '分析' },
  { text: '合抱之木，生于毫末；九层之台，起于累土。', topic: '积累实干', pos: '结尾' },
  { text: '仓廪实而知礼节，衣食足而知荣辱。', topic: '物质基础', pos: '分析' },
  { text: '凡治国之道，必先富民。', topic: '富民', pos: '开头' },
  { text: '一心可以丧邦，一心可以兴邦，只在公私之间尔。', topic: '公私廉政', pos: '分论点' },
  { text: '功成不必在我，功成必定有我。', topic: '担当实干', pos: '结尾' },
  { text: '取之有度，用之有节，则常足。', topic: '节约绿色', pos: '分论点' },
  { text: '能用众力，则无敌于天下矣；能用众智，则无畏于圣人矣。', topic: '共治', pos: '分论点' },
  { text: '天下难事，必作于易；天下大事，必作于细。', topic: '细节务实', pos: '对策' },
  { text: '志之所趋，无远弗届，穷山距海，不能限也。', topic: '青年志向', pos: '结尾' },
  { text: '大厦之成，非一木之材也；大海之阔，非一流之归也。', topic: '汇聚合力', pos: '结尾' },
  { text: '法者，治之端也。', topic: '法治', pos: '开头' },
  { text: '善治病者，必医其受病之处；善救弊者，必塞其起弊之原。', topic: '精准施策', pos: '分析' },
  { text: '知屋漏者在宇下，知政失者在草野。', topic: '倾听民意', pos: '对策' },
  { text: '利民者，民亦利之；恶民者，民亦恶之。', topic: '民心', pos: '分论点' },
  { text: '路虽远，行则将至；事虽难，做则必成。', topic: '实干', pos: '结尾' }
];

// ---------- 数据库读写辅助 ----------
async function getCol(name, limit) {
  const res = await db.collection(name).limit(limit || 1000).get();
  return res.data || [];
}
async function getOne(name) {
  const res = await db.collection(name).limit(1).get();
  return (res.data && res.data[0]) || null;
}
async function upsertOne(name, doc) {
  const res = await db.collection(name).limit(1).get();
  if (res.data && res.data.length) {
    await db.collection(name).doc(res.data[0]._id).set({ data: doc });
  } else {
    await db.collection(name).add({ data: doc });
  }
}

// ---------- 每日计划生成（含错题联动薄弱优先） ----------
async function genTodayPlan() {
  const p = (await getOne(COL.profile)) || {};
  const start = p.startDate || '2026-07-29';
  const idx = Math.max(0, daysBetween(start, todayStr()));
  const slot = Math.floor(idx / 2);
  const errs = await getCol(COL.errors);

  const weakErrs = errs.filter(e => e.reason === '知识点不熟' && !e.reviewed);
  let focus, pick, isWeak = false;
  if (weakErrs.length) {
    const cnt = {};
    weakErrs.forEach(e => { if (MODULE_ORDER.includes(e.module)) cnt[e.module] = (cnt[e.module] || 0) + 1; });
    const cand = MODULE_ORDER.filter(m => cnt[m]).sort((a, b) => cnt[b] - cnt[a]);
    focus = cand.length ? cand[0] : MODULE_ORDER[slot % MODULE_ORDER.length];
    const modLib = LIB.knowledge.filter(k => k.module === focus);
    const weakPoints = weakErrs.map(e => (e.point || '').slice(0, 4)).filter(Boolean);
    pick = modLib.find(k => weakPoints.some(w => (k.title + k.points.join('')).includes(w)))
      || modLib[slot % Math.max(1, modLib.length)] || modLib[0];
    isWeak = true;
  } else {
    focus = MODULE_ORDER[slot % MODULE_ORDER.length];
    const modLib = LIB.knowledge.filter(k => k.module === focus);
    pick = modLib[slot % Math.max(1, modLib.length)] || modLib[0];
  }

  const sl = (await getOne(COL.shenlun)) || { words: [], quotes: [], frameworks: [], docs: [] };
  const dwStart = (idx * 5) % SEED_SLAW.length;
  const dailyWords = Array.from({ length: 5 }, (_, i) => SEED_SLAW[(dwStart + i) % SEED_SLAW.length]);
  const dailyQuote = SEED_SLQU[idx % SEED_SLQU.length];
  const myWords = (sl.words || []).slice(-20).reverse();
  const myQuotes = sl.quotes || [];
  const tasks = [
    { id: 't1', name: '行测·' + pick.title + '（学 40min）', kind: 'study' },
    { id: 't2', name: '行测刷题（30min）', kind: 'drill' },
    { id: 't3', name: '常识·时政速览（20min）', kind: 'common' },
    { id: 't4', name: '申论·规范词+金句（30min）', kind: 'shenlun' },
    { id: 't5', name: '复盘+错题登记（20min）', kind: 'review' }
  ];
  const due = errs.filter(e => !e.reviewed && e.reviewDate === todayStr());
  return {
    date: todayStr(), focus, knowledge: pick, weak: isWeak,
    weakHint: isWeak ? ('检测到 ' + weakErrs.length + ' 条未复盘薄弱点，已优先推送「' + focus + '」模块') : '',
    tasks, drill: pick.drill,
    shenlun: { dailyWords, dailyQuote, myWords, myQuotes },
    reviewDue: due,
    tomorrow: '重点：' + MODULE_ORDER[(slot + 1) % MODULE_ORDER.length] + ' + 申论材料拆解'
  };
}

async function genPlan(type) {
  const p = (await getOne(COL.profile)) || {};
  const start = p.startDate || '2026-07-29';
  const total = type === '7' ? 7 : 30;
  const rows = [];
  for (let i = 0; i < total; i++) {
    const d = addDays(start, i);
    const slot = Math.floor(i / 2);
    const focus = MODULE_ORDER[slot % MODULE_ORDER.length];
    const modLib = LIB.knowledge.filter(k => k.module === focus);
    const pick = modLib[slot % Math.max(1, modLib.length)] || modLib[0];
    rows.push({ day: i + 1, date: d, focus, title: pick.title });
  }
  return { type, total, rows };
}

// ---------- 数据初始化（从种子文件导入云数据库） ----------
async function initData() {
  const fs = require('fs');
  const path = require('path');
  const seedDir = path.join(__dirname, 'seed');
  const files = ['profile', 'progress', 'errors', 'shenlun', 'politics', 'mocks', 'questionbank'];
  const map = { profile: COL.profile, progress: COL.progress, errors: COL.errors, shenlun: COL.shenlun, politics: COL.politics, mocks: COL.mocks, questionbank: COL.questionbank };
  const report = {};
  for (const f of files) {
    const col = map[f];
    // 清空
    await db.collection(col).where({ _id: _.exists(true) }).remove().catch(() => {});
    const arr = JSON.parse(fs.readFileSync(path.join(seedDir, f + '.json'), 'utf8'));
    const list = Array.isArray(arr) ? arr : [arr];
    let ok = 0;
    for (const item of list) {
      await db.collection(col).add({ data: item }).catch(e => { report[f + '_err'] = String(e); });
      ok++;
    }
    report[col] = ok;
  }
  return { ok: true, report };
}

// ---------- 主路由 ----------
exports.main = async (event) => {
  const action = event.action;
  try {
    switch (action) {
      case 'init': return await initData();

      case 'state': {
        const bank = await getCol(COL.questionbank);
        const byMod = {};
        bank.forEach(q => { byMod[q.module] = (byMod[q.module] || 0) + 1; });
        return {
          profile: (await getOne(COL.profile)) || {},
          progress: (await getOne(COL.progress)) || {},
          errors: await getCol(COL.errors),
          shenlun: (await getOne(COL.shenlun)) || {},
          politics: await getCol(COL.politics),
          mocks: await getCol(COL.mocks),
          questionbank: bank,
          quizBank: { _total: bank.length, _byMod: byMod },
          today: await genTodayPlan()
        };
      }

      case 'today': return await genTodayPlan();

      case 'plan': return await genPlan(event.type === '7' ? '7' : '30');

      case 'questionbank': {
        const bank = await getCol(COL.questionbank);
        const mod = event.module;
        return mod ? bank.filter(q => q.module === mod) : bank;
      }

      case 'quiz': {
        const bank = await getCol(COL.questionbank);
        const errs = await getCol(COL.errors);
        const mod = event.module;
        const n = Math.min(50, Number(event.n) || 10);
        const mode = event.mode || 'random';
        let pool = bank.slice();
        if (mod && mod !== '全部') pool = pool.filter(q => q.module === mod);
        if (mode === 'wrong') {
          const wrongIds = errs.map(e => e.qid).filter(Boolean);
          pool = bank.filter(q => wrongIds.includes(q.id));
        } else if (mode !== 'sequential') {
          pool = pool.slice().sort(() => Math.random() - 0.5);
        }
        return pool.slice(0, n).map(q => ({
          id: q.id, module: q.module, type: q.type, q: q.q, options: q.options, point: q.point, difficulty: q.difficulty
        }));
      }

      case 'profile': {
        const cur = (await getOne(COL.profile)) || {};
        const merged = Object.assign(cur, event.body || {});
        ['gkDate', 'skDate', 'startDate'].forEach(k => {
          if (merged[k] && /^\d{4}-\d{1,2}-\d{1,2}$/.test(merged[k])) {
            const parts = merged[k].split('-');
            merged[k] = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
          }
        });
        await upsertOne(COL.profile, merged);
        return merged;
      }

      case 'todayTask': {
        const prog = (await getOne(COL.progress)) || { today: { date: todayStr(), completed: [], questions: 0 } };
        if (!prog.today || prog.today.date !== todayStr()) prog.today = { date: todayStr(), completed: [], questions: 0 };
        if (event.body && event.body.done) { if (!prog.today.completed.includes(event.body.id)) prog.today.completed.push(event.body.id); }
        else if (event.body) { prog.today.completed = prog.today.completed.filter(x => x !== event.body.id); }
        await upsertOne(COL.progress, prog);
        return prog.today;
      }

      case 'questionLog': {
        const prog = (await getOne(COL.progress)) || {};
        if (!prog.today || prog.today.date !== todayStr()) prog.today = { date: todayStr(), completed: [], questions: 0 };
        const n = Number(event.body && event.body.n) || 0;
        prog.today.questions = (prog.today.questions || 0) + n;
        prog.totalQuestions = (prog.totalQuestions || 0) + n;
        if (prog.lastStudyDate !== todayStr()) { prog.totalDays = (prog.totalDays || 0) + 1; prog.lastStudyDate = todayStr(); }
        await upsertOne(COL.progress, prog);
        return prog;
      }

      case 'error': {
        const e = Object.assign({
          _id: undefined, id: Date.now(), date: todayStr(), reviewed: false, reviewDate: addDays(todayStr(), 3), images: []
        }, event.body || {});
        if (!Array.isArray(e.images)) e.images = [];
        const r = await db.collection(COL.errors).add({ data: e });
        const prog = (await getOne(COL.progress)) || {};
        prog.totalErrors = (prog.totalErrors || 0) + 1;
        prog.moduleProgress = prog.moduleProgress || {};
        const mp = prog.moduleProgress[e.module];
        if (mp && e.reason === '知识点不熟' && e.point && !mp.weak.includes(e.point)) mp.weak.push(e.point);
        await upsertOne(COL.progress, prog);
        return Object.assign({ _addid: r._id }, e);
      }

      case 'errorReview': {
        const errs = await getCol(COL.errors);
        const e = errs.find(x => x.id === event.body.id);
        if (e) {
          const up = { reviewed: true, reviewResult: (event.body.result || '已掌握') };
          await db.collection(COL.errors).doc(e._id).update({ data: up });
          Object.assign(e, up);
        }
        return e || {};
      }

      case 'shenlunWord': {
        const sl = (await getOne(COL.shenlun)) || { words: [], quotes: [], frameworks: [], docs: [] };
        sl.words = sl.words || [];
        sl.words.push({ date: todayStr(), topic: event.body.topic || '', oral: event.body.oral || '', standard: event.body.standard || '' });
        await upsertOne(COL.shenlun, sl);
        return sl;
      }

      case 'shenlunQuote': {
        const sl = (await getOne(COL.shenlun)) || { words: [], quotes: [], frameworks: [], docs: [] };
        sl.quotes = sl.quotes || [];
        sl.quotes.push({ topic: event.body.topic || '', text: event.body.text || '', pos: event.body.pos || '' });
        await upsertOne(COL.shenlun, sl);
        return sl;
      }

      case 'politics': {
        const pol = await getCol(COL.politics);
        const item = { date: todayStr(), cat: event.body.cat || '', event: event.body.event || '', point: event.body.point || '', angle: event.body.angle || '' };
        await db.collection(COL.politics).add({ data: item });
        pol.unshift(item);
        return pol;
      }

      case 'mock': {
        const mocks = await getCol(COL.mocks);
        const scores = event.body.scores || {};
        let totalRight = 0, totalAll = 0; const per = [];
        Object.keys(scores).forEach(m => {
          const r = Number(scores[m].right) || 0, t = Number(scores[m].total) || 0;
          totalRight += r; totalAll += t;
          per.push({ module: m, rate: t ? Math.round(r / t * 100) : 0, right: r, total: t });
        });
        per.sort((a, b) => a.rate - b.rate);
        const mock = { id: Date.now(), date: todayStr(), scores: per, overall: totalAll ? Math.round(totalRight / totalAll * 100) : 0, top3: per.slice(0, 3), plan: event.body.plan || '' };
        await db.collection(COL.mocks).add({ data: mock });
        const prog = (await getOne(COL.progress)) || {};
        prog.mockCount = (prog.mockCount || 0) + 1;
        await upsertOne(COL.progress, prog);
        return mock;
      }

      case 'checkin': {
        const prog = (await getOne(COL.progress)) || { checkIns: [] };
        prog.checkIns = prog.checkIns || [];
        const t = todayStr();
        if (!prog.checkIns.includes(t)) {
          prog.checkIns.push(t);
          if (prog.lastStudyDate !== t) { prog.totalDays = (prog.totalDays || 0) + 1; prog.lastStudyDate = t; }
          await upsertOne(COL.progress, prog);
        }
        return { ok: true, checkIns: prog.checkIns, totalDays: prog.totalDays };
      }

      case 'quizSubmit': {
        const bank = await getCol(COL.questionbank);
        const q = bank.find(x => x.id === event.id);
        if (!q) return { error: '题目不存在' };
        const right = q.answer === event.answer;
        if (!right) {
          await db.collection(COL.errors).add({
            data: {
              id: Date.now(), date: todayStr(), module: q.module, point: q.point, reason: (event.reason || '知识点不熟'),
              myAnswer: event.answer, correct: q.answer, solution: q.parse, qid: q.id, fromBank: true,
              reviewed: false, reviewDate: addDays(todayStr(), 3)
            }
          });
          const prog = (await getOne(COL.progress)) || {};
          prog.totalErrors = (prog.totalErrors || 0) + 1;
          prog.moduleProgress = prog.moduleProgress || {};
          const mp = prog.moduleProgress[q.module];
          if (mp && !mp.weak.includes(q.point)) mp.weak.push(q.point);
          await upsertOne(COL.progress, prog);
        }
        return { right, answer: q.answer, parse: q.parse, point: q.point, module: q.module };
      }

      default: return { error: 'unknown action: ' + action };
    }
  } catch (err) {
    return { error: String(err && err.message ? err.message : err) };
  }
};
