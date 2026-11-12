/**
 * 静态数据：游戏、玩家、商品、任务、房间、初始聊天
 * 运行中会变的数据（余额、好友、聊天记录等）在 store.js 里，初始值从这里复制
 */
(() => {
  'use strict';

  const IMG = 'assets/img/';
  const D = (window.D = { IMG });

  /* ---------- 游戏 ---------- */
  const G = (id, name, cat, online, o = {}) => ({
    id, name, cat, online,
    icon: `${IMG}games/${o.icon || id}.jpg`,
    cover: o.cover === false ? null : `${IMG}games/${o.cover || id + '-cover'}.jpg`,
    tag: o.tag || null,
    rating: o.rating || 4.6,
    players: o.players || '2–4人',
    dur: o.dur || '5分钟',
    max: o.max || 4,
    desc: o.desc || '',
    playable: !!o.playable,
  });

  D.games = [
    G('c4', '四子棋', '棋盘', 52300, { rating: 4.8, players: '2人', dur: '3分钟', max: 2, playable: true,
      desc: '往棋盘里投子，抢在对手之前连成四子，横、竖、斜都算。' }),
  ];
  D.game = Object.fromEntries(D.games.map((g) => [g.id, g]));
  D.GAME = 'c4'; // Soulgame 只有这一款游戏

  /* ---------- 金币分场（参考 Yalla Ludo：入场扣底注，赢家拿走奖池，平局退还） ---------- */
  // lv：解锁等级；online：该场在线人数
  D.stakes = [
    { id: 's1', name: '新手场', bet: 100, lv: 1, online: 18600 },
    { id: 's2', name: '进阶场', bet: 500, lv: 3, online: 21400 },
    { id: 's3', name: '高手场', bet: 2000, lv: 8, online: 9300 },
    { id: 's4', name: '大师场', bet: 10000, lv: 15, online: 3000 },
  ];
  D.stake = Object.fromEntries(D.stakes.map((x) => [x.id, x]));

  /* ---------- 段位与赛季 ---------- */
  D.tiers = ['青铜', '白银', '黄金', '铂金', '星耀'];
  D.season = {
    name: '第3赛季 · 夏日激战',
    left: '12天06小时',
    rewards: [
      { tier: 0, text: '50金币' },
      { tier: 1, text: '20钻石' },
      { tier: 2, text: '赛季头像框' },
      { tier: 3, text: '200钻石' },
      { tier: 4, text: '500钻石+传说徽章' },
    ],
  };

  /* ---------- 玩家 ---------- */
  const P = (id, name, lv, o = {}) => ({
    id, name, lv,
    avatar: `${IMG}avatars/${id}.jpg`,
    online: false, status: '', seen: '', frame: null, bg: 'aurora', bio: '', games: 60, win: 50,
    uid: String(10000000 + ((id.charCodeAt(0) * 7919 + id.length * 104729) % 89999999)),
    ...o,
  });

  D.people = {
    stella: P('stella', '星星', 3),
    lily: P('lily', '莉莉', 14, { online: true, status: '对局中', frame: 'wings', bg: 'galaxy', bio: '不连成四子不罢休 ✨', games: 318, win: 62 }),
    kai: P('kai', '阿凯', 9, { online: true, status: '在大厅', bg: 'arena', bio: '回合制>实时，不服来战。', games: 142, win: 51 }),
    mia: P('mia', '米娅', 11, { online: true, status: '对局中', frame: 'balloon', bg: 'sunset', bio: '连珠女王 👑', games: 204, win: 55 }),
    alex: P('alex', '阿乐', 8, { online: true, status: '在大厅', bio: '这赛季冲黄金', games: 97, win: 57 }),
    daniel: P('daniel', '大牛', 16, { online: true, status: '对局中', frame: 'crown', bg: 'arena', bio: '小队队长，常开麦。', games: 401, win: 64 }),
    lucas: P('lucas', '卢卡', 6, { online: true, status: '在房间中', bio: '慢慢下，稳稳赢 🧩', games: 66, win: 48 }),
    sofia: P('sofia', '索菲', 7, { seen: '2小时前', bio: '你好呀 👋', games: 88, win: 50 }),
    emma: P('emma', '艾玛', 5, { seen: '昨天', bio: '休闲玩家', games: 41, win: 44 }),
    aisha: P('aisha', '爱莎', 12, { seen: '5小时前', frame: 'saturn', bio: '速攻流选手 🏁', games: 230, win: 59 }),
    ryan: P('ryan', '瑞安', 4, { seen: '3天前', bio: '新人报到', games: 25, win: 40 }),
    noah: P('noah', '诺亚', 10, { online: true, status: '在大厅', bio: '友谊第一，比赛第二', games: 150, win: 53 }),
    grace: P('grace', '格蕾丝', 7, { seen: '1小时前', bio: '一起交个朋友吧！', games: 70, win: 49 }),
    victor: P('victor', '维克多', 13, { online: true, status: '对局中', frame: 'rocket', bio: '策略大师', games: 260, win: 58 }),
    marco: P('marco', '马可', 9, { seen: '30分钟前', bio: '哈喽！', games: 120, win: 52 }),
    hana: P('hana', '花花', 8, { online: true, status: '正在开房', bio: '只玩轻松局 🌙', games: 110, win: 54 }),
    zoe: P('zoe', '佐伊', 10, { online: true, status: '对局中', bio: '夜猫子', games: 133, win: 51 }),
    olivia: P('olivia', '奥莉', 21, { online: true, status: '在大厅', frame: 'crown', bio: '第2赛季冠军', games: 820, win: 71 }),
    isabella: P('isabella', '贝拉', 15, { online: true, status: '正在开房', bio: '冲鸭！', games: 300, win: 60 }),
    ruby: P('ruby', '露比', 12, { online: true, status: '对局中', bio: '幸运数字7', games: 190, win: 55 }),
    george: P('george', '老乔', 18, { online: true, status: '在大厅', bio: '姜还是老的辣', games: 610, win: 66 }),
    priya: P('priya', '普丽', 17, { online: true, status: '对局中', frame: 'dj', bio: '边听歌边下棋', games: 540, win: 63 }),
    ethan: P('ethan', '伊森', 14, { online: true, status: '对局中', bio: '认真党', games: 350, win: 61 }),
    leo: P('leo', '小狮', 16, { online: true, status: '对局中', bio: '小狮子在此，嗷呜～', games: 420, win: 62 }),
    jade: P('jade', '小玉', 11, { online: true, status: '在房间中', bio: '三步之内必有杀招', games: 205, win: 57 }),
    chloe: P('chloe', '克洛伊', 9, { online: true, status: '在房间中', bio: '嗨，你好呀', games: 98, win: 50 }),
  };
  D.matchPool = ['victor', 'hana', 'zoe', 'noah', 'ruby', 'jade', 'chloe', 'marco', 'ethan', 'priya'];

  /* ---------- 装扮与商品 ---------- */
  // box：图片头像框相对头像的位置 [left, top, width, height]（%），由内圈拟合得出
  D.frames = {
    wings: { name: '天使之翼', price: 300, img: `${IMG}frames/wings.png`, box: [-26.9, -21.2, 153.8, 151.9] },
    balloon: { name: '气球派对', price: 300, img: `${IMG}frames/balloon.png`, box: [-21.3, -20.4, 139.1, 139.1] },
    crown: { name: '皇家王冠', price: 500, ring: 'gold', deco: `${IMG}ui/crown.png`, pos: 'top' },
    saturn: { name: '星球轨道', price: 400, ring: 'purple', deco: `${IMG}ui/saturn.png`, pos: 'br' },
    dj: { name: '节奏大师', price: 400, ring: 'pink', deco: `${IMG}ui/headphones.png`, pos: 'head' },
    rocket: { name: '火箭冲刺', price: 350, ring: 'blue', deco: `${IMG}ui/rocket.png`, pos: 'bl' },
    season: { name: '夏日激战', price: 0, season: true, ring: 'season', deco: `${IMG}ui/trophy.png`, pos: 'br' },
    vip: { name: '会员金框', price: 0, vip: true, ring: 'vip', deco: `${IMG}ui/sparkle.png`, pos: 'tr' },
  };
  D.bubbles = {
    default: { name: '经典', price: 0 },
    ocean: { name: '海洋', price: 150 },
    candy: { name: '糖果', price: 150 },
    neon: { name: '霓虹', price: 200 },
    galaxy: { name: '星河', price: 250 },
    gold: { name: '鎏金', price: 300 },
  };
  D.bgs = {
    aurora: { name: '极光', price: 0, css: `url(${IMG}fx/aurora.jpg) center/cover` },
    sunset: { name: '日落', price: 200, css: 'linear-gradient(160deg, #ffb36b, #ff6f91 55%, #8a5cff)' },
    galaxy: { name: '星河', price: 300, css: `url(${IMG}fx/galaxy.jpg) center 30%/cover` },
    pop: { name: '波普艺术', price: 200, css: `url(${IMG}fx/halftone.png) right -40px top -60px/220px no-repeat, linear-gradient(135deg, #ff7eb3, #ffcf5c)` },
    arena: { name: '竞技场', price: 400, css: `url(${IMG}games/clash-cover.jpg) center/cover` },
    garden: { name: '花园', price: 250, css: `url(${IMG}games/squad-cover.jpg) center/cover` },
  };
  D.items = [
    { id: 'boost1', name: '加速卡', desc: '1秒内匹配到对手', price: 100, give: { boost: 1 }, img: `${IMG}ui/rocket.png` },
    { id: 'boost5', name: '加速卡×5', desc: '常玩党最划算', price: 450, give: { boost: 5 }, img: `${IMG}ui/rocket.png`, tag: '-10%' },
    { id: 'pass1', name: '房卡', desc: '可进入1次高级房', price: 200, give: { pass: 1 }, img: `${IMG}ui/pass.svg` },
    { id: 'pass3', name: '房卡×3', desc: '可进入3次高级房', price: 540, give: { pass: 3 }, img: `${IMG}ui/pass.svg`, tag: '-10%' },
  ];
  D.coinPacks = [
    { id: 'c1', usd: 0.99, coins: 600 },
    { id: 'c2', usd: 4.99, coins: 3000, bonus: 300 },
    { id: 'c3', usd: 9.99, coins: 6800, bonus: 1000 },
    { id: 'c4', usd: 19.99, coins: 12800, bonus: 2400 },
  ];
  D.bundle = { id: 'bundle', usd: 2.99, coins: 2000, name: '金币+免广告卡', desc: '2,000金币，外加30天免广告，广告奖励免看秒到账。' };
  D.gemPacks = [
    { id: 'g1', usd: 0.99, gems: 100 },
    { id: 'g2', usd: 4.99, gems: 550, bonus: '+10%' },
    { id: 'g3', usd: 9.99, gems: 1200, bonus: '+20%' },
  ];
  D.vip = { usd: 4.99, gems: 300, perks: ['每月领300钻石', '优先匹配', '专属会员金框', '签到奖励翻倍'] };

  /* ---------- 签到 ---------- */
  D.signin = [
    { gems: 10 }, { coins: 100 }, { gems: 20 }, { boost: 1 }, { gems: 30 }, { coins: 200 }, { gems: 100, frame: 'balloon' },
  ];

  /* ---------- 任务 ---------- */
  // metric 对应 store 里的计数；scope 由 group 决定：daily 用当天、weekly 用本周、其余用累计
  const T = (id, group, title, goal, metric, reward, go, o = {}) => ({ id, group, title, goal, metric, reward, go, ...o });
  D.tasks = [
    T('n_first', 'newbie', '完成第一局对战', 1, 'games', { coins: 50 }, 'c4'),
    T('n_time', 'newbie', '游玩3分钟', 3, 'minutes', { coins: 50 }, 'c4', { unit: '分钟' }),
    T('n_friend', 'newbie', '添加1位好友', 1, 'friendsAdded', { gems: 30 }, 'addfriend'),
    T('n_frame', 'newbie', '装备一个头像框', 1, 'framesEquipped', { coins: 100 }, 'shop'),
    T('d_play', 'daily', '玩3局', 3, 'games', { gems: 20 }, 'c4'),
    T('d_win', 'daily', '赢1局', 1, 'wins', { gems: 30 }, 'c4'),
    T('d_emoji', 'daily', '对局中发3个表情', 3, 'emojis', { coins: 50 }, 'c4'),
    T('d_share', 'daily', '分享1次', 1, 'shares', { gems: 10 }, 'share'),
    T('d_ad', 'daily', '看1次广告', 1, 'ads', { coins: 30 }, 'ad'),
    T('w_friend', 'weekly', '和好友玩3局', 3, 'friendGames', { gems: 100 }, 'friends'),
    T('w_invite', 'weekly', '邀请1位好友进房间', 1, 'invites', { gems: 80 }, 'create'),
    T('w_win', 'weekly', '赢10局', 10, 'wins', { coins: 200 }, 'c4'),
    T('l_mate', 'limited', '加1位一起对局过的玩家为好友', 1, 'mates', { gems: 100 }, 'recent', { period: '2026.11.01 - 11.30' }),
    T('l_notify', 'limited', '开启回合提醒', 1, 'notify', { gems: 100 }, 'notify', { period: '3个月' }),
    T('l_share', 'limited', '分享3次', 3, 'shares', { gems: 100 }, 'share', { period: '2026.11.01 - 12.31' }),
  ];
  D.taskGroups = [
    { id: 'newbie', name: '新手任务', sub: '轻松上手，奖励拿不停' },
    { id: 'daily', name: '每日任务', sub: '每天00:00刷新' },
    { id: 'weekly', name: '每周任务', sub: '每周一刷新' },
    { id: 'limited', name: '限时任务', sub: '限时开放，错过就没了' },
  ];
  // 盲盒任务的候选，翻开时优先抽已完成的
  D.mystery = [
    { title: '赢1局', metric: 'wins', goal: 1, go: 'c4' },
    { title: '对局中发3个表情', metric: 'emojis', goal: 3, go: 'c4' },
    { title: '玩2局', metric: 'games', goal: 2, go: 'c4' },
  ];

  /* ---------- 徽章 ---------- */
  D.badges = [
    { id: 'first_win', name: '首胜', desc: '在 Soulgame 赢得第一局', img: `${IMG}ui/trophy.png` },
    { id: 'social', name: '社交达人', desc: '拥有10位好友', img: `${IMG}ui/headphones.png` },
    { id: 'host', name: '人气房主', desc: '创建一个房间', img: `${IMG}ui/store.png` },
    { id: 'wall', name: '铜墙铁壁', desc: '一局内拦截对手3次', img: `${IMG}ui/glove-blue.png` },
    { id: 'speed', name: '极速玩家', desc: '使用一次加速卡', img: `${IMG}ui/rocket.png` },
    { id: 'collector', name: '收藏家', desc: '拥有3件装扮', img: `${IMG}ui/crown.png` },
    { id: 'explorer', name: '默契搭档', desc: '和同一位好友玩10局', img: `${IMG}ui/saturn.png` },
    { id: 'gold', name: '点石成金', desc: '四子棋达到黄金段位', img: `${IMG}ui/podium.png` },
    { id: 'streak', name: '每日之星', desc: '连续7天完成全部每日任务', img: `${IMG}ui/calendar.png` },
  ];

  /* ---------- 房间 ---------- */
  D.rooms = [
    { id: 'r1', name: '四子棋休闲局 🌙', game: 'c4', max: 2, seats: ['hana'], host: 'hana', lang: '中文', premium: false },
    { id: 'r2', name: '今晚不睡 🎉', game: 'c4', max: 2, seats: ['mia', 'zoe'], host: 'mia', lang: '中文', premium: false },
    { id: 'r3', name: '高手过招', game: 'c4', max: 2, seats: ['daniel'], host: 'daniel', lang: '中文', premium: true },
    { id: 'r4', name: '好友派对房', game: 'c4', max: 2, seats: ['isabella'], host: 'isabella', lang: '西班牙语', premium: false },
    { id: 'r5', name: '慢棋搭子 🧩', game: 'c4', max: 2, seats: ['lucas', 'jade'], host: 'lucas', lang: '中文', premium: false },
    { id: 'r6', name: '周末擂台', game: 'c4', max: 2, seats: ['victor'], host: 'victor', lang: '中文', premium: true },
    { id: 'r7', name: '连珠练习室', game: 'c4', max: 2, seats: ['olivia'], host: 'olivia', lang: '中文', premium: false },
    { id: 'r8', name: '四子棋 · 新手房', game: 'c4', max: 2, seats: ['george'], host: 'george', lang: '中文', premium: false },
  ];
  // 聊天邀请卡片对应的私密房间
  D.inviteRooms = {
    lily: { id: 'lily', name: '莉莉的房间', game: 'c4', max: 2, seats: ['lily'], host: 'lily', lang: '中文', premium: false, private: true },
    squad: { id: 'squad', name: '周末小队房间', game: 'c4', max: 2, seats: ['lucas'], host: 'lucas', lang: '中文', premium: false, private: true },
  };

  /* ---------- 聊天 ---------- */
  D.chats = {
    lily: { type: 'dm', with: 'lily', unread: 2, msgs: [
      { from: 'lily', text: '上一局太险了 😂', t: '昨天' },
      { from: 'me', text: '明天再战一局？', t: '昨天' },
      { from: 'lily', text: '一言为定！', t: '昨天' },
      { from: 'lily', type: 'invite', game: 'c4', room: 'lily', text: '来和我玩四子棋吧！', t: '10:24' },
      { from: 'lily', text: '给你留了个座 💺', t: '10:24' },
    ] },
    squad: { type: 'group', name: '周末小队', members: ['daniel', 'mia', 'lucas'], unread: 3, msgs: [
      { from: 'daniel', text: '今晚四子棋车轮战？', t: '09:12' },
      { from: 'mia', text: '算我一个！', t: '09:15' },
      { from: 'lucas', type: 'invite', game: 'c4', room: 'squad', text: '房间开好了，谁先来', t: '09:20' },
    ] },
    kai: { type: 'dm', with: 'kai', unread: 1, msgs: [
      { from: 'kai', text: '轮到你了！别让我等太久 ⏳', t: '08:47' },
    ] },
    system: { type: 'system', name: 'Soulgame', unread: 1, msgs: [
      { from: 'system', text: '第3赛季 · 夏日激战开始啦！四子棋达到黄金段位，即可解锁“夏日激战”头像框。', t: '周一' },
    ] },
    mia: { type: 'dm', with: 'mia', unread: 0, msgs: [{ from: 'mia', text: '打得好！🎉', t: '周日' }] },
    alex: { type: 'dm', with: 'alex', unread: 0, msgs: [{ from: 'alex', text: '赌你这赛季超不过我 😏', t: '周六' }] },
  };
  D.chatOrder = ['lily', 'squad', 'kai', 'system', 'mia', 'alex'];
  D.replies = ['哈哈，不错嘛 😄', '好啊，来一局！', '等我5分钟', '打得好！', '😂😂😂', '下次记得叫上我！', '马上到 🏃', '你变强了！'];

  /* ---------- 局内表情 ---------- */
  D.emojis = ['happy', 'love', 'laugh', 'wink', 'cool', 'tongue', 'shock', 'cry', 'angry', 'sleepy', 'dizzy', 'star'];
  D.phrases = ['你好！👋', '好棋！', '快点啦！⏰', '差一点哦 😏', '哎呀！', '你真厉害！', '看我的！', '打得好 🤝'];

  /* ---------- 好友排行榜（四子棋，分数 = 段位×100 + 段内分） ---------- */
  D.boardFriends = [
    { id: 'lily', score: 262, move: 1 },
    { id: 'daniel', score: 231, move: -1 },
    { id: 'alex', score: 205, move: 2 },
    { id: 'kai', score: 150, move: -2 },
    { id: 'mia', score: 132, move: 0 },
    { id: 'sofia', score: 118, move: 1 },
    { id: 'lucas', score: 96, move: -1 },
    { id: 'aisha', score: 74, move: 0 },
    { id: 'emma', score: 61, move: 0 },
    { id: 'ryan', score: 40, move: -1 },
  ];
  D.boardGlobal = [
    ['olivia', 498, 0], ['george', 487, 1], ['priya', 471, -1], ['ethan', 455, 2], ['leo', 449, 0],
    ['jade', 438, -2], ['isabella', 431, 3], ['ruby', 422, 0], ['chloe', 418, -1], ['victor', 405, 1],
    ['zoe', 396, 4], ['marco', 391, -3], ['hana', 383, 0], ['noah', 377, 2], ['daniel', 371, -1],
  ].map(([id, score, move]) => ({ id, score, move }));
})();
