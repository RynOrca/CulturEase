// OSINT 情报雷达 mock 数据 —— 适配 CulturEase 融合项目
import type {
  SearchLocation, SchoolSearchResult, PlaceProfile, PoiItem,
  ForumPost, ForumAnalysisResult, HeatZone, DimensionScores,
} from '@/lib/types';

// ==================== 热力网格生成工具 ====================
interface RiskPole {
  center: [number, number];
  intensity: number;
  radius: number;
  label?: string;
  type?: string;
}

function generateHeatGrid(
  centerLat: number, centerLng: number,
  poles: RiskPole[], gridSize = 0.003, radius = 0.018,
): HeatZone[] {
  const zones: HeatZone[] = [];
  const steps = Math.ceil((radius * 2) / gridSize);
  for (let i = 0; i <= steps; i++) {
    for (let j = 0; j <= steps; j++) {
      const lat = centerLat - radius + i * gridSize;
      const lng = centerLng - radius + j * gridSize;
      let maxIntensity = 0.08;
      for (const pole of poles) {
        const poleRadiusDeg = pole.radius / 111000;
        const dist = Math.sqrt((lat - pole.center[0]) ** 2 + (lng - pole.center[1]) ** 2);
        if (dist < poleRadiusDeg) {
          maxIntensity = Math.max(maxIntensity, pole.intensity * (1 - dist / poleRadiusDeg));
        }
      }
      if (maxIntensity > 0.05) {
        zones.push({
          id: `h-${zones.length}`,
          center: [lat, lng],
          radius: gridSize * 0.6 * 111000,
          intensity: maxIntensity,
          label: '',
          type: 'culture-shock',
        });
      }
    }
  }
  return zones;
}

// ==================== 东京工业大学 ====================
const tokyoTechScores: DimensionScores = {
  convenience: 82, costPressure: 74, safety: 88, noiseLevel: 42, friendliness: 65, cultureShockRisk: 58,
};

