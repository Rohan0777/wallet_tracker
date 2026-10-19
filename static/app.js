// OnChain Detective App JS (v9.1 - Related-Wallet Pivot Detective, Relation Score & Recovery Funnel Release)

let currentChain = 'unified';
let currentData = null;
let currentLanguage = 'ko';
let minUsdThreshold = 0;
let walletTypeFilter = 'all'; // 'all' or 'mine'
let pivotTrail = []; // [{ chain, address, label }]
let activeSheetWallet = null;
let partnerAdConfig = {
  affiliate_url: 'https://shop.ledger.com',
  exchange_referral_url: 'https://accounts.binance.com/register',
  okx_referral_url: 'https://www.okx.com/join',
  bybit_referral_url: 'https://www.bybit.com/invite',
  partners: []
};

// ============================================================================
// 1. STATIC UI TRANSLATION DICTIONARIES (ko, en, zh, ja, es, ru)
// ============================================================================
const I18N = {
  ko: {
    metaTitle: 'Wake Up Crypto | 멀티체인 방치 자산 & 다계정 역추적 솔루션',
    appTitle: 'Wake Up Crypto',
    appDesc: '다계정 에어드랍 지갑 역추적 & 방치 자산 스캐너',
    readonlyBadge: '내 지갑 트랜잭션 조회',
    btnCoffee: '커피 후원',
    themeToggleTitle: '라이트/다크 테마 전환',
    adBanner: '콜드월렛 Ledger & Trezor — 되찾은 자산을 스캠과 드레이너로부터 안전하게 분리 보관하세요',
    adCta: '공식 스토어',
    tabUnified: '전체 통합',
    tabUnifiedSub: '4대체인+브릿지',
    tabSolanaSub: 'SPL · 스테이킹',
    tabEthereumSub: 'ERC-20 실시간',
    tabBscSub: 'BEP-20 실시간',
    tabTronSub: 'TRC-20 실시간',
    inputPlaceholder: '조회할 실제 지갑 주소를 입력하세요...',
    btnAnalyze: '온체인 스캔',
    presetLabel: '내 기본 지갑 주소:',
    scanningStatus: '실시간 블록체인 노드 조회 중...',
    logStep1: '온체인 잔고 및 스테이킹 계정 조회 중...',
    logStep1Done: '온체인 원장 잔고 확인 완료',
    logStep2: '실제 입출금 카운터파티 지갑 클러스터링 중...',
    logStep3Done: '더미 없는 실제 온체인 데이터 매핑 완료',
    mindmapTitle: '온체인 자금 흐름 & 다계정 클러스터',
    filterAll: '전체',
    filterMine: '내 지갑만',
    resetZoomTitle: '화면 중앙 정렬',
    legendMain: '메인 지갑',
    legendStaked: '네이티브 스테이킹',
    legendSub: '내 보조지갑 추정',
    legendCex: '거래소',
    emptyNotice: '설정한 최소 금액 조건을 만족하는 연관 지갑이 없습니다.',
    resetUsdFilter: '필터 초기화 ($0)',
    usdFilterLabel: '다이어그램 금액 필터',
    usdAbove: '이상',
    visibleWallets: '표시 지갑',
    summaryTitle: '조회된 총 온체인 자산',
    summaryDesc: '더미 데이터 없이 실제 블록체인 원장에서 직접 조회한 네이티브 스테이킹, 토큰 계정 렌트비 및 보유 잔고 합계입니다.',
    metricStaked: '네이티브 스테이킹',
    metricRent: '빈 계정 렌트비',
    metricTokens: '지갑 보유 토큰',
    walletsTitle: '식별된 연관 지갑 클러스터',
    unitWallets: '개 지갑',
    unitItems: '건',
    noTxMessage: '조회된 연관 외부/보조 지갑 트랜잭션이 없습니다.',
    noMatchFilterMessage: '현재 필터 조건에 해당하는 지갑이 없습니다.',
    txCountLabel: '트젝',
    protocolLabel: '프로토콜:',
    balLabel: '잔고',
    volLabel: '이동',
    detailsBtn: '상세보기 →',
    targetsTitle: '온체인 자산 및 외부 프로토콜 내역',
    emptyTargetTitle: '감지된 방치 자산 및 외부 프로토콜',
    emptyTargetDesc: '해당 주소에서 잠든 스테이킹이나 외부 디파이(DeFi) 예치 내역이 발견되지 않았습니다.',
    extProtocolPrefix: '외부 프로토콜:',
    sponsoredAdBadge: 'SPONSORED · 외부 프로토콜 공란 광고 영역',
    sponsoredAdTitle: '수수료 할인 & 안전한 하드웨어 지갑 보관',
    sponsoredAdDesc: '외부 디파이에 묶이지 않은 내 소중한 코인을 콜드월렛(Ledger)으로 안전하게 지키거나 공식 거래소 수수료 혜택을 받으세요.',
    sponsoredAdCta: '확인하기 →',
    sheetCopy: '주소 복사',
    sheetTxs: '전체 트랜잭션',
    sheetBal: '현재 지갑 잔고',
    sheetVol: '누적 이동 금액',
    sheetMidTitle: '지갑 잔고 및 외부 프로토콜 예치 내역',
    extDefiProtocol: '연관 외부 DeFi 프로토콜',
    topTxHistoryTitle: '주요 입출금 트랜잭션 기록 (일시 · 금액)',
    dateUnknown: '날짜 미상',
    sheetBlankProtoTitle: '연관 외부 프로토콜 정보:',
    sheetBlankProtoDesc: '이 지갑은 Kamino나 SunSwap 등 외부 디파이(DeFi) 프로토콜에 예치되지 않은 <strong>순수 지갑 / 네이티브 스테이킹 계정</strong>입니다. 공식 블록 익스플로러에서 안전하게 원장 내역을 확인할 수 있습니다.',
    sheetAdBadge: 'SPONSORED AD · 프로토콜 공란 영역',
    sheetAdLink: '보안 가이드 →',
    sheetAdDesc: '네이티브 스테이킹 해제 후 회수한 코인을 하드웨어 지갑으로 안전하게 이전하여 해킹 위험을 차단하세요.',
    sheetEscapeTitle: '프로토콜 탈출 안내',
    officialVerified: '공식 검증 도메인',
    officialLinkPrefix: '공식 익스플로러 / 사이트:',
    safetyNotice: '※ 피싱 방지를 위해 최상위 공식 도메인 주소 전체를 표시하며, 사이트 내 서명을 요구하지 않습니다.',
    toastCopied: '지갑 주소가 클립보드에 복사되었습니다.',
    coffeeTitle: '개발자에게 커피 사주기',
    coffeeSub: '디지털 우주를 떠도는 나의 $1,000를 기리며...',
    coffeeStory1: '상승장때 이곳저곳 기웃거리다 \'에어드랍\' 이란걸 알게되었습니다. 어떻게 하는지도 잘 모르는데 다계정 해보겠다고 지갑 수십개 만들고 휴대폰 잃어버리고 다음상승장때 까먹고.. 분명히 내 지갑에 돈이 있었는데.. 어디간지 모를 <strong>$1,000</strong> 을 찾으려고 만든 추적기 입니다. (결국 제 $1,000는 끝내 찾지 못했지만요... 🥲)',
    coffeeStory2: '잠자던 자산을 찾으셨다면, 다음 체인을 추적할 수 있도록 따뜻한 커피 한 잔 후원해 주세요!',
    coffeeCopyBtn: '복사',
    blankProtocol: '— (공란 · 연관 외부 프로토콜 없음)',
    badgeUnified: '4대 체인 · 브릿지 통합조회',
    badgeSolana: '4.13 SOL 네이티브 스테이킹',
    badgeEthereum: '실시간 ERC-20 조회',
    badgeBsc: '실시간 BEP-20 조회',
    badgeTron: '실시간 TRC-20 조회',
    rootWalletLabel: '내 메인 조회 지갑 (Root Address)',
    rootWalletReason: '현재 스캔 기준이 되는 중심 지갑입니다.',
    rateLimitBadge: '스캔 제한: <strong class="text-slate-800 dark:text-slate-200">분당 최대 25회 (약 2.4초당 1회)</strong> · 15분 캐시 보호',
    scanCooldown: '조회 대기 중... ({sec}초 후 가능)',
    rateLimitExceeded: '분당 최대 실시간 스캔 횟수(25회)를 초과했습니다. 잠시 후 다시 시도해 주세요.',
    networkError: '네트워크 또는 서버 응답 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    targetNotice: '<strong>지갑을 잃어버린 코린이 전용 탐색기입니다.</strong> 거래내역(트랜잭션)이 너무 많은 지갑(거래소·봇 등)은 원활한 조회를 위해 검색을 지양해 주세요.'
  },
  en: {
    metaTitle: 'Wake Up Crypto | Multi-Chain Airdrop Tracer & Forgotten Asset Scanner',
    appTitle: 'Wake Up Crypto',
    appDesc: 'Multi-Account Airdrop Tracer & Forgotten Asset Scanner',
    readonlyBadge: 'My Wallet Transactions',
    btnCoffee: 'Buy Coffee',
    themeToggleTitle: 'Toggle Light/Dark Theme',
    adBanner: 'Ledger & Trezor Hardware Wallets — Secure your crypto against phishing drainers',
    adCta: 'Official Store',
    tabUnified: 'Unified All',
    tabUnifiedSub: '4 Chains + Bridge',
    tabSolanaSub: 'SPL · Staking',
    tabEthereumSub: 'ERC-20 Live',
    tabBscSub: 'BEP-20 Live',
    tabTronSub: 'TRC-20 Live',
    inputPlaceholder: 'Enter wallet address to scan...',
    btnAnalyze: 'Scan Chain',
    presetLabel: 'Default Wallet:',
    scanningStatus: 'Querying live blockchain nodes...',
    logStep1: 'Querying on-chain balances & staking accounts...',
    logStep1Done: 'On-chain ledger balance confirmed',
    logStep2: 'Clustering counterparty transaction wallets...',
    logStep3Done: 'Real on-chain data mapped with zero dummy data',
    mindmapTitle: 'On-Chain Fund Flow & Multi-Account Cluster',
    filterAll: 'All Nodes',
    filterMine: 'My Wallets',
    resetZoomTitle: 'Center View',
    legendMain: 'Main Wallet',
    legendStaked: 'Native Staking',
    legendSub: 'Sub-Wallet (Likely Mine)',
    legendCex: 'CEX Exchange',
    emptyNotice: 'No associated wallets match the minimum USD filter.',
    resetUsdFilter: 'Reset Filter ($0)',
    usdFilterLabel: 'Diagram Value Filter',
    usdAbove: 'min',
    visibleWallets: 'Visible',
    summaryTitle: 'Total On-Chain Assets Found',
    summaryDesc: 'Zero dummy data. Directly queried from live blockchain ledgers: native staking, token account rent, and token balances.',
    metricStaked: 'Native Staking',
    metricRent: 'Account Rent',
    metricTokens: 'Wallet Tokens',
    walletsTitle: 'Identified Associated Wallets',
    unitWallets: 'wallets',
    unitItems: 'items',
    noTxMessage: 'No associated wallet transactions found.',
    noMatchFilterMessage: 'No wallets match current filter condition.',
    txCountLabel: 'txs',
    protocolLabel: 'Protocol:',
    balLabel: 'Bal',
    volLabel: 'Vol',
    detailsBtn: 'Details →',
    targetsTitle: 'On-Chain Assets & External Protocols',
    emptyTargetTitle: 'Detected Assets & Protocols',
    emptyTargetDesc: 'No dormant staking or external DeFi positions found for this address.',
    extProtocolPrefix: 'External Protocol:',
    sponsoredAdBadge: 'SPONSORED · External Protocol Slot',
    sponsoredAdTitle: 'Fee Discounts & Secure Hardware Storage',
    sponsoredAdDesc: 'Protect coins not locked in DeFi with a Ledger cold wallet or enjoy exchange fee benefits.',
    sponsoredAdCta: 'Check Now →',
    sheetCopy: 'Copy Address',
    sheetTxs: 'Total Transactions',
    sheetBal: 'Current Balance',
    sheetVol: 'Cumulative Volume',
    sheetMidTitle: 'Wallet Balance & External Protocol Breakdown',
    extDefiProtocol: 'Associated External DeFi Protocol',
    topTxHistoryTitle: 'Top Transaction History (Date & Amount)',
    dateUnknown: 'Date unknown',
    sheetBlankProtoTitle: 'Associated External Protocol Info:',
    sheetBlankProtoDesc: 'This wallet is a <strong>pure wallet / native staking account</strong> not deposited in external DeFi (Kamino, SunSwap, etc.). You can safely verify ledger records on the official block explorer.',
    sheetAdBadge: 'SPONSORED AD · Empty Protocol Slot',
    sheetAdLink: 'Security Guide →',
    sheetAdDesc: 'Transfer recovered coins after unstaking to a hardware wallet to block phishing and hacking risks.',
    sheetEscapeTitle: 'Protocol Withdrawal Guide',
    officialVerified: 'Verified Official Domain',
    officialLinkPrefix: 'Official Link:',
    safetyNotice: '※ Displays full verified top-level domains to prevent phishing. Never requests signatures.',
    toastCopied: 'Wallet address copied to clipboard.',
    coffeeTitle: 'Buy the Developer a Coffee',
    coffeeSub: 'In memory of my $1,000 lost in the digital universe...',
    coffeeStory1: 'During the bull run, I stumbled upon "airdrops". Without really knowing what I was doing, I created dozens of wallets for multi-accounting, lost my phone, forgot about them by the next cycle... I knew I had money somewhere in my wallets. I built this tracker to recover my missing <strong>$1,000</strong>. (Though in the end, I never did find my $1,000... 🥲)',
    coffeeStory2: 'If you recovered your forgotten assets, buy the developer a warm cup of coffee to support tracking the next chains!',
    coffeeCopyBtn: 'Copy',
    blankProtocol: '— (Blank · No External Protocol)',
    badgeUnified: '4 Chains + Bridge Scan',
    badgeSolana: '4.13 SOL Native Staking',
    badgeEthereum: 'Live ERC-20 Scan',
    badgeBsc: 'Live BEP-20 Scan',
    badgeTron: 'Live TRC-20 Scan',
    rootWalletLabel: 'Main Scan Wallet (Root Address)',
    rootWalletReason: 'Root central wallet for the current scan.',
    rateLimitBadge: 'Scan Rate: <strong class="text-slate-800 dark:text-slate-200">Max 25/min (~1 per 2.4s)</strong> · 15m Cache',
    scanCooldown: 'Cooldown... (wait {sec}s)',
    rateLimitExceeded: 'Scan limit exceeded (max 25 requests/min). Please try again shortly.',
    networkError: 'Network or server error occurred. Please try again shortly.',
    targetNotice: '<strong>Dedicated scanner for crypto beginners looking for lost wallets.</strong> Please avoid scanning wallets with heavy transaction volume (exchanges, bots, etc.) to ensure optimal node performance.'
  },
  zh: {
    metaTitle: 'Wake Up Crypto | 多链沉睡资产与多账号逆向追踪工具',
    appTitle: 'Wake Up Crypto',
    appDesc: '空投多账号逆向追踪 & 链上滞留资产扫描器',
    readonlyBadge: '查询我的钱包交易',
    btnCoffee: '赞助咖啡',
    themeToggleTitle: '切换亮色/暗色主题',
    adBanner: 'Ledger & Trezor 硬件冷钱包 — 彻底隔离钓鱼合约与盗币风险，安全存放找回的资产',
    adCta: '官方商城',
    tabUnified: '全链整合',
    tabUnifiedSub: '4大公链 + 跨链桥',
    tabSolanaSub: 'SPL · 原生质押',
    tabEthereumSub: 'ERC-20 实时',
    tabBscSub: 'BEP-20 实时',
    tabTronSub: 'TRC-20 实时',
    inputPlaceholder: '输入要查询的真实钱包地址...',
    btnAnalyze: '链上扫描',
    presetLabel: '默认钱包地址:',
    scanningStatus: '正在实时查询区块链节点...',
    logStep1: '正在查询链上余额及质押账户...',
    logStep1Done: '链上账本余额确认完毕',
    logStep2: '正在聚类分析实际充提交易对手钱包...',
    logStep3Done: '真实链上数据映射完成 (零虚构数据)',
    mindmapTitle: '链上资金流向 & 关联多账号图谱',
    filterAll: '全部节点',
    filterMine: '仅看我的钱包',
    resetZoomTitle: '居中对齐',
    legendMain: '主钱包',
    legendStaked: '原生质押',
    legendSub: '疑似个人副钱包',
    legendCex: '中心化交易所',
    emptyNotice: '没有符合当前最低金额筛选条件的关联钱包。',
    resetUsdFilter: '重置筛选 ($0)',
    usdFilterLabel: '图谱金额过滤',
    usdAbove: '以上',
    visibleWallets: '显示钱包',
    summaryTitle: '查询到的链上总资产',
    summaryDesc: '无任何模拟虚构数据。直接从区块链链上账本查询的原生质押、代币租金及钱包实际持有代币总额。',
    metricStaked: '原生质押',
    metricRent: '账户租金',
    metricTokens: '钱包代币',
    walletsTitle: '已识别的关联钱包集群',
    unitWallets: '个钱包',
    unitItems: '项',
    noTxMessage: '未查询到关联的外部或副钱包交易记录。',
    noMatchFilterMessage: '没有符合当前筛选条件的钱包。',
    txCountLabel: '笔交易',
    protocolLabel: '协议:',
    balLabel: '余额',
    volLabel: '流转',
    detailsBtn: '查看详情 →',
    targetsTitle: '链上资产与外部协议明细',
    emptyTargetTitle: '检测到的资产与外部协议',
    emptyTargetDesc: '该地址未发现处于沉睡状态的质押或外部 DeFi 存款明细。',
    extProtocolPrefix: '外部协议:',
    sponsoredAdBadge: 'SPONSORED · 外部协议广告位',
    sponsoredAdTitle: '手续费减免 & 硬件冷钱包安全保管',
    sponsoredAdDesc: '将未质押于外部DeFi的珍贵资产安全存入 Ledger 冷钱包，或领取交易所手续费优惠。',
    sponsoredAdCta: '立即查看 →',
    sheetCopy: '复制地址',
    sheetTxs: '总交易数',
    sheetBal: '当前钱包余额',
    sheetVol: '累计流转资金',
    sheetMidTitle: '钱包余额及外部协议质押明细',
    extDefiProtocol: '关联外部 DeFi 协议',
    topTxHistoryTitle: '主要充提交易记录 (日期 · 金额)',
    dateUnknown: '日期未知',
    sheetBlankProtoTitle: '关联外部协议信息:',
    sheetBlankProtoDesc: '该钱包为未在 Kamino、SunSwap 等外部 DeFi 质押的<strong>独立钱包 / 原生质押账户</strong>。可在官方区块链浏览器上安全查验账本记录。',
    sheetAdBadge: 'SPONSORED AD · 协议空位推广',
    sheetAdLink: '安全指南 →',
    sheetAdDesc: '解除原生质押并收回代币后，请转移至硬件冷钱包以彻底阻断被盗风险。',
    sheetEscapeTitle: '协议资金撤出指南',
    officialVerified: '官方认证域名',
    officialLinkPrefix: '官方链接:',
    safetyNotice: '※ 完整显示官方顶级域名以防钓鱼，绝不在站内请求任何签名。',
    toastCopied: '钱包地址已复制到剪贴板。',
    coffeeTitle: '请开发者喝杯咖啡',
    coffeeSub: '纪念我遗失在数字宇宙中的 $1,000...',
    coffeeStory1: '在牛市狂潮中，我了解到了“空投”。当时连原理都没搞懂，就兴冲冲为了搞多账号建了几十个钱包，后来手机丢了、到下一个牛市全忘了……我明明记得钱包里是有钱的，为了找回那不知所踪的 <strong>$1,000</strong>，我亲手打造了这个追查工具。（不过遗憾的是，我那 $1,000 最终还是没能找回来…… 🥲）',
    coffeeStory2: '如果您找回了沉睡的资产，欢迎请开发者喝杯暖心咖啡，支持我们接入追踪更多公链！',
    coffeeCopyBtn: '复制',
    blankProtocol: '— (空白 · 无关联外部协议)',
    badgeUnified: '4大公链 · 跨链桥整合查询',
    badgeSolana: '4.13 SOL 原生质押',
    badgeEthereum: '实时 ERC-20 查询',
    badgeBsc: '实时 BEP-20 查询',
    badgeTron: '实时 TRC-20 查询',
    rootWalletLabel: '主查询钱包 (Root Address)',
    rootWalletReason: '当前链上扫描分析的基准核心钱包。',
    rateLimitBadge: '扫描限制: <strong class="text-slate-800 dark:text-slate-200">每分钟最多25次 (约2.4秒1次)</strong> · 15分钟缓存',
    scanCooldown: '冷却中... (请等待 {sec} 秒)',
    rateLimitExceeded: '超出每分钟最大扫描次数 (25次)，请稍后再试。',
    networkError: '网络或服务器错误，请稍后再试。',
    targetNotice: '<strong>专为遗失钱包的加密小白打造的寻宝工具。</strong> 为确保节点顺畅查询，请尽量避免查询交易量极大（交易所、做市机器人等）的地址。'
  },
  ja: {
    metaTitle: 'Wake Up Crypto | マルチチェーン放置資産＆サブ垢逆追跡',
    appTitle: 'Wake Up Crypto',
    appDesc: 'エアドロ周回サブ垢追跡 & 放置資産スキャナー',
    readonlyBadge: 'ウォレット取引履歴照会',
    btnCoffee: 'コーヒー支援',
    themeToggleTitle: 'ライト/ダークテーマ切替',
    adBanner: 'Ledger & Trezor ハードウェアウォレット — 取り戻した資産をフィッシング詐欺から完全分離保護',
    adCta: '公式ストア',
    tabUnified: '全体統合',
    tabUnifiedSub: '4大チェーン+ブリッジ',
    tabSolanaSub: 'SPL · ステーキング',
    tabEthereumSub: 'ERC-20 リアルタイム',
    tabBscSub: 'BEP-20 リアルタイム',
    tabTronSub: 'TRC-20 リアルタイム',
    inputPlaceholder: '照会するウォレットアドレスを入力...',
    btnAnalyze: 'スキャン',
    presetLabel: 'デフォルトウォレット:',
    scanningStatus: 'ブロックチェーンノードを照会中...',
    logStep1: 'オンチェーン残高およびステーキング照会中...',
    logStep1Done: 'オンチェーン台帳残高確認完了',
    logStep2: '入出金相手ウォレットをクラスタリング中...',
    logStep3Done: '実オンチェーンデータマッピング完了（ダミーなし）',
    mindmapTitle: 'オンチェーン資金フロー & 関連ウォレット図',
    filterAll: 'すべて',
    filterMine: '自分の財布のみ',
    resetZoomTitle: '画面中央揃え',
    legendMain: 'メインウォレット',
    legendStaked: 'ネイティブステーキング',
    legendSub: '個人サブウォレット推定',
    legendCex: '取引所',
    emptyNotice: '設定した最小金額条件を満たす関連ウォレットはありません。',
    resetUsdFilter: 'フィルター初期化 ($0)',
    usdFilterLabel: 'ダイアグラム金額フィルター',
    usdAbove: '以上',
    visibleWallets: '表示中',
    summaryTitle: '照会されたオンチェーン資産合計',
    summaryDesc: 'ダミーデータは一切なし。ブロックチェーン台帳から直接照会したネイティブステーキング、トークンレント代、保有残高の合計です。',
    metricStaked: 'ネイティブステーキング',
    metricRent: 'アカウントレント代',
    metricTokens: '保有トークン',
    walletsTitle: '特定された関連ウォレット群',
    unitWallets: '個のウォレット',
    unitItems: '件',
    noTxMessage: '照会された関連外部/サブウォレットの取引はありません。',
    noMatchFilterMessage: '現在のフィルター条件に一致するウォレットはありません。',
    txCountLabel: '取引',
    protocolLabel: 'プロトコル:',
    balLabel: '残高',
    volLabel: '移動',
    detailsBtn: '詳細 →',
    targetsTitle: 'オンチェーン資産および外部プロトコル内訳',
    emptyTargetTitle: '検出された資産および外部プロトコル',
    emptyTargetDesc: 'このアドレスで休眠ステーキングや外部DeFi預入は見つかりませんでした。',
    extProtocolPrefix: '外部プロトコル:',
    sponsoredAdBadge: 'SPONSORED · 外部プロトコル広告枠',
    sponsoredAdTitle: '手数料割引 & ハードウェアウォレット安全保管',
    sponsoredAdDesc: '外部DeFiに預けられていない大切なコインをLedgerで安全に保護、または取引所手数料特典を受けましょう。',
    sponsoredAdCta: '確認する →',
    sheetCopy: 'アドレスコピー',
    sheetTxs: '総トランザクション',
    sheetBal: 'ウォレット残高',
    sheetVol: '累積移動金額',
    sheetMidTitle: 'ウォレット残高および外部プロトコル預入内訳',
    extDefiProtocol: '関連外部DeFiプロトコル',
    topTxHistoryTitle: '主要入出金トランザクション履歴 (日時・金額)',
    dateUnknown: '日時不明',
    sheetBlankProtoTitle: '関連外部プロトコル情報:',
    sheetBlankProtoDesc: 'このウォレットはKaminoやSunSwap等の外部DeFiプロトコルに預け入れられていない<strong>純粋なウォレット / ネイティブステーキング口座</strong>です。公式エクスプローラーで安全に台帳履歴を確認できます。',
    sheetAdBadge: 'SPONSORED AD · プロトコル空欄枠',
    sheetAdLink: 'セキュリティガイド →',
    sheetAdDesc: 'ネイティブステーキング解除後に回収した暗号資産をハードウェアウォレットへ安全に移し、ハッキングリスクを遮断しましょう。',
    sheetEscapeTitle: 'プロトコル引出ガイド',
    officialVerified: '公式認証ドメイン',
    officialLinkPrefix: '公式リンク:',
    safetyNotice: '※ フィッシング防止のため公式ドメイン全体を表示し、署名は一切要求しません。',
    toastCopied: 'アドレスをクリップボードにコピーしました。',
    coffeeTitle: '開発者にコーヒーをおごる',
    coffeeSub: 'デジタル宇宙を彷徨う私の $1,000 を偲んで...',
    coffeeStory1: '強気相場の頃にあちこち覗いていて「エアドロ」というものを知りました。仕組みもよく分からないまま、複垢をやろうとウォレットを何十個も作り、スマホを失くし、次のバブル期にはすっかり忘れ… 自分の財布にお金があったはずなのに。行方不明になった <strong>$1,000</strong> を見つけるために作った追跡ツールです。（結局、私の $1,000 は最後まで見つかりませんでしたが… 🥲）',
    coffeeStory2: '眠っていた資産を見つけられたなら、次のチェーン追跡開発のために温かいコーヒー1杯のご支援をお願いします！',
    coffeeCopyBtn: 'コピー',
    blankProtocol: '— (空欄 · 外部プロトコルなし)',
    badgeUnified: '4大チェーン・ブリッジ統合照会',
    badgeSolana: '4.13 SOL ネイティブステーキング',
    badgeEthereum: 'リアルタイム ERC-20 照会',
    badgeBsc: 'リアルタイム BEP-20 照会',
    badgeTron: 'リアルタイム TRC-20 照会',
    rootWalletLabel: 'メイン照会ウォレット (Root Address)',
    rootWalletReason: '現在のスキャン基準となる中心ウォレットです。',
    rateLimitBadge: 'スキャン制限: <strong class="text-slate-800 dark:text-slate-200">毎分最大25回 (約2.4秒に1回)</strong> · 15分キャッシュ',
    scanCooldown: '待機中... ({sec}秒後に再試行可能)',
    rateLimitExceeded: '1分あたりの最大スキャン回数(25回)を超過しました。しばらくしてから再試行してください。',
    networkError: 'ネットワークまたはサーバーエラーが発生しました。しばらくしてから再試行してください。',
    targetNotice: '<strong>ウォレットを紛失したクリプト初心者のための専用探索ツールです。</strong> 円滑な照会のため、取引数が極めて多いウォレット（取引所・ボット等）の検索はお控えください。'
  },
  es: {
    metaTitle: 'Wake Up Crypto | Rastreo Multicadena de Airdrops y Activos Olvidados',
    appTitle: 'Wake Up Crypto',
    appDesc: 'Rastreador de Multicuentas Airdrop y Activos On-Chain',
    readonlyBadge: 'Consultar Transacciones',
    btnCoffee: 'Donar Café',
    themeToggleTitle: 'Cambiar Tema Claro/Oscuro',
    adBanner: 'Billeteras Frías Ledger & Trezor — Protege tus activos contra estafas y drenadores',
    adCta: 'Tienda Oficial',
    tabUnified: 'Todo Unificado',
    tabUnifiedSub: '4 Cadenas + Puentes',
    tabSolanaSub: 'SPL · Staking',
    tabEthereumSub: 'ERC-20 En Vivo',
    tabBscSub: 'BEP-20 En Vivo',
    tabTronSub: 'TRC-20 En Vivo',
    inputPlaceholder: 'Ingrese la dirección de billetera a escanear...',
    btnAnalyze: 'Escanear',
    presetLabel: 'Billetera Predeterminada:',
    scanningStatus: 'Consultando nodos blockchain en vivo...',
    logStep1: 'Consultando saldos on-chain y cuentas de staking...',
    logStep1Done: 'Saldo de libro mayor on-chain confirmado',
    logStep2: 'Agrupando billeteras de contrapartes...',
    logStep3Done: 'Datos on-chain reales mapeados sin datos falsos',
    mindmapTitle: 'Flujo de Fondos y Clúster de Billeteras',
    filterAll: 'Todos',
    filterMine: 'Mis Billeteras',
    resetZoomTitle: 'Centrar vista',
    legendMain: 'Billetera Principal',
    legendStaked: 'Staking Nativo',
    legendSub: 'Billetera Secundaria',
    legendCex: 'Exchange (CEX)',
    emptyNotice: 'No hay billeteras asociadas que cumplan con el filtro mínimo.',
    resetUsdFilter: 'Restablecer filtro ($0)',
    usdFilterLabel: 'Filtro de Valor ($)',
    usdAbove: 'mín',
    visibleWallets: 'Visibles',
    summaryTitle: 'Activos On-Chain Encontrados',
    summaryDesc: 'Cero datos ficticios. Consultado directamente de la blockchain: staking nativo, renta de cuentas y saldos de tokens.',
    metricStaked: 'Staking Nativo',
    metricRent: 'Renta de Cuentas',
    metricTokens: 'Tokens en Billetera',
    walletsTitle: 'Clúster de Billeteras Asociadas',
    unitWallets: 'billeteras',
    unitItems: 'elementos',
    noTxMessage: 'No se encontraron transacciones de billeteras asociadas.',
    noMatchFilterMessage: 'No hay billeteras que coincidan con el filtro actual.',
    txCountLabel: 'trans.',
    protocolLabel: 'Protocolo:',
    balLabel: 'Saldo',
    volLabel: 'Vol',
    detailsBtn: 'Detalles →',
    targetsTitle: 'Activos On-Chain y Protocolos Externos',
    emptyTargetTitle: 'Activos y Protocolos Detectados',
    emptyTargetDesc: 'No se encontraron posiciones de staking ni depósitos DeFi externos para esta dirección.',
    extProtocolPrefix: 'Protocolo externo:',
    sponsoredAdBadge: 'PATROCINADO · Espacio de Protocolo',
    sponsoredAdTitle: 'Descuentos en Tarifas y Billeteras Frías',
    sponsoredAdDesc: 'Proteja sus activos no bloqueados en DeFi con Ledger o disfrute de descuentos en exchanges.',
    sponsoredAdCta: 'Ver más →',
    sheetCopy: 'Copiar dirección',
    sheetTxs: 'Transacciones totales',
    sheetBal: 'Saldo actual',
    sheetVol: 'Volumen acumulado',
    sheetMidTitle: 'Saldo de billetera y protocolos externos',
    extDefiProtocol: 'Protocolo DeFi externo',
    topTxHistoryTitle: 'Historial de transacciones (Fecha y monto)',
    dateUnknown: 'Fecha desconocida',
    sheetBlankProtoTitle: 'Información del protocolo externo:',
    sheetBlankProtoDesc: 'Esta billetera es una <strong>billetera pura / cuenta de staking nativo</strong> sin depósitos en DeFi externo. Puede verificar los registros en el explorador de bloques oficial.',
    sheetAdBadge: 'ANUNCIO PATROCINADO · Espacio Libre',
    sheetAdLink: 'Guía de seguridad →',
    sheetAdDesc: 'Transfiera las monedas recuperadas tras desbloquear el staking a una billetera fría para bloquear riesgos de robo.',
    sheetEscapeTitle: 'Guía de retiro del protocolo',
    officialVerified: 'Dominio Oficial Verificado',
    officialLinkPrefix: 'Enlace Oficial:',
    safetyNotice: '※ Muestra el dominio oficial completo para evitar phishing. Nunca solicita firmas.',
    toastCopied: 'Dirección copiada al portapapeles.',
    coffeeTitle: 'Invítame un Café',
    coffeeSub: 'En memoria de mis $1,000 perdidos en el universo digital...',
    coffeeStory1: 'Durante el mercado alcista, descubrí los "airdrops". Sin entender bien cómo funcionaba, creé docenas de billeteras para multicuentas, perdí mi teléfono y lo olvidé para el siguiente ciclo... Sabía con certeza que tenía fondos. Creé este rastreador para recuperar mis <strong>$1,000</strong> perdidos. (Aunque al final, nunca pude recuperar mis $1,000... 🥲)',
    coffeeStory2: '¡Si recuperaste tus activos olvidados, invítale un café al desarrollador para apoyar el rastreo de nuevas cadenas!',
    coffeeCopyBtn: 'Copiar',
    blankProtocol: '— (En blanco · Sin protocolo externo)',
    badgeUnified: '4 Cadenas y Puentes',
    badgeSolana: '4.13 SOL Staking Nativo',
    badgeEthereum: 'ERC-20 en vivo',
    badgeBsc: 'BEP-20 en vivo',
    badgeTron: 'TRC-20 en vivo',
    rootWalletLabel: 'Billetera Principal (Dirección Raíz)',
    rootWalletReason: 'Billetera central utilizada como base para el escaneo.',
    rateLimitBadge: 'Límite de escaneo: <strong class="text-slate-800 dark:text-slate-200">Máx 25/min (~1 por 2.4s)</strong> · Caché 15 min',
    scanCooldown: 'Espera... (disponible en {sec}s)',
    rateLimitExceeded: 'Límite por minuto excedido (máx 25). Inténtelo de nuevo en unos segundos.',
    networkError: 'Error de red o servidor. Por favor, inténtelo de nuevo en unos segundos.',
    targetNotice: '<strong>Explorador exclusivo para principiantes que buscan billeteras perdidas.</strong> Por favor, evite consultar billeteras con volumen masivo de transacciones (exchanges, bots) para asegurar consultas fluidas.'
  },
  ru: {
    metaTitle: 'Wake Up Crypto | Мультичейн-поиск мультиаккаунтов и забытых активов',
    appTitle: 'Wake Up Crypto',
    appDesc: 'Поиск мультиаккаунтов и проверка ончейн-активов',
    readonlyBadge: 'Проверка транзакций кошелька',
    btnCoffee: 'Купить кофе',
    themeToggleTitle: 'Переключить тему',
    adBanner: 'Аппаратные кошельки Ledger и Trezor — Надежная защита активов от скама и дрейнеров',
    adCta: 'Магазин',
    tabUnified: 'Все сети',
    tabUnifiedSub: '4 сети + мосты',
    tabSolanaSub: 'SPL · Стейкинг',
    tabEthereumSub: 'ERC-20 онлайн',
    tabBscSub: 'BEP-20 онлайн',
    tabTronSub: 'TRC-20 онлайн',
    inputPlaceholder: 'Введите адрес кошелька для сканирования...',
    btnAnalyze: 'Сканировать',
    presetLabel: 'Кошелек по умолчанию:',
    scanningStatus: 'Запрос к узлам блокчейна...',
    logStep1: 'Запрос ончейн-баланса и стейкинга...',
    logStep1Done: 'Ончейн-баланс подтвержден',
    logStep2: 'Кластеризация кошельков контрагентов...',
    logStep3Done: 'Реальные ончейн-данные сопоставлены без фиктивных',
    mindmapTitle: 'Граф связей и кластер мультиаккаунтов',
    filterAll: 'Все узлы',
    filterMine: 'Мои кошельки',
    resetZoomTitle: 'По центру',
    legendMain: 'Основной кошелек',
    legendStaked: 'Нативный стейкинг',
    legendSub: 'Субкошелек (личный)',
    legendCex: 'Биржа (CEX)',
    emptyNotice: 'Нет связанных кошельков, соответствующих фильтру.',
    resetUsdFilter: 'Сбросить фильтр ($0)',
    usdFilterLabel: 'Фильтр суммы ($)',
    usdAbove: 'мин',
    visibleWallets: 'Показано',
    summaryTitle: 'Найдено ончейн-активов',
    summaryDesc: 'Без фиктивных данных. Сумма нативного стейкинга, возврата ренты и токенов, полученная напрямую из блокчейна.',
    metricStaked: 'Нативный стейкинг',
    metricRent: 'Возврат ренты',
    metricTokens: 'Токены кошелька',
    walletsTitle: 'Связанные кошельки кластера',
    unitWallets: 'кошельков',
    unitItems: 'позиций',
    noTxMessage: 'Связанных транзакций кошельков не найдено.',
    noMatchFilterMessage: 'Нет кошельков, подходящих под условия фильтра.',
    txCountLabel: 'транз.',
    protocolLabel: 'Протокол:',
    balLabel: 'Баланс',
    volLabel: 'Объем',
    detailsBtn: 'Подробнее →',
    targetsTitle: 'Ончейн-активы и внешние протоколы',
    emptyTargetTitle: 'Обнаруженные активы и протоколы',
    emptyTargetDesc: 'Для этого адреса не найдено неактивного стейкинга или внешних DeFi-депозитов.',
    extProtocolPrefix: 'Внешний протокол:',
    sponsoredAdBadge: 'РЕКЛАМА · Слот внешнего протокола',
    sponsoredAdTitle: 'Скидки на комиссии и аппаратные кошельки',
    sponsoredAdDesc: 'Храните активы, не задействованные в DeFi, на холодном кошельке Ledger или получайте скидки на биржах.',
    sponsoredAdCta: 'Узнать →',
    sheetCopy: 'Копировать адрес',
    sheetTxs: 'Всего транзакций',
    sheetBal: 'Текущий баланс',
    sheetVol: 'Общий объем',
    sheetMidTitle: 'Баланс кошелька и внешние протоколы',
    extDefiProtocol: 'Связанный DeFi-протокол',
    topTxHistoryTitle: 'История транзакций (Дата и сумма)',
    dateUnknown: 'Дата неизвестна',
    sheetBlankProtoTitle: 'Информация о внешнем протоколе:',
    sheetBlankProtoDesc: 'Этот кошелек является <strong>независимым кошельком / аккаунтом нативного стейкинга</strong> без депозитов в DeFi. Вы можете безопасно проверить записи в официальном эксплорере.',
    sheetAdBadge: 'РЕКЛАМА · Свободный слот протокола',
    sheetAdLink: 'Руководство →',
    sheetAdDesc: 'Переведите возвращенные средства после стейкинга на аппаратный кошелек для защиты от взлома.',
    sheetEscapeTitle: 'Инструкция по выводу средств',
    officialVerified: 'Проверенный домен',
    officialLinkPrefix: 'Официальная ссылка:',
    safetyNotice: '※ Отображается полный официальный домен. Подпись транзакций никогда не запрашивается.',
    toastCopied: 'Адрес скопирован в буфер обмена.',
    coffeeTitle: 'Купить кофе разработчику',
    coffeeSub: 'В память о моих $1,000, затерянных в цифровой вселенной...',
    coffeeStory1: 'Во время бычьего рынка я узнал про «аирдропы». Не особо понимая, как всё устроено, создал десятки кошельков для мультиаккаунтов, потерял телефон, а к следующему циклу всё забыл... Но я точно помнил, что на кошельках были деньги. Я создал этот трекер, чтобы найти пропавшие <strong>$1,000</strong>. (Хотя в итоге свои $1,000 я так и не нашел... 🥲)',
    coffeeStory2: 'Если вы нашли свои забытые активы, поддержите разработчика чашкой горячего кофе для добавления новых сетей!',
    coffeeCopyBtn: 'Копировать',
    blankProtocol: '— (Пусто · Нет внешнего протокола)',
    badgeUnified: '4 сети и мосты',
    badgeSolana: '4.13 SOL Нативный стейкинг',
    badgeEthereum: 'ERC-20 онлайн',
    badgeBsc: 'BEP-20 онлайн',
    badgeTron: 'TRC-20 онлайн',
    rootWalletLabel: 'Основной кошелек (Root Address)',
    rootWalletReason: 'Основной кошелек для текущего сканирования.',
    rateLimitBadge: 'Лимит запросов: <strong class="text-slate-800 dark:text-slate-200">макс 25/мин (~1 раз в 2.4 сек)</strong> · Кэш 15 мин',
    scanCooldown: 'Ожидание... (доступно через {sec}с)',
    rateLimitExceeded: 'Превышен лимит запросов в минуту (макс 25). Повторите попытку позже.',
    networkError: 'Ошибка сети или сервера. Пожалуйста, повторите попытку позже.',
    targetNotice: '<strong>Сканер для новичков, потерявших кошельки.</strong> Пожалуйста, избегайте сканирования адресов с огромным количеством транзакций (биржи, боты) для стабильной работы нод.'
  }
};

