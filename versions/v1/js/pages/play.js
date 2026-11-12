/**
 * Play 大厅（C1–C7），也是 app 的启动页
 * 以及启动相关的：B2 新手礼包、B5 退出挽留、B6 离线收益（B3 7 日签到在 tasks.js 顶部）、
 * C3 回合制对局（和 Kai）、C4 好友弹层、K3 好友主动发来邀请
 */
(() => {
  'use strict';

  const IMG = D.IMG;
  let cat = '推荐';
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
      UI.toast('已退出畅玩空间（演示）');
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

  function entries() {
    const fr = Rank.friendPos('c4');
    const ahead = fr.ahead ? ` · 再赢${fr.ahead.wins}局超过${D.people[fr.ahead.id].name}` : ' · 好友中第一！';
    return `<button class="season" data-go="rank">
        <img class="season-trophy" src="${IMG}ui/trophy.png" alt="">
        <span class="season-txt"><b>${D.season.name}</b><span>好友排名第${fr.pos}${ahead}</span></span>
        <span class="season-left">${UI.ic('clock', 12)}${D.season.left}</span>
      </button>`;
  }

  function turnCard() {
    const t = Store.s.turn;
    const p = D.people[t.with];
    return `<div class="turn card ${t.my ? 'is-mine' : ''}">
      ${C4.html(t.board, { cls: 'is-mini' })}
      <div class="turn-m">
        <div class="turn-tt">${UI.av(t.with, 22)}<b>${t.my ? '轮到你了！' : `等待${p.name}落子`}</b></div>
        <span class="turn-sub">四子棋 · 回合制</span>
        <span class="turn-time">${UI.ic('clock', 12)} ${t.my ? '还剩23小时12分可落子' : `${p.name}有24小时回应`}</span>
      </div>
      ${t.my ? '<button class="btn btn-orange btn-sm" data-act="turn">去落子</button>' : '<button class="btn btn-ghost btn-sm" data-act="nudge">催一下</button>'}
    </div>`;
  }

  function friendsRow() {
    const list = Store.s.friends.map((id) => D.people[id]).filter((p) => p.online);
    return `<div class="sec-hd"><h2>在线好友 <em class="sec-n">${list.length}</em></h2><button class="more" data-act="allFriends">全部 ${UI.ic('right', 16)}</button></div>
      <div class="hscroll lobby-friends" data-scroll="friends">
        ${list.map((p) => `<button class="lf" data-act="friend" data-uid="${p.id}">${UI.av(p.id, 54, { on: true })}<b>${p.name}</b><span>${UI.esc(p.status.replace('正在玩', ''))}</span></button>`).join('')}
        <button class="lf lf-add" data-go="addfriend"><span class="lf-plus">${UI.ic('userPlus', 22)}</span><b>添加</b><span>找好友</span></button>
      </div>`;
  }

  const tagHtml = (t) => {
    if (!t) return '';
    const top = /^第\d名$/.test(t);
    const cls = top ? 'tag-top' : t === '新游' ? 'tag-new' : t === '活动' ? 'tag-event' : 'tag-hot';
    const ic = top ? UI.ic('crown', 11) : t === '热门' ? UI.ic('flame', 11) : '';
    return `<span class="tag ${cls}">${ic}${t}</span>`;
  };
  window.Lobby = { tagHtml, setCat: (c) => { cat = c; } };

  function bigCard(x) {
    return `<div class="gcard" data-go="detail" data-game="${x.id}">
      <img class="gcard-cover" src="${x.cover}" alt="">
      <div class="gcard-tags">${tagHtml(x.tag)}${x.playable ? '<span class="tag tag-dark">可完整试玩</span>' : ''}</div>
      <span class="gcard-cost">${UI.cur('gems', 14)}${D.COST}</span>
      <div class="gcard-foot">
        <img class="gcard-icon" src="${x.icon}" alt="">
        <div class="gcard-txt"><b>${x.name}</b><span><i class="live-dot"></i>${UI.fmt(x.online)}人在玩 · ${x.cat} · ${x.players}</span></div>
        <button class="btn btn-white gcard-play" data-act="play" data-game="${x.id}">开玩</button>
      </div>
    </div>`;
  }
  function smallCard(x) {
    return `<div class="mcard" data-go="detail" data-game="${x.id}">
      <div class="mcard-img"><img src="${x.icon}" alt="">${x.tag ? `<span class="mcard-tag">${tagHtml(x.tag)}</span>` : ''}<span class="mcard-online"><i class="live-dot"></i>${UI.fmt(x.online)}</span></div>
      <b>${x.name}</b>
      <div class="mcard-foot"><span class="mcard-meta">${UI.cur('gems', 13)}${D.COST} · ${x.cat}</span><button class="btn btn-primary btn-sm" data-act="play" data-game="${x.id}">开玩</button></div>
    </div>`;
  }
  function games() {
    const list = cat === '推荐' ? D.forYou.map((id) => D.game[id]) : D.games.filter((x) => x.cat === cat);
    const big = list.filter((x) => x.cover).slice(0, cat === '推荐' ? 2 : 3);
    const rest = list.filter((x) => !big.includes(x));
    return `<div class="lobby-games anim-in">${big.map(bigCard).join('')}${rest.length ? `<div class="mgrid">${rest.map(smallCard).join('')}</div>` : ''}</div>`;
  }

  /* ================= B2 新手礼包、B6 离线收益 ================= */
  async function welcome() {
    await UI.sleep(200);
    Store.s.welcome = true;
    Store.save();
    await UI.reward({
      title: '欢迎来到畅玩空间！',
      sub: '和全球玩家实时开黑，先送你一份见面礼！',
      img: `${IMG}brand/mascot-gift.png`,
      items: { gems: 100, coins: 500, boost: 1 },
      btn: '全部领取',
      note: '新手礼包',
    });
    await UI.sleep(350);
    const el = pageEl();
    if (App.top() !== 'play') return;
    await UI.coach(el.querySelector('.lobby-sign'), '每天签到、做任务，免费领钻石，第7天有大奖！', { key: 'sign' });
    if (App.top() !== 'play') return;
    await UI.coach(el.querySelector('.gcard-play'), '点“开玩”直接开一局，四子棋可完整试玩。', { key: 'play', place: 'top' });
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
      text: `还有<b>${n}个奖励</b>没领，再玩1局得<b>双倍钻石</b>！`,
      buttons: [
        { label: '再玩1局 · 2×钻石', key: 'play', cls: 'btn-orange' },
        { label: '领取奖励', key: 'claim', cls: 'btn-line' },
        { label: '离开', key: 'leave', cls: 'btn-ghost' },
      ],
    });
    if (k === 'play') {
      Store.s.doubleNext = true;
      Store.save();
      Battle.quick('c4');
    } else if (k === 'claim') {
      App.go('tasks');
    } else if (k === 'leave') {
      Channel.exit();
    }
  }

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
        onTap: () => { if (App.top() !== 'play') App.tab('play'); setTimeout(openTurn, 450); } });
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
        <div class="fs-fav"><span>常玩</span>${p.fav.map((g) => `<img src="${D.game[g].icon}" alt="${D.game[g].name}" title="${D.game[g].name}">`).join('')}</div>
        <div class="fs-btns">
          ${room && room.seats.length < room.max ? `<button class="btn btn-orange btn-lg btn-block" data-act="join">${UI.ic('door', 18)} 加入${p.name} · ${D.game[room.game].name}</button>` : ''}
          <button class="btn btn-primary btn-lg btn-block" data-act="invite">${UI.ic('gamepad', 18)} 邀请一起玩</button>
          <div class="fs-row">
            <button class="btn btn-ghost btn-md" data-act="msg">${UI.ic('msg', 16)} 发消息</button>
            <button class="btn btn-ghost btn-md" data-act="profile">${UI.ic('users', 16)} 主页</button>
          </div>
        </div>`,
      acts: {
        join: () => { c.close(); Rooms.join('lily'); },
        invite: async () => {
          c.close();
          const g = await Rooms.pickGame(`和${p.name}一起玩`, p.fav);
          if (g) Rooms.withFriend(uid, g);
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
          ${entries()}
          ${turnCard()}
          ${friendsRow()}
          <div class="sec-hd"><h2>推荐游戏</h2><span class="live">${UI.fmt(D.games.reduce((a, x) => a + x.online, 0))}人在线</span></div>
          <div class="lobby-cats"><div class="hscroll">${D.cats.map((c) => `<button class="pill ${c === cat ? 'is-active' : ''}" data-act="cat" data-cat="${c}">${c}</button>`).join('')}</div></div>
          ${games()}
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
      cat: (el) => {
        cat = el.dataset.cat;
        const page = pageEl();
        page.querySelectorAll('.lobby-cats .pill').forEach((b) => b.classList.toggle('is-active', b.dataset.cat === cat));
        page.querySelector('.lobby-games').outerHTML = games();
        const body = page.querySelector('.lobby-body');
        const bar = page.querySelector('.lobby-cats');
        const stuck = bar.getBoundingClientRect().top - body.getBoundingClientRect().top < 2;
        if (stuck) body.scrollTop = page.querySelector('.lobby-games').offsetTop - bar.offsetHeight - 6;
      },
      play: (el) => Battle.quick(el.dataset.game),
    },
  });
})();