const tokyoTechPois: PoiItem[] = [
  {
    id: 'titech-main', name: '本馆·石川台校区', nameEn: 'Main Campus Ishikawadai',
    category: 'academic', lat: 35.6050, lng: 139.6820, shortLabel: '主校区',
    summary: '东京工业大学核心校区，理工学研究科所在地，2024年全新改造完成',
    tags: ['研究设施', '实验室集群', '图书馆'],
    scores: { convenience: 78, costPressure: 65, safety: 90, noiseLevel: 35, friendliness: 60, cultureShockRisk: 50 },
    detail: {
      highlights: ['2024年改造后设施一流', '24小时开放的理工图书馆', '跨学科实验室集群'],
      warnings: ['研究生工位需提前申请', '部分实验楼周末关闭'],
      recommendation: '核心学术区域，理工科留学生主要活动范围',
      forumSignals: ['新实验室设备好评', '工位申请竞争激烈'],
    },
  },
  {
    id: 'titech-suzukake', name: 'すずかけ台校区', nameEn: 'Suzukakedai Campus',
    category: 'academic', lat: 35.6220, lng: 139.6500, shortLabel: 'すずかけ台',
    summary: '生命理工学研究科校区，靠近长津田站，环境安静',
    tags: ['生命理工', '安静校区', '绿地'],
    scores: { convenience: 62, costPressure: 55, safety: 92, noiseLevel: 20, friendliness: 55, cultureShockRisk: 45 },
    detail: {
      highlights: ['环境极其安静适合研究', '校园内绿植丰富', '与自然融合的建筑设计'],
      warnings: ['距主校区30分钟巴士', '周边餐饮选择少', '便利店步行10分钟'],
      recommendation: '适合需要专注研究的博士生，但日常便利性偏低',
      forumSignals: ['安静但偏', '适合做实验'],
    },
  },
  {
    id: 'titech-library', name: '东京工业大学中央图书馆', nameEn: 'Tokyo Tech Central Library',
    category: 'academic', lat: 35.6038, lng: 139.6810, shortLabel: '中央图书馆',
    summary: '藏书120万册，理工科资料齐全，24H自习区',
    tags: ['自习', '藏书丰富', '24H开放'],
    scores: { convenience: 85, costPressure: 30, safety: 95, noiseLevel: 15, friendliness: 70, cultureShockRisk: 30 },
    detail: {
      highlights: ['24小时自习区', '英文藏书占比高', '免费打印区'],
      warnings: ['期末期间座位紧张', '部分日文资料无英文翻译'],
      recommendation: '留学生最常去的学术据点，自习首选',
    },
  },
  {
    id: 'titech-food', name: '大冈山站前学生食堂区', nameEn: 'Ookayama Station Food Zone',
    category: 'life', lat: 35.6070, lng: 139.6850, shortLabel: '学生食堂区',
    summary: '大冈山站周边密集分布500日元以内的学生套餐店',
    tags: ['平价餐饮', '拉面', '定食', '500日元以内'],
    scores: { convenience: 90, costPressure: 35, safety: 88, noiseLevel: 55, friendliness: 72, cultureShockRisk: 35 },
    detail: {
      highlights: ['500日元以下套餐选择多', '松屋/吉野家/食堂连片', '部分店铺有英文菜单'],
      warnings: ['高峰期12-13点需排队', '周末部分店休息'],
      recommendation: '留学生午餐首选区域，性价比极高',
    },
  },
  {
    id: 'titech-quiet-cafe', name: '自由丘咖啡馆区', nameEn: 'Jiyugaoka Cafe Area',
    category: 'life', lat: 35.6075, lng: 139.6685, shortLabel: '自由丘咖啡',
    summary: '东急东横线2站可达的文艺咖啡馆聚集地，适合远程自习',
    tags: ['咖啡馆', '安静', '文艺', '远程自习'],
    scores: { convenience: 75, costPressure: 55, safety: 92, noiseLevel: 25, friendliness: 80, cultureShockRisk: 28 },
    detail: {
      highlights: ['日系精品咖啡集中地', '多数有WiFi和插座', '甜点水准极高'],
      warnings: ['单杯咖啡500-800日元偏贵', '部分店限时2小时'],
      recommendation: '周末自习或放松的好去处',
    },
  },
  {
    id: 'titech-metro', name: '大冈山站（东急大井町线/目黑线）', nameEn: 'Ookayama Station',
    category: 'life', lat: 35.6080, lng: 139.6840, shortLabel: '大冈山站',
    summary: '双线换乘站，直达涩谷15分钟，目黑10分钟',
    tags: ['交通枢纽', '涩谷15分', '目黑10分'],
    scores: { convenience: 92, costPressure: 50, safety: 90, noiseLevel: 48, friendliness: 68, cultureShockRisk: 32 },
    detail: {
      highlights: ['涩谷15分钟直达', '目黑线直达目黑/白金台', '始发站早班有座'],
      warnings: ['早高峰8-9点极度拥挤', '末班车约0:15'],
      recommendation: '通勤便利性在东京圈内中上，双线优势明显',
    },
  },
  {
    id: 'titech-rental', name: '大冈山·北千束学生公寓区', nameEn: 'Ookayama Kitasenzoku Student Housing',
    category: 'housing', lat: 35.6110, lng: 139.6880, shortLabel: '学生公寓区',
    summary: '距校区步行10分钟的学生公寓聚集区，月租6-8万日元',
    tags: ['学生公寓', '6-8万/月', '步行10分'],
    scores: { convenience: 82, costPressure: 58, safety: 85, noiseLevel: 38, friendliness: 55, cultureShockRisk: 52 },
    detail: {
      highlights: ['步行10分钟到校区', '6-8万含水电的公寓多', '周边有超市和百元店'],
      warnings: ['部分老旧公寓隔音差', '外国学生需保证人', '退房清扫费约3万日元'],
      recommendation: '预算有限的首选区域',
      forumSignals: ['留学生扎堆', '老房子隔音是硬伤'],
    },
  },
  {
    id: 'titech-highrent', name: '自由丘·绿丘高级住宅区', nameEn: 'Jiyugaoka Premium Area',
    category: 'housing', lat: 35.6050, lng: 139.6700, shortLabel: '高级住宅区',
    summary: '环境优美但租金12万+，适合预算充裕的学生',
    tags: ['高级住宅', '12万+/月', '环境优美'],
    scores: { convenience: 68, costPressure: 88, safety: 95, noiseLevel: 18, friendliness: 45, cultureShockRisk: 65 },
    detail: {
      highlights: ['治安极好', '环境安静绿化率高', '步行到自由丘商圈'],
      warnings: ['月租12万日元起', '周边几乎没有留学生', '日语环境为主'],
      recommendation: '预算充裕且希望安静的学生可考虑',
    },
  },
  {
    id: 'titech-agency', name: '大冈山站前不动产中介区', nameEn: 'Ookayama Real Estate Agency Zone',
    category: 'housing', lat: 35.6085, lng: 139.6865, shortLabel: '不动产中介',
    summary: '5家以上不动产中介集中区域，留学生租房主要渠道',
    tags: ['不动产', '中介', 'guarantor', '签约'],
    scores: { convenience: 78, costPressure: 62, safety: 82, noiseLevel: 42, friendliness: 48, cultureShockRisk: 60 },
    detail: {
      highlights: ['中介集中可比较价格', '部分有中文服务', '校区周边房源信息多'],
      warnings: ['礼金/敷金需额外2-3个月', '保证会社审查严格', '部分中介对外国学生有隐性歧视'],
      recommendation: '提前了解日本租房规则，找有留学生服务经验的中介',
      forumSignals: ['保证人问题最头疼', '礼金就是打水漂'],
    },
  },
  {
    id: 'titech-complaint', name: '大冈山商店街噪音投诉区', nameEn: 'Ookayama Shopping Street Noise Zone',
    category: 'forum', lat: 35.6095, lng: 139.6830, shortLabel: '噪音投诉区',
    summary: '商店街深夜居酒屋噪音问题频发，周边住户投诉集中',
    tags: ['噪音', '居酒屋', '深夜扰民'],
    scores: { convenience: 85, costPressure: 45, safety: 72, noiseLevel: 78, friendliness: 55, cultureShockRisk: 40 },
    detail: {
      highlights: ['白天商业设施齐全便利'],
      warnings: ['深夜居酒屋噪音到凌晨', '垃圾收集早5点', '周末深夜行人嘈杂'],
      recommendation: '选择远离主街面的房间，高楼层影响较小',
      forumSignals: ['凌晨2点还在吵', '换到高层好多了'],
    },
  },
  {
    id: 'titech-friendly', name: '留学生会馆周边', nameEn: 'International Student Hub',
    category: 'forum', lat: 35.6042, lng: 139.6795, shortLabel: '留学生友好区',
    summary: '留学生会馆+国际交流中心所在区域，英语支持度高',
    tags: ['留学生', '英语支持', '国际交流'],
    scores: { convenience: 75, costPressure: 48, safety: 90, noiseLevel: 30, friendliness: 88, cultureShockRisk: 25 },
    detail: {
      highlights: ['国际交流中心英语服务', '留学生社团活动频繁', '老乡会资源丰富'],
      warnings: ['会馆房间有限需抽签', '部分活动日语为主'],
      recommendation: '初到日本首选落脚点，社交网络建立快',
      forumSignals: ['会馆抽签靠运气', '老乡会真的有用'],
    },
  },
  {
    id: 'titech-language', name: '北千束日语环境区', nameEn: 'Kitasenzuku Japanese-Dominant Area',
    category: 'forum', lat: 35.6140, lng: 139.6900, shortLabel: '日语环境区',
    summary: '生活设施完善但几乎无英语支持，日语初学者有障碍',
    tags: ['日语环境', '语言障碍', '无英文菜单'],
    scores: { convenience: 70, costPressure: 42, safety: 88, noiseLevel: 32, friendliness: 38, cultureShockRisk: 72 },
    detail: {
      highlights: ['物价低于大冈山站前', '地道日本生活体验'],
      warnings: ['餐厅基本无英文菜单', '医院需日语沟通', '邻里交往需日语基础'],
      recommendation: '日语N3以上可挑战，初学者建议先住大冈山站前',
      forumSignals: ['不会日语别住这边', '省钱但压力也大'],
    },
  },
  {
    id: 'titech-sony', name: 'ソニー·日立就职核心圈', nameEn: 'Sony-Hitachi Employment Zone',
    category: 'academic', lat: 35.6020, lng: 139.6840, shortLabel: '就职强区',
    summary: '东工大2024年索尼系录用56人、日立29人、NTT数据25人，知名400企业就职率全国第3',
    tags: ['就职', '索尼', '日立', 'NTT', '98%就职率'],
    scores: { convenience: 80, costPressure: 65, safety: 88, noiseLevel: 35, friendliness: 75, cultureShockRisk: 25 },
    detail: {
      highlights: ['理工科就职率约98%', '索尼系2024年录用56人', '日立29人/NTT数据25人', '知名400企业就职率全国第3'],
      warnings: ['就职活动需提前1年', '日语能力影响大', '部分企业只招日语N1'],
      recommendation: '东工大毕业生理工科就职竞争力极强',
      forumSignals: ['就职真的强', '索尼是最大雇主'],
    },
  },
];

