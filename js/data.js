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
    G('c4', '四子棋', '棋盘', 52300, { tag: '第1名', rating: 4.8, players: '2人', dur: '3分钟', max: 2, playable: true,
      desc: '往棋盘里投子，抢在对手之前连成四子（横、竖、斜都算）。' }),
    G('clash', '英雄对决', '动作', 38100, { tag: '第2名', rating: 4.7, players: '2–6人', max: 6,
      desc: '选一位英雄，冲进快节奏竞技场。和好友打出技能连招，一起登顶。' }),
    G('strike', '突击小队', '动作', 31600, { tag: '第3名', rating: 4.6,
      desc: '战术小队射击。组队安放信标，守住据点。' }),
    G('royal', '皇家乱斗', '动作', 27900, { tag: '热门', rating: 4.6, players: '2–6人', max: 6,
      desc: '挥舞法术和战锤在城堡里乱斗，活到最后就是赢家。' }),
    G('bingo', '宾果派对', '卡牌', 24700, { tag: '热门', rating: 4.7, players: '2–6人', max: 6, cover: false,
      desc: '经典宾果加道具玩法。手快划号，抢先喊出“宾果”！' }),
    G('jet', '喷气冲刺', '竞速', 21500, { tag: '热门', rating: 4.5, cover: false,
      desc: '背上喷气背包穿越满是激光的实验室。捡金币、躲陷阱，飞得最远就赢。' }),
    G('squad', '花园大乱斗', '动作', 18200, { tag: '新游', rating: 4.5,
      desc: '和队友在花园里混战。布下陷阱，把对手轰出院子。' }),
    G('dust', '尘埃落定', '竞速', 15000, { rating: 4.4, cover: false,
      desc: '驾驶飞船穿越流星雨，飞得最远的人获胜。' }),
    G('cards', '疯狂卡牌', '卡牌', 14800, { rating: 4.6, players: '2–6人', max: 6,
      desc: '同色或同数字就能出牌，甩出万能牌，先出完手牌就赢。' }),
    G('boxing', '拳击对决', '体育', 12400, { tag: '新游', rating: 4.5, players: '2人', dur: '2分钟', max: 2,
      desc: '一键拳击对决。闪避、出拳，一拳击倒对手。' }),
    G('pirate', '海盗泡泡', '益智', 11900, { rating: 4.5, cover: false,
      desc: '戳泡泡、找宝藏，抢在伙伴前面打开宝箱。' }),
    G('beat', '节奏派对', '益智', 10300, { tag: '活动', rating: 4.6,
      desc: '跟着乐队踩准节拍。本周活动：今日热门金曲。' }),
    G('wave', '冲浪达人', '体育', 9800, { rating: 4.4,
      desc: '征服最大的浪头，和好友比谁先冲上岸。' }),
    G('fruit', '疯狂水果', '益智', 9100, { rating: 4.5, players: '2人', max: 2, cover: false,
      desc: '交换消除多汁水果，90秒一决胜负。' }),
    G('raccoon', '浣熊快跑', '竞速', 8600, { rating: 4.3, cover: false,
      desc: '奔跑、跳跃，沿着巨型魔豆藤一路往上冲。' }),
    G('slime', '史莱姆传说', '动作', 7700, { rating: 4.4,
      desc: '和好友一起带领史莱姆大军，击退一波波哥布林。' }),
    G('sweet', '甜蜜消消', '益智', 7200, { rating: 4.5, players: '2人', max: 2, cover: false,
      desc: '甜蜜三消对战，打出连击就能赢。' }),
    G('star', '星星爆破', '益智', 6900, { rating: 4.4, players: '2人', max: 2, cover: false,
      desc: '炸开星星方块，打出超长连击。' }),
    G('gemgrab', '宝石争夺', '棋盘', 6100, { rating: 4.3, cover: false,
      desc: '抢宝石、偷对手，先攒够10颗就赢。' }),
    G('maze', '烧脑迷宫', '棋盘', 5400, { rating: 4.3, cover: false,
      desc: '在不断变化的迷宫里狂奔，抢先拿到钥匙。' }),
    G('dragon', '龙龙泡泡', '益智', 4800, { rating: 4.4, players: '2人', max: 2, cover: false,
      desc: '瞄准、反弹、戳泡泡，比对手更快清场。' }),
  ];
  // 几张图标不是 jpg
  D.games.find((g) => g.id === 'star').icon = `${IMG}gc/star.png`;
  D.games.find((g) => g.id === 'dragon').icon = `${IMG}gc/dragon.png`;
  D.games.find((g) => g.id === 'maze').icon = `${IMG}games/maze.png`;
  D.games.find((g) => g.id === 'gemgrab').icon = `${IMG}gc/gem-grab.jpg`;
  D.game = Object.fromEntries(D.games.map((g) => [g.id, g]));

  D.cats = ['推荐', '动作', '体育', '竞速', '卡牌', '棋盘', '益智'];
  D.forYou = ['c4', 'clash', 'boxing', 'jet', 'bingo', 'strike', 'royal', 'wave', 'cards', 'dust', 'beat', 'squad', 'pirate', 'fruit', 'raccoon', 'slime', 'sweet', 'star', 'gemgrab', 'maze', 'dragon'];
  D.COST = 16; // 每局消耗 Gems

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
    online: false, status: '', seen: '', frame: null, bg: 'aurora', bio: '', games: 60, win: 50, fav: ['c4'],
    uid: String(10000000 + ((id.charCodeAt(0) * 7919 + id.length * 104729) % 89999999)),
    ...o,
  });

  D.people = {
    stella: P('stella', '星星', 3),
    lily: P('lily', '莉莉', 14, { online: true, status: '正在玩四子棋', frame: 'wings', bg: 'galaxy', bio: '不连成四子不罢休 ✨', games: 318, win: 62, fav: ['c4', 'bingo', 'pirate'] }),
    kai: P('kai', '阿凯', 9, { online: true, status: '在大厅', bg: 'arena', bio: '回合制>实时，不服来战。', games: 142, win: 51, fav: ['c4', 'gemgrab', 'maze'] }),
    mia: P('mia', '米娅', 11, { online: true, status: '正在玩宾果派对', frame: 'balloon', bg: 'sunset', bio: '宾果女王 👑', games: 204, win: 55, fav: ['bingo', 'cards', 'fruit'] }),
    alex: P('alex', '阿乐', 8, { online: true, status: '在大厅', bio: '这赛季冲黄金', games: 97, win: 57, fav: ['c4', 'strike', 'jet'] }),
    daniel: P('daniel', '大牛', 16, { online: true, status: '正在玩突击小队', frame: 'crown', bg: 'arena', bio: '小队队长，常开麦。', games: 401, win: 64, fav: ['strike', 'clash', 'royal'] }),
    lucas: P('lucas', '卢卡', 6, { online: true, status: '在房间中', bio: '益智游戏控 🧩', games: 66, win: 48, fav: ['pirate', 'fruit', 'sweet'] }),
    sofia: P('sofia', '索菲', 7, { seen: '2小时前', bio: '你好呀 👋', games: 88, win: 50, fav: ['clash', 'cards'] }),
    emma: P('emma', '艾玛', 5, { seen: '昨天', bio: '休闲玩家', games: 41, win: 44, fav: ['fruit', 'sweet'] }),
    aisha: P('aisha', '爱莎', 12, { seen: '5小时前', frame: 'saturn', bio: '竞速狂热粉 🏁', games: 230, win: 59, fav: ['jet', 'dust', 'raccoon'] }),
    ryan: P('ryan', '瑞安', 4, { seen: '3天前', bio: '新人报到', games: 25, win: 40, fav: ['boxing'] }),
    noah: P('noah', '诺亚', 10, { online: true, status: '在大厅', bio: '友谊第一，比赛第二', games: 150, win: 53, fav: ['c4', 'boxing'] }),
    grace: P('grace', '格蕾丝', 7, { seen: '1小时前', bio: '一起交个朋友吧！', games: 70, win: 49, fav: ['bingo'] }),
    victor: P('victor', '维克多', 13, { online: true, status: '正在玩皇家乱斗', frame: 'rocket', bio: '策略大师', games: 260, win: 58, fav: ['royal', 'c4'] }),
    marco: P('marco', '马可', 9, { seen: '30分钟前', bio: '哈喽！', games: 120, win: 52, fav: ['wave', 'boxing'] }),
    hana: P('hana', '花花', 8, { online: true, status: '正在开房', bio: '只玩轻松局 🌙', games: 110, win: 54, fav: ['c4', 'sweet'] }),
    zoe: P('zoe', '佐伊', 10, { online: true, status: '正在玩宾果派对', bio: '夜猫子', games: 133, win: 51 }),
    olivia: P('olivia', '奥莉', 21, { online: true, status: '在大厅', frame: 'crown', bio: '第2赛季冠军', games: 820, win: 71 }),
    isabella: P('isabella', '贝拉', 15, { online: true, status: '正在开房', bio: '冲鸭！', games: 300, win: 60 }),
    ruby: P('ruby', '露比', 12, { online: true, status: '正在玩宾果派对', bio: '幸运数字7', games: 190, win: 55 }),
    george: P('george', '老乔', 18, { online: true, status: '在大厅', bio: '姜还是老的辣', games: 610, win: 66 }),
    priya: P('priya', '普丽', 17, { online: true, status: '正在玩皇家乱斗', frame: 'dj', bio: '音乐+游戏', games: 540, win: 63 }),
    ethan: P('ethan', '伊森', 14, { online: true, status: '正在玩皇家乱斗', bio: '认真党', games: 350, win: 61 }),
    leo: P('leo', '小狮', 16, { online: true, status: '正在玩皇家乱斗', bio: '小狮子在此，嗷呜～', games: 420, win: 62 }),
    jade: P('jade', '小玉', 11, { online: true, status: '在房间中', bio: '益智速通玩家', games: 205, win: 57 }),
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
    T('d_play', 'daily', '玩3局游戏', 3, 'games', { gems: 20 }, 'c4'),
    T('d_win', 'daily', '赢1局游戏', 1, 'wins', { gems: 30 }, 'c4'),
    T('d_emoji', 'daily', '对局中发3个表情', 3, 'emojis', { coins: 50 }, 'c4'),
    T('d_share', 'daily', '分享1次', 1, 'shares', { gems: 10 }, 'share'),
    T('d_ad', 'daily', '看1次广告', 1, 'ads', { coins: 30 }, 'ad'),
    T('w_variety', 'weekly', '玩5款不同的游戏', 5, 'distinct', { gems: 100 }, 'lobby'),
    T('w_invite', 'weekly', '邀请1位好友进房间', 1, 'invites', { gems: 80 }, 'create'),
    T('w_win', 'weekly', '赢10局游戏', 10, 'wins', { coins: 200 }, 'c4'),
    T('l_action', 'limited', '试玩3款动作游戏', 3, 'action', { gems: 100 }, 'action', { period: '2026.11.01 - 11.30' }),
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
    { title: '赢1局游戏', metric: 'wins', goal: 1, go: 'c4' },
    { title: '对局中发3个表情', metric: 'emojis', goal: 3, go: 'c4' },
    { title: '玩2局游戏', metric: 'games', goal: 2, go: 'c4' },
  ];

  /* ---------- 徽章 ---------- */
  D.badges = [
    { id: 'first_win', name: '首胜', desc: '在畅玩空间赢得第一局', img: `${IMG}ui/trophy.png` },
    { id: 'social', name: '社交达人', desc: '拥有10位好友', img: `${IMG}ui/headphones.png` },
    { id: 'host', name: '人气房主', desc: '创建一个房间', img: `${IMG}ui/store.png` },
    { id: 'wall', name: '铜墙铁壁', desc: '一局内拦截对手3次', img: `${IMG}ui/glove-blue.png` },
    { id: 'speed', name: '极速玩家', desc: '使用一次加速卡', img: `${IMG}ui/rocket.png` },
    { id: 'collector', name: '收藏家', desc: '拥有3件装扮', img: `${IMG}ui/crown.png` },
    { id: 'explorer', name: '探险家', desc: '玩过5款不同的游戏', img: `${IMG}ui/saturn.png` },
    { id: 'gold', name: '点石成金', desc: '任意游戏达到黄金段位', img: `${IMG}ui/podium.png` },
    { id: 'streak', name: '每日之星', desc: '连续7天完成全部每日任务', img: `${IMG}ui/calendar.png` },
  ];

  /* ---------- 房间 ---------- */
  D.rooms = [
    { id: 'r1', name: '四子棋休闲局 🌙', game: 'c4', max: 2, seats: ['hana'], host: 'hana', lang: '中文', premium: false },
    { id: 'r2', name: '宾果之夜 🎉', game: 'bingo', max: 4, seats: ['mia', 'zoe', 'ruby'], host: 'mia', lang: '中文', premium: false },
    { id: 'r3', name: '突击高手专场', game: 'strike', max: 4, seats: ['daniel', 'george'], host: 'daniel', lang: '中文', premium: true },
    { id: 'r4', name: '好友派对房', game: 'clash', max: 6, seats: ['isabella', 'marco'], host: 'isabella', lang: '西班牙语', premium: false },
    { id: 'r5', name: '益智搭子 🧩', game: 'pirate', max: 4, seats: ['lucas', 'chloe', 'jade'], host: 'lucas', lang: '中文', premium: false },
    { id: 'r6', name: '周末乱斗', game: 'royal', max: 6, seats: ['victor', 'leo', 'ethan', 'priya'], host: 'victor', lang: '中文', premium: true },
    { id: 'r7', name: '喷气冲刺竞速赛', game: 'jet', max: 4, seats: ['olivia'], host: 'olivia', lang: '中文', premium: false },
    { id: 'r8', name: '四子棋 · 新手房', game: 'c4', max: 2, seats: ['george'], host: 'george', lang: '中文', premium: false },
  ];
  // 聊天邀请卡片对应的私密房间
  D.inviteRooms = {
    lily: { id: 'lily', name: '莉莉的房间', game: 'c4', max: 2, seats: ['lily'], host: 'lily', lang: '中文', premium: false, private: true },
    squad: { id: 'squad', name: '周末小队房间', game: 'strike', max: 4, seats: ['lucas', 'daniel'], host: 'lucas', lang: '中文', premium: false, private: true },
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
      { from: 'daniel', text: '今晚打突击小队？', t: '09:12' },
      { from: 'mia', text: '算我一个！', t: '09:15' },
      { from: 'lucas', type: 'invite', game: 'strike', room: 'squad', text: '小队房间开好了', t: '09:20' },
    ] },
    kai: { type: 'dm', with: 'kai', unread: 1, msgs: [
      { from: 'kai', text: '轮到你了！别让我等太久 ⏳', t: '08:47' },
    ] },
    system: { type: 'system', name: '畅玩空间', unread: 1, msgs: [
      { from: 'system', text: '第3赛季 · 夏日激战开始啦！任意游戏达到黄金段位，即可解锁“夏日激战”头像框。', t: '周一' },
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
