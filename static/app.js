// OnChain Detective App JS (v8 - Comprehensive 6-Language Localization & Dynamic On-Chain Text Engine)

let currentChain = 'unified';
let currentData = null;
let currentLanguage = 'ko';
let minUsdThreshold = 0;
let walletTypeFilter = 'all'; // 'all' or 'mine'

// ============================================================================
// 1. STATIC UI TRANSLATION DICTIONARIES (ko, en, zh, ja, es, ru)
// ============================================================================
const I18N = {
  ko: {
    metaTitle: 'OnChain Detective | 멀티체인 방치 자산 & 다계정 역추적 솔루션',
    appTitle: 'OnChain Detective',
    appDesc: '다계정 에어드랍 지갑 역추적 & 방치 자산 스캐너',
    readonlyBadge: '실시간 온체인 안전조회',
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
    coffeeSub: '디지털 우주를 떠도는 나의 $2,000를 기리며...',
    coffeeStory1: '저 역시 여러분과 똑같은 코린이였습니다. 에어드랍 받겠다고 곰돌이(베라체인) 트랜잭션 수백 개씩 찍고, 다계정 만든다고 지갑 쪼개고, 카미노니 팬케이크스왑에 돈을 보냈다가 까먹어서 <strong>피 같은 $2,000</strong>를 날려먹고 밤새 헤매다 직접 만든 온체인 탐정기입니다.',
    coffeeStory2: '잠자던 자산을 단 $10라도 찾으셨다면, 개발자가 다음 체인을 추적할 수 있도록 따뜻한 커피 한 잔 후원해 주세요!',
    coffeeCopyBtn: '복사',
    blankProtocol: '— (공란 · 연관 외부 프로토콜 없음)',
    badgeUnified: '4대 체인 · 브릿지 통합조회',
    badgeSolana: '4.13 SOL 네이티브 스테이킹',
    badgeEthereum: '실시간 ERC-20 조회',
    badgeBsc: '실시간 BEP-20 조회',
    badgeTron: '실시간 TRC-20 조회',
    rootWalletLabel: '내 메인 조회 지갑 (Root Address)',
    rootWalletReason: '현재 스캔 기준이 되는 중심 지갑입니다.'
  },
  en: {
    metaTitle: 'OnChain Detective | Multi-Chain Airdrop Tracer & Forgotten Asset Scanner',
    appTitle: 'OnChain Detective',
    appDesc: 'Multi-Account Airdrop Tracer & Forgotten Asset Scanner',
    readonlyBadge: 'Live Read-Only On-Chain',
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
    coffeeSub: 'In memory of my $2,000 lost in the digital universe...',
    coffeeStory1: 'I was a crypto newbie just like you. Farming airdrops with hundreds of Berachain transactions, splitting multiple wallets, depositing funds into Kamino or PancakeSwap and forgetting about them—losing <strong>a painful $2,000</strong>. After wandering through block explorers all night, I built this On-Chain Detective tool myself.',
    coffeeStory2: 'If this tool helped you recover even $10 of forgotten crypto, please consider buying a warm cup of coffee to support further chain tracking!',
    coffeeCopyBtn: 'Copy',
    blankProtocol: '— (Blank · No External Protocol)',
    badgeUnified: '4 Chains + Bridge Scan',
    badgeSolana: '4.13 SOL Native Staking',
    badgeEthereum: 'Live ERC-20 Scan',
    badgeBsc: 'Live BEP-20 Scan',
    badgeTron: 'Live TRC-20 Scan',
    rootWalletLabel: 'Main Scan Wallet (Root Address)',
    rootWalletReason: 'Root central wallet for the current scan.'
  },
  zh: {
    metaTitle: 'OnChain Detective | 多链沉睡资产与多账号逆向追踪工具',
    appTitle: 'OnChain Detective',
    appDesc: '空投多账号逆向追踪 & 链上滞留资产扫描器',
    readonlyBadge: '实时链上只读安全查询',
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
    coffeeSub: '纪念我遗失在数字宇宙中的 $2,000...',
    coffeeStory1: '我也曾和大家一样是个加密小白。为了撸空投刷了几百笔 Berachain 交易，分散搞多账号，往 Kamino、PancakeSwap 质押转账后转头就忘，白白损失了<strong>血汗钱 $2,000</strong>。在区块链浏览器里通宵翻找后，我亲手打造了这个链上侦探工具。',
    coffeeStory2: '如果您通过本工具找回了哪怕 $10 的沉睡资产，欢迎请开发者喝杯热咖啡，支持我们接入追踪更多公链！',
    coffeeCopyBtn: '复制',
    blankProtocol: '— (空白 · 无关联外部协议)',
    badgeUnified: '4大公链 · 跨链桥整合查询',
    badgeSolana: '4.13 SOL 原生质押',
    badgeEthereum: '实时 ERC-20 查询',
    badgeBsc: '实时 BEP-20 查询',
    badgeTron: '实时 TRC-20 查询',
    rootWalletLabel: '主查询钱包 (Root Address)',
    rootWalletReason: '当前链上扫描分析的基准核心钱包。'
  },
  ja: {
    metaTitle: 'OnChain Detective | マルチチェーン放置資産＆サブ垢逆追跡',
    appTitle: 'OnChain Detective',
    appDesc: 'エアドロ周回サブ垢追跡 & 放置資産スキャナー',
    readonlyBadge: 'リアルタイム安全照会',
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
    coffeeSub: 'デジタル宇宙を彷徨う私の $2,000 を偲んで...',
    coffeeStory1: '私も皆様と同じクリプト初心者でした。エアドロのためにBerachainのトランザクションを数百回刻み、サブ垢をいくつも作り、KaminoやPancakeSwapに預けたまま忘れて<strong>血のような $2,000</strong>を紛失。夜通しエクスプローラーを彷徨った末に自作したオンチェーン探偵ツールです。',
    coffeeStory2: 'もし眠っていた資産を $10 でも見つけられたなら、次のチェーン追跡開発のために温かいコーヒー1杯のご支援をお願いします！',
    coffeeCopyBtn: 'コピー',
    blankProtocol: '— (空欄 · 外部プロトコルなし)',
    badgeUnified: '4大チェーン・ブリッジ統合照会',
    badgeSolana: '4.13 SOL ネイティブステーキング',
    badgeEthereum: 'リアルタイム ERC-20 照会',
    badgeBsc: 'リアルタイム BEP-20 照会',
    badgeTron: 'リアルタイム TRC-20 照会',
    rootWalletLabel: 'メイン照会ウォレット (Root Address)',
    rootWalletReason: '現在のスキャン基準となる中心ウォレットです。'
  },
  es: {
    metaTitle: 'OnChain Detective | Rastreo Multicadena de Airdrops y Activos Olvidados',
    appTitle: 'OnChain Detective',
    appDesc: 'Rastreador de Multicuentas Airdrop y Activos On-Chain',
    readonlyBadge: 'Consulta On-Chain Segura',
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
    coffeeSub: 'En memoria de mis $2,000 perdidos en el universo digital...',
    coffeeStory1: 'Yo también fui un principiante en cripto como ustedes. Hice cientos de transacciones en Berachain por airdrops, dividí múltiples billeteras y deposité en Kamino o PancakeSwap para luego olvidarlo, perdiendo <strong>$2,000 dolorosos</strong>. Tras pasar noches buscando en exploradores de bloques, creé esta herramienta On-Chain Detective.',
    coffeeStory2: 'Si esta herramienta te ayudó a recuperar aunque sea $10 de cripto olvidado, ¡invítale un café al desarrollador para apoyar el rastreo de más cadenas!',
    coffeeCopyBtn: 'Copiar',
    blankProtocol: '— (En blanco · Sin protocolo externo)',
    badgeUnified: '4 Cadenas y Puentes',
    badgeSolana: '4.13 SOL Staking Nativo',
    badgeEthereum: 'ERC-20 en vivo',
    badgeBsc: 'BEP-20 en vivo',
    badgeTron: 'TRC-20 en vivo',
    rootWalletLabel: 'Billetera Principal (Dirección Raíz)',
    rootWalletReason: 'Billetera central utilizada como base para el escaneo.'
  },
  ru: {
    metaTitle: 'OnChain Detective | Мультичейн-поиск мультиаккаунтов и забытых активов',
    appTitle: 'OnChain Detective',
    appDesc: 'Поиск мультиаккаунтов и проверка ончейн-активов',
    readonlyBadge: 'Безопасный ончейн-запрос',
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
    coffeeSub: 'В память о моих $2,000, затерянных в цифровой вселенной...',
    coffeeStory1: 'Я был таким же новичком в крипте, как и вы. Фармил аирдропы сотнями транзакций в Berachain, дробил кошельки на мультиаккаунты, закидывал средства в Kamino или PancakeSwap и забывал о них, потеряв <strong>целых $2,000</strong>. Проведя бессонные ночи в блокчейн-эксплорерах, я создал этот On-Chain Detective.',
    coffeeStory2: 'Если этот инструмент помог вам вернуть хотя бы $10 забытых средств, поддержите разработчика чашкой горячего кофе!',
    coffeeCopyBtn: 'Копировать',
    blankProtocol: '— (Пусто · Нет внешнего протокола)',
    badgeUnified: '4 сети и мосты',
    badgeSolana: '4.13 SOL Нативный стейкинг',
    badgeEthereum: 'ERC-20 онлайн',
    badgeBsc: 'BEP-20 онлайн',
    badgeTron: 'TRC-20 онлайн',
    rootWalletLabel: 'Основной кошелек (Root Address)',
    rootWalletReason: 'Основной кошелек для текущего сканирования.'
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

// Switch Active Chain
function switchChain(chain) {
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

  document.getElementById('addressInput').value = cfg.defaultAddress;
  document.getElementById('presetLabel').innerText = cfg.label;
  document.getElementById('presetBadge').innerText = dict[cfg.badgeKey] || dict.badgeUnified;

  loadAnalysis(chain, cfg.defaultAddress);
}

// Load Real On-Chain Analysis Data
async function loadAnalysis(chain, address) {
  const dict = I18N[currentLanguage] || I18N.ko;
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const progressPercent = document.getElementById('progressPercent');
  const logFeed = document.getElementById('logFeed');

  progressContainer.classList.remove('hidden');
  progressBar.style.width = '30%';
  progressPercent.innerText = '30%';
  logFeed.innerHTML = `<div class="text-indigo-700 dark:text-indigo-400">[1/3] ${chain.toUpperCase()} ${dict.logStep1}</div>`;

  setTimeout(() => {
    progressBar.style.width = '70%';
    progressPercent.innerText = '70%';
    logFeed.innerHTML = `
      <div class="text-emerald-700 dark:text-emerald-400">✓ [1/3] ${dict.logStep1Done}</div>
      <div class="text-indigo-700 dark:text-indigo-400">[2/3] ${dict.logStep2}</div>
    `;
  }, 180);

  try {
    const res = await fetch(`/api/analysis?chain=${encodeURIComponent(chain)}&address=${encodeURIComponent(address)}`);
    const data = await res.json();
    currentData = data;

    setTimeout(() => {
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
    }, 320);

  } catch (err) {
    console.error(err);
    progressContainer.classList.add('hidden');
  } finally {
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

    row.className = 'inner-box rounded-xl p-3 transition cursor-pointer flex items-center justify-between gap-3';
    row.innerHTML = `
      <div class="flex items-center gap-2.5 min-w-0">
        <span class="w-2.5 h-2.5 rounded-full ${dotColor} shrink-0"></span>
        <div class="min-w-0">
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-bold text-slate-900 dark:text-white truncate">${localizedLabel}</span>
          </div>
          <div class="flex items-center gap-2 text-[10px] text-slate-600 dark:text-slate-400 font-mono mt-0.5">
            <span>${w.short_addr || w.address.slice(0, 10)}</span>
            <span>·</span>
            <span>${w.lifetime_txs.toLocaleString()} ${dict.txCountLabel}</span>
            <span>·</span>
            <span>${dict.protocolLabel} ${protoText}</span>
          </div>
        </div>
      </div>
      <div class="text-right shrink-0">
        <span class="text-xs font-bold font-mono tabular-nums ${w.current_usd > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}">
          ${w.current_usd > 0 ? dict.balLabel + ' $' + Number(w.current_usd).toFixed(2) : (w.is_my_wallet ? dict.volLabel + ' $' + Number(w.volume_usd).toFixed(2) : 'CEX')}
        </span>
        <span class="block text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">${dict.detailsBtn}</span>
      </div>
    `;
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

      card.className = 'inner-box rounded-xl p-3.5 transition cursor-pointer space-y-2';
      card.innerHTML = `
        <div class="flex items-start justify-between gap-2">
          <div>
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 inline-block mb-1">${localizedBadge}</span>
            <h4 class="text-xs font-bold text-slate-900 dark:text-white leading-snug">${localizedTitle}</h4>
          </div>
          <span class="text-sm font-mono font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums shrink-0">$${Number(t.value_usd).toFixed(2)}</span>
        </div>
        <p class="text-[11px] text-slate-700 dark:text-slate-400 leading-relaxed">${localizedDesc}</p>
        
        <div class="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-white/[0.06] text-[10px]">
          <span class="text-slate-600 dark:text-slate-400 font-medium">
            ${dict.extProtocolPrefix} <strong class="text-slate-900 dark:text-slate-200">${protoDisplay}</strong>
          </span>
          <a href="${t.official_url}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" class="text-indigo-700 dark:text-indigo-400 hover:underline font-mono font-bold flex items-center gap-1">
            <span>${t.official_url.replace('https://', '').slice(0, 32)}...</span>
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

  document.getElementById('sheetWalletAddress').innerText = wallet.address;
  document.getElementById('sheetWalletBadge').innerText = localizeText(wallet.label, currentLanguage);
  document.getElementById('sheetTxCount').innerText = `${(wallet.lifetime_txs || 0).toLocaleString()} ${dict.txCountLabel}`;
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
          <span class="text-slate-900 dark:text-white font-bold block text-xs">${localizeText(p.name, currentLanguage)}</span>
          <span class="text-slate-600 dark:text-slate-400 text-[11px] font-mono">${p.amount_desc || ''}</span>
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
      ${extProtoId ? extProtoId.toUpperCase() : dict.blankProtocol}
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
          <span class="font-semibold text-slate-900 dark:text-white block">${localizeText(tx.direction, currentLanguage)}</span>
          <span class="font-mono text-[10px] text-slate-500">${tx.date || dict.dateUnknown}</span>
        </div>
        <span class="font-mono font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">${tx.amount} ${tx.symbol || ''}</span>
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
          href="${explorerFullUrl}"
          target="_blank"
          rel="noopener noreferrer"
          class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2 font-mono"
        >
          <i data-lucide="shield-check" class="w-4 h-4 text-emerald-300"></i>
          <span>${dict.officialLinkPrefix} ${explorerFullUrl.slice(0, 46)}...</span>
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
      renderSheetProtocolTier(null, address, explorerFullUrl);
      return;
    }
    container.innerHTML = `
      <div class="flex items-center justify-between">
        <h3 class="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
          <span>${proto.name} (${proto.category})</span>
        </h3>
        <span class="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-semibold">${dict.officialVerified}</span>
      </div>
      <p class="text-xs text-slate-800 dark:text-slate-300 leading-relaxed">${proto.description}</p>
      <div class="inner-box text-[11px] text-slate-700 dark:text-slate-300 p-3 rounded-xl leading-relaxed">
        <strong class="text-indigo-700 dark:text-indigo-400 block mb-0.5">${dict.sheetEscapeTitle}</strong>
        ${proto.escape_guide}
      </div>
      <div class="pt-1">
        <a
          href="${proto.official_url}"
          target="_blank"
          rel="noopener noreferrer"
          class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2 font-mono"
        >
          <i data-lucide="shield-check" class="w-4 h-4 text-emerald-300"></i>
          <span>${dict.officialLinkPrefix} ${proto.official_url}</span>
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

// Initialize DOM Events
document.addEventListener('DOMContentLoaded', () => {
  initIcons();

  document.getElementById('langSelect').addEventListener('change', (e) => {
    switchLanguage(e.target.value);
  });

  document.querySelectorAll('.chain-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchChain(tab.getAttribute('data-chain'));
    });
  });

  document.getElementById('searchBtn').addEventListener('click', () => {
    const addr = document.getElementById('addressInput').value.trim();
    loadAnalysis(currentChain, addr);
  });
  document.getElementById('addressInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      loadAnalysis(currentChain, e.target.value.trim());
    }
  });

  document.getElementById('presetChip').addEventListener('click', () => {
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

  document.getElementById('themeToggle').addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    if (currentData) {
      renderGraph(currentData.graph_data);
    }
  });

  switchChain('unified');
});