const tokyoTechPosts: ForumPost[] = [
  { id: 'p-zh-1', source: '知乎', author: '东工大修士在读', text: '教授在我来一周左右就给了课题。研究室设备太豪华，人均一台SEM扫描电镜。', createdAt: '2025-03-15' },
  { id: 'p-zh-2', source: '知乎', author: '日本留学老司机', text: '东工大就职是全日本大学中最容易的之一。理工科日本就职率约98%。索尼系56人，日立29人，NTT数据25人。', createdAt: '2025-02-10' },
  { id: 'p-zh-3', source: '知乎', author: '匿名用户', text: '东工大宿舍中签率只有个位数。目黑区1K月租7-10万，头金要准备4-7个月房租。', createdAt: '2025-01-20' },
  { id: 'p-zh-5', source: '知乎', author: '东工大PhD', text: 'すずかけ台校区被形容为"乡下校区"，只有1间食堂和1间超市，ATM和邮筒各一个。', createdAt: '2025-03-28' },
  { id: 'p-xhs-1', source: '小红书', author: '东工大留学生活', text: '大冈山食堂500日元就能吃很饱。四川屋台担担面是隐藏食堂。涩谷15分钟，自由之丘3分钟。', createdAt: '2025-03-20' },
  { id: 'p-xhs-2', source: '小红书', author: '日本租房日记', text: 'SUUMO日文版比中文版房源全很多。UR团地不需要礼金押金，拿学生证和在留卡就能申请。', createdAt: '2025-04-08' },
  { id: 'p-xhs-4', source: '小红书', author: '东京生活账本', text: '东工大留学生一个月真实花销约12-13万日元（约6000人民币）。share house是关键。', createdAt: '2025-05-01' },
  { id: 'p-red-1', source: 'Reddit r/japanlife', author: 'titech_grad', text: "Tokyo Tech's research facilities are world-class. My lab has equipment most Western universities would kill for.", createdAt: '2025-03-10' },
  { id: 'p-red-2', source: 'Reddit r/Tokyo', author: 'ookayama_resident', text: 'Living near Ookayama station: 15 min to Shibuya. Only complaint is morning rush 8:00-9:00.', createdAt: '2025-04-02' },
  { id: 'p-red-5', source: 'Reddit r/Tokyo', author: 'titech_employ', text: 'Graduated Tokyo Tech 2024. Nearly everyone in my cohort had job offers 6+ months before graduation.', createdAt: '2025-03-22' },
  { id: 'p-5ch-1', source: '5ch', author: '名無し', text: '大岡山の商店街、深夜まで居酒屋うるさい。早朝はゴミ収集車もうるさい。', createdAt: '2025-02-10' },
  { id: 'p-5ch-2', source: '5ch', author: '名無し', text: '東工大の学食はコスパ最強。特に第二食堂の唐揚げ定食は500円以下。', createdAt: '2025-03-05' },
];

