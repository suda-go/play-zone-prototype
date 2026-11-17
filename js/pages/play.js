/**
 * Play 首页（登录后的启动页）。V4 精简成一屏、不用滚动，参考 Yalla Ludo：
 *   顶栏 → 一行四子棋标志 → 快速开始（大卡片，一点就匹配）→ 和好友玩、本地对战。V7 首发版不做赛季、排行榜
 *   快速开始一点就匹配；金币分场收进“换场次”弹层
 * 以及启动相关的：B2 新手礼包、B5 退出挽留、B6 离线收益（B3 7 日签到在 tasks.js 顶部）、
 * K3 好友主动发来邀请（V7 首发版不做 C3 回合制对局）
 */
(() => {
  'use strict';

  const IMG = D.IMG;
  let retainShown = false;
  let pingTimer = 0;
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
      <button class="lobby-me" data-tab="me" aria-label="我的资料">${UI.av('me', 36)}</button>
      <div class="lobby-chips">${UI.chips(['coins'])}</div>
      <button class="icon-btn lobby-sign" data-go="tasks" aria-label="签到和任务"><img src="${IMG}ui/calendar.png" alt="">${UI.count('welfare')}</button>
      <button class="icon-btn lobby-shop" data-go="shop" aria-label="商城"><img src="${IMG}ui/store.png" alt=""></button>
    </header>`;
  }

  /** 四子棋标志缩成一行（左边标志，右边在玩人数和玩法），把位置让给“开始游戏” */
  function logo() {
    const g = D.game[D.GAME];
    const chars = [...g.name];
    const x = (i) => 44 + i * 82;
    return `<div class="hm-logo">
      <svg class="hm-title" viewBox="0 0 252 86" width="150" height="51" role="img" aria-label="${g.name}">
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
    return lower[lower.length - 1] || ok[0] || normal[0] || last;
  }

  /** 玩法入口：快速开始（最大，放最上面，一点就匹配），下面是和好友玩（线上）、本地对战（同一台手机） */
  function modes() {
    const st = pickStake();
    const online = Store.s.friends.map((id) => D.people[id]).filter((p) => p && p.online);
    const hasFriends = Store.s.friends.length > 0;
    return `<div class="hm-modes">
      <div class="hm-tile is-quick is-big">
        <button class="hm-hit" data-act="quick" data-id="${st.id}" aria-label="开始游戏 · ${st.name}"></button>
        <img class="hm-art" src="${IMG}games/c4.jpg" alt="">
        <b class="hm-name">快速开始</b>
        <span class="hm-desc">和真人实时对战 · 赢家拿走奖池</span>
        <button class="hm-change" data-act="stakes" aria-label="换场次">${st.vip ? '超级场' : st.name} · ${UI.cur('coins', 14)}${UI.fmt(st.bet)}${UI.ic('down', 13)}</button>
        <span class="hm-go">${UI.ic('play', 18)}开始游戏</span>
      </div>
      <button class="hm-tile is-friends" data-act="friends">
        <img class="hm-art" src="${IMG}brand/mascot-cheer.png" alt="">
        <b class="hm-name">和好友玩</b>
        <span class="hm-desc">${hasFriends ? '选入场金币 · 含免费档' : '约朋友来下一局'}</span>
        <span class="hm-avs">${hasFriends ? `${online.slice(0, 3).map((p) => UI.av(p.id, 24)).join('')}<em>${online.length}人在线</em>` : `<i class="hm-avs-add">${UI.ic('userPlus', 14)}</i><em>还没有好友</em>`}</span>
      </button>
      <button class="hm-tile is-local" data-act="local">
        <img class="hm-art" src="${IMG}brand/blobs-vs.png" alt="">
        <b class="hm-name">本地对战</b>
        <span class="hm-desc">同一台手机 · 两人轮流下</span>
        <span class="hm-free">免费 · 不用联网匹配</span>
      </button>
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
      ${k === 'vip' ? `<span class="stake-lock">${UI.ic('crown', 12)} 超级会员专属 · 奖池×${st.potX}</span>` : `<span class="stake-on"><i class="live-dot"></i>${UI.fmt(st.online)}${st.vip ? ` · 奖池×${st.potX}` : ''}</span>`}
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
      items: { coins: 1500 },
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

  /* ================= V7 纯新用户还没有好友：和好友玩 → 引导先玩一局、加好友或邀请朋友 ================= */
  function noFriends() {
    const c = UI.sheet({
      title: '还没有好友',
      sub: '先玩游戏，再交朋友：对局中点对手头像、结算页点“加好友”都能加',
      html: `<div class="nf-ops">
        <button class="nf-op is-main" data-act="play"><span class="nf-op-ic">${UI.ic('play', 18)}</span><span class="row-main"><b>快速开始一局</b><span>和真人对战，打完就能加对手为好友</span></span>${UI.ic('right', 16)}</button>
        <button class="nf-op" data-act="add"><span class="nf-op-ic">${UI.ic('userPlus', 18)}</span><span class="row-main"><b>添加好友</b><span>按昵称或 ID 搜索，或从“可能认识的人”里加</span></span>${UI.ic('right', 16)}</button>
        <button class="nf-op" data-act="invite"><span class="nf-op-ic">${UI.ic('share', 18)}</span><span class="row-main"><b>邀请朋友来 Soulgame</b><span>发链接给朋友，下载后就能一起玩</span></span>${UI.ic('right', 16)}</button>
      </div>`,
      acts: {
        play: () => { c.close(); Battle.quick(pickStake().id); },
        add: () => { c.close(); App.go('addfriend'); },
        invite: () => { c.close(); UI.share({ title: '邀请朋友', text: `来 Soulgame 和我一起下四子棋！我的ID是${Store.s.user.uid}` }); },
      },
    });
  }

  /* ================= K3 好友主动发来邀请（莉莉是好友时才会发） ================= */
  function schedulePing() {
    if (Store.s.pinged || pingTimer) return;
    const tryPing = () => {
      const free = App.TABS.includes(App.top()) && !UI.hasOverlay() && !document.querySelector('.coach');
      if (!free || !Store.isFriend('lily')) { pingTimer = setTimeout(tryPing, 4000); return; }
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
        await UI.coach(el.querySelector('.lobby-sign'), '每天签到、做任务，免费领金币，第7天有大奖！', { key: 'sign' });
      }
      schedulePing();
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
      quick: (el) => Battle.quick(el.dataset.id),
      local: () => Battle.local(),
      stakes: () => stakeSheet(),
      howto: () => Battle.howto(D.GAME, { manual: true }),
      friends: async () => {
        if (!Store.s.friends.length) { noFriends(); return; }
        const uid = await UI.pickFriend({ title: '邀请好友下四子棋', sub: '选好友后再选入场金币，有免费档', onlineOnly: true });
        if (uid) Rooms.withFriend(uid);
      },
    },
  });
})();