// ============================================================================
// 2. DYNAMIC TEXT REPLACEMENTS & PATTERN TRANSLATOR (for on-chain data)
// ============================================================================
const DYNAMIC_I18N = {
  '내 메인 조회 지갑 (Root Address)': {
    en: 'Main Query Wallet (Root Address)',
    zh: '主查询钱包 (Root Address)',
    ja: 'メイン照会ウォレット (Root Address)',
    es: 'Billetera Principal (Dirección Raíz)',
    ru: 'Основной кошелек (Root Address)'
  },
  '내 메인 지갑 (Root Address)': {
    en: 'Main Wallet (Root Address)',
    zh: '主钱包 (Root Address)',
    ja: 'メインウォレット (Root Address)',
    es: 'Billetera Principal (Dirección Raíz)',
    ru: 'Основной кошелек (Root Address)'
  },
  '내 네이티브 스테이킹 계정': {
    en: 'My Native Staking Account',
    zh: '我的原生质押账户',
    ja: 'ネイティブステーキングアカウント',
    es: 'Mi Cuenta de Staking Nativo',
    ru: 'Мой аккаунт нативного стейкинга'
  },
  '내 보조 지갑 (양방향 입출금 확인)': {
    en: 'My Sub-Wallet (Bidirectional Activity)',
    zh: '个人副钱包 (双向充提已确认)',
    ja: '個人サブウォレット (双方向取引確認済)',
    es: 'Billetera Secundaria (Bidireccional)',
    ru: 'Личный субкошелек (двусторонние транзакции)'
  },
  '내 보조 지갑 (과거 송금 후 잔고 잔존)': {
    en: 'My Sub-Wallet (Retained Balance)',
    zh: '个人副钱包 (往期转账留存余额)',
    ja: '個人サブウォレット (残高留保)',
    es: 'Billetera Secundaria (Saldo retenido)',
    ru: 'Личный субкошелек (с остатком)'
  },
  '내 보조 지갑 추정': {
    en: 'Sub-Wallet (Likely Mine)',
    zh: '疑似个人副钱包',
    ja: '個人サブウォレット推定',
    es: 'Billetera Secundaria',
    ru: 'Субкошелек (вероятно, личный)'
  },
  '내 소액/렌트 보조 지갑': {
    en: 'Micro/Rent Sub-Wallet',
    zh: '小额/租金副钱包',
    ja: '少額/レント用サブウォレット',
    es: 'Billetera Micro/Renta',
    ru: 'Микро/рентный субкошелек'
  },
  '거래소 핫월렛': {
    en: 'Exchange Hotwallet',
    zh: '交易所热钱包',
    ja: '取引所ホットウォレット',
    es: 'Billetera Caliente CEX',
    ru: 'Горячий кошелек биржи'
  },
  '거래소 개인 입금 전용 주소': {
    en: 'Exchange Deposit Address',
    zh: '交易所专属充值地址',
    ja: '取引所個人入金専用アドレス',
    es: 'Dirección de Depósito Personal',
    ru: 'Депозитный адрес биржи'
  },
  '외부 대규모 기관/거래소 지갑': {
    en: 'Large Institution/Exchange',
    zh: '外部大型机构/交易所钱包',
    ja: '外部大規模機関/取引所',
    es: 'Institución/Exchange Externa',
    ru: 'Внешний институциональный/биржа'
  },
  '외부 거래 상대방': {
    en: 'External Counterparty',
    zh: '外部交易对手方',
    ja: '外部取引相手',
    es: 'Contraparte Externa',
    ru: 'Внешний контрагент'
  },
  'DEX/브릿지 프로토콜 라우터': {
    en: 'DEX/Bridge Protocol Router',
    zh: 'DEX/跨链桥协议路由',
    ja: 'DEX/ブリッジプロトコルルーター',
    es: 'Enrutador DEX/Puente',
    ru: 'Маршрутизатор DEX/моста'
  },
  '브릿지 탈출 지갑': {
    en: 'Cross-Chain Bridge Outflow',
    zh: '跨链转出钱包',
    ja: 'ブリッジ送金先',
    es: 'Salida por Puente',
    ru: 'Вывод через мост'
  },
  '내 멀티체인 통합 허브': {
    en: 'My Multi-Chain Unified Hub',
    zh: '我的多链整合中枢',
    ja: 'マルチチェーン統合ハブ',
    es: 'Mi Centro Unificado Multicadena',
    ru: 'Мультичейн-хаб'
  },
  '거래소(CEX) 공식 핫월렛 또는 입출금 기관 주소입니다.': {
    en: 'Official CEX hotwallet or institutional withdrawal address.',
    zh: '中心化交易所(CEX)官方热钱包或机构出入金地址。',
    ja: '取引所(CEX)公式ホットウォレットまたは出入金機関アドレスです。',
    es: 'Billetera caliente oficial de CEX o dirección institucional.',
    ru: 'Официальный горячий кошелек CEX или институциональный адрес.'
  },
  '스마트 컨트랙트 또는 디파이/브릿지 라우터 주소입니다 (개인 지갑 아님).': {
    en: 'Smart contract or DeFi/bridge router address (not a personal wallet).',
    zh: '智能合约或 DeFi/跨链桥路由地址 (非个人独立钱包)。',
    ja: 'スマートコントラクトまたはDeFi/ブリッジルーターアドレスです（個人ウォレットではありません）。',
    es: 'Contrato inteligente o enrutador DeFi/puente (no es billetera personal).',
    ru: 'Смарт-контракт или маршрутизатор DeFi/моста (не личный кошелек).'
  },
  '거래소 입금 후 핫월렛으로 자동 집금(Sweep)되는 거래소 입금 전용 주소로 추정됩니다.': {
    en: 'Estimated exchange deposit address automatically swept to hotwallets.',
    zh: '推测为充值后自动归集至热钱包的交易所个人充币专用地址。',
    ja: '入金後にホットウォレットへ自動集金される取引所専用アドレスと推定されます。',
    es: 'Dirección de depósito de exchange que se transfiere automáticamente a billeteras calientes.',
    ru: 'Предположительно депозитный адрес биржи со сбором на горячий кошелек.'
  },
  '내 메인 지갑과 직접 주고받은 양방향 거래 이력(보낸 돈 + 받은 돈)이 확인된 확실한 개인 보조 지갑입니다.': {
    en: 'Confirmed personal sub-wallet with bidirectional transactions (both sent and received) with main wallet.',
    zh: '与主钱包存在明确双向转账记录(转出+转入)的高置信度个人副钱包。',
    ja: 'メインウォレットと直接送受金した双方向履歴（送金＋受取）が確認された個人サブウォレットです。',
    es: 'Billetera secundaria confirmada con transferencias bidireccionales con la principal.',
    ru: 'Подтвержденный личный субкошелек с двусторонними транзакциями к основному кошельку.'
  },
  '과거 메인 지갑에서 자금을 송금한 후 현재까지 잔고가 남아있는 개인 보조 지갑입니다.': {
    en: 'Personal sub-wallet that received funds from the main wallet in the past and still retains balance.',
    zh: '过去曾接收自主钱包的资金，且当前仍存有留存余额的个人副钱包。',
    ja: '過去にメインウォレットから送金された資金が現在も残っている個人サブウォレットです。',
    es: 'Billetera secundaria que recibió fondos de la principal y aún conserva saldo.',
    ru: 'Личный субкошелек, получивший средства от основного и сохранивший баланс.'
  },
  '내 지갑이 소유한 솔라나 네이티브 스테이킹 계정': {
    en: 'Solana native staking account owned by your wallet.',
    zh: '本钱包所有的 Solana 原生质押账户。',
    ja: 'このウォレットが所有するSolanaネイティブステーキングアカウント。',
    es: 'Cuenta de staking nativo de Solana propiedad de su billetera.',
    ru: 'Аккаунт нативного стейкинга Solana, принадлежащий вашему кошельку.'
  },
  '현재 스캔 기준이 되는 중심 지갑입니다.': {
    en: 'Root central wallet for the current on-chain scan.',
    zh: '当前链上扫描分析的基准核心钱包。',
    ja: '現在のスキャン基準となる中心ウォレットです。',
    es: 'Billetera central utilizada como base para el escaneo actual.',
    ru: 'Основной кошелек, используемый для текущего сканирования.'
  },
  '외부 디파이 프로토콜과 무관한 순수 솔라나 네이티브 스테이킹 계정입니다. 지갑 앱의 Staking 메뉴에서 직접 해제(Deactivate) 및 인출할 수 있습니다.': {
    en: 'Pure Solana native staking account separate from external DeFi. You can deactivate and withdraw directly in your wallet app staking tab.',
    zh: '与外部 DeFi 协议无关的纯粹 Solana 原生质押账户。可直接在钱包 App 的 Staking 菜单中停用并提取。',
    ja: '外部DeFiプロトコルと無関係な純粋なSolanaネイティブステーキングです。ウォレットのステーキング機能から直接解除・出金可能です。',
    es: 'Cuenta de staking nativo de Solana sin protocolos DeFi externos. Puede desactivar y retirar directamente desde el menú de staking de su billetera.',
    ru: 'Нативный стейкинг Solana без внешних DeFi. Деактивировать и вывести можно прямо в приложении кошелька.'
  },
  '외부 디파이가 아닌 트론 네트워크 기본 에너지/대역폭 동결(Stake) 자산입니다.': {
    en: 'Tron native energy/bandwidth frozen stake assets, not tied to external DeFi.',
    zh: '波场网络原生的能量/带宽冻结质押资产，非外部 DeFi 协议。',
    ja: '外部DeFiではなくTronネットワークの基本エネルギー/帯域幅凍結(ステーキング)資産です。',
    es: 'Activos congelados de energía/ancho de banda en red Tron, no en DeFi externo.',
    ru: 'Нативные замороженные ресурсы Tron (энергия/пропускная способность), не внешний DeFi.'
  },
  '지갑에 기본 보유 중인 네이티브 SOL 잔고입니다.': {
    en: 'Native SOL balance directly held in this wallet.',
    zh: '该钱包直接持有的原生 SOL 基础余额。',
    ja: 'ウォレットに直接保有されている基本SOL残高です。',
    es: 'Saldo nativo de SOL retenido directamente en la billetera.',
    ru: 'Базовый баланс нативного SOL, хранящийся на кошельке.'
  },
  '현재 지갑에 보유 중인 기본 TRX 잔고입니다.': {
    en: 'Native TRX balance directly held in this wallet.',
    zh: '该钱包直接持有的原生 TRX 基础余额。',
    ja: 'ウォレットに直接保有されている基本TRX残高です。',
    es: 'Saldo nativo de TRX retenido directamente en la billetera.',
    ru: 'Базовый баланс TRX, хранящийся на кошельке.'
  },
  '온체인 입출금 패턴 기반 분류': {
    en: 'Classified based on on-chain transaction patterns',
    zh: '基于链上充提模式的智能分类',
    ja: 'オンチェーン取引パターンに基づく分類',
    es: 'Clasificado según el patrón de transacciones on-chain',
    ru: 'Классификация на основе ончейн-транзакций'
  },
  '내가 보낸 돈': {
    en: 'Sent by me',
    zh: '我转出的资金',
    ja: '自分が送金',
    es: 'Enviado por mí',
    ru: 'Отправлено мной'
  },
  '내가 받은 돈': {
    en: 'Received by me',
    zh: '我收到的资金',
    ja: '自分が受取',
    es: 'Recibido por mí',
    ru: 'Получено мной'
  },
  '거래소 출금 자금': {
    en: 'Exchange Withdrawal',
    zh: '交易所提币',
    ja: '取引所からの出金',
    es: 'Retiro de exchange',
    ru: 'Вывод с биржи'
  },
  '지갑 직접 보유': {
    en: 'Held in Wallet',
    zh: '钱包直接持有',
    ja: 'ウォレット直接保有',
    es: 'En billetera',
    ru: 'Прямой баланс'
  },
  '본인 인출권한 100%': {
    en: '100% Self-Withdrawal Authority',
    zh: '本人直接提领权限 100%',
    ja: '本人出金権限100%',
    es: 'Autoridad de retiro 100%',
    ru: 'Полный доступ к выводу 100%'
  },
  '계정 닫기 시 환급': {
    en: 'Reclaim on Account Close',
    zh: '关闭账户即可退还',
    ja: 'アカウントクローズ時に返金',
    es: 'Reembolso al cerrar cuenta',
    ru: 'Возврат при закрытии счета'
  },
  '지갑 내 보유 중': {
    en: 'Held in Wallet',
    zh: '钱包内持有',
    ja: 'ウォレット内保有',
    es: 'En billetera',
    ru: 'В кошельке'
  },
  '기본 잔고': {
    en: 'Native Balance',
    zh: '基础余额',
    ja: '基本残高',
    es: 'Saldo nativo',
    ru: 'Базовый баланс'
  },
  '지갑 기본 잔고': {
    en: 'Native Balance',
    zh: '基础余额',
    ja: '基本残高',
    es: 'Saldo nativo',
    ru: 'Базовый баланс'
  },
  'Unfreeze 시 환급': {
    en: 'Reclaim upon Unfreeze',
    zh: '解冻即可退还',
    ja: 'アンフリーズ時に返金',
    es: 'Reembolso al descongelar',
    ru: 'Возврат при разморозке'
  },
  '실제 온체인 조회': {
    en: 'Live On-Chain Scan',
    zh: '真实链上查询',
    ja: '実オンチェーン照会',
    es: 'Consulta Real On-Chain',
    ru: 'Реальный ончейн-запрос'
  },
  '실시간 조회 완료': {
    en: 'Live Query Completed',
    zh: '实时查询完成',
    ja: 'リアルタイム照会完了',
    es: 'Consulta en vivo lista',
    ru: 'Онлайн-запрос выполнен'
  },
  '실시간 조회': {
    en: 'Live Query',
    zh: '实时查询',
    ja: 'リアルタイム照会',
    es: 'Consulta en vivo',
    ru: 'Онлайн-запрос'
  },
  '— (외부 프로토콜 없음)': {
    en: '— (No External Protocol)',
    zh: '— (无外部协议)',
    ja: '— (外部プロトコルなし)',
    es: '— (Sin protocolo externo)',
    ru: '— (Нет внешнего протокола)'
  },
  '— (공란)': {
    en: '— (Blank)',
    zh: '— (空白)',
    ja: '— (空欄)',
    es: '— (En blanco)',
    ru: '— (Пусто)'
  }
};