const tokyoTechForumAnalysis: ForumAnalysisResult = {
  sentiment: 'mixed', sentimentScore: 65,
  sentimentBreakdown: { positive: 7, neutral: 2, negative: 3 },
  cultureShockRisk: 52, friendlinessScore: 68,
  topKeywords: ['就职强', '租房门槛', '设施一流', '索尼', '日立', '四川屋台', '大冈山', '保证会社'],
  riskTags: ['初期费用高', '保证会社审查', '深夜噪音', '部分日语环境', 'すずかけ台生活不便'],
  highlights: ['理工科就职率98%', '人均SEM顶级设备', '涩谷15分交通便利', '学食500日元以下'],
  summary: '东工大是日本理工科最强就职校之一。主要痛点：租房初期费用高、保证会社审查、すずかけ台生活不便。建议提前3个月准备租房。',
};

const tokyoTechRiskRefs: RiskPole[] = [
  { center: [35.6095, 139.6830], intensity: 0.88, radius: 420, label: '居酒屋街深夜噪音' },
  { center: [35.6050, 139.6700], intensity: 0.92, radius: 470, label: '自由之丘高租金' },
  { center: [35.6140, 139.6900], intensity: 0.78, radius: 380, label: '北千束日语环境门槛' },
  { center: [35.6085, 139.6865], intensity: 0.72, radius: 350, label: '不动产中介·初期费用高' },
  { center: [35.6110, 139.6770], intensity: 0.58, radius: 320, label: '语言壁垒' },
  { center: [35.6220, 139.6500], intensity: 0.65, radius: 400, label: 'すずかけ台生活不便' },
  { center: [35.6075, 139.6910], intensity: 0.62, radius: 310, label: '早高峰通勤拥挤' },
  { center: [35.6042, 139.6795], intensity: 0.12, radius: 280, label: '留学生会馆+国际交流中心' },
  { center: [35.6058, 139.6838], intensity: 0.10, radius: 250, label: '校园核心安全区' },
  { center: [35.6075, 139.6685], intensity: 0.18, radius: 250, label: '自由之丘生活区' },
];

