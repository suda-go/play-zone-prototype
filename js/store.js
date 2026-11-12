/**
 * 状态层：全部运行数据存在 localStorage（键 soulgame.v5，和同域名下其他版本的预览分开存），刷新后保留
 * 每次修改后 emit(type, meta)，ui.js 订阅后同步余额、红点
 * Store.reset() 清空数据回到新用户状态（需要重新登录）；Store.reset(seed) 换账号登录时用，新状态里预先写入登录信息
 */
(() => {
  'use strict';

  const KEY = 'soulgame.v5';
  const subs = [];
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const zero = () => ({ games: 0, wins: 0, emojis: 0, shares: 0, ads: 0, invites: 0, seconds: 0, friendGames: 0, mates: 0 });
  const now = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  /** 和 Kai 的回合制四子棋初始局面：0 空、1 我（蓝）、2 对方（红）；board[行][列]，第 0 行在最上面 */
  function turnBoard() {
    const b = Array.from({ length: 6 }, () => Array(7).fill(0));
    b[5][1] = 2; b[5][2] = 2; b[5][3] = 1; b[5][4] = 1;
    b[4][2] = 1; b[4][3] = 2;
    return b;
  }

  function fresh() {
    return {
      v: 1,
      day: 1,
      visits: 0,
      welcome: false,
      tips: {},
      lastExit: 0,
      // 默认昵称 happy、默认头像 avatars/happy.jpg（游客和邮箱注册用）；Google / Facebook 登录换成第三方的昵称和头像
      user: { name: 'happy', uid: '82640317', bio: '四子棋重度玩家 · 快加我！', lv: 3, exp: 320 },
      gems: 0, coins: 0, boost: 0, pass: 0,
      mi: 25,
      adFree: false, vip: false, firstPay: {},
      log: [],
      sign: { count: 0, last: 0 },
      cnt: { day: zero(), week: zero(), all: zero() },
      friendsAdded: 0, framesEquipped: 0,
      claimed: {},
      mystery: { pick: 0, claimed: false, chest: false },
      streak: { days: 0, last: 0, chest: false, opened: false },
      ads: { watched: 0, bonus: false },
      ranks: { c4: { tier: 1, pts: 60 } },
      record: { games: 12, wins: 7 },
      gstats: { c4: { g: 12, w: 7 } },
      history: [
        { game: 'c4', vs: 'lily', win: false, coins: -100, t: '昨天' },
        { game: 'c4', vs: 'kai', win: true, coins: 200, t: '昨天' },
        { game: 'c4', vs: 'mia', win: false, coins: -100, t: '周一' },
      ],
      owned: { frame: [], bubble: ['default'], bg: ['aurora'] },
      equip: { frame: null, bubble: 'default', bg: 'aurora' },
      friends: ['lily', 'kai', 'mia', 'alex', 'daniel', 'lucas', 'sofia', 'emma', 'aisha', 'ryan'],
      requests: ['noah', 'grace'],
      sent: [],
      recent: ['victor', 'marco', 'hana'],
      chats: clone(D.chats),
      chatOrder: [...D.chatOrder],
      turn: { with: 'kai', board: turnBoard(), my: true, wins: 0 },
      rooms: clone(D.rooms),
      badges: { social: Date.now() },
      settings: { invite: true, friend: true, turn: false, sound: true, lang: '简体中文' },
      doubleNext: false,
      howto: {},
      pinged: false,
      stake: 's1',                      // 上次选的金币场
      voice: { mic: false, spk: true }, // 局内语音：麦克风、扬声器
      mateGames: {},                    // 和每位好友玩过的局数（默契搭档徽章）
      vipDaily: 0,                      // 会员每日福利上次领取的 day
      aid: { day: 0, used: 0 },         // 破产补助：当天已领次数
      protectUsed: { week: 0, n: 0 },   // 段位保护卡：本周已用张数
      callPerm: { mic: false, cam: false }, // 通话授权
      rang: false,                      // 是否已模拟过好友来电
      // V4 登录：auth 当前登录的账号（null 表示没登录）；owner 本机进度属于哪个账号；lastBy 上次用的登录方式；
      // accounts 邮箱注册表 { 邮箱: { h 密码散列, name, at } }（演示数据只在本机，真实产品在服务端）
      auth: null,
      owner: '',
      lastBy: '',
      accounts: {},
      visitors: [
        { id: 'hana', t: '10分钟前' }, { id: 'victor', t: '1小时前' }, { id: 'zoe', t: '3小时前' },
        { id: 'marco', t: '昨天' }, { id: 'ruby', t: '昨天' }, { id: 'noah', t: '2天前' },
      ],
    };
  }

  let s = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const o = JSON.parse(raw);
        if (o && o.v === 1) return Object.assign(fresh(), o);
      }
    } catch (_) { /* 数据损坏时回到初始状态 */ }
    return fresh();
  }
  let resetting = false;
  function save() {
    // 重置后页面刷新前还会触发 pagehide，这时不能把旧数据写回去
    if (resetting) return;
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) { /* 存储不可用时只在内存里运行 */ }
  }
  function emit(type, meta) {
    save();
    subs.forEach((fn) => {
      try { fn(type, meta || {}); } catch (e) { console.error(e); }
    });
  }

  /* ---------- 钱包 ---------- */
  function add(cur, n, note) {
    if (!n) return;
    s[cur] = Math.max(0, (s[cur] || 0) + n);
    s.log.unshift({ t: Date.now(), cur, n, note });
    if (s.log.length > 200) s.log.length = 200;
    emit('wallet', { cur, n });
  }
  function spend(cur, n, note) {
    if ((s[cur] || 0) < n) return false;
    add(cur, -n, note);
    return true;
  }
  function pay(usd) {
    if (s.mi < usd) return false;
    s.mi = Math.round((s.mi - usd) * 100) / 100;
    emit('pay');
    return true;
  }

  /* ---------- 等级 ---------- */
  const need = (lv) => 200 + 100 * lv;
  function addExp(n, note) {
    const ups = [];
    s.user.exp += n;
    while (s.user.exp >= need(s.user.lv)) {
      s.user.exp -= need(s.user.lv);
      s.user.lv += 1;
      ups.push(s.user.lv);
    }
    s.log.unshift({ t: Date.now(), cur: 'exp', n, note });
    emit('exp', { ups });
    return ups;
  }

  /* ---------- 段位 ---------- */
  const rank = (g) => s.ranks[g] || { tier: 0, pts: 0 };
  const score = (g) => rank(g).tier * 100 + rank(g).pts;
  function addRank(g, d) {
    const before = { ...rank(g) };
    const total = Math.max(0, Math.min(499, before.tier * 100 + before.pts + d));
    const after = { tier: Math.min(4, Math.floor(total / 100)), pts: 0 };
    after.pts = total - after.tier * 100;
    s.ranks[g] = after;
    if (after.tier >= 2 && !s.owned.frame.includes('season')) s.owned.frame.push('season');
    checkBadges();
    emit('rank', { g, before, after });
    return { before, after, up: after.tier > before.tier, down: after.tier < before.tier };
  }

  /* ---------- 计数（驱动任务进度） ---------- */
  function count(metric, n = 1, val) {
    ['day', 'week', 'all'].forEach((k) => {
      const c = s.cnt[k];
      if (Array.isArray(c[metric])) { if (!c[metric].includes(val)) c[metric].push(val); } else c[metric] = (c[metric] || 0) + n;
    });
    checkBadges();
    emit('count', { metric });
  }

  /* ---------- 任务 ---------- */
  const week = () => Math.ceil(s.day / 7);
  function metricVal(t) {
    const c = t.group === 'weekly' ? s.cnt.week : (t.group === 'daily' || t.group === 'mystery') ? s.cnt.day : s.cnt.all;
    switch (t.metric) {
      case 'minutes': return Math.floor(c.seconds / 60);
      case 'friendsAdded': return s.friendsAdded;
      case 'framesEquipped': return s.framesEquipped;
      case 'notify': return s.settings.turn ? 1 : 0;
      default: return c[t.metric] || 0;
    }
  }
  function isClaimed(t) {
    const v = s.claimed[t.id];
    if (t.group === 'daily') return v === s.day;
    if (t.group === 'weekly') return v === week();
    return !!v;
  }
  function task(t) {
    const cur = Math.min(t.goal, metricVal(t));
    const claimed = isClaimed(t);
    return { ...t, cur, claimed, state: claimed ? 'done' : cur >= t.goal ? 'claim' : 'go' };
  }
  const tasks = (group) => D.tasks.filter((t) => !group || t.group === group).map(task);
  function claim(id) {
    const t = task(D.tasks.find((x) => x.id === id));
    if (t.state !== 'claim') return null;
    s.claimed[id] = t.group === 'daily' ? s.day : t.group === 'weekly' ? week() : true;
    const dailyAll = D.tasks.filter((x) => x.group === 'daily').every(isClaimed);
    if (dailyAll && s.streak.last !== s.day) {
      s.streak.days = Math.min(7, s.streak.days + 1);
      s.streak.last = s.day;
      if (s.streak.days >= 7) s.streak.chest = true;
    }
    checkBadges();
    emit('task', { id });
    return t.reward;
  }
  function mystery() {
    const m = s.mystery;
    if (!m.pick) return { revealed: false, chest: m.chest };
    const def = D.mystery[m.pick - 1];
    const t = { id: 'mystery', group: 'mystery', ...def };
    const cur = Math.min(def.goal, metricVal(t));
    return { ...t, revealed: true, cur, claimed: m.claimed, chest: m.chest, state: m.claimed ? 'done' : cur >= def.goal ? 'claim' : 'go' };
  }
  function revealMystery() {
    const ready = D.mystery.findIndex((d) => metricVal({ group: 'mystery', ...d }) >= d.goal);
    s.mystery.pick = (ready >= 0 ? ready : Math.floor(Math.random() * D.mystery.length)) + 1;
    emit('task');
    return mystery();
  }
  function claimMystery() {
    if (mystery().state !== 'claim') return false;
    s.mystery.claimed = true;
    emit('task');
    return true;
  }
  function openChest() {
    s.mystery.chest = true;
    emit('task');
    return { gems: 50 + 10 * Math.floor(Math.random() * 4), coins: 100 };
  }
  function openStreakChest() {
    s.streak.chest = false;
    s.streak.opened = true;
    emit('task');
    return { gems: 300, coins: 500, boost: 2 };
  }
  function claimable() {
    let n = tasks().filter((t) => t.state === 'claim').length;
    if (mystery().state === 'claim') n += 1;
    if (s.streak.chest) n += 1;
    return n;
  }

  /* ---------- 签到 ---------- */
  const canSign = () => s.sign.last !== s.day && s.sign.count < 7;
  function signReward(i) {
    const r = { ...D.signin[i] };
    if (r.frame && s.owned.frame.includes(r.frame)) { delete r.frame; r.coins = (r.coins || 0) + 300; }
    const k = perk('sign');
    if (k > 1) { if (r.gems) r.gems *= k; if (r.coins) r.coins *= k; }
    return r;
  }
  function sign() {
    if (!canSign()) return null;
    const r = signReward(s.sign.count);
    s.sign.count += 1;
    s.sign.last = s.day;
    emit('sign');
    return r;
  }

  /* ---------- 装扮与道具 ---------- */
  const catalog = (kind) => (kind === 'frame' ? D.frames : kind === 'bubble' ? D.bubbles : D.bgs);
  const owns = (kind, id) => s.owned[kind].includes(id);
  function own(kind, id) {
    if (owns(kind, id)) return;
    s.owned[kind].push(id);
    checkBadges();
    emit('own', { kind, id });
  }
  function buy(kind, id) {
    const it = catalog(kind)[id];
    if (owns(kind, id)) return 'owned';
    if (s.coins < it.price) return 'poor';
    s.owned[kind].push(id);
    add('coins', -it.price, `购买${it.name}`);
    checkBadges();
    return 'ok';
  }
  function equip(kind, id) {
    s.equip[kind] = id;
    if (kind === 'frame' && id) s.framesEquipped += 1;
    emit('equip', { kind, id });
  }
  function buyItem(id) {
    const it = D.items.find((x) => x.id === id);
    if (s.coins < it.price) return 'poor';
    add('coins', -it.price, `购买${it.name}`);
    Object.entries(it.give).forEach(([k, n]) => add(k, n, it.name));
    return 'ok';
  }

  /* ---------- 好友 ---------- */
  const isFriend = (id) => s.friends.includes(id);
  function addFriend(id) {
    if (isFriend(id)) return;
    s.friends.unshift(id);
    s.friendsAdded += 1;
    s.requests = s.requests.filter((x) => x !== id);
    s.sent = s.sent.filter((x) => x !== id);
    // 一起对局过的人加成好友：计入限时任务
    if (s.recent.includes(id)) count('mates');
    checkBadges();
    emit('friend', { id });
  }
  function request(id) {
    if (!s.sent.includes(id)) s.sent.push(id);
    emit('friend', { id });
  }
  function decline(id) {
    s.requests = s.requests.filter((x) => x !== id);
    emit('friend', { id });
  }
  function unfriend(id) {
    s.friends = s.friends.filter((x) => x !== id);
    emit('friend', { id });
  }
  function addRecent(id) {
    s.recent = [id, ...s.recent.filter((x) => x !== id)].slice(0, 8);
    save();
  }

  /* ---------- 聊天 ---------- */
  function dm(uid) {
    if (!s.chats[uid]) {
      s.chats[uid] = { type: 'dm', with: uid, unread: 0, msgs: [] };
      s.chatOrder.unshift(uid);
      save();
    }
    return s.chats[uid];
  }
  function post(cid, msg, opt = {}) {
    const c = s.chats[cid];
    if (!c) return;
    c.msgs.push({ t: now(), ...msg });
    if (msg.from !== 'me' && !opt.read) c.unread = (c.unread || 0) + 1;
    s.chatOrder = [cid, ...s.chatOrder.filter((x) => x !== cid)];
    emit('chat', { cid, msg });
  }
  function read(cid) {
    const c = s.chats[cid];
    if (c && c.unread) { c.unread = 0; emit('chat', { cid }); }
  }
  const unread = () => Object.values(s.chats).reduce((a, c) => a + (c.unread || 0), 0);
  function newGroup(members) {
    const id = 'g' + Date.now().toString(36);
    const names = [s.user.name, ...members.map((m) => D.people[m].name)];
    s.chats[id] = {
      type: 'group', name: names.slice(0, 3).join('、') + (names.length > 3 ? '…' : ''), members, unread: 0,
      msgs: [{ from: 'system', text: `你创建了群聊，成员有${members.map((m) => D.people[m].name).join('、')}`, t: now() }],
    };
    s.chatOrder.unshift(id);
    emit('chat', { cid: id });
    return id;
  }

  /* ---------- 房间 ---------- */
  function room(id) {
    let r = s.rooms.find((x) => x.id === id);
    if (!r && D.inviteRooms[id]) {
      r = clone(D.inviteRooms[id]);
      s.rooms.push(r);
      save();
    }
    return r;
  }
  function createRoom(o) {
    const r = { id: 'my' + Date.now().toString(36), game: D.GAME, max: 2, seats: ['me'], host: 'me', lang: '中文', mine: true, ...o };
    s.rooms.unshift(r);
    checkBadges();
    emit('room', { id: r.id });
    return r;
  }
  function sit(id, uid) {
    const r = room(id);
    if (r && !r.seats.includes(uid) && r.seats.length < r.max) { r.seats.push(uid); emit('room', { id }); }
  }
  /** 离开房间：自己建的房间解散；别人的房间恢复成初始座位，避免模拟加入的人越积越多 */
  function leaveRoom(id) {
    const i = s.rooms.findIndex((x) => x.id === id);
    if (i < 0) return;
    const r = s.rooms[i];
    if (r.mine) s.rooms.splice(i, 1);
    else {
      const orig = D.rooms.find((x) => x.id === id) || D.inviteRooms[id];
      r.seats = orig ? [...orig.seats] : r.seats.filter((u) => u !== 'me');
    }
    emit('room', { id });
  }

  /* ---------- 对局记录 ---------- */
  function addMatch(m) {
    s.history.unshift({ t: now(), ...m });
    if (s.history.length > 30) s.history.length = 30;
    if (!m.practice) {
      s.record.games += 1;
      if (m.win) s.record.wins += 1;
      const gs = (s.gstats[m.game] = s.gstats[m.game] || { g: 0, w: 0 });
      gs.g += 1;
      if (m.win) gs.w += 1;
      // 和好友对局：计入每周任务和默契搭档徽章
      if (isFriend(m.vs)) {
        s.mateGames[m.vs] = (s.mateGames[m.vs] || 0) + 1;
        count('friendGames');
      }
    }
    emit('match');
  }

  /* ---------- 徽章 ---------- */
  function checkBadges() {
    const cond = {
      first_win: s.cnt.all.wins >= 1,
      social: s.friends.length >= 10,
      host: s.rooms.some((r) => r.mine),
      collector: s.owned.frame.length + s.owned.bubble.length + s.owned.bg.length - 2 >= 3,
      explorer: Object.values(s.mateGames).some((n) => n >= 10),
      gold: Object.values(s.ranks).some((r) => r.tier >= 2),
      streak: s.streak.days >= 7,
    };
    const got = [];
    Object.entries(cond).forEach(([id, ok]) => {
      if (ok && !s.badges[id]) { s.badges[id] = Date.now(); got.push(id); }
    });
    if (got.length) subs.forEach((fn) => fn('badge', { got }));
    return got;
  }
  function badge(id) {
    if (s.badges[id]) return;
    s.badges[id] = Date.now();
    emit('badge', { got: [id] });
  }

  /* ---------- 模拟下一天 ---------- */
  function nextDay() {
    if (s.streak.last !== s.day && s.streak.days < 7) s.streak.days = 0;
    s.day += 1;
    s.cnt.day = zero();
    if ((s.day - 1) % 7 === 0) s.cnt.week = zero();
    s.ads = { watched: 0, bonus: false };
    s.mystery = { pick: 0, claimed: false, chest: false };
    emit('day');
  }

  /* ---------- 会员：s.vip 为档位 0 / 1 / 2（兼容旧数据的 true = 1） ---------- */
  const vipTier = () => (s.vip === true ? 1 : Math.max(0, Math.min(2, +s.vip || 0)));
  const perk = (key) => D.vip.tiers[vipTier()][key];
  function setVip(tier) {
    s.vip = tier;
    const f = D.vip.tiers[tier].frame;
    if (f && !s.owned.frame.includes(f)) s.owned.frame.push(f);
    if (tier === 2 && !s.owned.frame.includes('vip')) s.owned.frame.push('vip');
    emit('vip', { tier });
  }
  /** 会员每日福利：返回奖励对象，已领或非会员返回 null */
  const canVipDaily = () => vipTier() > 0 && s.vipDaily !== s.day;
  function vipDaily() {
    if (!canVipDaily()) return null;
    s.vipDaily = s.day;
    save();
    return { coins: perk('dailyCoins'), gems: perk('dailyGems') };
  }
  /** 破产补助：每次补 AID 金币 */
  const AID = 500;
  const aidLeft = () => Math.max(0, perk('aid') - (s.aid.day === s.day ? s.aid.used : 0));
  function useAid() {
    if (!aidLeft()) return 0;
    if (s.aid.day !== s.day) s.aid = { day: s.day, used: 0 };
    s.aid.used += 1;
    save();
    return AID;
  }
  /** 段位保护卡：每周按档位发放 */
  const protectLeft = () => Math.max(0, perk('protect') - (s.protectUsed.week === week() ? s.protectUsed.n : 0));
  function useProtect() {
    if (!protectLeft()) return false;
    if (s.protectUsed.week !== week()) s.protectUsed = { week: week(), n: 0 };
    s.protectUsed.n += 1;
    save();
    return true;
  }

  function dots() {
    // welfare：顶栏签到按钮的角标 = 今天可签到（1）+ 可领取的任务数
    return { vip: canVipDaily(), sign: canSign(), tasks: claimable(), welfare: (canSign() ? 1 : 0) + claimable(), chat: unread(), requests: s.requests.length };
  }

  /**
   * 回到新用户状态并刷新页面
   * seed 可选：新状态里预先写入的字段（换账号登录时带上登录信息和邮箱注册表），user 按字段合并
   */
  function reset(seed) {
    resetting = true;
    try {
      if (seed) {
        const base = fresh();
        localStorage.setItem(KEY, JSON.stringify({ ...base, ...seed, user: { ...base.user, ...(seed.user || {}) } }));
      } else localStorage.removeItem(KEY);
      sessionStorage.clear();
    } catch (_) { /* 忽略 */ }
    location.hash = '#play';
    location.reload();
  }

  window.Store = {
    get s() { return s; },
    save, emit, on: (fn) => subs.push(fn), reset, now,
    add, spend, pay,
    need, addExp,
    rank, score, addRank,
    count,
    tasks, task, claim, claimable, mystery, revealMystery, claimMystery, openChest, openStreakChest, metricVal,
    canSign, sign, signReward,
    catalog, owns, own, buy, equip, buyItem,
    isFriend, addFriend, request, decline, unfriend, addRecent,
    dm, post, read, unread, newGroup,
    room, createRoom, sit, leaveRoom,
    addMatch, checkBadges, badge,
    nextDay, dots,
    vipTier, perk, setVip, canVipDaily, vipDaily, AID, aidLeft, useAid, protectLeft, useProtect,
  };
})();