const DYNAMIC_PATTERNS = [
  {
    regex: /\[(\w+)\]\s*내 네이티브 스테이킹 계정\s*\((.+?)\)/,
    replace: {
      en: '[$1] Native Staking Account ($2)',
      zh: '[$1] 我的原生质押账户 ($2)',
      ja: '[$1] ネイティブステーキングアカウント ($2)',
      es: '[$1] Mi Cuenta de Staking Nativo ($2)',
      ru: '[$1] Аккаунт нативного стейкинга ($2)'
    }
  },
  {
    regex: /\[(\w+)\]\s*메인 지갑 \(Root Address\)/,
    replace: {
      en: '[$1] Main Wallet (Root Address)',
      zh: '[$1] 主钱包 (Root Address)',
      ja: '[$1] メインウォレット (Root Address)',
      es: '[$1] Billetera Principal (Root Address)',
      ru: '[$1] Основной кошелек (Root Address)'
    }
  },
  {
    regex: /\[(\w+)\]\s*메인\s*\((.+?)\)/,
    replace: {
      en: '[$1] Main ($2)',
      zh: '[$1] 主钱包 ($2)',
      ja: '[$1] メイン ($2)',
      es: '[$1] Principal ($2)',
      ru: '[$1] Основной ($2)'
    }
  },
  {
    regex: /\[(\w+)\]\s*스테이킹\s*\((.+?)\)/,
    replace: {
      en: '[$1] Staking ($2)',
      zh: '[$1] 质押 ($2)',
      ja: '[$1] ステーキング ($2)',
      es: '[$1] Staking ($2)',
      ru: '[$1] Стейкинг ($2)'
    }
  },
  {
    regex: /\[(\w+)\]\s*내 지갑\s*\((.+?)\)/,
    replace: {
      en: '[$1] My Wallet ($2)',
      zh: '[$1] 我的钱包 ($2)',
      ja: '[$1] マイウォレット ($2)',
      es: '[$1] Mi Billetera ($2)',
      ru: '[$1] Мой кошелек ($2)'
    }
  },
  {
    regex: /\[(\w+)\]\s*거래소\s*\((.+?)\)/,
    replace: {
      en: '[$1] Exchange ($2)',
      zh: '[$1] 交易所 ($2)',
      ja: '[$1] 取引所 ($2)',
      es: '[$1] Exchange ($2)',
      ru: '[$1] Биржа ($2)'
    }
  },
  {
    regex: /\[(\w+)\]\s*내 보조 지갑 추정\s*\(잔고\s*(.+?)\)/,
    replace: {
      en: '[$1] Sub-Wallet (Bal $2)',
      zh: '[$1] 疑似个人副钱包 (余额 $2)',
      ja: '[$1] 個人サブウォレット推定 (残高 $2)',
      es: '[$1] Billetera Secundaria (Saldo $2)',
      ru: '[$1] Субкошелек (Баланс $2)'
    }
  },
  {
    regex: /\[(\w+)\]\s*내 보조 지갑 추정\s*\(누적\s*(.+?)\s*이동\)/,
    replace: {
      en: '[$1] Sub-Wallet (Vol $2)',
      zh: '[$1] 疑似个人副钱包 (流转 $2)',
      ja: '[$1] 個人サブウォレット推定 (移動 $2)',
      es: '[$1] Billetera Secundaria (Vol $2)',
      ru: '[$1] Субкошелек (Объем $2)'
    }
  },
  {
    regex: /\[(\w+)\]\s*내 소액\/렌트 보조 지갑\s*\((.+?)\)/,
    replace: {
      en: '[$1] Micro/Rent Sub-Wallet ($2)',
      zh: '[$1] 小额/租金副钱包 ($2)',
      ja: '[$1] 少額/レント用サブウォレット ($2)',
      es: '[$1] Billetera Micro/Renta ($2)',
      ru: '[$1] Микро/рентный субкошелек ($2)'
    }
  },
  {
    regex: /\[(\w+)\]\s*거래소 핫월렛\s*\((.+?)\)/,
    replace: {
      en: '[$1] Exchange Hotwallet ($2)',
      zh: '[$1] 交易所热钱包 ($2)',
      ja: '[$1] 取引所ホットウォレット ($2)',
      es: '[$1] Billetera Caliente CEX ($2)',
      ru: '[$1] Горячий кошелек биржи ($2)'
    }
  },
  {
    regex: /\[(\w+)\]\s*거래소 개인 입금 전용 주소\s*\((.+?)\)/,
    replace: {
      en: '[$1] Exchange Deposit Address ($2)',
      zh: '[$1] 交易所充值专属地址 ($2)',
      ja: '[$1] 取引所個人入金専用アドレス ($2)',
      es: '[$1] Dirección de Depósito Personal ($2)',
      ru: '[$1] Депозитный адрес биржи ($2)'
    }
  },
  {
    regex: /\[(\w+)\]\s*외부 대규모 기관\/거래소 지갑\s*\((.+?)\)/,
    replace: {
      en: '[$1] Large Institution/Exchange ($2)',
      zh: '[$1] 外部大型机构/交易所钱包 ($2)',
      ja: '[$1] 外部大規模機関/取引所 ($2)',
      es: '[$1] Institución/Exchange Externa ($2)',
      ru: '[$1] Внешний институциональный/биржа ($2)'
    }
  },
  {
    regex: /\[(\w+)\]\s*내 보조 지갑 \(양방향 입출금 확인\)/,
    replace: {
      en: '[$1] My Sub-Wallet (Bidirectional Txs)',
      zh: '[$1] 个人副钱包 (双向充提已确认)',
      ja: '[$1] 個人サブウォレット (双方向取引確認済)',
      es: '[$1] Billetera Secundaria (Bidireccional)',
      ru: '[$1] Личный субкошелек (двусторонние транз.)'
    }
  },
  {
    regex: /\[(\w+)\]\s*내 보조 지갑 \(과거 송금 후 잔고 잔존\)/,
    replace: {
      en: '[$1] My Sub-Wallet (Retained Balance)',
      zh: '[$1] 个人副钱包 (往期转账留存余额)',
      ja: '[$1] 個人サブウォレット (残高留保)',
      es: '[$1] Billetera Secundaria (Saldo retenido)',
      ru: '[$1] Личный субкошелек (с остатком)'
    }
  },
  {
    regex: /\[(\w+)\]\s*외부 거래 상대방\s*\((.+?)\)/,
    replace: {
      en: '[$1] External Counterparty ($2)',
      zh: '[$1] 外部交易对手方 ($2)',
      ja: '[$1] 外部取引相手 ($2)',
      es: '[$1] Contraparte Externa ($2)',
      ru: '[$1] Внешний контрагент ($2)'
    }
  },
  {
    regex: /\[(\w+)\]\s*DEX\/브릿지 프로토콜 라우터\s*\((.+?)\)/,
    replace: {
      en: '[$1] DEX/Bridge Protocol Router ($2)',
      zh: '[$1] DEX/跨链桥协议路由 ($2)',
      ja: '[$1] DEX/ブリッジプロトコルルーター ($2)',
      es: '[$1] Enrutador DEX/Puente ($2)',
      ru: '[$1] Маршрутизатор DEX/моста ($2)'
    }
  },
  {
    regex: /\[🌉\s*브릿지 탈출 지갑\]\s*([A-Za-z0-9_]+)\s*→\s*([A-Za-z0-9_]+)\s*\((.+?)\)/,
    replace: {
      en: '[🌉 Bridge Outflow] $1 → $2 ($3)',
      zh: '[🌉 跨链转出钱包] $1 → $2 ($3)',
      ja: '[🌉 ブリッジ送金先] $1 → $2 ($3)',
      es: '[🌉 Salida por Puente] $1 → $2 ($3)',
      ru: '[🌉 Вывод через мост] $1 → $2 ($3)'
    }
  },
  {
    regex: /\[DEX\/브릿지\]\s*(.+?)\s*라우터\s*\((.+?)→(.+?)\)/,
    replace: {
      en: '[DEX/Bridge] $1 Router ($2→$3)',
      zh: '[DEX/跨链桥] $1 路由 ($2→$3)',
      ja: '[DEX/ブリッジ] $1 ルーター ($2→$3)',
      es: '[DEX/Puente] $1 Enrutador ($2→$3)',
      ru: '[DEX/мост] $1 Маршрутизатор ($2→$3)'
    }
  },
  {
    regex: /\[(\w+)\]\s*솔라나 네이티브 스테이킹 계정\s*\((.+?)\)/,
    replace: {
      en: '[$1] Solana Native Staking ($2)',
      zh: '[$1] Solana 原生质押账户 ($2)',
      ja: '[$1] Solana ネイティブステーキング ($2)',
      es: '[$1] Staking Nativo de Solana ($2)',
      ru: '[$1] Нативный стейкинг Solana ($2)'
    }
  },
  {
    regex: /\[(\w+)\]\s*빈 SPL 토큰 계정 보증금 환급\s*\((.+?)개\s*계정\)/,
    replace: {
      en: '[$1] Empty SPL Token Rent Refund ($2 accounts)',
      zh: '[$1] 闲置 SPL 代币账户租金退还 ($2 个账户)',
      ja: '[$1] 空SPLトークン口座レント返金 ($2口座)',
      es: '[$1] Reembolso de Renta SPL Vacía ($2 cuentas)',
      ru: '[$1] Возврат ренты счетов SPL ($2 счетов)'
    }
  },
  {
    regex: /\[(\w+)\]\s*빈 SPL 토큰 계정 보증금 환급\s*\((.+?)\)/,
    replace: {
      en: '[$1] Empty SPL Token Rent Refund ($2)',
      zh: '[$1] 闲置 SPL 代币账户租金退还 ($2)',
      ja: '[$1] 空SPLトークン口座レント返金 ($2)',
      es: '[$1] Reembolso de Renta SPL Vacía ($2)',
      ru: '[$1] Возврат ренты пустых счетов SPL ($2)'
    }
  },
  {
    regex: /\[(\w+)\]\s*지갑 보유 토큰:\s*(.+?)\s*\((.+?)개\)/,
    replace: {
      en: '[$1] Token in Wallet: $2 ($3 units)',
      zh: '[$1] 钱包持有代币: $2 ($3 个)',
      ja: '[$1] ウォレット保有トークン: $2 ($3 個)',
      es: '[$1] Token en Billetera: $2 ($3)',
      ru: '[$1] Токен в кошельке: $2 ($3 шт.)'
    }
  },
  {
    regex: /\[(\w+)\]\s*지갑 보유 토큰:\s*(.+?)\s*\((.+?)\)/,
    replace: {
      en: '[$1] Token in Wallet: $2 ($3)',
      zh: '[$1] 钱包持有代币: $2 ($3)',
      ja: '[$1] ウォレット保有トークン: $2 ($3)',
      es: '[$1] Token en Billetera: $2 ($3)',
      ru: '[$1] Токен в кошельке: $2 ($3)'
    }
  },
  {
    regex: /\[(\w+)\]\s*지갑 기본\s*(.+?)\s*잔고\s*\((.+?)\)/,
    replace: {
      en: '[$1] Native $2 Balance ($3)',
      zh: '[$1] 原生 $2 基础余额 ($3)',
      ja: '[$1] 基本 $2 残高 ($3)',
      es: '[$1] Saldo Nativo $2 ($3)',
      ru: '[$1] Базовый баланс $2 ($3)'
    }
  },
  {
    regex: /트랜잭션 수\s*(.+?)건 이상의 대규모 활성 주소로,\s*거래소 또는 기관 지갑입니다\./,
    replace: {
      en: 'Large active address with over $1 txs (exchange or institution).',
      zh: '交易次数达 $1 笔以上的大型活跃地址，为交易所或机构钱包。',
      ja: '取引数 $1件以上の活発なアドレス（取引所または機関ウォレット）。',
      es: 'Dirección muy activa con más de $1 transacciones (exchange o institución).',
      ru: 'Крупный активный адрес с более чем $1 транзакций (биржа или организация).'
    }
  },
  {
    regex: /온체인 입출금 이력\((.+?)\)이 감지된 외부 상대방 주소입니다\./,
    replace: {
      en: 'External counterparty with $1 on-chain transactions detected.',
      zh: '检测到 $1 笔链上充提记录的外部交易对手方地址。',
      ja: 'オンチェーン入出金履歴（$1）が検出された外部取引相手アドレスです。',
      es: 'Contraparte externa con $1 transacciones on-chain detectadas.',
      ru: 'Внешний контрагент с историей ончейн-транзакций ($1).'
    }
  },
  {
    regex: /(.+?)\s*브릿지를 통해\s*(.+?)에서\s*(.+?)\s*체인으로 이동된 수취인 개인 주소입니다\s*\(내 타 체인 지갑 추정\)\./,
    replace: {
      en: 'Recipient personal address transferred from $2 to $3 via $1 bridge (likely your sub-wallet).',
      zh: '通过 $1 跨链桥从 $2 转移至 $3 网络的个人接收地址 (推测为您在其他公链的副钱包)。',
      ja: '$1 ブリッジを通じて $2 から $3 へ移動した受取人個人アドレスです（他チェーンの個人ウォレット推定）。',
      es: 'Dirección de destino transferida de $2 a $3 mediante puente $1 (probablemente su billetera).',
      ru: 'Личный адрес получателя перевода из $2 в $3 через мост $1 (вероятно, ваш субкошелек).'
    }
  },
  {
    regex: /(.+?)\s*크로스체인 브릿지\s*\/\s*DEX 라우터 컨트랙트 주소입니다\s*\(개인 지갑 아님\)\./,
    replace: {
      en: '$1 cross-chain bridge / DEX router contract address (not a personal wallet).',
      zh: '$1 跨链桥 / DEX 路由合约地址 (非个人独立钱包)。',
      ja: '$1 クロスチェーンブリッジ / DEX ルーターコントラクトアドレス（個人ウォレットではありません）。',
      es: 'Dirección de contrato de enrutador $1 / DEX (no es billetera personal).',
      ru: 'Адрес смарт-контракта моста $1 / маршрутизатора DEX (не личный кошелек).'
    }
  },
  {
    regex: /토큰 전송 후 잔고가 0이 되었으나 닫히지 않은\s*(.+?)개의 SPL 토큰 계정에 묶여있는 SOL 보증금입니다\./,
    replace: {
      en: 'Locked SOL rent deposits in $1 empty SPL token accounts that were not closed.',
      zh: '代币转出后余额为0但未关闭的 $1 个 SPL 代币账户中锁定的 SOL 租金押金。',
      ja: '残高が0になった後もクローズされていない $1 個のSPLトークン口座に拘束されているSOLレント預託金です。',
      es: 'Depósitos de renta en SOL bloqueados en $1 cuentas de token SPL vacías que no fueron cerradas.',
      ru: 'Заблокированная рента SOL в $1 пустых токен-счетах SPL, которые не были закрыты.'
    }
  },
  {
    regex: /현재 지갑 내부에 직접 보유 중인\s*(.+?)\s*잔고입니다\./,
    replace: {
      en: 'Direct balance of $1 held in this wallet.',
      zh: '该钱包内部直接持有的 $1 余额。',
      ja: 'このウォレットに直接保有されている $1 の残高です。',
      es: 'Saldo de $1 retenido directamente en la billetera.',
      ru: 'Баланс $1, хранящийся на этом кошельке.'
    }
  },
  {
    regex: /해당 주소에 직접 보유 중인\s*(.+?)\s*잔고입니다\./,
    replace: {
      en: 'Direct balance of $1 held in this address.',
      zh: '该地址直接持有的 $1 余额。',
      ja: 'このアドレスに直接保有されている $1 の残高です。',
      es: 'Saldo de $1 retenido directamente en esta dirección.',
      ru: 'Баланс $1, хранящийся на этом адресе.'
    }
  },
  {
    regex: /온체인 잔고 조회를 통해 확인된 실제\s*(.+?)\s*보유분입니다\./,
    replace: {
      en: 'Live verified on-chain holding of $1.',
      zh: '经链上实时查询确认的实际 $1 持有量。',
      ja: 'オンチェーン照会により確認された実際の $1 保有分です。',
      es: 'Tenencia real de $1 verificada en la blockchain.',
      ru: 'Подтвержденный баланс $1, проверенный в ончейне.'
    }
  },
  {
    regex: /실제 온체인에서 조회된\s*(.+?)\s*잔고입니다\./,
    replace: {
      en: 'Live on-chain verified balance of $1.',
      zh: '链上实时查验确认的 $1 实际余额。',
      ja: 'オンチェーンで照会された実際の $1 残高です。',
      es: 'Saldo real de $1 verificado en la blockchain.',
      ru: 'Реальный баланс $1, полученный из ончейна.'
    }
  },
  {
    regex: /내 지갑이 출금 권한자\(Withdrawer\)로 지정된 스테이킹 계정\s*\((.+?)\s*보유\)/,
    replace: {
      en: 'Staking account with this wallet as designated withdrawer ( held)',
      zh: '以本钱包作为指定提款人的质押账户 (持有 )',
      ja: 'このウォレットが出金権限者に指定されたステーキング口座 ()',
      es: 'Cuenta de staking con esta billetera como retirador designado ( retenido)',
      ru: 'Стейкинг-счет с правом вывода на этот кошелек ( на балансе)'
    }
  },
  {
    regex: /내 지갑이 출금 권한자\(Withdrawer\)로 지정된 스테이킹 계정\s*\((.+?)\)/,
    replace: {
      en: 'Staking account with this wallet as designated withdrawer ($1)',
      zh: '以本钱包作为指定提款人(Withdrawer)的质押账户 ($1)',
      ja: 'このウォレットが出金権限者(Withdrawer)に指定されたステーキング口座 ($1)',
      es: 'Cuenta de staking con esta billetera como retirador designado ($1)',
      ru: 'Стейкинг-счет с этим кошельком в качестве права на вывод ($1)'
    }
  },
  {
    regex: /전체 트랜잭션 수\s*(.+?)건에 불과한 소규모 개인 지갑\s*\(내 보조 지갑 유추\)/,
    replace: {
      en: 'Small personal wallet with only $1 total transactions (inferred sub-wallet)',
      zh: '总交易仅 $1 笔的小型个人钱包 (推测为副钱包)',
      ja: '総取引わずか $1件の小規模個人ウォレット（サブウォレット推定）',
      es: 'Billetera personal pequeña con solo $1 transacciones (sub-billetera inferida)',
      ru: 'Небольшой личный кошелек всего с $1 транзакций (предположительно субкошелек)'
    }
  },
  {
    regex: /트랜잭션 수\s*(.+?)건\s*-\s*개인 지갑 또는 개인 전용 입금 지갑/,
    replace: {
      en: '$1 transactions - personal wallet or deposit address',
      zh: '交易次数 $1 笔 - 个人钱包或个人专属充值地址',
      ja: '取引数 $1件 - 個人ウォレットまたは個人専用入金アドレス',
      es: '$1 transacciones - billetera personal o dirección de depósito',
      ru: '$1 транзакций - личный кошелек или депозитный адрес'
    }
  },
  {
    regex: /트랜잭션 수 1,000\+건 이상\s*\/\s*대규모 잔고\s*\((.+?)\)\s*-\s*거래소 핫월렛\s*\(예:\s*(.+?)\s*등\)/,
    replace: {
      en: '1,000+ txs / Large balance () - Exchange hotwallet (e.g. Binance)',
      zh: '1,000+ 笔交易以上 / 大额余额 () - 交易所热钱包 (如: 币安等)',
      ja: '1,000件以上の取引 / 大規模残高 () - 取引所ホットウォレット (例: Binance等)',
      es: 'Más de 1,000 txs / Gran saldo () - Billetera caliente de exchange (ej. Binance)',
      ru: 'Более 1,000 транзакций / Крупный баланс () - Горячий кошелек биржи (напр. Binance)'
    }
  },
  {
    regex: /트랜잭션 수 1,000\+건 이상\s*\/\s*대규모 잔고\s*\((.+?)\)\s*-\s*거래소 핫월렛\s*\(예:\s*(.+?)\)/,
    replace: {
      en: '1,000+ txs / Large balance ($1) - Exchange hotwallet ($2)',
      zh: '1,000+ 笔交易以上 / 大额余额 ($1) - 交易所热钱包 ($2)',
      ja: '1,000件以上の取引 / 大規模残高 ($1) - 取引所ホットウォレット ($2)',
      es: 'Más de 1,000 txs / Gran saldo ($1) - Billetera caliente de exchange ($2)',
      ru: 'Более 1,000 транзакций / Крупный баланс ($1) - Горячий кошелек биржи ($2)'
    }
  }
];