const tokyoTechHeatZones = generateHeatGrid(35.6050, 139.6820, tokyoTechRiskRefs, 0.003, 0.020);

export const TOKYO_TECH_PROFILE: PlaceProfile = {
  id: 'tokyo-titech', name: '东京工业大学', nameEn: 'Tokyo Institute of Technology',
  country: '日本', city: '东京', cityId: 'tokyo',
  lat: 35.6050, lng: 139.6820, zoom: 15,
  keywords: ['东京工业大学', '东工大', 'tokyo tech', 'titech', '大冈山'],
  overview: '东京工业大学是日本顶尖理工类国立大学，QS全球排名91。大冈山校区交通便利（涩谷15分钟），周边生活完善，但租房成本和语言适应是主要挑战。',
  scores: tokyoTechScores, pois: tokyoTechPois,
  forumPosts: tokyoTechPosts, forumAnalysis: tokyoTechForumAnalysis,
  heatZones: tokyoTechHeatZones,
};

// ==================== 早稻田大学 ====================
const wasedaPois: PoiItem[] = [
  {
    id: 'waseda-main', name: '早稻田校区', nameEn: 'Waseda Campus',
    category: 'academic', lat: 35.7088, lng: 139.7240, shortLabel: '主校区',
    summary: '早稻田大学主校区，政治经济学部等核心学部所在地',
    tags: ['大隈讲堂', '政治学', '经济学'],
    scores: { convenience: 85, costPressure: 60, safety: 82, noiseLevel: 45, friendliness: 70, cultureShockRisk: 38 },
    detail: {
      highlights: ['国际化程度日本顶尖', '留学生比例高', '英语项目丰富'],
      warnings: ['部分学部竞争激烈', '校内设施部分老化'],
      recommendation: '留学生融入度最高的日本大学之一',
    },
  },
  {
    id: 'waseda-food', name: '高田马场学生街', nameEn: 'Takadanobaba Student Town',
    category: 'life', lat: 35.7120, lng: 139.7190, shortLabel: '学生街',
    summary: '日本最著名的学生街之一，餐饮娱乐设施密集且价格低廉',
    tags: ['学生街', '平价', '拉面激战区', '夜生活'],
    scores: { convenience: 92, costPressure: 38, safety: 72, noiseLevel: 65, friendliness: 75, cultureShockRisk: 30 },
    detail: {
      highlights: ['300日元起的学生套餐', '拉面店密集度东京第一', '二手书店街'],
      warnings: ['夜间居酒屋区较吵', '治安一般需注意'],
      recommendation: '早大留学生生活核心区域，性价比极高',
    },
  },
  {
    id: 'waseda-housing', name: '高田马场·早稻田租房区', nameEn: 'Takadanobaba Housing Area',
    category: 'housing', lat: 35.7140, lng: 139.7150, shortLabel: '租房区',
    summary: '学生合租房源丰富，5-8万日元可找到合适住所',
    tags: ['合租', '5-8万/月', '学生多'],
    scores: { convenience: 85, costPressure: 50, safety: 70, noiseLevel: 55, friendliness: 68, cultureShockRisk: 35 },
    detail: {
      highlights: ['合租房源多', '早大生租房信息丰富', '交通方便'],
      warnings: ['老旧公寓比例高', '隔音普遍较差'],
      recommendation: '预算有限且希望社交的留学生首选',
    },
  },
];

