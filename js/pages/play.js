/**
 * Play 大厅（单游戏：四子棋主视觉、段位、金币分场、好友），也是 app 的启动页
 * 以及启动相关的：B2 新手礼包、B5 退出挽留、B6 离线收益（B3 7 日签到在 tasks.js 顶部）、
 * C3 回合制对局（和 Kai）、C4 好友弹层、K3 好友主动发来邀请
 */
(() => {
  'use strict';

  const IMG = D.IMG;
  let retainShown = false;
  let pingTimer = 0;
  let kaiTimer = 0;
  const pageEl = () => document.querySelector('.page[data-page="play"]');

  /* ================= 启动 / 退出 ================= */
  // Play 是 app 的启动页：打开时记一次访问，距上次离开超过 2 秒就发离线收益
  let pendingOffline = false;
  App.onInit(() => {
    const s = Store.s;
    pendingOffline = !!(s.welcome && s.lastExit && Date.now() - s.lastExit > 2000);
    s.lastExit = 0;
    s.visits += 1;
    Store.save();
  });
  // 关闭或刷新页面时记下离开时间，下次打开用来判断离线收益；
  // 已经点过 Leave 的保留更早的那次时间
  addEventListener('pagehide', () => {
    if (Store.s.lastExit) return;
    Store.s.lastExit = Date.now();
    Store.save();
  });

  window.Channel = {
    exit() {
      Store.s.lastExit = Date.now();
      Store.save();
      UI.toast('已退出 Soulgame（演示）');
    },
  };

  /* ================= 大厅各区块 ================= */
  function header() {
    const s = Store.s;
    return `<header class="lobby-top safe-top">
      <button class="lobby-me" data-tab="me" aria-label="我的资料">${UI.av('me', 36)}<span class="lobby-lv">Lv${s.user.lv}</span></button>
      <div class="lobby-chips">${UI.chips(['gems', 'coins'])}</div>
      <button class="icon-btn lobby-sign" data-go="tasks" aria-label="签到和任务"><img src="${IMG}ui/calendar.png" alt="">${UI.count('welfare')}</button>
      <button class="icon-btn lobby-shop" data-go="shop" aria-label="商城"><img src="${IMG}ui/store.png" alt=""></button>
    </header>`;
  }

  /** 赛季模块：赛季名、倒计时、我的段位进度、段位奖励轨道、好友排名（段位卡合并进来） */
  function season() {
    const r = Store.rank(D.GAME);
    const gs = Store.s.gstats[D.GAME] || { g: 0 };
    const fr = Rank.friendPos(D.GAME);
    const toNext = Math.ceil((100 - r.pts) / 25);
    const next = D.season.rewards.find((x) => x.tier > r.tier);
    const ahead = fr.ahead ? `再赢${fr.ahead.wins}局超过${D.people[fr.ahead.id].name}` : '好友中第一！';
    return `<section class="ss" data-go="rank">
      <div class="ss-hd">
        <img class="ss-trophy" src="${IMG}ui/trophy.png" alt="">
        <span class="ss-tt"><small>赛季进行中</small><b>${D.season.name}</b></span>
        <span class="ss-left">${UI.ic('clock', 13)}${D.season.left}</span>
      </div>
      <div class="ss-me">
        ${UI.tier(r.tier, 52)}
        <span class="ss-me-m"><b>${D.tiers[r.tier]} <small>${r.pts}/100分</small></b>${UI.bar(r.pts, 100, 'is-gold')}
          <span>${r.tier < 4 ? `再赢<em>${toNext}</em>局升${D.tiers[r.tier + 1]}${next ? `，得${next.text}` : ''}` : '已达最高段位！'}</span></span>
        <span class="ss-me-s"><b>${Battle.winRate()}</b><span>胜率 · ${gs.g}局</span></span>
      </div>
      <div class="ss-track">${D.season.rewards.map((x) => `<span class="ss-step ${x.tier < r.tier ? 'is-done' : x.tier === r.tier ? 'is-now' : ''}">${UI.tier(x.tier, 26)}<b>${D.tiers[x.tier]}</b><i>${x.text}</i></span>`).join('')}</div>
      <div class="ss-ft"><span>${UI.ic('users', 14)} 好友排名第<b>${fr.pos}</b> · ${ahead}</span><span class="ss-more">排行榜 ${UI.ic('right', 14)}</span></div>
    </section>`;
  }

  /** 在线好友：头像下面直接“一起玩”，不用再选游戏 */
  function friendsRow() {
    const list = Store.s.friends.map((id) => D.people[id]).filter((p) => p.online);
    return `<div class="sec-hd"><h2>在线好友 <em class="sec-n">${list.length}</em></h2><button class="more" data-act="allFriends">全部 ${UI.ic('right', 16)}</button></div>
      <div class="hscroll lobby-friends" data-scroll="friends">
        ${list.map((p) => `<div class="lf">
          <button class="lf-hit" data-act="friend" data-uid="${p.id}">${UI.av(p.id, 54, { on: true })}<b>${p.name}</b><span>${UI.esc(p.status)}</span></button>
          <button class="lf-play" data-act="playWith" data-uid="${p.id}">一起玩</button>
        </div>`).join('')}
        <button class="lf lf-add" data-go="addfriend"><span class="lf-plus">${UI.ic('userPlus', 22)}</span><b>添加</b><span>找好友</span></button>
      </div>`;
  }

  /* ================= 单游戏大厅：四子棋主视觉、段位、金币分场、玩法入口 ================= */
  function hero() {
    const g = D.game[D.GAME];
    return `<section class="lb-hero">
      <img class="lb-hero-img" src="${g.cover}" alt="">
      <i class="lb-hero-shade"></i>
      <div class="lb-hero-top"><span class="lb-live"><i class="live-dot"></i>${UI.fmt(g.online)}人在玩</span>
        <button class="lb-howto" data-act="howto">${UI.ic('book', 14)} 玩法</button></div>
      <div class="lb-hero-foot"><b>${g.name}</b><span>${g.players}实时对战 · 连成四子就赢</span></div>
    </section>`;
  }
  /** 金币分场（参考 Yalla Ludo）：点场次直接开始匹配 */
  function stakes() {
    const s = Store.s;
    return `<div class="sec-hd"><h2>选择场次</h2><span class="lb-rule">赢家拿走奖池</span></div>
      <div class="lb-stakes">${D.stakes.map((st, i) => {
        const k = Battle.canEnter(st);
        return `<button class="stake st-${i + 1} ${st.vip ? 'is-vip' : ''} ${k === 'lock' || k === 'vip' ? 'is-locked' : ''} ${s.stake === st.id ? 'is-last' : ''}" data-act="stake" data-id="${st.id}">
          <b class="stake-name">${st.vip ? `${UI.vipTag(2)} ` : ''}${st.name}</b>
          <span class="stake-bet">${UI.cur('coins', 22)}${UI.fmt(st.bet)}</span>
          <span class="stake-pot">奖池 ${UI.fmt(Battle.pot(st))}</span>
          ${k === 'vip' ? `<span class="stake-lock">${UI.ic('crown', 12)} 超级会员专属 · 奖池×${st.potX}</span>` : k === 'lock' ? `<span class="stake-lock">${UI.ic('lock', 12)} Lv${st.lv}解锁</span>` : `<span class="stake-on"><i class="live-dot"></i>${UI.fmt(st.online)}${st.vip ? ` · 奖池×${st.potX}` : ''}</span>`}
          ${s.stake === st.id && k !== 'lock' && k !== 'vip' ? '<i class="stake-tag">上次</i>' : ''}
          ${st.vip ? `<img class="stake-crown" src="${IMG}ui/crown.png" alt="">` : ''}
        </button>`;
      }).join('')}</div>
      <div class="lb-modes">
        <button class="lb-mode" data-act="friends"><i class="mode-ic is-blue">${UI.ic('users', 20)}</i><b>和好友玩</b><span>不扣金币</span></button>
        <button class="lb-mode" data-go="create"><i class="mode-ic is-purple">${UI.ic('door', 20)}</i><b>创建房间</b><span>公开或私密</span></button>
        <button class="lb-mode" data-act="ai"><i class="mode-ic is-green">${UI.ic('bot', 20)}</i><b>人机练习</b><span>免费练手</span></button>
      </div>`;
  }

  /* ================= B2 新手礼包、B6 离线收益 ================= */
  async function welcome() {
    await UI.sleep(200);
    Store.s.welcome = true;
    Store.save();
    await UI.reward({
      title: '欢迎来到 Soulgame！',
      sub: '先下一局，再交个朋友。见面礼请收好！',
      img: `${IMG}brand/mascot-gift.png`,
      items: { gems: 50, coins: 1000, boost: 1 },
      btn: '全部领取',
      note: '新手礼包',
    });
    await UI.sleep(350);
    const el = pageEl();
    if (App.top() !== 'play') return;
    await UI.coach(el.querySelector('.lobby-sign'), '每天签到、做任务，免费领钻石，第7天有大奖！', { key: 'sign' });
    if (App.top() !== 'play') return;
    await UI.coach(el.querySelector('.stake'), '选个场次就开局，赢家拿走奖池。先从新手场试试！', { key: 'play', place: 'top' });
  }
  const offline = () => UI.reward({
    title: '欢迎回来！',
    sub: '你不在的时候，小团子帮你攒了些金币。',
    img: `${IMG}brand/mascot.png`,
    items: { coins: 20 },
    btn: '收下',
    note: '离线收益',
  });

  /* ================= B5 退出挽留 ================= */
  async function retain() {
    const n = Store.claimable() + (Store.canSign() ? 1 : 0);
    const k = await UI.dialog({
      img: `${IMG}brand/mascot-sad.png`,
      title: '这就要走了？',
      text: `还有<b>${n}个奖励</b>没领，再玩1局赢了<b>奖池翻倍</b>！`,
      buttons: [
        { label: '再玩1局 · 奖池翻倍', key: 'play', cls: 'btn-orange' },
        { label: '领取奖励', key: 'claim', cls: 'btn-line' },
        { label: '离开', key: 'leave', cls: 'btn-ghost' },
      ],
    });
    if (k === 'play') {
      Store.s.doubleNext = true;
      Store.save();
      Battle.quick();
    } else if (k === 'claim') {
      App.go('tasks');
    } else if (k === 'leave') {
      Channel.exit();
    }
  }

  /* ================= 回合制提醒：右下角悬浮窗（原首页卡片） ================= */
  function goTurn() {
    if (App.top() !== 'play') App.tab('play');
    App.whenIdle(() => setTimeout(openTurn, 200));
  }
  UI.floater.add(() => {
    if (!Store.s.welcome) return null;
    const t = Store.s.turn;
    const p = D.people[t.with];
    return {
      id: 'turn', key: t.my ? 'my' : 'wait', close: true, uid: t.with, urgent: t.my,
      board: C4.html(t.board, { cls: 'is-mini' }),
      title: t.my ? '轮到你了 · 去落子' : `等${p.name}落子`,
      sub: t.my ? `回合制 · 还剩23小时` : '回合制 · 点击催一下',
      onTap: () => { if (t.my) goTurn(); else { UI.toast(`已催${p.name}落子👋`); scheduleKai(3500); } },
    };
  }, 1);

  /* ================= C3 回合制对局 ================= */
  function openTurn() {
    const t = Store.s.turn;
    const p = D.people[t.with];
    if (!t.my) { UI.toast(`等待${p.name}落子`); return; }
    const c = UI.sheet({
      title: `对战${p.name} · 轮到你了`,
      sub: '四子棋 · 回合制。点击一列落子。',
      html: `<div class="tb-players"><span>${UI.av('me', 28)}<b>你</b><i class="disc p1"></i></span><em>VS</em><span><i class="disc p2"></i><b>${p.name}</b>${UI.av(t.with, 28)}</span></div>
        <div class="tb">${C4.html(t.board, { cls: 'is-sheet', cols: true })}</div>
        <p class="tb-tip">${UI.ic('info', 14)} 你落子后，${p.name}有24小时回应，到时会通知你。</p>`,
      acts: { col: (el) => moveTurn(c, +el.dataset.c) },
    });
  }
  async function moveTurn(c, col) {
    const t = Store.s.turn;
    if (!t.my) return;
    const row = C4.drop(t.board, col, 1);
    if (row < 0) { UI.toast('这一列已经满了'); return; }
    t.my = false;
    Store.save();
    C4.paint(c.$('.c4'), row, col, 1);
    Sfx.play('drop');
    const win = C4.wins(t.board, 1);
    await UI.sleep(750);
    c.close();
    if (win) {
      t.board = C4.empty();
      t.my = true;
      Store.save();
      App.refresh('play');
      await UI.reward({ title: '你赢了！', sub: `你在回合制四子棋中击败了${D.people[t.with].name}。`, img: `${IMG}ui/trophy.png`, items: { gems: 30 }, note: '回合制胜利' });
      return;
    }
    UI.toast(`已落子！${D.people[t.with].name}有24小时回应`);
    App.refresh('play');
    scheduleKai(25000);
  }
  function scheduleKai(ms) {
    clearTimeout(kaiTimer);
    kaiTimer = setTimeout(() => {
      kaiTimer = 0;
      const t = Store.s.turn;
      if (t.my) return;
      const col = C4.bot(t.board, 2, 1, 0.9);
      let text = '四子棋轮到你了';
      if (col < 0 || C4.full(t.board)) {
        t.board = C4.empty();
        text = '棋盘下满了。新开一局，轮到你了！';
      } else {
        C4.drop(t.board, col, 2);
        if (C4.wins(t.board, 2)) { t.board = C4.empty(); text = `${D.people[t.with].name}赢了这局。新开一局，轮到你了！`; }
      }
      t.my = true;
      Store.save();
      Store.post(t.with, { from: t.with, text: '轮到你了！😎' });
      UI.notify({ img: D.people[t.with].avatar, title: `${D.people[t.with].name}已落子`, text, btn: '去落子',
        onTap: goTurn });
      if (App.top() === 'play') App.refresh('play');
    }, ms);
  }

  /* ================= C4 好友弹层 ================= */
  function friendSheet(uid) {
    const p = D.people[uid];
    const room = uid === 'lily' ? Store.room('lily') : null;
    const c = UI.sheet({
      html: `<div class="fs-hd">${UI.av(uid, 68, { on: true })}<div class="fs-txt"><h3>${p.name} <span class="tag">Lv${p.lv}</span></h3>
          <p class="${p.online ? 'is-on' : ''}">${p.online ? UI.esc(p.status) : `离线 · ${p.seen}`}</p></div></div>
        <div class="fs-fav"><span>四子棋</span><b>${p.games}局 · 胜率${p.win}%</b>${Store.s.mateGames[uid] ? `<em>和你玩过${Store.s.mateGames[uid]}局</em>` : ''}</div>
        <div class="fs-btns">
          ${room && room.seats.length < room.max ? `<button class="btn btn-orange btn-lg btn-block" data-act="join">${UI.ic('door', 18)} 加入${p.name}的房间</button>` : ''}
          <button class="btn btn-primary btn-lg btn-block" data-act="invite">${UI.ic('gamepad', 18)} 邀请一起玩</button>
          <div class="fs-row">
            <button class="btn btn-ghost btn-md" data-act="msg">${UI.ic('msg', 16)} 发消息</button>
            <button class="btn btn-ghost btn-md" data-act="profile">${UI.ic('users', 16)} 主页</button>
          </div>
        </div>`,
      acts: {
        join: () => { c.close(); Rooms.join('lily'); },
        invite: () => {
          c.close();
          Rooms.withFriend(uid);
        },
        msg: () => { c.close(); App.go('dm', { id: uid }); },
        profile: () => { c.close(); App.go('profile', { uid }); },
      },
    });
  }

  /* ================= K3 好友主动发来邀请 ================= */
  function schedulePing() {
    if (Store.s.pinged || pingTimer) return;
    const tryPing = () => {
      const free = App.TABS.includes(App.top()) && !UI.hasOverlay() && !document.querySelector('.coach');
      if (!free) { pingTimer = setTimeout(tryPing, 4000); return; }
      pingTimer = 0;
      Store.s.pinged = true;
      Store.post('lily', { from: 'lily', type: 'invite', game: 'c4', room: 'lily', text: '来一局？我在房间等你！' });
      UI.notify({ img: D.people.lily.avatar, title: `${D.people.lily.name}邀请你一起玩`, text: `四子棋 · ${D.people.lily.name}的房间 1/2`, btn: '查看', ms: 7000, onTap: () => App.go('dm', { id: 'lily' }) });
    };
    pingTimer = setTimeout(tryPing, 22000);
  }

  /* ================= 页面 ================= */
  App.page('play', {
    render(el) {
      el.innerHTML = `<div class="lobby-bg"></div>${header()}
        <div class="body lobby-body" data-scroll="main">
          ${hero()}
          ${season()}
          ${stakes()}
          ${friendsRow()}
          <div class="bottom-space"></div>
        </div>
        ${UI.tabbar('play')}`;
    },
    async shown(el, p) {
      if (!Store.s.welcome) await welcome();
      else if (pendingOffline) { pendingOffline = false; await offline(); }
      schedulePing();
      if (!Store.s.turn.my && !kaiTimer) scheduleKai(9000);
    },
    back() {
      if (!retainShown && (Store.claimable() > 0 || Store.canSign())) {
        retainShown = true;
        retain();
        return false;
      }
      Channel.exit();
      return false;
    },
    act: {
      turn: () => openTurn(),
      nudge: () => {
        const p = D.people[Store.s.turn.with];
        UI.toast(`已催${p.name}落子👋`);
        scheduleKai(3500);
      },
      friend: (el) => friendSheet(el.dataset.uid),
      allFriends: () => App.tab('chat', { seg: 'friends' }),
      stake: (el) => Battle.quick(el.dataset.id),
      ai: () => Battle.practice(),
      howto: () => Battle.howto(D.GAME, { manual: true }),
      friends: async () => {
        const uid = await UI.pickFriend({ title: '邀请好友下四子棋', sub: '好友房不扣金币、不计段位', onlineOnly: true });
        if (uid) Rooms.withFriend(uid);
      },
      playWith: (el) => Rooms.withFriend(el.dataset.uid),
    },
  });
})();