function localizeText(str, lang = currentLanguage) {
  if (!str || typeof str !== 'string') return str;
  if (lang === 'ko') return str;

  // 1. Direct dictionary lookup
  if (DYNAMIC_I18N[str] && DYNAMIC_I18N[str][lang]) {
    return DYNAMIC_I18N[str][lang];
  }

  // 2. Pattern matching
  for (const item of DYNAMIC_PATTERNS) {
    if (item.regex.test(str)) {
      const rep = item.replace[lang] || item.replace.en;
      return str.replace(item.regex, rep);
    }
  }

  // 3. Fallback for blank/empty protocol
  if (str.includes('공란') || str.includes('외부 프로토콜 없음')) {
    const dict = I18N[lang] || I18N.en;
    return dict.blankProtocol;
  }

  return str;
}

// User's Actual 4 Wallets as Default Presets
const CHAIN_PRESETS = {
  unified: {
    name: 'Unified Multi-Chain',
    symbol: 'ALL',
    defaultAddress: 'BQ4x7ypgaqW7tFZwJadmuxbiuzvy3mk26i9WFo7hDf7H, 0xb107205E2f9D89E85fb7d6311FFD802049Ffe56e, TG918Q75YzASD4UaRfG23nVwYYyVSnahvu',
    label: 'SOL + EVM(ETH·BNB·L2) + TRON',
    badgeKey: 'badgeUnified',
    explorerUrl: 'https://solscan.io/account/',
    maxSlider: 500
  },
  solana: {
    name: 'Solana',
    symbol: 'SOL',
    defaultAddress: 'BQ4x7ypgaqW7tFZwJadmuxbiuzvy3mk26i9WFo7hDf7H',
    label: 'BQ4x7ypg...Df7H',
    badgeKey: 'badgeSolana',
    explorerUrl: 'https://solscan.io/account/',
    maxSlider: 500
  },
  ethereum: {
    name: 'Ethereum',
    symbol: 'ETH',
    defaultAddress: '0xb107205E2f9D89E85fb7d6311FFD802049Ffe56e',
    label: '0xb10720...fe56e',
    badgeKey: 'badgeEthereum',
    explorerUrl: 'https://etherscan.io/address/',
    maxSlider: 500
  },
  bsc: {
    name: 'BNB Chain',
    symbol: 'BNB',
    defaultAddress: '0xb107205E2f9D89E85fb7d6311FFD802049Ffe56e',
    label: '0xb10720...fe56e',
    badgeKey: 'badgeBsc',
    explorerUrl: 'https://bscscan.com/address/',
    maxSlider: 500
  },
  tron: {
    name: 'Tron',
    symbol: 'TRX',
    defaultAddress: 'TG918Q75YzASD4UaRfG23nVwYYyVSnahvu',
    label: 'TG918Q75...nahvu',
    badgeKey: 'badgeTron',
    explorerUrl: 'https://tronscan.org/#/address/',
    maxSlider: 500
  }
};