export const WASEDA_PROFILE: PlaceProfile = {
  id: 'waseda', name: '早稻田大学', nameEn: 'Waseda University',
  country: '日本', city: '东京', cityId: 'tokyo',
  lat: 35.7088, lng: 139.7240, zoom: 15,
  keywords: ['早稻田大学', '早大', 'waseda', '高田马场'],
  overview: '早稻田大学是日本顶尖私立大学，国际化程度极高，留学生比例日本最高之一。高田马场学生街生活便利且价格低廉。',
  scores: { convenience: 85, costPressure: 68, safety: 78, noiseLevel: 55, friendliness: 72, cultureShockRisk: 42 },
  pois: wasedaPois, forumPosts: [],
  forumAnalysis: {
    sentiment: 'positive', sentimentScore: 72, cultureShockRisk: 38, friendlinessScore: 75,
    topKeywords: ['国际化', '学生街', '平价', '社交', '英语友好'],
    riskTags: ['夜间噪音', '老房子隔音'],
    highlights: ['国际化程度日本顶尖', '学生街性价比极高'],
    summary: '早稻田大学是留学生融入度最高的日本大学之一。',
  },
  heatZones: generateHeatGrid(35.7092, 139.7324, [
    { center: [35.7100, 139.7340], radius: 300, intensity: 0.8 },
    { center: [35.7130, 139.7300], radius: 250, intensity: 0.6 },
    { center: [35.7092, 139.7324], radius: 250, intensity: 0.1 },
  ]),
};

