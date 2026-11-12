/**
 * Play 首页（登录后的启动页）。V4 精简成一屏、不用滚动，参考 Yalla Ludo：
 *   顶栏 → 赛季段位 / 好友排名两张小卡片 → 四子棋标志 → 玩法入口（快速开始、和好友玩、人机练习、创建房间、超级会员场）
 *   快速开始一点就匹配；金币分场收进“换场次”弹层
 * 以及启动相关的：B2 新手礼包、B5 退出挽留、B6 离线收益（B3 7 日签到在 tasks.js 顶部）、
 * C3 回合制对局（和 Kai，入口是右下角悬浮窗）、K3 好友主动发来邀请
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

  /** 赛季段位、好友排名：两张小卡片，点开都是排行榜（赛季奖励在排行榜页） */
  function info() {
    const r = Store.rank(D.GAME);
    const fr = Rank.friendPos(D.GAME);
    const days = (D.season.left.match(/^(\d+)天/) || [])[1];
    return `<div class="hm-info">
      <button class="hm-card hm-season" data-go="rank">
        ${UI.tier(r.tier, 40)}
        <span class="hm-card-m"><small>${D.season.name.split(' · ')[0]}${days ? ` · 剩${days}天` : ''}</small>
          <b>${D.tiers[r.tier]}<em>${r.pts}/100</em></b>${UI.bar(r.pts, 100, 'is-gold is-thin')}</span>
      </button>
      <button class="hm-card hm-rank" data-go="rank">
        <img src="${IMG}ui/trophy.png" alt="">
        <span class="hm-card-m"><small>好友排行</small><b>第${fr.pos}名</b><span>全服第${UI.fmt(Rank.myGlobalPos())}名</span></span>
        ${UI.ic('right', 16, 'hm-card-go')}
      </button>
    </div>`;
  }

  /** 四子棋标志：彩色描边字，下面是在玩人数和玩法说明 */
  function logo() {
    const g = D.game[D.GAME];
    const chars = [...g.name];
    const x = (i) => 44 + i * 82;
    return `<div class="hm-logo">
      <i class="hm-glow"></i><i class="disc p1 hm-d1"></i><i class="disc p2 hm-d2"></i><i class="hm-d3"></i>
      <svg class="hm-title" viewBox="0 0 252 86" width="252" height="86" role="img" aria-label="${g.name}">
        <defs>
          <linearGradient id="hmg1" x1="0" y1="0" x2="0" y2="1"><stop offset=".1" stop-color="#7cc0ff"/><stop offset="1" stop-color="#1f4fe0"/></linearGradient>
          <linearGradient id="hmg2" x1="0" y1="0" x2="0" y2="1"><stop offset=".1" stop-color="#ff9aa6"/><stop offset="1" stop-color="#e01f3d"/></linearGradient>
          <linearGradient id="hmg3" x1="0" y1="0" x2="0" y2="1"><stop offset=".1" stop-color="#ffe98a"/><stop offset="1" stop-color="#ff9500"/></linearGradient>
        </defs>
        <g class="hm-title-o">${chars.map((ch, i) => `<text x="${x(i)}" y="66">${ch}</text>`).join('')}</g>
        <g class="hm-title-i">${chars.map((ch, i) => `<text x="${x(i)}" y="66" class="c${i + 1}">${ch}</text>`).join('')}</g>
      </svg>
      <div class="hm-meta"><span class="hm-live"><i class="live-dot"></i>${UI.fmt(g.online)}人在玩</span><button class="hm-howto" data-act="howto">${UI.ic('book', 13)}玩法</button></div>
    </div>`;
  }

  /**
   * 快速开始用的场次：上次的场次能进就用它；进不了（金币不够、会员过期）就换成底注不超过它、能进的最高一档；
   * 一档都进不了就用已解锁的最低一档（新手场），点开始时由 Battle.quick 弹金币不足，差额最小
   */
  function pickStake() {
    const last = Battle.stakeOf(Store.s.stake);
    if (Battle.canEnter(last) === 'ok') return last;
    const normal = D.stakes.filter((x) => !x.vip);
    const ok = normal.filter((x) => Battle.canEnter(x) === 'ok');
    const lower = ok.filter((x) => x.bet <= last.bet);
    return lower[lower.length - 1] || ok[0] || normal.find((x) => Store.s.user.lv >= x.lv) || last;
  }

  /** 玩法入口：上排两个大块（快速开始、和好友玩），下排三个小块（人机练习、创建房间、超级会员场） */
  function modes() {
    const st = pickStake();
    const online = Store.s.friends.map((id) => D.people[id]).filter((p) => p && p.online);
    const vs = D.stakes.find((x) => x.vip);
    const vipOk = Store.vipTier() >= vs.vip;
    return `<div class="hm-modes">
      <div class="hm-tile is-quick">
        <button class="hm-hit" data-act="quick" data-id="${st.id}" aria-label="快速开始 · ${st.name}"></button>
        <img class="hm-art" src="${IMG}games/c4.jpg" alt="">
        <b class="hm-name">快速开始</b>
        <button class="hm-change" data-act="stakes" aria-label="换场次">${st.vip ? '超级场' : st.name} · ${UI.cur('coins', 14)}${UI.fmt(st.bet)}${UI.ic('down', 13)}</button>
        <span class="hm-go">${UI.ic('play', 14)}开始</span>
      </div>
      <button class="hm-tile is-friends" data-act="friends">
        <img class="hm-art" src="${IMG}brand/blobs-vs.png" alt="">
        <b class="hm-name">和好友玩</b>
        <span class="hm-desc">选入场金币 · 含免费档</span>
        <span class="hm-avs">${online.slice(0, 3).map((p) => UI.av(p.id, 24)).join('')}<em>${online.length}人在线</em></span>
      </button>
      <button class="hm-tile is-s is-ai" data-act="ai"><img class="hm-art" src="${IMG}brand/mascot.png" alt=""><b class="hm-name">人机练习</b><span class="hm-desc">免费练手</span></button>
      <button class="hm-tile is-s is-room" data-go="create"><img class="hm-art" src="${IMG}ui/pass.svg" alt=""><b class="hm-name">创建房间</b><span class="hm-desc">公开或私密</span></button>
      <button class="hm-tile is-s is-vip ${vipOk ? '' : 'is-locked'}" data-act="vipStake"><img class="hm-art" src="${IMG}ui/crown.png" alt=""><b class="hm-name">${vs.name}</b>
        <span class="hm-desc">${vipOk ? '' : UI.ic('lock', 11)}奖池×${vs.potX}</span></button>
    </div>`;
  }

  /** 金币分场（参考 Yalla Ludo）：换场次弹层里点场次直接开始匹配，并记住这次的场次 */
  function stakeCard(st, i) {
    const s = Store.s;
    const k = Battle.canEnter(st);
    return `<button class="stake st-${i + 1} ${st.vip ? 'is-vip' : ''} ${k === 'lock' || k === 'vip' ? 'is-locked' : ''} ${s.stake === st.id ? 'is-last' : ''}" data-act="stake" data-id="${st.id}">
      <b class="stake-name">${st.vip ? `${UI.vipTag(2)} ` : ''}${st.name}</b>
      <span class="stake-bet">${UI.cur('coins', 22)}${UI.fmt(st.bet)}</span>
      <span class="stake-pot">奖池 ${UI.fmt(Battle.pot(st))}</span>
      ${k === 'vip' ? `<span class="stake-lock">${UI.ic('crown', 12)} 超级会员专属 · 奖池×${st.potX}</span>` : k === 'lock' ? `<span class="stake-lock">${UI.ic('lock', 12)} Lv${st.lv}解锁</span>` : `<span class="stake-on"><i class="live-dot"></i>${UI.fmt(st.online)}${st.vip ? ` · 奖池×${st.potX}` : ''}</span>`}
      ${s.stake === st.id && k !== 'lock' && k !== 'vip' ? '<i class="stake-tag">上次</i>' : ''}
      ${st.vip ? `<img class="stake-crown" src="${IMG}ui/crown.png" alt="">` : ''}
    </button>`;
  }
  function stakeSheet() {
    const c = UI.sheet({
      title: '选择场次',
      sub: '入场扣底注，赢家拿走奖池，平局退还',
      cls: 'sheet-stakes',
      html: `<div class="lb-stakes is-sheet">${D.stakes.map(stakeCard).join('')}</div>`,
      acts: {
        stake: (el) => {
          const st = D.stake[el.dataset.id];
          // 等级不够：留在弹层里提示，其他情况（开局、金币不足、会员专属）交给 Battle.quick
          if (Battle.canEnter(st) === 'lock') { UI.toast(`${st.name}需要Lv${st.lv}解锁`); Sfx.play('error'); return; }
          c.close();
          Battle.quick(st.id);
        },
      },
    });
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
    if (App.top() !== 'play') return;
    // 先教开局，让新用户马上玩上第一局；签到的引导等打完第一局回到首页再出（见 shown）
    await UI.coach(pageEl().querySelector('.hm-tile.is-quick'), '点这里马上开一局，赢家拿走奖池。先从新手场试试！', { key: 'play' });
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
        <div class="body lobby-body hm-body" data-scroll="main">
          ${info()}
          ${logo()}
          ${modes()}
          <i class="hm-foot" aria-hidden="true"></i>
        </div>
        ${UI.tabbar('play')}`;
    },
    async shown(el) {
      if (!Store.s.welcome) await welcome();
      else if (pendingOffline) { pendingOffline = false; await offline(); }
      else if (!Store.s.tips.sign && Store.s.cnt.all.games > 0 && !UI.hasOverlay()) {
        // 打完第一局回到首页，再介绍签到
        await UI.coach(el.querySelector('.lobby-sign'), '每天签到、做任务，免费领钻石，第7天有大奖！', { key: 'sign' });
      }
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
      quick: (el) => Battle.quick(el.dataset.id),
      stakes: () => stakeSheet(),
      vipStake: () => Battle.quick(D.stakes.find((x) => x.vip).id),
      ai: () => Battle.practice(),
      howto: () => Battle.howto(D.GAME, { manual: true }),
      friends: async () => {
        const uid = await UI.pickFriend({ title: '邀请好友下四子棋', sub: '选好友后再选入场金币，有免费档', onlineOnly: true });
        if (uid) Rooms.withFriend(uid);
      },
    },
  });
})();