// ----------------------------------------------------------------------------
// XSS Defense-in-Depth: HTML Entity Escaping & HTTPS Protocol Whitelist
// ----------------------------------------------------------------------------
const esc = s => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function safeHttpsUrl(rawUrl, fallback = '#') {
  try {
    const parsed = new URL(String(rawUrl ?? '').trim());
    return parsed.protocol === 'https:' ? parsed.href : fallback;
  } catch (_) {
    return fallback;
  }
}

function initIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function copyToClipboard(text) {
  const dict = I18N[currentLanguage] || I18N.ko;
  navigator.clipboard.writeText(text).then(() => {
    showToast(dict.toastCopied);
  }).catch(() => {
    showToast(text);
  });
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.innerText = msg;
  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 2200);
}

// Sync Slider Bar & Number Input
function syncUsdFilterControls(val, triggerRender = true) {
  const slider = document.getElementById('minUsdSlider');
  const numInput = document.getElementById('minUsdInput');
  const maxVal = Number(slider.max) || 500;

  const cleanVal = Math.max(0, Number(val) || 0);
  minUsdThreshold = cleanVal;

  const clampedSliderVal = Math.min(cleanVal, maxVal);
  slider.value = clampedSliderVal;
  const pct = Math.min(100, Math.max(0, (clampedSliderVal / maxVal) * 100));
  slider.style.setProperty('--slider-pct', `${pct}%`);

  if (document.activeElement !== numInput) {
    numInput.value = cleanVal;
  }

  document.querySelectorAll('.usd-preset-btn').forEach(btn => {
    const presetVal = Number(btn.getAttribute('data-usd-preset'));
    if (presetVal === cleanVal) {
      btn.className = 'usd-preset-btn px-2 py-0.5 rounded bg-indigo-600 text-white font-semibold transition';
    } else {
      btn.className = 'usd-preset-btn inner-box px-2 py-0.5 rounded text-slate-700 dark:text-slate-400 font-medium transition';
    }
  });

  if (triggerRender && currentData) {
    renderGraph(currentData.graph_data);
    renderWalletsList(currentData.classified_wallets || []);
  }
}

// Switch Active Language across 100% of the UI
function switchLanguage(lang) {
  currentLanguage = lang;
  const dict = I18N[lang] || I18N.ko;

  document.title = dict.metaTitle;
  document.getElementById('txt-app-title').innerText = dict.appTitle;
  document.getElementById('txt-app-desc').innerText = dict.appDesc;
  document.getElementById('txt-readonly-badge').innerText = dict.readonlyBadge;
  document.getElementById('txt-btn-coffee').innerText = dict.btnCoffee;
  document.getElementById('themeToggle').title = dict.themeToggleTitle;
  document.getElementById('txt-ad-banner').innerText = dict.adBanner;
  document.getElementById('txt-ad-cta').innerText = dict.adCta;
  const targetNoticeEl = document.getElementById('txt-target-notice');
  if (targetNoticeEl && dict.targetNotice) {
    targetNoticeEl.innerHTML = dict.targetNotice;
  }

  // Chain tabs
  document.getElementById('txt-tab-unified').innerText = dict.tabUnified;
  document.getElementById('txt-tab-unified-sub').innerText = dict.tabUnifiedSub;
  document.getElementById('txt-tab-solana-sub').innerText = dict.tabSolanaSub;
  document.getElementById('txt-tab-ethereum-sub').innerText = dict.tabEthereumSub;
  document.getElementById('txt-tab-bsc-sub').innerText = dict.tabBscSub;
  document.getElementById('txt-tab-tron-sub').innerText = dict.tabTronSub;

  // Search input & presets
  document.getElementById('addressInput').placeholder = dict.inputPlaceholder;
  document.getElementById('txt-btn-analyze').innerText = dict.btnAnalyze;
  document.getElementById('txt-preset-label').innerText = dict.presetLabel;
  const cfg = CHAIN_PRESETS[currentChain];
  if (cfg && cfg.badgeKey) {
    document.getElementById('presetBadge').innerText = dict[cfg.badgeKey] || dict.badgeUnified;
  }
  const rateLimitBadgeEl = document.getElementById('txt-rate-limit-badge');
  if (rateLimitBadgeEl && dict.rateLimitBadge) {
    rateLimitBadgeEl.innerHTML = dict.rateLimitBadge;
  }

  // Scanning & Mindmap
  document.getElementById('txt-scanning-status').innerText = dict.scanningStatus;
  document.getElementById('txt-mindmap-title').innerText = dict.mindmapTitle;
  document.getElementById('filterTypeAll').innerText = dict.filterAll;
  document.getElementById('filterTypeMine').innerText = dict.filterMine;
  document.getElementById('resetZoom').title = dict.resetZoomTitle;
  document.getElementById('txt-legend-main').innerText = dict.legendMain;
  document.getElementById('txt-legend-staked').innerText = dict.legendStaked;
  document.getElementById('txt-legend-sub').innerText = dict.legendSub;
  document.getElementById('txt-legend-cex').innerText = dict.legendCex;
  document.getElementById('emptyNoticeText').innerText = dict.emptyNotice;
  document.getElementById('resetUsdFilterBtn').innerText = dict.resetUsdFilter;
  document.getElementById('txt-usd-filter-label').innerText = dict.usdFilterLabel;
  document.getElementById('txt-usd-above').innerText = dict.usdAbove;

  // Summary
  document.getElementById('txt-summary-title').innerText = dict.summaryTitle;
  document.getElementById('summaryDesc').innerText = dict.summaryDesc;
  document.getElementById('txt-metric-staked').innerText = dict.metricStaked;
  document.getElementById('txt-metric-rent').innerText = dict.metricRent;
  document.getElementById('txt-metric-tokens').innerText = dict.metricTokens;

  // Wallets & Targets titles
  document.getElementById('txt-wallets-title').innerText = dict.walletsTitle;
  document.getElementById('txt-targets-title').innerHTML = `<i data-lucide="layers" class="w-4 h-4 text-emerald-600 dark:text-emerald-500"></i> <span>${dict.targetsTitle}</span>`;

  // Sheet
  document.getElementById('txt-sheet-copy').innerText = dict.sheetCopy;
  document.getElementById('txt-sheet-txs').innerText = dict.sheetTxs;
  document.getElementById('txt-sheet-peers').innerText = dict.sheetBal;
  document.getElementById('txt-sheet-val').innerText = dict.sheetVol;
  document.getElementById('txt-sheet-mid-title').innerText = dict.sheetMidTitle;

  // Coffee Modal
  document.getElementById('txt-coffee-modal-title').innerText = dict.coffeeTitle;
  document.getElementById('txt-coffee-modal-sub').innerText = dict.coffeeSub;
  document.getElementById('txt-coffee-modal-story1').innerHTML = dict.coffeeStory1;
  document.getElementById('txt-coffee-modal-story2').innerText = dict.coffeeStory2;
  document.querySelectorAll('.txt-coffee-copy-btn').forEach(btn => {
    btn.innerText = dict.coffeeCopyBtn;
  });

  if (currentData) {
    renderDashboard(currentData);
    renderGraph(currentData.graph_data);
    renderWalletsList(currentData.classified_wallets || []);
    renderRecoveryTargets(currentData.recovery_targets || [], currentData.has_external_protocol);
  }
  initIcons();
}