// ==================== UCL ====================
const uclPois: PoiItem[] = [
  {
    id: 'ucl-main', name: 'Bloomsbury 主校区', nameEn: 'Bloomsbury Campus',
    category: 'academic', lat: 51.5245, lng: -0.1340, shortLabel: '主校区',
    summary: 'UCL 主校区位于伦敦市中心，紧邻大英博物馆和大英图书馆',
    tags: ['Russell Square', '大英博物馆', '中心伦敦'],
    scores: { convenience: 95, costPressure: 85, safety: 65, noiseLevel: 55, friendliness: 80, cultureShockRisk: 35 },
    detail: {
      highlights: ['伦敦市中心黄金地段', '大英图书馆步行2分钟', '国际化程度极高'],
      warnings: ['周边消费水平高', '旅游区人流大'],
      recommendation: '学术与城市体验完美结合，但需做好高生活成本预算',
    },
  },
  {
    id: 'ucl-housing', name: 'Camden/Euston 学生租房带', nameEn: 'Camden Euston Student Housing',
    category: 'housing', lat: 51.5290, lng: -0.1380, shortLabel: '租房区',
    summary: '距校区步行15-20分钟的学生租房集中区，月租 £800-1200',
    tags: ['学生合租', '£800-1200/月', 'Zone 1-2'],
    scores: { convenience: 78, costPressure: 82, safety: 58, noiseLevel: 55, friendliness: 72, cultureShockRisk: 32 },
    detail: {
      highlights: ['步行/公交可达校区', '合租房源多'],
      warnings: ['租金含bill需确认', '部分老房子供暖差'],
      recommendation: '适合与同学合租，预算有限可考虑Zone 3通勤',
    },
  },
];

export const UCL_PROFILE: PlaceProfile = {
  id: 'london-ucl', name: '伦敦大学学院', nameEn: 'University College London',
  country: '英国', city: '伦敦', cityId: 'london',
  lat: 51.5245, lng: -0.1340, zoom: 15,
  keywords: ['伦敦大学学院', 'UCL', 'university college london', '伦敦', 'london'],
  overview: 'UCL是英国G5超级精英大学，QS全球第9。主校区位于伦敦市中心Bloomsbury，学术资源与城市文化体验兼备。',
  scores: { convenience: 90, costPressure: 88, safety: 62, noiseLevel: 58, friendliness: 78, cultureShockRisk: 40 },
  pois: uclPois, forumPosts: [],
  forumAnalysis: {
    sentiment: 'mixed', sentimentScore: 65, cultureShockRisk: 42, friendlinessScore: 78,
    topKeywords: ['Bloomsbury', '房租', '国际化', '伦敦'],
    riskTags: ['高生活成本', '租房压力', '学费上涨'],
    highlights: ['地理位置无可挑剔', '国际化程度极高'],
    summary: 'UCL学术资源与城市体验极佳。主要挑战来自伦敦高昂的生活与租房成本。',
  },
  heatZones: generateHeatGrid(51.5245, -0.1340, [
    { center: [51.5308, -0.1238], radius: 400, intensity: 0.80 },
    { center: [51.5290, -0.1380], radius: 350, intensity: 0.72 },
    { center: [51.5243, -0.1335], radius: 250, intensity: 0.10 },
  ]),
};

// ==================== MIT ====================
const mitPois: PoiItem[] = [
  {
    id: 'mit-main', name: 'Kendall Square 主校区', nameEn: 'Kendall Square Campus',
    category: 'academic', lat: 42.3601, lng: -71.0942, shortLabel: '主校区',
    summary: 'MIT 主校区位于 Cambridge Kendall Square，全球科技创新中心',
    tags: ['Kendall Square', '查尔斯河', '科技中心'],
    scores: { convenience: 82, costPressure: 80, safety: 75, noiseLevel: 38, friendliness: 68, cultureShockRisk: 42 },
    detail: {
      highlights: ['全球最强STEM研究环境', 'Kendall Square科技公司云集', '查尔斯河畔环境优美'],
      warnings: ['学术压力极大', 'Cambridge生活成本高', '冬天严寒'],
      recommendation: '顶尖学术环境，适合抗压能力强、目标明确的学生',
    },
  },
  {
    id: 'mit-housing', name: 'Somerville/Port 学生租房带', nameEn: 'Somerville Student Housing',
    category: 'housing', lat: 42.3850, lng: -71.1050, shortLabel: '租房区',
    summary: 'MIT 研究生主要居住区，$1200-1800/月(合租)',
    tags: ['合租', '$1200-1800', '公交通勤'],
    scores: { convenience: 68, costPressure: 78, safety: 65, noiseLevel: 42, friendliness: 70, cultureShockRisk: 38 },
    detail: {
      highlights: ['Somerville社区氛围好', '比Kendall便宜30-40%'],
      warnings: ['冬季通勤辛苦', '好房源竞争激烈'],
      recommendation: 'MIT研究生首选Somerville/Port，性价比远高于Kendall核心区',
    },
  },
];