// ----------------------------------------------------------------------------
// Client-side LRU Memory Cache with TTL (15-Minute Expiry matching Server) - v8.5
// ----------------------------------------------------------------------------
const CACHE_NAMESPACE = 'analysis-cache-v4';
const CLIENT_CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_CLIENT_CACHE = 50;
const clientAnalysisCache = new Map(); // key -> { data, ts }

const EVM_CHAINS = new Set(['ethereum', 'bsc']);

function normalizeAddress(chain, address) {
  const value = String(address ?? '').trim();
  const c = String(chain ?? '').trim().toLowerCase();
  return EVM_CHAINS.has(c) ? value.toLowerCase() : value;
}

function makeCacheKey(chain, address) {
  const c = String(chain ?? '').trim().toLowerCase();
  return `${c}:${normalizeAddress(c, address)}`;
}

function cachePut(key, data) {
  if (!key || !data) return;
  const normKey = String(key).trim();
  if (clientAnalysisCache.has(normKey)) {
    clientAnalysisCache.delete(normKey);
  }
  clientAnalysisCache.set(normKey, { data, ts: Date.now() });
  if (clientAnalysisCache.size > MAX_CLIENT_CACHE) {
    const oldestKey = clientAnalysisCache.keys().next().value;
    clientAnalysisCache.delete(oldestKey);
  }
}

function cacheGet(key) {
  if (!key) return null;
  const normKey = String(key).trim();
  const entry = clientAnalysisCache.get(normKey);
  if (!entry) return null;
  if (Date.now() - entry.ts >= CLIENT_CACHE_TTL_MS) {
    clientAnalysisCache.delete(normKey);
    return null;
  }
  // Refresh LRU order
  clientAnalysisCache.delete(normKey);
  clientAnalysisCache.set(normKey, entry);
  return entry.data;
}

// 번들에서 체인에 맞는 주소 고르기 (백엔드 detect_address_type과 일치)
function pickAddressForChain(chain, raw) {
  if (!raw) return null;
  const toks = raw.split(/[,;\s]+/).filter(Boolean);
  const kind = a => (a.startsWith('0x') && a.length === 42) ? 'evm'
    : (a.startsWith('T') && a.length >= 33 && a.length <= 35) ? 'tron'
    : (a.length >= 32 && a.length <= 44 && !a.startsWith('0x') && !a.startsWith('T')) ? 'solana' : null;
  const want = (chain === 'ethereum' || chain === 'bsc') ? 'evm' : chain;
  return toks.find(t => kind(t) === want) || null;
}

let unifiedInputMemo = '';

// Switch Active Chain
function switchChain(chain) {
  const addressInput = document.getElementById('addressInput');
  const prev = addressInput ? addressInput.value.trim() : '';
  if (currentChain === 'unified' && prev) unifiedInputMemo = prev;

  currentChain = chain;
  const cfg = CHAIN_PRESETS[chain];
  const dict = I18N[currentLanguage] || I18N.ko;

  document.querySelectorAll('.chain-tab').forEach(tab => {
    const tChain = tab.getAttribute('data-chain');
    if (tChain === chain) {
      tab.className = 'chain-tab chain-tab-active px-3 py-2.5 rounded-xl text-left transition-all flex items-center gap-2.5';
    } else {
      tab.className = 'chain-tab chain-tab-inactive px-3 py-2.5 rounded-xl text-left transition-all flex items-center gap-2.5';
    }
  });

  const slider = document.getElementById('minUsdSlider');
  slider.max = cfg.maxSlider;
  document.getElementById('sliderMaxLabel').innerText = `$${cfg.maxSlider}`;
  syncUsdFilterControls(0, false);

  const isPreset = Object.values(CHAIN_PRESETS).some(p => p.defaultAddress.toLowerCase() === prev.toLowerCase());
  let targetAddress = cfg.defaultAddress;
  if (chain === 'unified') {
    targetAddress = unifiedInputMemo || (isPreset || !prev ? cfg.defaultAddress : prev);
  } else if (!isPreset && prev) {
    targetAddress = pickAddressForChain(chain, prev) || cfg.defaultAddress;
  }
  if (addressInput) addressInput.value = targetAddress;

  document.getElementById('presetLabel').innerText = cfg.label;
  document.getElementById('presetBadge').innerText = dict[cfg.badgeKey] || dict.badgeUnified;

  loadAnalysis(chain, targetAddress, false);
}

// ----------------------------------------------------------------------------
// Rate Limit & Cooldown Manager (Max 25 queries / min = ~2.4s cooldown)
// ----------------------------------------------------------------------------
let isScanning = false;
let cooldownTimerInterval = null;
const SCAN_COOLDOWN_SECONDS = 2.4; // 60s / 25 queries = ~2.4s
let cooldownRemaining = 0;

function startCooldown(durationSec = SCAN_COOLDOWN_SECONDS) {
  const indicator = document.getElementById('cooldownIndicator');
  const timerText = document.getElementById('cooldownTimerText');
  const searchBtn = document.getElementById('searchBtn');

  if (cooldownTimerInterval) {
    clearInterval(cooldownTimerInterval);
  }

  cooldownRemaining = durationSec;
  if (indicator && timerText) {
    indicator.classList.remove('hidden');
    timerText.innerText = `${cooldownRemaining.toFixed(1)}s`;
  }

  if (searchBtn) {
    searchBtn.disabled = true;
    searchBtn.classList.add('opacity-70', 'cursor-not-allowed');
  }

  const stepMs = 100;
  cooldownTimerInterval = setInterval(() => {
    cooldownRemaining -= stepMs / 1000;
    if (cooldownRemaining <= 0) {
      clearInterval(cooldownTimerInterval);
      cooldownTimerInterval = null;
      cooldownRemaining = 0;
      if (indicator) indicator.classList.add('hidden');
      if (searchBtn && !isScanning) {
        searchBtn.disabled = false;
        searchBtn.classList.remove('opacity-70', 'cursor-not-allowed');
      }
    } else {
      if (timerText) timerText.innerText = `${cooldownRemaining.toFixed(1)}s`;
    }
  }, stepMs);
}

// Load Real On-Chain Analysis Data (Instant render on cache hit!)
async function loadAnalysis(chain, address, forceRefresh = false) {
  const dict = I18N[currentLanguage] || I18N.ko;
  const cacheKey = makeCacheKey(chain, address);

  // Instant Cache Hit: Skip network fetch & cooldown, render immediately!
  const cachedData = !forceRefresh ? cacheGet(cacheKey) : null;
  if (cachedData) {
    currentData = cachedData;
    renderDashboard(cachedData);
    renderGraph(cachedData.graph_data);
    renderWalletsList(cachedData.classified_wallets || []);
    renderRecoveryTargets(cachedData.recovery_targets || [], cachedData.has_external_protocol);
    initIcons();
    return;
  }

  if (isScanning) {
    showToast(dict.scanningStatus || '현재 온체인 조회가 진행 중입니다.');
    return;
  }
  if (cooldownRemaining > 0) {
    showToast(dict.scanCooldown.replace('{sec}', cooldownRemaining.toFixed(1)));
    return;
  }

  isScanning = true;
  startCooldown(SCAN_COOLDOWN_SECONDS);

  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const progressPercent = document.getElementById('progressPercent');
  const logFeed = document.getElementById('logFeed');

  progressContainer.classList.remove('hidden');
  progressBar.style.width = '30%';
  progressPercent.innerText = '30%';
  logFeed.innerHTML = `<div class="text-indigo-700 dark:text-indigo-400">[1/3] ${esc(chain.toUpperCase())} ${dict.logStep1}</div>`;

  let curPct = 30;
  let step2Timer = null;
  let creepTimer = null;

  step2Timer = setTimeout(() => {
    if (!isScanning) return;
    curPct = 70;
    progressBar.style.width = '70%';
    progressPercent.innerText = '70%';
    logFeed.innerHTML = `
      <div class="text-emerald-700 dark:text-emerald-400">✓ [1/3] ${dict.logStep1Done}</div>
      <div class="text-indigo-700 dark:text-indigo-400">[2/3] ${dict.logStep2}</div>
    `;
    creepTimer = setInterval(() => {
      if (isScanning && curPct < 94) {
        curPct += 2;
        progressBar.style.width = `${curPct}%`;
        progressPercent.innerText = `${curPct}%`;
      }
    }, 450);
  }, 180);

  try {
    const forceParam = forceRefresh ? '&force_refresh=true' : '';
    const res = await fetch(`/api/analysis?chain=${encodeURIComponent(chain)}&address=${encodeURIComponent(address)}${forceParam}`);
    
    let data = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        data = await res.json();
      } catch (jsonErr) {
        data = null;
      }
    }

    if (!res.ok) {
      let errorMsg = '';
      if (data && data.detail) {
        if (Array.isArray(data.detail)) {
          errorMsg = data.detail.map(d => (typeof d === 'object' ? (d.msg || JSON.stringify(d)) : d)).join(', ');
        } else if (typeof data.detail === 'string') {
          errorMsg = data.detail;
        }
      }

      if (!errorMsg) {
        if (res.status === 429) {
          errorMsg = dict.rateLimitExceeded || '분당 최대 실시간 스캔 횟수를 초과했습니다. 잠시 후 다시 시도해 주세요.';
        } else if (res.status === 422) {
          errorMsg = '유효하지 않은 체인 또는 주소입니다.';
        } else if (res.status === 503) {
          errorMsg = '서버가 혼잡합니다. 잠시 후 다시 시도해 주세요.';
        } else if (res.status === 502 || res.status === 504) {
          errorMsg = `게이트웨이/네트워크 응답 지연이 발생했습니다 (${res.status}). 잠시 후 다시 시도해 주세요.`;
        } else {
          errorMsg = `온체인 스캔 중 오류가 발생했습니다 (${res.status} ${res.statusText || ''})`.trim();
        }
      }

      showToast(errorMsg);
      progressContainer.classList.add('hidden');
      return;
    }

    currentData = data;
    // Save to client memory cache only if complete (never cache partial failures)
    if (!data.is_partial && !data.partial) {
      cachePut(cacheKey, data);
    }
    // Decompose sub-chains into client cache safely supporting both key formats
    Object.entries(data.per_chain_results || {}).forEach(([k, sub]) => {
      if (sub && !sub.is_partial && !sub.partial) {
        const key = k.includes(':') ? k : makeCacheKey(k, sub.address || '');
        cachePut(key, sub);
      }
    });

    if (step2Timer) clearTimeout(step2Timer);
    if (creepTimer) clearInterval(creepTimer);

    progressBar.style.width = '100%';
    progressPercent.innerText = '100%';
    logFeed.innerHTML = `
      <div class="text-emerald-700 dark:text-emerald-400">✓ [3/3] ${dict.logStep3Done}</div>
    `;
    setTimeout(() => {
      progressContainer.classList.add('hidden');
    }, 280);

    renderDashboard(data);
    renderGraph(data.graph_data);
    renderWalletsList(data.classified_wallets || []);
    renderRecoveryTargets(data.recovery_targets || [], data.has_external_protocol);

  } catch (err) {
    console.error(err);
    showToast(dict.networkError || '네트워크 또는 서버 응답 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    progressContainer.classList.add('hidden');
  } finally {
    if (step2Timer) clearTimeout(step2Timer);
    if (creepTimer) clearInterval(creepTimer);
    isScanning = false;
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn && cooldownRemaining <= 0) {
      searchBtn.disabled = false;
      searchBtn.classList.remove('opacity-70', 'cursor-not-allowed');
    }
    initIcons();
  }
}

function renderDashboard(data) {
  const dict = I18N[currentLanguage] || I18N.ko;
  document.getElementById('totalRecoverableUsd').innerText = `$${Number(data.total_recoverable_usd).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  document.getElementById('stakedMetric').innerText = `$${Number(data.staked_usd).toFixed(2)}`;
  document.getElementById('rentMetric').innerText = `$${Number(data.rent_reclaim_usd).toFixed(2)}`;
  document.getElementById('tokensMetric').innerText = `$${Number(data.token_balance_usd).toFixed(2)}`;
  
  const rawFirstSeen = data.first_seen || '실시간 조회 완료';
  document.getElementById('firstSeenBadge').innerText = localizeText(rawFirstSeen, currentLanguage);
  document.getElementById('targetCount').innerText = `${(data.recovery_targets || []).length} ${dict.unitItems}`;
}

// Render Filtered Sub-Wallets List (Shows Blank '—' when no external protocol!)
function renderWalletsList(wallets) {
  const container = document.getElementById('walletsList');
  container.innerHTML = '';
  const dict = I18N[currentLanguage] || I18N.ko;

  const filtered = wallets.filter(w => {
    if (walletTypeFilter === 'mine' && !w.is_my_wallet) return false;
    const effUsd = Math.max(Number(w.current_usd || 0), Number(w.volume_usd || 0));
    if (w.is_my_wallet && effUsd < minUsdThreshold) return false;
    if (!w.is_my_wallet && minUsdThreshold > 0) return false;
    return true;
  });

  document.getElementById('walletListCount').innerText = `${filtered.length} / ${wallets.length} ${dict.unitWallets}`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="inner-box rounded-xl text-center py-4 px-3 text-xs text-slate-600 dark:text-slate-400">
        ${wallets.length === 0 ? dict.noTxMessage : `${dict.noMatchFilterMessage} ($${minUsdThreshold}+)`}
      </div>
    `;
    return;
  }

  filtered.forEach(w => {
    const row = document.createElement('div');
    const isStake = w.wallet_type === 'MY_STAKE_WALLET';
    const dotColor = !w.is_my_wallet ? 'bg-slate-400' : (isStake ? 'bg-rose-500' : 'bg-amber-500');
    const protoText = w.protocol_id ? w.protocol_name : dict.blankProtocol;
    const localizedLabel = localizeText(w.label, currentLanguage);

    const relScore = Number(w.relation_score !== undefined ? w.relation_score : (w.is_my_wallet ? 90 : 20));
    const scoreBadgeClass = w.is_my_wallet
      ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30'
      : 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/25';
    const pivotChain = w.pivot_chain || (w.chain && w.chain !== 'bridge' ? w.chain : currentChain);
    const pivotAddr = w.pivot_address || w.address;
    const canPivot = w.can_pivot_scan !== false && Boolean(pivotAddr);

    row.className = 'inner-box rounded-xl p-3 transition cursor-pointer flex items-center justify-between gap-3';
    row.innerHTML = `
      <div class="flex items-center gap-2.5 min-w-0">
        <span class="w-2.5 h-2.5 rounded-full ${dotColor} shrink-0"></span>
        <div class="min-w-0">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-xs font-bold text-slate-900 dark:text-white truncate">${esc(localizedLabel)}</span>
            <span class="text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded border ${scoreBadgeClass}">연관도 ${esc(relScore)}%</span>
          </div>
          <div class="flex items-center gap-2 text-[10px] text-slate-600 dark:text-slate-400 font-mono mt-0.5">
            <span>${esc(w.short_addr || (w.address || '').slice(0, 10))}</span>
            <span>·</span>
            <span>생애 ${esc((w.lifetime_txs || 1).toLocaleString())}${dict.txCountLabel} (교류 ${esc(w.my_tx_count || 1)}회)</span>
          </div>
        </div>
      </div>
      <div class="text-right shrink-0 flex flex-col items-end gap-1">
        <span class="text-xs font-bold font-mono tabular-nums ${w.current_usd > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}">
          ${w.current_usd > 0 ? dict.balLabel + ' $' + Number(w.current_usd).toFixed(2) : (w.is_my_wallet ? dict.volLabel + ' $' + Number(w.volume_usd).toFixed(2) : 'CEX')}
        </span>
        <div class="flex items-center gap-1.5">
          ${canPivot && w.is_my_wallet ? `<button type="button" class="pivot-inline-btn px-2 py-0.5 rounded bg-indigo-600/15 hover:bg-indigo-600 hover:text-white text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold transition">🔍 연관추적</button>` : ''}
          <span class="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">${dict.detailsBtn}</span>
        </div>
      </div>
    `;
    const pivotBtn = row.querySelector('.pivot-inline-btn');
    if (pivotBtn) {
      pivotBtn.onclick = (ev) => {
        ev.stopPropagation();
        pivotToWallet(pivotAddr, pivotChain, localizedLabel);
      };
    }
    row.onclick = () => openBottomSheet(w);
    container.appendChild(row);
  });
}