export const MIT_PROFILE: PlaceProfile = {
  id: 'boston-mit', name: '麻省理工学院', nameEn: 'Massachusetts Institute of Technology',
  country: '美国', city: '波士顿', cityId: 'boston',
  lat: 42.3601, lng: -71.0942, zoom: 15,
  keywords: ['麻省理工学院', 'MIT', 'massachusetts institute', '波士顿', 'boston', '剑桥'],
  overview: 'MIT是世界顶尖理工科大学，QS全球第1。主校区位于剑桥市Kendall Square，是全球科技创新中心。',
  scores: { convenience: 78, costPressure: 85, safety: 72, noiseLevel: 40, friendliness: 65, cultureShockRisk: 48 },
  pois: mitPois, forumPosts: [],
  forumAnalysis: {
    sentiment: 'positive', sentimentScore: 72, cultureShockRisk: 45, friendlinessScore: 65,
    topKeywords: ['学术压力', 'Kendall Square', '冬季', '科技', '实习'],
    riskTags: ['高房租', '学术压力', '冬季严寒'],
    highlights: ['全球最强STEM环境', '实习/就业机会极多'],
    summary: 'MIT拥有世界顶级科研环境与就业资源，但学术竞争激烈、生活成本高。',
  },
  heatZones: generateHeatGrid(42.3601, -71.0942, [
    { center: [42.3580, -71.0880], radius: 350, intensity: 0.78 },
    { center: [42.3850, -71.1050], radius: 400, intensity: 0.75 },
    { center: [42.3603, -71.0935], radius: 250, intensity: 0.08 },
  ]),
};

// ==================== 搜索列表 ====================
export const SEARCH_LOCATIONS: SearchLocation[] = [
  { id: 'tokyo-titech', cityId: 'tokyo', name: '东京工业大学', nameEn: 'Tokyo Tech', country: '日本', lat: 35.6050, lng: 139.6820, zoom: 15, keywords: ['东京工业大学', '东工大', 'tokyo tech', 'titech', '大冈山'] },
  { id: 'waseda', cityId: 'tokyo', name: '早稻田大学', nameEn: 'Waseda Univ.', country: '日本', lat: 35.7088, lng: 139.7240, zoom: 15, keywords: ['早稻田大学', '早大', 'waseda', '高田马场'] },
  { id: 'london-ucl', cityId: 'london', name: '伦敦大学学院', nameEn: 'UCL', country: '英国', lat: 51.5245, lng: -0.1340, zoom: 15, keywords: ['伦敦大学学院', 'UCL', 'university college london', '伦敦'] },
  { id: 'boston-mit', cityId: 'boston', name: '麻省理工学院', nameEn: 'MIT', country: '美国', lat: 42.3601, lng: -71.0942, zoom: 15, keywords: ['麻省理工学院', 'MIT', 'massachusetts institute', '波士顿', '剑桥'] },
];

export const ALL_PROFILES: PlaceProfile[] = [TOKYO_TECH_PROFILE, WASEDA_PROFILE, UCL_PROFILE, MIT_PROFILE];

export function getProfileById(id: string): PlaceProfile | undefined {
  return ALL_PROFILES.find((p) => p.id === id);
}
export function getFirstProfileByCityId(cityId: string): PlaceProfile | undefined {
  return ALL_PROFILES.find((p) => p.cityId === cityId);
}
export function searchSchools(query: string): SchoolSearchResult[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase().trim();
  const results: SchoolSearchResult[] = [];
  for (const loc of SEARCH_LOCATIONS) {
    const match = loc.name.toLowerCase().includes(q) || loc.nameEn.toLowerCase().includes(q) || loc.keywords.some((k) => k.toLowerCase().includes(q));
    if (match) {
      const profile = getProfileById(loc.id);
      if (profile) results.push({ profile, location: loc });
    }
  }
  return results;
}