// Render On-Chain Assets & External Protocol Status (Shows Native Ad Card when External Protocol is Blank/Empty!)
function renderRecoveryTargets(targets, hasExternalProtocol) {
  const container = document.getElementById('recoveryList');
  container.innerHTML = '';
  const dict = I18N[currentLanguage] || I18N.ko;

  if (targets.length === 0) {
    container.innerHTML = `
      <div class="inner-box rounded-xl p-3.5 text-xs text-slate-700 dark:text-slate-300 space-y-1">
        <div class="flex items-center justify-between">
          <span class="font-bold text-slate-900 dark:text-white">${dict.emptyTargetTitle}</span>
          <span class="font-mono text-[11px] text-slate-500">${dict.blankProtocol}</span>
        </div>
        <p class="text-[11px] text-slate-600 dark:text-slate-400">${dict.emptyTargetDesc}</p>
      </div>
    `;
  } else {
    targets.forEach(t => {
      const card = document.createElement('div');
      const protoDisplay = t.protocol_id ? t.protocol_name : dict.blankProtocol;
      const localizedBadge = localizeText(t.badge, currentLanguage);
      const localizedTitle = localizeText(t.title, currentLanguage);
      const localizedDesc = localizeText(t.description, currentLanguage);
      const safeTargetUrl = safeHttpsUrl(t.official_url, 'https://solscan.io');
      const shortTargetUrl = safeTargetUrl.replace(/^https:\/\//, '').slice(0, 32);

      card.className = 'inner-box rounded-xl p-3.5 transition cursor-pointer space-y-2';
      card.innerHTML = `
        <div class="flex items-start justify-between gap-2">
          <div>
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 inline-block mb-1">${esc(localizedBadge)}</span>
            <h4 class="text-xs font-bold text-slate-900 dark:text-white leading-snug">${esc(localizedTitle)}</h4>
          </div>
          <span class="text-sm font-mono font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums shrink-0">$${Number(t.value_usd).toFixed(2)}</span>
        </div>
        <p class="text-[11px] text-slate-700 dark:text-slate-400 leading-relaxed">${esc(localizedDesc)}</p>
        
        <div class="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-white/[0.06] text-[10px]">
          <span class="text-slate-600 dark:text-slate-400 font-medium">
            ${dict.extProtocolPrefix} <strong class="text-slate-900 dark:text-slate-200">${esc(protoDisplay)}</strong>
          </span>
          <a href="${esc(safeTargetUrl)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" class="text-indigo-700 dark:text-indigo-400 hover:underline font-mono font-bold flex items-center gap-1">
            <span>${esc(shortTargetUrl)}...</span>
            <i data-lucide="external-link" class="w-3 h-3"></i>
          </a>
        </div>
      `;
      card.onclick = () => openBottomSheetForTarget(t);
      container.appendChild(card);
    });
  }

  // When no external DeFi protocol is involved, render sponsored ad card
  if (!hasExternalProtocol) {
    const adCard = document.createElement('div');
    adCard.className = 'inner-box rounded-xl p-3.5 border-dashed border-indigo-500/40 bg-indigo-500/[0.04] space-y-2';
    adCard.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
          ${dict.sponsoredAdBadge}
        </span>
        <span class="text-[10px] text-slate-500 font-mono">AdSense / Partner Slot</span>
      </div>
      <div class="flex items-center justify-between gap-3">
        <div>
          <h4 class="text-xs font-bold text-slate-900 dark:text-white">${dict.sponsoredAdTitle}</h4>
          <p class="text-[11px] text-slate-700 dark:text-slate-400 mt-0.5 leading-relaxed">
            ${dict.sponsoredAdDesc}
          </p>
        </div>
        <a href="https://www.ledger.com" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold shrink-0 transition">
          ${dict.sponsoredAdCta}
        </a>
      </div>
    `;
    container.appendChild(adCard);
  }

  initIcons();
}

// Open 3-Tier Bottom Sheet (Never shows Kamino for pure Staking; shows Blank '—' + Ad Slot when no external protocol!)
function openBottomSheet(wallet) {
  const dict = I18N[currentLanguage] || I18N.ko;
  const wChain = (wallet.chain && CHAIN_PRESETS[wallet.chain]) ? wallet.chain : (currentChain === 'unified' ? 'solana' : currentChain);
  const cfg = CHAIN_PRESETS[wChain] || CHAIN_PRESETS.solana;

  activeSheetWallet = wallet;
  document.getElementById('sheetWalletAddress').innerText = wallet.address;
  document.getElementById('sheetWalletBadge').innerText = localizeText(wallet.label, currentLanguage);
  const relScore = Number(wallet.relation_score !== undefined ? wallet.relation_score : (wallet.is_my_wallet ? 90 : 20));
  const scoreBadgeEl = document.getElementById('sheetRelationScoreBadge');
  if (scoreBadgeEl) {
    scoreBadgeEl.innerText = `연관 신뢰도 ${relScore}%`;
  }
  const tagsEl = document.getElementById('sheetEvidenceTags');
  if (tagsEl) {
    tagsEl.innerHTML = '';
    const tags = Array.isArray(wallet.evidence_tags) && wallet.evidence_tags.length > 0
      ? wallet.evidence_tags
      : (wallet.is_my_wallet ? ['내 지갑 연관 확인'] : ['외부 거래 상대방']);
    tags.forEach(t => {
      const span = document.createElement('span');
      span.className = 'text-[10px] font-medium px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25';
      span.innerText = t;
      tagsEl.appendChild(span);
    });
  }
  const pivotBtnEl = document.getElementById('pivotSheetAddrBtn');
  if (pivotBtnEl) {
    const canPivot = wallet.can_pivot_scan !== false && Boolean(wallet.address);
    pivotBtnEl.style.display = canPivot ? 'inline-flex' : 'none';
  }
  document.getElementById('sheetTxCount').innerText = `${(wallet.lifetime_txs || 0).toLocaleString()} ${dict.txCountLabel} (교류 ${wallet.my_tx_count || 1}회)`;
  document.getElementById('sheetCurrentUsd').innerText = `$${Number(wallet.current_usd || 0).toFixed(2)}`;
  document.getElementById('sheetVolumeUsd').innerText = `$${Number(wallet.volume_usd || 0).toFixed(2)}`;
  document.getElementById('sheetWalletReason').innerText = localizeText(wallet.reason, currentLanguage);

  // Tier 2: Wallet Balance vs External Protocol Breakdown
  const posContainer = document.getElementById('sheetStuckPositions');
  posContainer.innerHTML = '';

  if (wallet.stuck_positions && wallet.stuck_positions.length > 0) {
    wallet.stuck_positions.forEach(p => {
      const row = document.createElement('div');
      row.className = 'inner-box flex items-center justify-between p-2.5 rounded-xl';
      row.innerHTML = `
        <div>
          <span class="text-slate-900 dark:text-white font-bold block text-xs">${esc(localizeText(p.name, currentLanguage))}</span>
          <span class="text-slate-600 dark:text-slate-400 text-[11px] font-mono">${esc(p.amount_desc || '')}</span>
        </div>
        <span class="text-emerald-700 dark:text-emerald-400 font-mono font-bold tabular-nums text-xs">$${Number(p.usd).toFixed(2)}</span>
      `;
      posContainer.appendChild(row);
    });
  } else {
    const emptyRow = document.createElement('div');
    emptyRow.className = 'inner-box flex items-center justify-between p-2.5 rounded-xl';
    emptyRow.innerHTML = `
      <span class="text-slate-700 dark:text-slate-300 font-semibold text-xs">${dict.sheetBal}</span>
      <span class="text-slate-500 font-mono text-xs">$${Number(wallet.current_usd || 0).toFixed(2)}</span>
    `;
    posContainer.appendChild(emptyRow);
  }

  // Always explicitly show External Protocol Row (Blank '—' if null!)
  const extProtoId = wallet.protocol_id || ((wallet.stuck_positions || []).find(p => p.protocol)?.protocol) || null;
  const protoRow = document.createElement('div');
  protoRow.className = 'inner-box flex items-center justify-between p-2.5 rounded-xl';
  protoRow.innerHTML = `
    <span class="text-slate-700 dark:text-slate-300 font-semibold text-xs">${dict.extDefiProtocol}</span>
    <span class="font-mono font-bold text-xs ${extProtoId ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}">
      ${extProtoId ? esc(String(extProtoId).toUpperCase()) : dict.blankProtocol}
    </span>
  `;
  posContainer.appendChild(protoRow);

  // Render Top Historical Transactions (Dates & Amounts) if available
  if (wallet.top_txs && wallet.top_txs.length > 0) {
    const txHeader = document.createElement('div');
    txHeader.className = 'text-[11px] font-bold text-slate-700 dark:text-slate-300 pt-2 pb-0.5 flex items-center gap-1';
    txHeader.innerHTML = `<span>${dict.topTxHistoryTitle}</span>`;
    posContainer.appendChild(txHeader);

    wallet.top_txs.forEach(tx => {
      const txRow = document.createElement('div');
      txRow.className = 'inner-box flex items-center justify-between p-2 rounded-lg text-[11px]';
      txRow.innerHTML = `
        <div>
          <span class="font-semibold text-slate-900 dark:text-white block">${esc(localizeText(tx.direction, currentLanguage))}</span>
          <span class="font-mono text-[10px] text-slate-500">${esc(tx.date || dict.dateUnknown)}</span>
        </div>
        <span class="font-mono font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">${esc(tx.amount)} ${esc(tx.symbol || '')}</span>
      `;
      posContainer.appendChild(txRow);
    });
  }

  // Tier 3: Protocol Encyclopedia OR Blank + Native Ad Slot
  renderSheetProtocolTier(extProtoId, wallet.address, cfg.explorerUrl + wallet.address);

  const backdrop = document.getElementById('bottomSheetBackdrop');
  const sheet = document.getElementById('bottomSheet');
  backdrop.classList.remove('hidden');
  requestAnimationFrame(() => {
    sheet.classList.add('bottom-sheet-open');
  });
}

function renderSheetProtocolTier(protoId, address, explorerFullUrl) {
  const container = document.getElementById('sheetProtocolContainer');
  const dict = I18N[currentLanguage] || I18N.ko;
  const safeExplorerUrl = safeHttpsUrl(explorerFullUrl, 'https://solscan.io');

  if (!protoId) {
    // STRICT BLANK STATE + SPONSORED AD SLOT WHEN NO PROTOCOL IS ASSOCIATED!
    container.innerHTML = `
      <div class="flex items-center justify-between">
        <h3 class="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
          <i data-lucide="info" class="w-4 h-4 text-slate-500"></i>
          <span>${dict.sheetBlankProtoTitle} <span class="text-slate-500 font-normal">${dict.blankProtocol}</span></span>
        </h3>
        <span class="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-semibold">${dict.officialVerified}</span>
      </div>

      <p class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
        ${dict.sheetBlankProtoDesc}
      </p>

      <!-- Sponsored Ad Banner in Blank Protocol Space -->
      <div class="inner-box rounded-xl p-3 border-dashed border-amber-500/50 space-y-1.5">
        <div class="flex items-center justify-between">
          <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300">${dict.sheetAdBadge}</span>
          <a href="https://www.ledger.com" target="_blank" rel="noopener noreferrer" class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">${dict.sheetAdLink}</a>
        </div>
        <p class="text-[11px] text-slate-700 dark:text-slate-300">
          ${dict.sheetAdDesc}
        </p>
      </div>

      <div class="pt-1">
        <a
          href="${esc(safeExplorerUrl)}"
          target="_blank"
          rel="noopener noreferrer"
          class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2 font-mono"
        >
          <i data-lucide="shield-check" class="w-4 h-4 text-emerald-300"></i>
          <span>${dict.officialLinkPrefix} ${esc(safeExplorerUrl.slice(0, 46))}...</span>
          <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
        </a>
        <p class="text-[10px] text-center text-slate-600 dark:text-slate-400 mt-1.5">
          ${dict.safetyNotice}
        </p>
      </div>
    `;
    initIcons();
    return;
  }

  fetch('/api/protocols').then(r => r.json()).then(protocols => {
    const proto = protocols[protoId];
    if (!proto) {
      renderSheetProtocolTier(null, address, safeExplorerUrl);
      return;
    }
    const safeProtoUrl = safeHttpsUrl(proto.official_url, safeExplorerUrl);
    container.innerHTML = `
      <div class="flex items-center justify-between">
        <h3 class="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
          <span>${esc(proto.name)} (${esc(proto.category)})</span>
        </h3>
        <span class="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-semibold">${dict.officialVerified}</span>
      </div>
      <p class="text-xs text-slate-800 dark:text-slate-300 leading-relaxed">${esc(proto.description)}</p>
      <div class="inner-box text-[11px] text-slate-700 dark:text-slate-300 p-3 rounded-xl leading-relaxed">
        <strong class="text-indigo-700 dark:text-indigo-400 block mb-0.5">${dict.sheetEscapeTitle}</strong>
        ${esc(proto.escape_guide)}
      </div>
      <div class="pt-1">
        <a
          href="${esc(safeProtoUrl)}"
          target="_blank"
          rel="noopener noreferrer"
          class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2 font-mono"
        >
          <i data-lucide="shield-check" class="w-4 h-4 text-emerald-300"></i>
          <span>${dict.officialLinkPrefix} ${esc(safeProtoUrl)}</span>
          <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
        </a>
        <p class="text-[10px] text-center text-slate-600 dark:text-slate-400 mt-1.5">
          ${dict.safetyNotice}
        </p>
      </div>
    `;
    initIcons();
  });
}

function closeBottomSheet() {
  const backdrop = document.getElementById('bottomSheetBackdrop');
  const sheet = document.getElementById('bottomSheet');
  sheet.classList.remove('bottom-sheet-open');
  setTimeout(() => {
    backdrop.classList.add('hidden');
  }, 240);
}

function openBottomSheetForTarget(target) {
  const dict = I18N[currentLanguage] || I18N.ko;
  openBottomSheet({
    address: currentData.address,
    label: target.title,
    lifetime_txs: 1,
    current_usd: target.value_usd,
    volume_usd: target.value_usd,
    protocol_id: target.protocol_id || null,
    protocol_name: target.protocol_name || dict.blankProtocol,
    reason: target.description,
    stuck_positions: [{
      protocol: target.protocol_id || null,
      name: target.title,
      amount_desc: target.amount_desc,
      usd: target.value_usd
    }]
  });
}

// D3.js Interactive Force Graph with Real-Time Min USD Filtering
function renderGraph(graphData) {
  const svg = d3.select("#graphSvg");
  svg.selectAll("*").remove();

  const containerEl = document.getElementById('graphContainer');
  const width = containerEl.clientWidth || 540;
  const height = 350;
  const isDark = document.documentElement.classList.contains('dark');
  const dict = I18N[currentLanguage] || I18N.ko;

  const allNonRootNodes = graphData.nodes.filter(n => n.type !== 'ROOT' && n.type !== 'HUB_ROOT');
  const filteredNodes = graphData.nodes.filter(n => {
    if (n.type === 'ROOT' || n.type === 'HUB_ROOT') return true;
    if (walletTypeFilter === 'mine' && n.type === 'CEX_HOTWALLET') return false;
    if (n.type === 'CEX_HOTWALLET' && minUsdThreshold > 0) return false;
    return Number(n.usd || 0) >= minUsdThreshold;
  }).map(n => Object.assign({}, n));

  const visibleNodeIds = new Set(filteredNodes.map(n => n.id));
  const filteredLinks = graphData.links
    .filter(l => {
      const srcId = typeof l.source === 'object' ? l.source.id : l.source;
      const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
      return visibleNodeIds.has(srcId) && visibleNodeIds.has(tgtId);
    })
    .map(l => ({
      source: typeof l.source === 'object' ? l.source.id : l.source,
      target: typeof l.target === 'object' ? l.target.id : l.target,
      value: l.value,
      type: l.type,
      strokeWidth: l.strokeWidth
    }));

  const visibleSubCount = filteredNodes.filter(n => n.type !== 'ROOT' && n.type !== 'HUB_ROOT').length;
  document.getElementById('visibleWalletCountBadge').innerText = `${dict.visibleWallets}: ${visibleSubCount} / ${allNonRootNodes.length}`;

  const emptyNotice = document.getElementById('graphEmptyNotice');
  if (allNonRootNodes.length > 0 && visibleSubCount === 0) {
    emptyNotice.classList.remove('hidden');
  } else {
    emptyNotice.classList.add('hidden');
  }

  const g = svg.append("g");

  const zoom = d3.zoom().scaleExtent([0.4, 2.8]).on("zoom", (e) => {
    g.attr("transform", e.transform);
  });
  svg.call(zoom);

  document.getElementById('resetZoom').onclick = () => {
    svg.transition().duration(450).call(zoom.transform, d3.zoomIdentity);
  };

  const simulation = d3.forceSimulation(filteredNodes)
    .force("link", d3.forceLink(filteredLinks).id(d => d.id).distance(105))
    .force("charge", d3.forceManyBody().strength(-260))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide().radius(d => d.radius + 22));

  const link = g.append("g")
    .selectAll("line")
    .data(filteredLinks)
    .join("line")
    .attr("stroke", d => {
      if (d.type === 'STAKE_DELEGATION') return '#e11d48';
      if (d.type === 'HIGH_INTERACTION') return isDark ? '#f59e0b' : '#d97706';
      return isDark ? '#475569' : '#64748b';
    })
    .attr("stroke-width", d => d.strokeWidth || 2)
    .attr("stroke-opacity", 0.7)
    .attr("class", d => (d.type === 'HIGH_INTERACTION' || d.type === 'STAKE_DELEGATION') ? 'flowing-link' : '');

  const node = g.append("g")
    .selectAll("g")
    .data(filteredNodes)
    .join("g")
    .style("cursor", "pointer")
    .call(d3.drag()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x; d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null; d.fy = null;
      }))
    .on("click", (event, d) => {
      const match = (currentData.classified_wallets || []).find(w => w.address === d.id || w.address === d.raw_address);
      if (match) {
        openBottomSheet(match);
      } else if (d.type === 'ROOT') {
        openBottomSheet({
          address: d.id,
          label: dict.rootWalletLabel,
          lifetime_txs: (currentData.classified_wallets || []).length,
          current_usd: d.usd,
          volume_usd: d.usd,
          protocol_id: null,
          protocol_name: dict.blankProtocol,
          reason: dict.rootWalletReason,
          stuck_positions: (currentData.recovery_targets || []).map(t => ({
            protocol: t.protocol_id || null,
            name: t.title,
            amount_desc: t.amount_desc,
            usd: t.value_usd
          }))
        });
      }
    });

  node.append("circle")
    .attr("r", d => d.radius + 5)
    .attr("fill", d => {
      if (d.type === 'ROOT') return 'rgba(79, 70, 229, 0.2)';
      if (d.type === 'JACKPOT_STAKE') return 'rgba(225, 29, 72, 0.22)';
      if (d.type === 'MY_SUBWALLET') return 'rgba(217, 119, 6, 0.2)';
      return 'rgba(100, 116, 139, 0.15)';
    });

  node.append("circle")
    .attr("r", d => d.radius)
    .attr("fill", d => {
      if (d.type === 'HUB_ROOT') return '#312e81';
      if (d.type === 'ROOT') return '#4f46e5';
      if (d.type === 'BRIDGE_HOP') return '#9333ea';
      if (d.type === 'JACKPOT_STAKE') return '#e11d48';
      if (d.type === 'MY_SUBWALLET') return '#d97706';
      return '#475569';
    })
    .attr("stroke", isDark ? "#07090E" : "#ffffff")
    .attr("stroke-width", 2.5);

  node.append("text")
    .text(d => {
      if (d.type === 'HUB_ROOT') return 'HUB';
      if (d.type === 'ROOT') return d.short || 'MAIN';
      if (d.type === 'CEX_HOTWALLET') return 'CEX';
      if (d.type === 'BRIDGE_HOP') return d.short || 'BRIDGE';
      const b = Number(d.balance_usd !== undefined ? d.balance_usd : (d.usd || 0));
      return b >= 1 ? `$${Math.round(b)}` : (b > 0 ? `$${b.toFixed(2)}` : '$0');
    })
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .attr("fill", "#ffffff")
    .attr("font-family", "JetBrains Mono, monospace")
    .attr("font-size", d => d.radius > 20 ? "10px" : "8.5px")
    .attr("font-weight", "700");

  node.append("text")
    .text(d => localizeText(d.short || d.label, currentLanguage))
    .attr("text-anchor", "middle")
    .attr("dy", d => d.radius + 14)
    .attr("fill", isDark ? "#e2e8f0" : "#0f172a")
    .attr("font-size", "10px")
    .attr("font-weight", "700");

  simulation.on("tick", () => {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    node.attr("transform", d => `translate(${d.x},${d.y})`);
  });
}

// ============================================================================
// v9.0 RELATED-WALLET PIVOT SCAN & INTERACTIVE RECOVERY / AFFILIATE FUNNEL
// ============================================================================
function renderPivotTrail() {
  const container = document.getElementById('pivotTrailContainer');
  const itemsEl = document.getElementById('pivotTrailItems');
  if (!container || !itemsEl) return;

  if (pivotTrail.length <= 1) {
    container.classList.add('hidden');
    itemsEl.innerHTML = '';
    return;
  }

  container.classList.remove('hidden');
  itemsEl.innerHTML = '';

  pivotTrail.forEach((step, idx) => {
    const isLast = idx === pivotTrail.length - 1;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = isLast
      ? 'px-2 py-0.5 rounded bg-indigo-600 text-white font-mono font-bold text-[10px] shrink-0'
      : 'inner-box px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 font-mono text-[10px] hover:border-indigo-500 shrink-0';
    const shortAddr = step.address.length > 14 ? `${step.address.slice(0, 6)}...${step.address.slice(-4)}` : step.address;
    btn.innerText = `${idx === 0 ? '🏠 ' : '👤 '}${step.chain.toUpperCase()}:${shortAddr}`;
    btn.onclick = () => {
      pivotTrail = pivotTrail.slice(0, idx + 1);
      renderPivotTrail();
      const target = pivotTrail[pivotTrail.length - 1];
      currentChain = target.chain;
      document.getElementById('addressInput').value = target.address;
      switchChainWithAddress(target.chain, target.address);
    };
    itemsEl.appendChild(btn);

    if (!isLast) {
      const sep = document.createElement('span');
      sep.className = 'text-slate-400 font-bold text-[10px]';
      sep.innerText = '➔';
      itemsEl.appendChild(sep);
    }
  });
}

function switchChainWithAddress(chain, address) {
  const targetChain = CHAIN_PRESETS[chain] ? chain : 'unified';
  currentChain = targetChain;
  document.querySelectorAll('.chain-tab').forEach(tab => {
    const tChain = tab.getAttribute('data-chain');
    tab.className = (tChain === targetChain)
      ? 'chain-tab chain-tab-active px-3 py-2.5 rounded-xl text-left transition-all flex items-center gap-2.5'
      : 'chain-tab chain-tab-inactive px-3 py-2.5 rounded-xl text-left transition-all flex items-center gap-2.5';
  });
  const addressInput = document.getElementById('addressInput');
  if (addressInput) addressInput.value = address;
  loadAnalysis(targetChain, address, false);
}

function pivotToWallet(targetAddress, targetChain, labelHint = '') {
  if (!targetAddress) return;
  const resolvedChain = (targetChain && CHAIN_PRESETS[targetChain]) ? targetChain : currentChain;
  const currentAddr = (document.getElementById('addressInput')?.value || '').trim();

  if (pivotTrail.length === 0 && currentAddr) {
    pivotTrail.push({
      chain: currentChain,
      address: currentAddr,
      label: 'Root Wallet'
    });
  }

  const last = pivotTrail[pivotTrail.length - 1];
  if (!last || last.address.toLowerCase() !== targetAddress.toLowerCase() || last.chain !== resolvedChain) {
    pivotTrail.push({
      chain: resolvedChain,
      address: targetAddress,
      label: labelHint || targetAddress
    });
  }

  closeBottomSheet();
  renderPivotTrail();
  switchChainWithAddress(resolvedChain, targetAddress);
  showToast(`🔍 연관 지갑(${targetAddress.slice(0, 6)}...) 연쇄 추적을 시작합니다.`);
}

async function loadPartnerAdConfig() {
  try {
    const res = await fetch('/api/ad-config');
    if (res.ok) {
      const cfg = await res.json();
      partnerAdConfig = Object.assign(partnerAdConfig, cfg || {});
      const topAdLink = document.getElementById('topAdLink');
      if (topAdLink && partnerAdConfig.affiliate_url) {
        topAdLink.href = safeHttpsUrl(partnerAdConfig.affiliate_url, 'https://shop.ledger.com');
      }
    }
  } catch (e) {
    // Keep safe defaults
  }
}

function openRecoveryModal() {
  const modal = document.getElementById('recoveryModalBackdrop');
  const summaryEl = document.getElementById('recoveryModalSummary');
  const partnersEl = document.getElementById('recoveryPartnerCards');
  if (!modal || !summaryEl || !partnersEl) return;

  const data = currentData || {};
  const totalUsd = Number(data.total_recoverable_usd || 0).toFixed(2);
  const myWallets = (data.classified_wallets || []).filter(w => w.is_my_wallet);
  const targets = data.recovery_targets || [];

  summaryEl.innerHTML = `
    <div class="flex items-center justify-between border-b border-slate-300 dark:border-white/[0.08] pb-2">
      <span class="font-bold text-slate-900 dark:text-white">현재 스캔 요약 · 발굴된 연관 지갑 및 자산</span>
      <span class="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">$${totalUsd} USD</span>
    </div>
    <div class="grid grid-cols-2 gap-2 pt-1">
      <div class="inner-box p-2.5 rounded-lg">
        <span class="text-[10px] text-slate-500 block">식별된 내 연관/보조 지갑</span>
        <span class="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">${myWallets.length}개 지갑 (클릭하여 연쇄 추적)</span>
      </div>
      <div class="inner-box p-2.5 rounded-lg">
        <span class="text-[10px] text-slate-500 block">즉시 회수 대상 포지션</span>
        <span class="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">${targets.length}건 (스테이킹·렌트·토큰)</span>
      </div>
    </div>
    <p class="text-[11px] text-slate-700 dark:text-slate-300 pt-1 leading-relaxed">
      💡 <strong>회수 팁:</strong> 솔라나 스테이킹/렌트비는 팬텀·솔플레어 지갑에서 해제하며, BNB/TRX 가스비가 부족해 묶인 USDT는 아래 제휴 거래소에서 소액 가스비를 입금해 즉시 인출할 수 있습니다.
    </p>
  `;

  const partners = (partnerAdConfig.partners && partnerAdConfig.partners.length > 0) ? partnerAdConfig.partners : [
    {
      name: 'Binance (바이낸스 공식 제휴)',
      benefit_badge: '거래 수수료 최대 20~40% 할인',
      description: '발굴한 코인 현금화 및 가스비 부족 지갑 구출용 소액 BNB·TRX 출금 지원',
      url: partnerAdConfig.exchange_referral_url || 'https://accounts.binance.com/register'
    },
    {
      name: 'OKX (오케이엑스 Web3 & 거래소)',
      benefit_badge: '수수료 30% 페이백 혜택',
      description: '다계정 에어드랍 지갑 통합 관리 및 멀티체인 브릿지 자산 즉시 입출금',
      url: partnerAdConfig.okx_referral_url || 'https://www.okx.com/join'
    },
    {
      name: 'Ledger (렛저 하드웨어 콜드월렛)',
      benefit_badge: '해킹·드레이너 100% 물리적 차단',
      description: '되찾은 소중한 스테이킹·보조지갑 자산을 오프라인 보안 칩에 안전하게 통합 보관하세요',
      url: partnerAdConfig.affiliate_url || 'https://shop.ledger.com'
    }
  ];

  partnersEl.innerHTML = '';
  partners.forEach(p => {
    const safePartnerUrl = safeHttpsUrl(p.url, 'https://shop.ledger.com');
    const card = document.createElement('div');
    card.className = 'inner-box rounded-xl p-3 flex items-center justify-between gap-3';
    card.innerHTML = `
      <div class="min-w-0 space-y-0.5">
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-xs font-bold text-slate-900 dark:text-white">${esc(p.name)}</span>
          <span class="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">${esc(p.benefit_badge)}</span>
        </div>
        <p class="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">${esc(p.description)}</p>
      </div>
      <a href="${esc(safePartnerUrl)}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold shrink-0 transition flex items-center gap-1">
        <span>이동</span>
        <i data-lucide="external-link" class="w-3 h-3"></i>
      </a>
    `;
    partnersEl.appendChild(card);
  });

  modal.classList.remove('hidden');
  initIcons();
}

// Initialize DOM Events
document.addEventListener('DOMContentLoaded', () => {
  loadPartnerAdConfig();
  initIcons();

  document.getElementById('langSelect').addEventListener('change', (e) => {
    switchLanguage(e.target.value);
  });

  document.querySelectorAll('.chain-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchChain(tab.getAttribute('data-chain'));
    });
  });

  function runSearch() {
    const addr = document.getElementById('addressInput').value.trim();
    if (!addr) return;
    const same = currentData && currentData.chain === currentChain &&
      (currentData.address || '').toLowerCase() === addr.toLowerCase();
    loadAnalysis(currentChain, addr, !!same);
  }

  document.getElementById('searchBtn').addEventListener('click', runSearch);
  document.getElementById('addressInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      runSearch();
    }
  });

  document.getElementById('presetChip').addEventListener('click', () => {
    unifiedInputMemo = '';
    const cfg = CHAIN_PRESETS[currentChain];
    document.getElementById('addressInput').value = cfg.defaultAddress;
    loadAnalysis(currentChain, cfg.defaultAddress);
  });

  const minUsdSlider = document.getElementById('minUsdSlider');
  const minUsdInput = document.getElementById('minUsdInput');

  minUsdSlider.addEventListener('input', (e) => {
    syncUsdFilterControls(e.target.value, true);
  });

  minUsdInput.addEventListener('input', (e) => {
    syncUsdFilterControls(e.target.value, true);
  });

  document.querySelectorAll('.usd-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      syncUsdFilterControls(btn.getAttribute('data-usd-preset'), true);
    });
  });

  document.getElementById('resetUsdFilterBtn').addEventListener('click', () => {
    syncUsdFilterControls(0, true);
  });

  const btnAll = document.getElementById('filterTypeAll');
  const btnMine = document.getElementById('filterTypeMine');
  btnAll.addEventListener('click', () => {
    walletTypeFilter = 'all';
    btnAll.className = 'px-2.5 py-1 rounded-md bg-indigo-600 text-white font-semibold transition';
    btnMine.className = 'px-2.5 py-1 rounded-md text-slate-700 dark:text-slate-400 hover:bg-white/60 dark:hover:text-white transition';
    if (currentData) {
      renderGraph(currentData.graph_data);
      renderWalletsList(currentData.classified_wallets || []);
    }
  });
  btnMine.addEventListener('click', () => {
    walletTypeFilter = 'mine';
    btnMine.className = 'px-2.5 py-1 rounded-md bg-indigo-600 text-white font-semibold transition';
    btnAll.className = 'px-2.5 py-1 rounded-md text-slate-700 dark:text-slate-400 hover:bg-white/60 dark:hover:text-white transition';
    if (currentData) {
      renderGraph(currentData.graph_data);
      renderWalletsList(currentData.classified_wallets || []);
    }
  });

  document.getElementById('openCoffeeBtn').addEventListener('click', () => {
    document.getElementById('coffeeModalBackdrop').classList.remove('hidden');
  });
  document.getElementById('closeCoffeeBtn').addEventListener('click', () => {
    document.getElementById('coffeeModalBackdrop').classList.add('hidden');
  });
  document.getElementById('coffeeModalBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'coffeeModalBackdrop') {
      document.getElementById('coffeeModalBackdrop').classList.add('hidden');
    }
  });

  document.getElementById('closeSheetBtn').addEventListener('click', closeBottomSheet);
  document.getElementById('bottomSheetBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'bottomSheetBackdrop') closeBottomSheet();
  });
  document.getElementById('copySheetAddr').addEventListener('click', () => {
    copyToClipboard(document.getElementById('sheetWalletAddress').innerText);
  });
  const pivotSheetBtn = document.getElementById('pivotSheetAddrBtn');
  if (pivotSheetBtn) {
    pivotSheetBtn.addEventListener('click', () => {
      if (activeSheetWallet && activeSheetWallet.address) {
        const targetCh = activeSheetWallet.pivot_chain || (activeSheetWallet.chain && activeSheetWallet.chain !== 'bridge' ? activeSheetWallet.chain : currentChain);
        pivotToWallet(activeSheetWallet.pivot_address || activeSheetWallet.address, targetCh, activeSheetWallet.label);
      }
    });
  }
  const resetPivotBtn = document.getElementById('resetPivotTrailBtn');
  if (resetPivotBtn) {
    resetPivotBtn.addEventListener('click', () => {
      if (pivotTrail.length > 0) {
        const rootStep = pivotTrail[0];
        pivotTrail = [];
        renderPivotTrail();
        switchChainWithAddress(rootStep.chain, rootStep.address);
      }
    });
  }
  const openRecBtn = document.getElementById('openRecoveryModalBtn');
  if (openRecBtn) openRecBtn.addEventListener('click', openRecoveryModal);
  const openRecTopBtn = document.getElementById('openRecoveryTopBtn');
  if (openRecTopBtn) openRecTopBtn.addEventListener('click', openRecoveryModal);
  const closeRecBtn = document.getElementById('closeRecoveryModalBtn');
  if (closeRecBtn) {
    closeRecBtn.addEventListener('click', () => {
      document.getElementById('recoveryModalBackdrop').classList.add('hidden');
    });
  }
  const recBackdrop = document.getElementById('recoveryModalBackdrop');
  if (recBackdrop) {
    recBackdrop.addEventListener('click', (e) => {
      if (e.target.id === 'recoveryModalBackdrop') {
        recBackdrop.classList.add('hidden');
      }
    });
  }

  document.getElementById('themeToggle').addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    if (currentData) {
      renderGraph(currentData.graph_data);
    }
  });

  switchChain('unified');
});
