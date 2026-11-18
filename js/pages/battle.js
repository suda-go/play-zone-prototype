/**
 * 对局链路：四子棋引擎、开局入口（金币分场）、B4 玩法引导、E 匹配与对局（含局内语音、V5 点对手头像加好友）、F 结算（含加好友 / 再战TA）
 */

/* ================= 四子棋引擎（棋盘 6 行 × 7 列，0 空 1 我 2 对方） ================= */
window.C4 = (() => {
  'use strict';

  const R = 6;
  const C = 7;
  const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
  const empty = () => Array.from({ length: R }, () => Array(C).fill(0));
  const copy = (b) => b.map((r) => [...r]);
  const valid = (b) => [...Array(C).keys()].filter((c) => !b[0][c]);
  const full = (b) => valid(b).length === 0;

  function drop(b, c, who) {
    for (let r = R - 1; r >= 0; r -= 1) {
      if (!b[r][c]) { b[r][c] = who; return r; }
    }
    return -1;
  }
  /** 返回连成四子的格子 [[r,c]...]，没有则 null */
  function wins(b, who) {
    for (let r = 0; r < R; r += 1) {
      for (let c = 0; c < C; c += 1) {
        if (b[r][c] !== who) continue;
        for (const [dr, dc] of DIRS) {
          const cells = [[r, c]];
          for (let k = 1; k < 4; k += 1) {
            const rr = r + dr * k;
            const cc = c + dc * k;
            if (rr < 0 || rr >= R || cc < 0 || cc >= C || b[rr][cc] !== who) break;
            cells.push([rr, cc]);
          }
          if (cells.length === 4) return cells;
        }
      }
    }
    return null;
  }
  /** who 下一步能直接赢的列 */
  const winningCols = (b, who) => valid(b).filter((c) => { const t = copy(b); drop(t, c, who); return !!wins(t, who); });

  /** 机器人：能赢就赢、该堵就堵；其余时候避免送对方一步赢，偏好中间列。skill 越低越随意 */
  function bot(b, me, opp, skill = 0.82) {
    const v = valid(b);
    if (!v.length) return -1;
    const w = winningCols(b, me);
    if (w.length) return w[0];
    const block = winningCols(b, opp);
    if (block.length) return block[0];
    let safe = v.filter((c) => { const t = copy(b); drop(t, c, me); return winningCols(t, opp).length === 0; });
    if (!safe.length || Math.random() > skill) safe = v;
    const weight = [1, 2, 3, 5, 3, 2, 1];
    const total = safe.reduce((a, c) => a + weight[c], 0);
    let x = Math.random() * total;
    for (const c of safe) { x -= weight[c]; if (x <= 0) return c; }
    return safe[safe.length - 1];
  }

  /** 棋盘：圆孔面板盖在棋子层上面，棋子下落时从面板后面经过 */
  function html(b, { cls = '', cols = false } = {}) {
    let discs = '';
    for (let r = 0; r < R; r += 1) {
      for (let c = 0; c < C; c += 1) {
        discs += `<i class="c4-cell" data-r="${r}" data-c="${c}">${b[r][c] ? `<b class="disc p${b[r][c]}"></b>` : ''}</i>`;
      }
    }
    const hit = cols ? `<div class="c4-hit">${[...Array(C).keys()].map((c) => `<button class="c4-col" data-act="col" data-c="${c}" aria-label="第${c + 1}列"></button>`).join('')}</div>` : '';
    return `<div class="c4 ${cls}"><div class="c4-box"><div class="c4-in"><div class="c4-discs">${discs}</div><div class="c4-face"></div><div class="c4-hl"></div></div></div>${hit}</div>`;
  }
  /** 在界面上落一颗子，带下落和回弹 */
  function paint(root, r, c, who) {
    const cell = root.querySelector(`.c4-cell[data-r="${r}"][data-c="${c}"]`);
    if (!cell) return;
    cell.innerHTML = `<b class="disc p${who}"></b>`;
    const h = cell.offsetHeight || 40;
    const dist = (r + 1) * h + 8;
    cell.firstChild.animate([
      { transform: `translateY(${-dist}px)`, easing: 'cubic-bezier(.55,0,1,.45)' },
      { transform: 'translateY(0)', offset: 0.72, easing: 'ease-out' },
      { transform: `translateY(${-h * 0.16}px)`, offset: 0.86, easing: 'ease-in' },
      { transform: 'translateY(0)' },
    ], { duration: 300 + r * 55 });
  }
  function highlight(root, cells) {
    const hl = root.querySelector('.c4-hl');
    hl.innerHTML = cells.map(([r, c]) => `<i style="--r:${r};--c:${c}"></i>`).join('');
    cells.forEach(([r, c]) => root.querySelector(`.c4-cell[data-r="${r}"][data-c="${c}"] .disc`)?.classList.add('is-win'));
  }

  return { R, C, empty, copy, valid, full, drop, wins, winningCols, bot, html, paint, highlight };
})();

/* ================= 开局入口与玩法引导 ================= */
(() => {
  'use strict';

  const IMG = D.IMG;
  // V7 本地对战：同一台手机上的第二位玩家（红方）
  D.people.local2 = { id: 'local2', name: '好友', lv: 1, avatar: `${IMG}avatars/p2.svg`, local: true, online: true, frame: null, bg: 'aurora', status: '' };
  D.people.bot = { id: 'bot', name: '诺娃', lv: 5, avatar: `${IMG}brand/blob-face.png`, ai: true, online: true, frame: null, bg: 'aurora', fav: ['c4'], status: 'AI' };

  /** B4 玩法引导：15 秒图解，3 步各 5 秒，可跳过。onOpen 拿到浮层（对局里打开时，对局结束会把它关掉） */
  function howto(gameId, { manual = false, onOpen } = {}) {
    return new Promise((resolve) => {
      const g = D.game[gameId];
      const steps = gameId === 'c4' ? [
        { t: '点击一列', d: '棋子会落到这一列最下面的空位。', art: 'drop' },
        { t: '四子连珠', d: '横、竖、斜连成4颗同色棋子就赢了。', art: 'line' },
        { t: '堵住对手', d: '及时拦截对手的连线，别让对方先连成四子。', art: 'block' },
      ] : [
        { t: '快速匹配', d: `优先匹配好友，其次是${g.name}中水平相近的玩家。`, art: 'cover' },
        { t: '全力取胜', d: g.desc, art: 'cover2' },
        { t: '领取奖励', d: '赢家拿走奖池金币，每一局都计入任务进度。', art: 'reward' },
      ];
      const art = (a) => {
        if (a === 'drop') return `<div class="ht-board">${C4.html([[0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0], [0, 0, 2, 0, 0, 0, 0], [0, 1, 2, 1, 0, 0, 0]], { cls: 'is-howto' })}<b class="disc p1 ht-falling"></b><span class="ht-hand">👆</span></div>`;
        if (a === 'line') return `<div class="ht-board">${C4.html([[0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 1, 0, 0], [0, 0, 0, 1, 2, 0, 0], [0, 0, 1, 2, 2, 0, 0], [0, 1, 2, 1, 2, 0, 0]], { cls: 'is-howto ht-line' })}</div>`;
        if (a === 'block') return `<div class="ht-board">${C4.html([[0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0], [0, 2, 2, 2, 0, 1, 1]], { cls: 'is-howto' })}<b class="disc p1 ht-falling is-block"></b><span class="ht-shield">${UI.ic('shield', 30)}</span></div>`;
        if (a === 'reward') return `<div class="ht-reward"><img src="${IMG}ui/trophy.png" alt=""><span>${UI.cur('coins', 30)}+300</span><span>${UI.cur('exp', 30)}+50</span></div>`;
        return `<div class="ht-cover ${a === 'cover2' ? 'is-zoom' : ''}"><img src="${g.cover || g.icon}" alt=""></div>`;
      };
      let i = 0;
      let t0 = performance.now();
      let raf = 0;
      const c = UI.open({
        type: 'full',
        cls: 'ov-howto',
        closable: false,
        onBack: () => finish(),
        onOpen,
        // 不管是自己点完、跳过，还是被对局结束关掉，都停掉动画、记为看过
        onClose: () => {
          cancelAnimationFrame(raf);
          Store.s.howto[gameId] = 1;
          Store.save();
          setTimeout(resolve, 200);
        },
        html: `<div class="ht">
          <div class="ht-top safe-top"><div class="ht-prog">${steps.map(() => '<i><b></b></i>').join('')}</div>
            <button class="ht-skip" data-act="skip">跳过</button></div>
          <div class="ht-head"><img src="${g.icon}" alt=""><b>${g.name}玩法说明</b></div>
          <div class="ht-stage"></div>
          <div class="ht-txt"><span class="ht-step"></span><h2></h2><p></p></div>
          <div class="ht-foot"><button class="btn btn-white btn-lg" data-act="next">下一步</button></div>
        </div>`,
        acts: { skip: () => finish(), next: () => { if (i >= steps.length - 1) finish(); else show(i + 1); } },
      });
      function show(n) {
        i = n;
        t0 = performance.now();
        const s = steps[n];
        c.$('.ht-stage').innerHTML = art(s.art);
        c.$('.ht-step').textContent = `第${n + 1}步，共${steps.length}步`;
        c.$('.ht-txt h2').textContent = s.t;
        c.$('.ht-txt p').textContent = s.d;
        c.$('[data-act="next"]').textContent = n === steps.length - 1 ? (manual ? '知道了' : '知道了，开玩！') : '下一步';
        c.$('.ht-txt').animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'ease-out' });
      }
      function tick(now) {
        const p = Math.min(1, (now - t0) / 5000);
        c.panel.querySelectorAll('.ht-prog i').forEach((bar, k) => { bar.firstChild.style.width = `${k < i ? 100 : k === i ? p * 100 : 0}%`; });
        if (p >= 1) {
          if (i < steps.length - 1) show(i + 1);
          else { finish(); return; }
        }
        raf = requestAnimationFrame(tick);
      }
      function finish() { c.close(); }
      show(0);
      raf = requestAnimationFrame(tick);
    });
  }

  /* ---------- 金币分场（参考 Yalla Ludo）：入场扣底注，赢家拿走奖池，平局退还 ---------- */
  const stakeOf = (id) => D.stake[id] || D.stake[Store.s.stake] || D.stakes[0];
  const pot = (st, double) => st.bet * (st.potX || 2) * (double ? 2 : 1);
  /** 场次是否可进：返回 'vip' | 'lock' | 'poor' | 'ok' */
  function canEnter(st) {
    if (st.vip && Store.vipTier() < st.vip) return 'vip';
    if (Store.s.coins < st.bet) return 'poor';
    return 'ok';
  }
  /**
   * 快速开始用的场次：上次的场次能进就用它；进不了（金币不够、会员过期）就换成底注不超过它、能进的最高一档；
   * 一档都进不了就用已解锁的最低一档（新手场），点开始时由 quick 弹金币不足，差额最小
   */
  function pickStake() {
    const last = stakeOf(Store.s.stake);
    if (canEnter(last) === 'ok') return last;
    const normal = D.stakes.filter((x) => !x.vip);
    const ok = normal.filter((x) => canEnter(x) === 'ok');
    const lower = ok.filter((x) => x.bet <= last.bet);
    return lower[lower.length - 1] || ok[0] || normal[0] || last;
  }
  function checkEnter(st) {
    const k = canEnter(st);
    if (k === 'vip') { UI.toast(`${st.name}仅限超级会员`); Vip.open(st.vip); return false; }
    if (k === 'lock') { UI.toast(`${st.name}需要Lv${st.lv}解锁`); return false; }
    if (k === 'poor') { Shop.lack({ need: st.bet, stake: st.id }); return false; }
    return true;
  }

  /** 有一局缩小在悬浮窗里（或已结束待看结算）时，不能再开新局 */
  function busy() {
    if (!Battle.active || !Battle.active()) return false;
    UI.toast('你有一局正在进行，先下完这局');
    Battle.restore();
    return true;
  }

  /** 快速匹配：检查场次能不能进（会员场、金币）→ 扣底注 → 匹配页。stakeId 不传就按场次自动选择（同首页“开始游戏”，例如消息页的“快速开始一局”） */
  function quick(stakeId, opt = {}) {
    if (busy()) return;
    const st = stakeId ? stakeOf(stakeId) : pickStake();
    if (!checkEnter(st)) return;
    Store.s.stake = st.id;
    Store.save();
    const start = () => {
      if (!checkEnter(st)) return;
      Store.add('coins', -st.bet, `${st.name} · 底注`);
      const p = { game: D.GAME, mode: 'quick', stake: st.id, double: Store.s.doubleNext ? 1 : 0 };
      if (opt.replace) App.replace('match', p, { anim: 'fade' }); else App.go('match', p, { anim: 'up' });
    };
    start(); // V7：不再先放15秒玩法说明，让新用户马上开局（首页“玩法”、对局里的“?”随时能看）
  }
  /** A 再战TA：和同一个对手按同一场次再来一局，一方同意后直接开局。byMe：是自己接受了对手的邀请（开场提示不说“对手接受了再战”） */
  function rematch(opp, stakeId, { byMe = false } = {}) {
    const st = stakeOf(stakeId);
    if (!checkEnter(st)) return false;
    Store.add('coins', -st.bet, `${st.name} · 底注（再战）`);
    App.replace('game', { game: D.GAME, mode: 'quick', stake: st.id, opp, rematch: byMe ? 2 : 1, first: Math.random() < 0.5 ? 1 : 2 });
    return true;
  }
  /** vs AI 免费练习：不扣金币、不计段位 */
  function practice(_, opt = {}) {
    if (busy()) return;
    const p = { game: D.GAME, mode: 'ai', opp: 'bot', first: Math.random() < 0.6 ? 1 : 2 };
    const start = () => (opt.replace ? App.replace('game', p) : App.go('game', p, { anim: 'up' }));
    start();
  }
  /** V7 本地对战：同一台手机两人轮流下，不扣金币、不计战绩。first 可指定先手（再来一局时让输的一方先下） */
  function local(opt = {}) {
    if (busy()) return;
    const p = { game: D.GAME, mode: 'local', opp: 'local2', first: opt.first || (Math.random() < 0.5 ? 1 : 2) };
    if (opt.replace) App.replace('game', p); else App.go('game', p, { anim: 'up' });
  }
  /** 房间开局（V6）：房主设了入场金币就在这里扣底注；赢家拿走奖池（底注×2），平局退还，不计段位 */
  function fromRoom(room, opp) {
    if (busy()) return;
    const bet = room.bet || 0;
    if (bet && !Store.spend('coins', bet, '好友房 · 底注')) { Shop.lack({ need: bet, where: '好友房' }); return; }
    App.go('game', { game: room.game, mode: 'room', room: room.id, opp, bet, first: Math.random() < 0.5 ? 1 : 2 }, { anim: 'fade' });
  }

  const winRate = (id = D.GAME) => {
    const gs = Store.s.gstats[id];
    return gs && gs.g ? `${Math.round((gs.w / gs.g) * 100)}%` : '—';
  };

  window.Battle = Object.assign(window.Battle || {}, { quick, rematch, practice, local, fromRoom, howto, stakeOf, pot, canEnter, pickStake, winRate });
})();

/* ================= E1–E4 匹配 ================= */
(() => {
  'use strict';

  const IMG = D.IMG;
  let M = null;

  function stop() {
    if (!M) return;
    clearInterval(M.tick);
    M.timers.forEach(clearTimeout);
    M = null;
  }
  function pickOpp() {
    const pool = D.matchPool.filter((id) => !Store.isFriend(id));
    return UI.pick(pool.length ? pool : D.matchPool);
  }

  function found(opp, how) {
    if (!M || M.found) return;
    // 确认取消期间暂停“匹配成功”，避免弹窗还开着就跳进对局。
    if (M.paused) { M.pendingFound = { opp, how }; return; }
    M.found = true;
    clearInterval(M.tick);
    M.timers.forEach(clearTimeout);
    M.timers = [];
    const el = M.el;
    const P = D.people[opp];
    el.querySelector('.mt-title').innerHTML = how === 'boost' ? '加速成功！已匹配' : '匹配成功！';
    el.querySelector('.mt-fast').hidden = true;
    el.querySelector('.mt-tip').textContent = P.ai ? '极速匹配：对手是AI' : `${P.name} · 水平相近`;
    el.querySelector('.mt-opp').innerHTML = `${UI.av(opp, 92)}<b>${P.name}${P.ai ? ' <i class="ai-tag">AI</i>' : ''}</b><span>${P.ai ? '极速匹配' : `胜率${P.win}%`}</span>`;
    el.classList.add('is-found');
    // 超级会员入场特效：彩色光环 + 登场横幅
    if (Store.perk('entryFx')) {
      el.classList.add('is-vipfx');
      const fx = document.createElement('div');
      fx.className = 'mt-vipfx';
      fx.innerHTML = `<i></i><b>${UI.vipTag(2)} ${UI.esc(Store.s.user.name)} 闪亮登场</b>`;
      el.appendChild(fx);
      setTimeout(() => fx.remove(), 2600);
    }
    Sfx.play('reward');
    const p = M.p;
    M.timers.push(setTimeout(() => el.classList.add('is-loading'), 900));
    M.timers.push(setTimeout(() => {
      stop();
      // 先手双方各 50%（正式产品由服务端在开局时随机决定）
      App.replace('game', { game: p.game, mode: P.ai ? 'fast' : 'quick', stake: p.stake, opp, double: p.double, first: Math.random() < 0.5 ? 1 : 2 });
    }, 2000));
  }

  async function cancel() {
    if (!M) return;
    if (M.found) { UI.toast('匹配成功！游戏加载中…'); return; }
    const current = M;
    current.paused = true;
    const bet = Battle.stakeOf(current.p.stake).bet;
    const ok = await UI.confirm({ title: '取消匹配？', text: `底注<b>${UI.fmt(bet)}金币</b>将全额退还。`, ok: '取消匹配', cancel: '继续等待' });
    if (!M || M !== current) return;
    M.paused = false;
    if (!ok) {
      const pending = M.pendingFound;
      M.pendingFound = null;
      if (pending) found(pending.opp, pending.how);
      return;
    }
    stop();
    Store.add('coins', bet, '取消匹配 · 退还底注');
    App.pop();
    UI.toast(`已取消匹配 · 退还${UI.fmt(bet)}金币`);
  }


  App.page('match', {
    render(el, p) {
      const g = D.game[p.game] || D.game[D.GAME];
      const st = Battle.stakeOf(p.stake);
      // 状态类加在页面节点上，重写内容不会清掉：不清的话第二次匹配起一进来就显示“加载中”
      el.classList.remove('is-found', 'is-loading', 'is-vipfx', 'is-boost');
      el.innerHTML = `
        <div class="mt-sky"><img src="${IMG}fx/galaxy.jpg" alt=""><i class="mt-glow g1"></i><i class="mt-glow g2"></i></div>
        <header class="mt-top safe-top"><button class="icon-btn mt-x" data-act="cancel" aria-label="取消匹配">${UI.ic('x', 26)}</button></header>
        <div class="mt-game">
          <span class="mt-icon"><img src="${g.icon}" alt=""></span>
          <b>${g.name}</b>
          <p class="mt-stake">${st.name} · 底注${UI.cur('coins', 18)}<em>${UI.fmt(st.bet)}</em> · 奖池<em>${UI.fmt(Battle.pot(st, p.double))}</em></p>
          ${p.double ? `<span class="mt-double">${UI.ic('zap', 13)} 本局奖池翻倍</span>` : ''}
        </div>
        <h2 class="mt-title">匹配中<i class="mt-dots"><b>.</b><b>.</b><b>.</b></i></h2>
        <div class="mt-wait"><span class="mt-time">00:00</span><span class="mt-tip">正在为你寻找水平相近的对手</span></div>
        <div class="mt-fast" hidden>
          <button class="btn btn-glass btn-md" data-act="fast">${UI.ic('bot', 17)} 极速匹配 · 人机</button>
        </div>
        <div class="mt-arena">
          <div class="mt-half is-blue"><img class="mt-lines" src="${IMG}fx/speedlines.png" alt=""><img class="mt-tone" src="${IMG}fx/halftone.png" alt=""></div>
          <div class="mt-half is-red"><img class="mt-lines" src="${IMG}fx/speedlines.png" alt=""><img class="mt-tone" src="${IMG}fx/halftone.png" alt=""></div>
          <i class="mt-split"></i>
          <img class="mt-blobs" src="${IMG}brand/blobs-vs.png" alt="">
          <div class="mt-p mt-me">${UI.av('me', 92)}<b>${UI.esc(Store.s.user.name)}</b><span>${Battle.winRate() === '—' ? '新玩家' : `胜率${Battle.winRate()}`}</span></div>
          <div class="mt-p mt-opp"><span class="mt-search"><i></i><i></i><i></i></span><b>搜索中</b><span>&nbsp;</span></div>
          <div class="mt-vs"><b class="v">V</b><b class="s">S</b></div>
          <img class="mt-rocket" src="${IMG}ui/rocket.png" alt="">
          <div class="mt-load"><span>${g.name}加载中…</span><div class="bar"><i></i></div></div>
        </div>`;
    },
    shown(el, p) {
      stop();
      M = { p, el, t0: Date.now(), found: false, paused: false, pendingFound: null, timers: [], fast: false };
      Sfx.play('match');
      M.tick = setInterval(() => {
        if (!M) return;
        const sec = Math.floor((Date.now() - M.t0) / 1000);
        el.querySelector('.mt-time').textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
        if (sec >= 5 && !M.fast) {
          M.fast = true;
          el.querySelector('.mt-fast').hidden = false;
          el.querySelector('.mt-tip').textContent = '等太久？试试极速匹配';
        }
      }, 250);
      M.timers.push(setTimeout(() => found(pickOpp()), Store.s.vip ? 1800 : 3500)); // V7：缩短等待，会员更快
    },
    leave: () => stop(),
    back() { cancel(); return false; },
    act: {
      cancel: () => cancel(),
      fast: () => found('bot', 'fast'),
    },
  });
})();

/* ================= E5–E7 对局：四子棋可玩，其他游戏是占位画面 ================= */
(() => {
  'use strict';

  const IMG = D.IMG;
  const RING = 2 * Math.PI * 32;
  let G = null;

  const name = (uid) => (uid === 'me' ? '你' : D.people[uid].name);
  const board = () => G.el.querySelector('.c4');
  const later = (fn, ms) => { if (G) G.timers.push(setTimeout(fn, ms)); };
  function clearAll() {
    if (!G) return;
    clearInterval(G.tick);
    G.timers.forEach(clearTimeout);
    G.timers = [];
  }
  // 对局里打开的浮层（认输确认、开麦说明、对手资料、举报、玩法说明）：计时不因它们暂停，
  // 对局结束时一起关掉再进结算页（例如认输弹窗开着时第 2 次超时）
  const own = (c) => { if (G) G.ovs.push(c); return c; };
  function closeOwn() { if (G) G.ovs.splice(0).forEach((c) => c.close()); }

  // V5：真人对手的头像可以点，看资料、直接加好友；还不是好友时头像右下角有个“+”
  const canAdd = (uid) => !Store.isFriend(uid) && !Store.s.sent.includes(uid);
  const player = (uid, who) => {
    const p = UI.person(uid);
    const tap = who === 2 && !p.ai && !p.local;
    const tag = tap ? 'button' : 'span';
    return `<div class="gm-pl p${who}">
      <${tag} class="gm-av${tap ? ' is-tap' : ''}"${tap ? ' data-act="opp" aria-label="查看对手资料"' : ''}><svg class="gm-ring" viewBox="0 0 70 70"><circle cx="35" cy="35" r="32"/></svg>${UI.av(uid, 54)}<span class="gm-pop"></span><i class="gm-voice" aria-hidden="true"><b></b><b></b><b></b></i>${tap && canAdd(uid) ? '<i class="gm-add" aria-hidden="true">+</i>' : ''}</${tag}>
      <b>${uid === 'me' ? '你' : UI.esc(p.name)}${p.ai ? ' <i class="ai-tag">AI</i>' : ''}</b>
      <span class="gm-chip"><i class="disc p${who}"></i>${who === 1 ? '蓝方' : '红方'}</span>
    </div>`;
  };

  /* ---------- 回合与计时 ---------- */
  function ring(who, secs) {
    G.el.querySelectorAll('.gm-ring circle').forEach((c) => { c.style.transition = 'none'; c.style.strokeDashoffset = RING; });
    if (!who) return;
    const c = G.el.querySelector(`.gm-pl.p${who} .gm-ring circle`);
    const f = (15 - secs) / 15;
    c.style.strokeDashoffset = RING * f;
    void c.getBoundingClientRect();
    c.style.transition = `stroke-dashoffset ${secs}s linear`;
    c.style.strokeDashoffset = RING;
  }
  function setClock(v) {
    const el = G.el.querySelector('.gm-clock');
    el.textContent = v;
    el.classList.toggle('is-low', G.turn === 1 && v <= 5);
  }
  function startTurn(who) {
    if (!G || G.over) return;
    G.turn = who;
    G.left = 15;
    const el = G.el;
    el.classList.toggle('is-myturn', who === 1);
    el.classList.toggle('is-oppturn', who === 2);
    el.querySelectorAll('.gm-pl').forEach((x) => x.classList.toggle('is-turn', x.classList.contains(`p${who}`)));
    if (G.p.mode === 'local') {
      el.querySelector('.gm-turn').innerHTML = who === 1 ? `<b>蓝方落子</b> · ${UI.esc(Store.s.user.name)}` : '<b>红方落子</b> · 好友';
      ring(0);
      clearInterval(G.tick);
      return;
    }
    el.querySelector('.gm-turn').innerHTML = who === 1 ? '<b>轮到你了</b> · 点击一列落子' : `<b>${name(G.opp)}</b>思考中…`;
    if (who === 1) closePanel();
    setClock(15);
    ring(who, 15);
    clearInterval(G.tick);
    G.tick = setInterval(() => {
      if (!G) return;
      G.left -= 1;
      setClock(Math.max(0, G.left));
      if (who === 1 && G.left <= 5 && G.left > 0) Sfx.play('tick');
      if (G.left <= 0) { clearInterval(G.tick); if (who === 1) timeout(); }
    }, 1000);
    if (who === 2) later(botMove, 800 + Math.random() * 1300);
  }
  /** 超时：系统代落一子；连续 2 次超时判负（防挂机，缩小到悬浮窗时同样计算） */
  function timeout() {
    if (!G || G.over || G.turn !== 1) return;
    G.timeouts = (G.timeouts || 0) + 1;
    if (G.timeouts >= 2) {
      G.over = true;
      UI.toast('连续2次超时，本局判负');
      end('lose', { forfeit: true, timeout: true });
      return;
    }
    UI.toast(G.min ? '时间到！已帮你随机落子，再超时一次就判负' : '时间到！已帮你随机落子');
    myMove(UI.pick(C4.valid(G.board)));
  }

  function flash(text, cls = '') {
    const f = document.createElement('div');
    f.className = `gm-flash ${cls}`;
    f.innerHTML = text;
    G.el.querySelector('.gm-stage').appendChild(f);
    setTimeout(() => f.remove(), 1300);
  }

  function myMove(col) {
    if (!G || G.over) return;
    if (G.turn !== 1) { UI.toast(`请等${name(G.opp)}落子`); return; }
    const threats = C4.winningCols(G.board, 2);
    const row = C4.drop(G.board, col, 1);
    if (row < 0) { UI.toast('这一列满了'); Sfx.play('error'); return; }
    G.turn = 0;
    G.moves += 1;
    clearInterval(G.tick);
    C4.paint(board(), row, col, 1);
    Sfx.play('drop');
    G.el.querySelector('.gm-moves').textContent = G.moves;
    if (threats.includes(col)) {
      G.blocks += 1;
      G.el.querySelector('.gm-blocks').textContent = G.blocks;
      flash(`${UI.ic('shield', 22)} 堵住了！`, 'is-block');
      if (G.blocks === 3) Store.badge('wall');
      if (Math.random() < 0.5) later(() => emote('opp', UI.pick(['angry', 'shock', 'cry'])), 900);
    }
    settle(1);
  }
  function botMove() {
    if (!G || G.over || G.turn !== 2) return;
    const mine = C4.winningCols(G.board, 1);
    // 人机和模拟的真人对手一样强（正式产品按用户的水平分调整人机难度）
    const col = C4.bot(G.board, 2, 1, 0.85);
    const row = C4.drop(G.board, col, 2);
    G.turn = 0;
    clearInterval(G.tick);
    C4.paint(board(), row, col, 2);
    Sfx.play('drop');
    if (mine.includes(col)) {
      flash(`${name(G.opp)}堵住了你！`, 'is-opp');
      if (Math.random() < 0.6) later(() => emote('opp', UI.pick(['cool', 'laugh', 'tongue'])), 700);
    }
    settle(2);
  }
  /** V7 本地对战：哪一方落子都走这里 */
  function localMove(col) {
    if (!G || G.over || !G.turn) return;
    const who = G.turn;
    const row = C4.drop(G.board, col, who);
    if (row < 0) { UI.toast('这一列满了'); Sfx.play('error'); return; }
    G.turn = 0;
    G.moves += 1;
    C4.paint(board(), row, col, who);
    Sfx.play('drop');
    G.el.querySelector('.gm-moves').textContent = G.moves;
    settle(who);
  }
  /** V7 本地对战结束：不结算金币和战绩，弹窗问要不要再来一局（输的一方先下） */
  async function localEnd(winner) {
    if (!G) return;
    clearAll();
    Store.count('seconds', Math.max(1, Math.round((Date.now() - G.t0) / 1000)));
    G = null;
    const who = winner === 1 ? `${UI.esc(Store.s.user.name)}（蓝方）` : '好友（红方）';
    const k = await UI.dialog({
      img: winner ? `${IMG}ui/trophy.png` : `${IMG}brand/mascot.png`,
      title: winner ? `${who}赢了！` : '平局',
      text: winner ? '先连成了四子。换输的一方先下，再来一局？' : '棋盘下满了，难分高下！',
      x: false,
      buttons: [{ label: '再来一局', key: 'again', cls: 'btn-orange' }, { label: '返回首页', key: 'home', cls: 'btn-ghost' }],
    });
    if (k === 'again') Battle.local({ replace: true, first: winner === 1 ? 2 : winner === 2 ? 1 : 0 });
    else App.backTo('play');
  }
  function settle(who) {
    const line = C4.wins(G.board, who);
    const isLocal = G.p.mode === 'local';
    if (line) {
      G.over = true;
      ring(0);
      G.el.querySelector('.gm-turn').innerHTML = isLocal ? `<b>${who === 1 ? '蓝方' : '红方'}四子连珠！</b>` : who === 1 ? '<b>四子连珠！</b>' : `<b>${name(G.opp)}</b>连成了四子`;
      later(() => { C4.highlight(board(), line); Sfx.play(who === 1 ? 'win' : 'lose'); }, 420);
      later(() => (isLocal ? localEnd(who) : end(who === 1 ? 'win' : 'lose')), isLocal ? 1600 : 2000);
      return;
    }
    if (C4.full(G.board)) {
      G.over = true;
      ring(0);
      G.el.querySelector('.gm-turn').innerHTML = '<b>棋盘已满</b> · 平局';
      later(() => (isLocal ? localEnd(0) : end('draw')), 1200);
      return;
    }
    later(() => startTurn(who === 1 ? 2 : 1), 450);
  }

  /* ---------- E6 局内表情：自己回合置灰，对手回合放大高亮；以弹幕飘过 ---------- */
  function locked() { return G && G.g.playable && G.turn === 1 && !G.over; }
  function openPanel(tab) {
    if (locked()) { UI.toast('专心对局！对手回合才能发表情'); return; }
    const panel = G.el.querySelector('.gm-panel');
    panel.hidden = false;
    panel.querySelectorAll('.gm-ptab').forEach((b) => b.classList.toggle('is-active', b.dataset.p === tab));
    panel.querySelector('.gm-emojis').hidden = tab !== 'emoji';
    panel.querySelector('.gm-phrases').hidden = tab !== 'phrases';
  }
  function closePanel() {
    const panel = G && G.el.querySelector('.gm-panel');
    if (panel) panel.hidden = true;
  }
  function danmaku(uid, content, mine) {
    const layer = G.el.querySelector('.gm-dm');
    const it = document.createElement('div');
    it.className = `dm ${mine ? 'is-me' : 'is-opp'}`;
    it.innerHTML = `${UI.av(uid, 26, { frame: false })}${content}`;
    it.style.top = `${4 + Math.random() * 30}%`;
    layer.appendChild(it);
    const w = it.offsetWidth;
    it.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${-(392 + w + 30)}px)` }], { duration: 5200, easing: 'linear' }).onfinish = () => it.remove();
  }
  function pop(who, content) {
    const el = G.el.querySelector(`.gm-pl.p${who} .gm-pop`);
    el.innerHTML = content;
    el.classList.remove('is-show');
    void el.offsetWidth;
    el.classList.add('is-show');
  }
  function emote(side, type, text) {
    if (!G) return;
    const uid = side === 'me' ? 'me' : G.opp;
    const content = text ? `<span class="dm-txt">${UI.esc(text)}</span>` : UI.blob(type, 34);
    danmaku(uid, content, side === 'me');
    pop(side === 'me' ? 1 : 2, text ? `<span class="pop-txt">${UI.esc(text)}</span>` : UI.blob(type, 48));
  }
  function send(type, text) {
    if (!G) return;
    if (locked()) { UI.toast('专心对局！对手回合才能发表情'); return; }
    closePanel();
    emote('me', type, text);
    Store.count('emojis');
    Sfx.play('tap');
    if (Math.random() < 0.5) {
      later(() => {
        if (Math.random() < 0.7) emote('opp', UI.pick(D.emojis));
        else emote('opp', null, UI.pick(['GG 🤝', '哈哈', '不错嘛！', '快点啦！⏰']));
      }, 1300 + Math.random() * 1200);
    }
  }

  /* ---------- C 局内语音（演示：只做开关和说话动效，不接真实语音） ---------- */
  const oppIsAI = () => !!(G && D.people[G.opp] && D.people[G.opp].ai);
  function voiceUI() {
    if (!G) return;
    const v = Store.s.voice;
    const el = G.el;
    const mic = el.querySelector('.gm-mic');
    const spk = el.querySelector('.gm-spk');
    mic.classList.toggle('is-on', v.mic);
    mic.setAttribute('aria-pressed', v.mic);
    mic.innerHTML = UI.ic(v.mic ? 'mic' : 'micOff', 22);
    spk.classList.toggle('is-on', v.spk);
    spk.setAttribute('aria-pressed', v.spk);
    spk.innerHTML = UI.ic(v.spk ? 'volume' : 'mute', 22);
    el.querySelector('.gm-pl.p1').classList.toggle('is-mic', v.mic);
    el.querySelector('.gm-pl.p2').classList.toggle('is-muted', !v.spk && !oppIsAI());
  }
  /** 头像上的声波：who 1 我、2 对手 */
  function talk(who, ms = 1500) {
    const pl = G && G.el.querySelector(`.gm-pl.p${who}`);
    if (!pl) return;
    pl.classList.add('is-talking');
    later(() => pl.classList.remove('is-talking'), ms);
  }
  /** 真人对手隔一会儿说几句；扬声器关了就听不到 */
  function scheduleTalk() {
    if (!G || oppIsAI()) return;
    later(() => {
      if (!G || G.over) return;
      if (Store.s.voice.spk) talk(2, 1200 + Math.random() * 1400);
      scheduleTalk();
    }, 4500 + Math.random() * 5000);
  }
  async function toggleMic() {
    if (!G) return;
    const v = Store.s.voice;
    if (!v.mic && !v.asked) {
      // 开麦前先说明（计时不暂停）；点“不允许”下次再问，点过“允许”以后不再问
      const ok = await UI.confirm({ title: '允许 Soulgame 使用麦克风？', text: '开麦后，对局中可以和对手实时语音聊天。', ok: '允许', cancel: '不允许', onOpen: own });
      if (!G) return;
      if (!ok) { UI.toast('没有开麦，随时可以再打开'); return; }
      v.asked = true;
    }
    v.mic = !v.mic;
    Store.save();
    voiceUI();
    if (v.mic) {
      talk(1, 1200);
      UI.toast(oppIsAI() ? '麦克风已开启（人机对手听不到）' : '麦克风已开启，对手能听到你');
    } else UI.toast('麦克风已关闭');
  }
  function toggleSpk() {
    if (!G) return;
    const v = Store.s.voice;
    v.spk = !v.spk;
    Store.save();
    voiceUI();
    if (!v.spk) G.el.querySelector('.gm-pl.p2').classList.remove('is-talking');
    UI.toast(v.spk ? '已打开对手声音' : '已静音对手');
  }

  /* ---------- V5 对局中点对手头像：看资料、直接加好友、举报（对局照常进行，计时不暂停） ---------- */
  function oppSheet() {
    if (!G) return;
    const uid = G.opp;
    const P = D.people[uid];
    if (!P || P.ai) return;
    const played = Math.max(Store.s.history.filter((h) => h.vs === uid).length, Store.s.mateGames[uid] || 0);
    const btn = () => {
      if (Store.isFriend(uid)) return `<span class="btn is-disabled btn-lg btn-block">${UI.ic('userCheck', 18)} 已是好友</span>`;
      if (Store.s.sent.includes(uid)) return `<span class="btn is-disabled btn-lg btn-block">${UI.ic('check', 18)} 已发送好友申请</span>`;
      if (Store.s.requests.includes(uid)) return `<button class="btn btn-primary btn-lg btn-block" data-act="accept">${UI.ic('userCheck', 18)} 同意好友申请</button>`;
      return `<button class="btn btn-primary btn-lg btn-block" data-act="add">${UI.ic('userPlus', 18)} 加好友</button>`;
    };
    const done = () => {
      if (!c.closed) c.$('.op-btn').innerHTML = btn();
      if (G && G.opp === uid) G.el.querySelector('.gm-pl.p2 .gm-add')?.remove();
    };
    const c = own(UI.sheet({
      cls: 'sheet-opp',
      html: `<div class="op-hd">${UI.av(uid, 64, { on: true })}<div class="op-m"><h3>${UI.name(uid)}</h3><p>${UI.esc(P.bio || '这个人很懒，什么都没写')}</p></div>
          <button class="op-report" data-act="report">${UI.ic('flag', 14)}举报</button></div>
        <div class="op-stats"><span><b>${P.games}</b>对局</span><span><b>${P.win}%</b>胜率</span><span><b>${played}</b>和你玩过</span></div>
        <div class="op-btn">${btn()}</div>
        <p class="op-tip">${UI.ic('info', 13)} 对局还在进行，计时不会暂停</p>`,
      acts: {
        add: () => {
          Store.request(uid);
          done();
          UI.toast('好友申请已发送');
          // 演示：对方几秒后通过
          setTimeout(() => {
            if (!Store.s.sent.includes(uid)) return;
            Store.addFriend(uid);
            done();
            // 还在这一局里：轻提示，不挡住对手信息；对局已经结束：和结算页加好友一样弹通知，可以直接去聊天
            if (G && G.opp === uid && !G.over) { UI.toast(`${P.name}通过了你的好友申请`); return; }
            UI.notify({ img: P.avatar, title: `${P.name}通过了你的好友申请`, text: '你们已经是好友了，打个招呼吧！', btn: '聊天', onTap: () => App.go('dm', { id: uid }) });
            const tag = document.querySelector('.page[data-page="result"].is-active .rs-mate .rs-friend');
            if (tag) tag.outerHTML = `<span class="rs-friend is-done">${UI.ic('userCheck', 14)} 已是好友</span>`;
          }, 5000);
        },
        accept: () => {
          Store.addFriend(uid);
          done();
          UI.toast(`你和${P.name}已经是好友了`);
        },
        report: () => { c.close(); report(uid); },
      },
    }));
  }

  /* ---------- V7 举报（对手资料卡右上角）：原因四选一，可补充说明；同一局只能举报同一人一次，对局照常进行 ---------- */
  const REASONS = ['辱骂和骚扰', '不良语音', '作弊或挂机', '其他'];
  function report(uid) {
    if (!G) return;
    if (G.reported) { UI.toast('已收到举报，我们会尽快处理'); return; }
    let reason = '';
    const c = own(UI.sheet({
      title: '举报',
      cls: 'sheet-report',
      html: `<div class="rp-list">${REASONS.map((r) => `<button class="rp-opt" data-act="reason" data-r="${r}"><span>${r}</span><i class="rp-radio"></i></button>`).join('')}</div>
        <textarea class="rp-note" rows="3" maxlength="200" placeholder="补充说明（选填）"></textarea>`,
      foot: '<button class="btn btn-primary btn-lg btn-block" data-act="submit" disabled>提交</button>',
      acts: {
        reason: (el) => {
          reason = el.dataset.r;
          c.panel.querySelectorAll('.rp-opt').forEach((b) => b.classList.toggle('is-on', b === el));
          c.$('[data-act="submit"]').disabled = false;
        },
        submit: () => {
          if (!reason) return;
          // 演示：不发到服务端。正式产品附上这一局的表情、快捷语和对局记录，进入人工审核
          if (G && G.opp === uid) G.reported = true;
          c.close();
          UI.toast('已收到举报，我们会尽快处理');
        },
      },
    }));
  }

  /* ---------- E7 中途退出 ---------- */
  async function quit() {
    if (!G || G.over) return;
    const practice = G.p.mode === 'ai';
    const room = G.p.mode === 'room';
    if (G.p.mode === 'local') {
      const ok = await UI.confirm({ title: '结束本局？', text: '本地对战不计输赢，随时可以再开一局。', ok: '结束', cancel: '继续玩' });
      if (ok && G) { G.over = true; clearAll(); G = null; App.backTo('play'); }
      return;
    }
    // 弹窗开着时计时照走、对手照常落子；这期间分出了胜负，弹窗跟着对局结束关掉
    const ok = await UI.confirm({
      title: practice ? '结束练习？' : '确定认输？',
      text: practice ? '练习局结束没有惩罚。' : `认输算作失败，底注<b>${UI.fmt(room ? G.p.bet : Battle.stakeOf(G.p.stake).bet)}金币</b>不予退还。`,
      ok: practice ? '结束' : '认输', cancel: '继续玩', danger: !practice,
      onOpen: own,
    });
    if (!G || G.over || !ok) return;
    G.over = true;
    end('lose', { forfeit: true });
  }

  /* ---------- 缩小到悬浮窗：对局在后台继续（计时照走、对手照常落子），点悬浮窗回来 ---------- */
  let DONE = null; // 缩小期间结束的对局：{ params, board }，点悬浮窗看结算
  const modeLabel = (p) => { const st = Battle.stakeOf(p.stake); return { quick: st.name, fast: `${st.name} · 人机`, ai: '人机练习', room: p.bet ? `好友房 · 奖池${UI.fmt(p.bet * 2)}` : '好友房' }[p.mode] || '对局'; };
  function minimize() {
    if (!G || G.over) return;
    closePanel();
    G.min = true;
    App.backTo('play', { anim: 'pop' });
    App.whenIdle(() => UI.floater.refresh());
    UI.toast('对局已缩小到右下角，点击悬浮窗继续');
  }
  function restore() {
    if (DONE) {
      const d = DONE;
      DONE = null;
      App.go('result', d.params, { anim: 'up', queue: true });
      return;
    }
    if (G && G.min) App.go('game', { ...G.p, restore: 1 }, { anim: 'up', queue: true });
  }
  Battle.active = () => !!(DONE || (G && G.min));
  Battle.restore = restore;
  Battle.minimize = minimize;
  UI.floater.add(() => {
    if (DONE) {
      const r = DONE.params;
      return { id: 'done', uid: r.opp, board: C4.html(DONE.board, { cls: 'is-mini' }), urgent: true,
        title: r.outcome === 'win' ? '你赢了！' : r.outcome === 'draw' ? '平局' : '对局结束', sub: '点击查看结算', onTap: restore };
    }
    if (!G || !G.min) return null;
    const my = G.turn === 1 && !G.over;
    return {
      id: 'game', uid: G.opp, board: C4.html(G.board, { cls: 'is-mini' }), urgent: my,
      title: G.over ? '对局结束' : my ? `轮到你 · ${Math.max(0, G.left)}秒` : G.turn === 2 ? `${name(G.opp)}思考中…` : '对局进行中',
      sub: `${modeLabel(G.p)} · 点击回到对局`,
      onTap: restore,
    };
  }, 10);

  /* ---------- 结束：先更新数据，结算页负责动画和飞入 ---------- */
  function end(outcome, opt = {}) {
    if (!G) return;
    clearAll();
    closeOwn();
    const { p, g, opp, blocks, moves } = G;
    const sec = Math.max(1, Math.round((Date.now() - G.t0) / 1000));
    const min = !!G.min;
    const board = C4.copy(G.board);
    G = null;
    const practice = p.mode === 'ai';
    const room = p.mode === 'room'; // 好友房：房主设的入场金币（V7 没有免费档）
    const roomBet = room ? (p.bet || 0) : 0;
    const staked = !practice && !room;
    const st = Battle.stakeOf(p.stake);
    let coins = 0; // 本局到账金币（赢：奖池；平：退还底注）
    Store.count('seconds', sec);
    if (!practice) {
      if (staked) {
        // V7 首发版不做等级和段位：只结算金币
        if (outcome === 'win') coins = Battle.pot(st, p.double);
        else if (outcome === 'draw') coins = st.bet;
        if (p.double) Store.s.doubleNext = false;
      } else if (roomBet) {
        // 有入场金币的好友房：赢家拿走奖池，平局退还底注
        if (outcome === 'win') coins = roomBet * 2;
        else if (outcome === 'draw') coins = roomBet;
      }
      Store.count('games');
      if (outcome === 'win') Store.count('wins');
    }
    const net = staked ? coins - st.bet : roomBet ? coins - roomBet : 0;
    Store.addMatch({ game: g.id, vs: opp, win: outcome === 'win', draw: outcome === 'draw', coins: net, stake: staked ? st.id : '', bet: roomBet, practice, mode: p.mode });
    if (!D.people[opp].ai) Store.addRecent(opp);
    if (coins) {
      if (!min) UI.hold('coins');
      const where = staked ? st.name : '好友房';
      Store.add('coins', coins, outcome === 'win' ? `${where} · 赢得奖池${p.double ? '（翻倍）' : ''}` : `${where} · 平局退还底注`);
    }
    const params = {
      game: g.id, mode: p.mode, room: p.room || '', opp, outcome, stake: st.id,
      forfeit: opt.forfeit ? 1 : 0, timeout: opt.timeout ? 1 : 0, coins, net,
      blocks, moves, sec, double: p.double || 0, bet: roomBet,
    };
    if (min) {
      // 不在对局页：结果先放进悬浮窗，回来再看结算（金币已经到账）
      DONE = { params, board };
      UI.floater.refresh();
      UI.notify({ img: D.people[opp].avatar, title: outcome === 'win' ? '你赢下了刚才那局！' : opt.timeout ? '连续超时，刚才那局判负' : outcome === 'draw' ? '刚才那局打平了' : '刚才那局输了', text: '点击查看结算', btn: '查看', onTap: restore });
      return;
    }
    App.replace('result', params);
  }

  App.page('game', {
    render(el, p) {
      // 从悬浮窗回来：棋盘和计时都在，保留现有画面
      if (p.restore && G && G.el === el) return;
      const g = D.game[p.game] || D.game[D.GAME];
      const opp = p.opp || 'bot';
      const st = Battle.stakeOf(p.stake);
      const mode = { quick: `${st.name} · 奖池${UI.fmt(Battle.pot(st, p.double))}`, fast: `${st.name} · 人机`, ai: '人机练习', local: '本地对战 · 同一台手机', room: p.bet ? `好友房 · 奖池${UI.fmt(p.bet * 2)}` : '好友房' }[p.mode] || '对局';
      const v = Store.s.voice;
      el.classList.toggle('is-local', p.mode === 'local');
      el.classList.remove('is-myturn', 'is-oppturn');
      el.innerHTML = `
        <div class="gm-bg"><img class="gm-tone" src="${IMG}fx/halftone.png" alt=""></div>
        <header class="gm-top safe-top">
          <div class="gm-title"><b>${g.name}</b><span>${mode}</span></div>
          <button class="icon-btn gm-quit" data-act="quit" aria-label="认输">${UI.ic('flag', 20)}</button>
          <button class="icon-btn" data-act="sound" aria-label="音效">${UI.ic(Store.s.settings.sound ? 'volume' : 'mute', 21)}</button>
          <button class="icon-btn" data-act="help" aria-label="玩法说明">${UI.ic('help', 21)}</button>
        </header>
        <div class="gm-players">
          ${player('me', 1)}
          <div class="gm-mid"><span class="gm-clock">15</span><span class="gm-clock-l">秒</span></div>
          ${player(opp, 2)}
        </div>
        <div class="gm-stage">
          <div class="gm-turn">准备开始…</div>
          ${C4.html(C4.empty(), { cls: 'is-game', cols: true })}
          <div class="gm-stats"><span>${UI.ic('shield', 14)} 拦截 <b class="gm-blocks">0</b></span><span>${UI.ic('gamepad', 14)} 步数 <b class="gm-moves">0</b></span>${p.mode === 'quick' || p.mode === 'fast' ? `` : ''}</div>
        </div>
        <div class="gm-dm"></div>
        <div class="gm-bar">
          <button class="gm-btn gm-mic ${v.mic ? 'is-on' : ''}" data-act="mic" aria-label="麦克风" aria-pressed="${v.mic}">${UI.ic(v.mic ? 'mic' : 'micOff', 22)}</button>
          <button class="gm-btn gm-spk ${v.spk ? 'is-on' : ''}" data-act="spk" aria-label="听对方说话" aria-pressed="${v.spk}">${UI.ic(v.spk ? 'volume' : 'mute', 22)}</button>
          <i class="gm-bar-gap"></i>
          <button class="gm-btn" data-act="panel" data-p="phrases" aria-label="快捷语">${UI.ic('msgText', 22)}</button>
          <button class="gm-btn gm-emo" data-act="panel" data-p="emoji" aria-label="表情">${UI.ic('smile', 24)}</button>
        </div>
        <div class="gm-panel" hidden>
          <div class="gm-panel-hd">
            <button class="gm-ptab is-active" data-act="ptab" data-p="emoji">表情</button>
            <button class="gm-ptab" data-act="ptab" data-p="phrases">快捷语</button>
            <button class="gm-panel-x" data-act="closePanel" aria-label="关闭">${UI.ic('x', 18)}</button>
          </div>
          <div class="gm-emojis">${D.emojis.map((e) => `<button class="gm-e" data-act="emo" data-e="${e}">${UI.blob(e, 58)}</button>`).join('')}</div>
          <div class="gm-phrases" hidden>${D.phrases.map((t) => `<button class="gm-ph" data-act="say" data-t="${UI.esc(t)}">${UI.esc(t)}</button>`).join('')}</div>
        </div>`;
    },
    shown(el, p) {
      if (p.restore && G && G.el === el) {
        G.min = false;
        voiceUI();
        if (G.turn) ring(G.turn, G.left);
        UI.floater.refresh();
        return;
      }
      clearAll();
      G = { p, el, g: D.game[p.game] || D.game[D.GAME], opp: p.opp || 'bot', board: C4.empty(), turn: 0, left: 15, blocks: 0, moves: 0, t0: Date.now(), timers: [], ovs: [], over: false };
      const first = p.first || 1;
      const intro = document.createElement('div');
      intro.className = 'gm-intro';
      intro.innerHTML = p.mode === 'local'
        ? `${UI.av(first === 1 ? 'me' : G.opp, 64)}<b>${first === 1 ? '蓝方先手' : '红方先手'}</b><span>两人轮流在这台手机上落子</span>`
        : `${UI.av(first === 1 ? 'me' : G.opp, 64)}<b>${first === 1 ? '你先手！' : `${name(G.opp)}先手`}</b><span>${p.rematch === 1 ? `${name(G.opp)}接受了再战` : '点一列落子，横竖斜连成4子就赢'}</span>`;
      el.querySelector('.gm-stage').appendChild(intro);
      later(() => { intro.remove(); startTurn(first); }, 1500);
      voiceUI();
      if (p.mode !== 'local') {
        scheduleTalk();
        later(() => { if (G && G.turn !== 1) emote('opp', UI.pick(['happy', 'wink', 'cool'])); }, 2600);
      }
    },
    leave() { if (G && G.min) return; closeOwn(); clearAll(); G = null; },
    back() {
      const panel = G && G.el.querySelector('.gm-panel');
      if (panel && !panel.hidden) { closePanel(); return false; }
      // V7 没有悬浮窗、不能缩小对局：返回键直接问要不要认输
      quit();
      return false;
    },
    act: {
      col: (el) => { if (G && G.p.mode === 'local') { localMove(+el.dataset.c); return; } if (G) G.timeouts = 0; myMove(+el.dataset.c); },
      quit: () => quit(),
      panel: (el) => openPanel(el.dataset.p),
      ptab: (el) => openPanel(el.dataset.p),
      closePanel: () => closePanel(),
      emo: (el) => send(el.dataset.e),
      say: (el) => send(null, el.dataset.t),
      sound: (el) => {
        Store.s.settings.sound = !Store.s.settings.sound;
        Store.save();
        el.innerHTML = UI.ic(Store.s.settings.sound ? 'volume' : 'mute', 21);
        UI.toast(Store.s.settings.sound ? '音效已开启' : '音效已关闭');
      },
      help: () => { if (G) Battle.howto(G.g.id, { manual: true, onOpen: own }); }, // 计时不暂停
      mic: () => toggleMic(),
      spk: () => toggleSpk(),
      opp: () => oppSheet(),
    },
  });
})();

/* ================= F 结算 ================= */
(() => {
  'use strict';

  const IMG = D.IMG;
  let acceptTimer = 0;
  const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  function title(p) {
    if (p.outcome === 'draw') return '平局';
    if (p.mode === 'ai') return p.outcome === 'win' ? '赢得漂亮' : '再接再厉';
    if (p.outcome === 'win') return '胜利';
    return p.protect ? '惜败！' : '失败';
  }
  const hero = (p) => {
    if (p.outcome === 'win') return `<img class="rs-burst" src="${IMG}fx/burst.png" alt=""><img class="rs-podium" src="${IMG}ui/podium.png" alt=""><img class="rs-mascot" src="${IMG}brand/mascot-cheer.png" alt=""><img class="rs-trophy" src="${IMG}ui/trophy.png" alt=""><img class="rs-confetti" src="${IMG}fx/confetti.png" alt=""><img class="rs-spark s1" src="${IMG}ui/sparkle.png" alt=""><img class="rs-spark s2" src="${IMG}ui/sparkle.png" alt="">`;
    if (p.outcome === 'draw') return `<img class="rs-glove l" src="${IMG}ui/glove-blue.png" alt=""><img class="rs-mascot is-draw" src="${IMG}brand/mascot.png" alt=""><img class="rs-glove r" src="${IMG}ui/glove-red.png" alt="">`;
    return `<img class="rs-tomb" src="${IMG}ui/tomb.png" alt=""><img class="rs-mascot is-sad" src="${IMG}brand/mascot-sad.png" alt="">${p.protect ? `<span class="rs-shield">${UI.ic('shield', 34)}</span>` : ''}`;
  };

  const staked = (p) => p.mode === 'quick' || p.mode === 'fast';
  const paidRoom = (p) => p.mode === 'room' && p.bet > 0; // V6 有入场金币的好友房
  function friendBtn(uid) {
    if (Store.isFriend(uid)) return `<span class="rs-friend is-done">${UI.ic('userCheck', 15)} 已是好友</span>`;
    if (Store.s.sent.includes(uid)) return `<span class="rs-friend is-done">${UI.ic('check', 15)} 已申请</span>`;
    return `<button class="rs-friend" data-act="addFriend">${UI.ic('userPlus', 15)} 加好友</button>`;
  }
  /** A 结算后的社交位：和真人对手打完，引导加好友、再战一局 */
  function mateHtml(p) {
    const P = D.people[p.opp];
    if (!P || P.ai || p.mode === 'ai') return '';
    const friend = Store.isFriend(p.opp);
    const n = Store.s.mateGames[p.opp] || 0;
    // 平台的引导语，不替对手说话
    const line = friend ? (n ? `你们已经一起玩了${n}局` : '下次可以在“和好友玩”里约TA') : p.outcome === 'win' ? '再战一局？' : p.outcome === 'lose' ? '打得不错，加个好友？' : '难分高下，交个朋友吧';
    return `<div class="rs-mate">
      ${UI.av(p.opp, 46, { on: true })}
      <div class="rs-mate-m"><b>${UI.esc(P.name)}</b><span>${line}</span></div>
      <div class="rs-mate-btns">
        ${friendBtn(p.opp)}
        ${p.mode === 'room' ? '' : `<button class="rs-rematch" data-act="rematch">${UI.ic('swords', 15)} 再战TA</button>`}
      </div>
    </div>`;
  }
  function card(uid, p, me) {
    const win = p.outcome === 'win';
    const draw = p.outcome === 'draw';
    const winner = draw ? false : me ? win : !win;
    const P = UI.person(uid);
    const st = Battle.stakeOf(p.stake);
    const bet = paidRoom(p) ? p.bet : st.bet;
    const pot = paidRoom(p) ? p.bet * 2 : Battle.pot(st, false);
    // 金币变化：赢家 +奖池净赚，输家 -底注，平局 ±0；免费好友房、练习不显示
    const net = !staked(p) && !paidRoom(p) ? null : me ? p.net : winner ? pot - bet : draw ? 0 : -bet;
    const gain = net === null ? `<span class="rs-gain is-free">${p.mode === 'room' ? '好友局' : '练习'}</span>`
      : `<span class="rs-gain ${net < 0 ? 'is-neg' : ''}">${UI.cur('coins', 24)}<em>${net > 0 ? '+' : ''}${UI.fmt(net)}</em></span>`;
    return `<div class="rs-card ${me ? 'is-me' : 'is-opp'} ${winner ? 'is-winner' : ''}">
      ${winner ? `<img class="rs-crown" src="${IMG}ui/crown.png" alt="">` : ''}
      ${UI.av(uid, 70)}
      <b>${me ? UI.esc(Store.s.user.name) : UI.esc(P.name)}${P.ai ? ' <i class="ai-tag">AI</i>' : ''}</b>
      ${gain}
    </div>`;
  }

  /** 结算面板：好友房说明 + 本局数据（V7 首发版不做经验和段位） */
  function progress(p) {
    const stats = `<div class="rs-stats"><span>步数 <b>${p.moves}</b></span><span>拦截 <b>${p.blocks}</b></span><span>用时 <b>${mmss(p.sec)}</b></span></div>`;
    if (p.mode === 'room') {
      return `<div class="rs-panel rs-practice"><p>${UI.ic('users', 18)} 好友房 · 底注${UI.fmt(p.bet)}金币，赢家拿走奖池${UI.fmt(p.bet * 2)}。</p>${stats}</div>`;
    }
    return `<div class="rs-panel">${stats}</div>`;
  }

  function taskList() {
    const ids = ['n_first', 'd_win', 'd_play', 'l_mate', 'w_friend', 'd_emoji', 'n_time'];
    const list = ids.map((id) => Store.task(D.tasks.find((t) => t.id === id))).filter((t) => t.state !== 'done');
    list.sort((a, b) => (b.state === 'claim') - (a.state === 'claim'));
    return list.slice(0, 3);
  }
  /* ---------- V7 收到再战邀请（演示）：对手也还在结算页时发来，信息条变成邀请，10 秒内接受或拒绝 ---------- */
  let invite = null; // { p, timer, tick, left }
  const mateBox = () => document.querySelector('.page[data-page="result"] .rs-mate');
  function clearInvite() {
    if (!invite) return;
    clearTimeout(invite.timer);
    clearInterval(invite.tick);
    invite = null;
  }
  /** 演示：只有快速开始的真人对手会发；输给你的对手更想再来一局（70%），平局 50%，赢了你的 30%；结算页出现 3–4.5 秒后发来 */
  function scheduleInvite(p) {
    clearInvite();
    const P = D.people[p.opp];
    if (p.mode !== 'quick' || !P || P.ai) return;
    if (Math.random() >= (p.outcome === 'win' ? 0.7 : p.outcome === 'draw' ? 0.5 : 0.3)) return;
    invite = { p, timer: setTimeout(() => showInvite(p), 3000 + Math.random() * 1500) };
  }
  function showInvite(p) {
    const box = mateBox();
    // 已经离开结算页，或者自己已经点了“再战TA”：不再收到邀请
    if (!invite || invite.p !== p || App.top() !== 'result' || App.params('result') !== p || !box || box.querySelector('.rs-rematch.is-wait')) { clearInvite(); return; }
    const P = D.people[p.opp];
    invite.left = 10;
    box.classList.add('is-invite');
    box.querySelector('.rs-mate-m span').textContent = `${P.name}想再战一局`;
    box.querySelector('.rs-mate-btns').innerHTML = `<button class="rs-rematch" data-act="inviteYes">${UI.ic('swords', 15)} 接受<i class="rs-cd">10</i></button>
      <button class="rs-decline" data-act="inviteNo">拒绝</button>`;
    Sfx.play('msg');
    invite.tick = setInterval(() => {
      invite.left -= 1;
      const cd = box.querySelector('.rs-cd');
      if (cd) cd.textContent = invite.left;
      if (invite.left <= 0) restoreMate(p); // 10 秒没回应：邀请失效
    }, 1000);
  }
  /** 拒绝、超时、接受时金币不够：邀请结束，信息条恢复成加好友 / 再战TA */
  function restoreMate(p) {
    clearInvite();
    const box = mateBox();
    if (!box) return;
    box.outerHTML = mateHtml(p);
    const nb = mateBox();
    if (nb) UI.decorate(nb);
  }

  function tasksHtml() {
    const list = taskList();
    if (!list.length) return '';
    return `<div class="rs-tasks">
      <div class="rs-tasks-hd"><b>任务进度</b><button class="more" data-go="tasks">全部任务 ${UI.ic('right', 14)}</button></div>
      ${list.map((t) => `<div class="rs-task ${t.state === 'claim' ? 'is-claim' : ''}">
        <div class="rs-task-m"><b>${t.title}</b>${UI.bar(t.cur, t.goal, 'is-thin is-gold')}<span>${t.cur}/${t.goal}${t.unit || ''}<i>${UI.rewardInline(t.reward)}</i></span></div>
        ${t.state === 'claim' ? `<button class="btn btn-orange btn-sm" data-act="claim" data-id="${t.id}">领取</button>` : `<span class="rs-task-n">${t.cur}/${t.goal}</span>`}
      </div>`).join('')}
    </div>`;
  }


  App.page('result', {
    render(el, p) {
      const g = D.game[p.game] || D.game[D.GAME];
      const practice = p.mode === 'ai';
      const st = Battle.stakeOf(p.stake);
      const cls = p.outcome === 'win' ? 'is-win' : p.outcome === 'draw' ? 'is-draw' : 'is-lose';
      el.innerHTML = `
        <div class="rs-bg ${cls}"><img src="${IMG}fx/galaxy.jpg" alt=""><i class="rs-blue"></i><i class="rs-red"></i></div>
        <header class="rs-top safe-top">
          ${UI.chips(['coins'], { plus: false, cls: 'is-dark' })}
          <span class="rs-game"><img src="${g.icon}" alt="">${g.name}</span>
          <button class="icon-btn rs-x" data-act="lobby" aria-label="关闭">${UI.ic('x', 24)}</button>
        </header>
        <div class="body rs-body ${cls}" data-scroll="main">
          <div class="rs-head"><b class="rs-ghost">${title(p)}</b><h1 class="rs-title">${title(p)}</h1>
            ${p.timeout ? '<p class="rs-sub">连续2次超时，本局判负</p>' : p.forfeit ? '<p class="rs-sub">你已认输</p>' : p.double && p.outcome === 'win' ? `<p class="rs-sub">${UI.ic('zap', 14)} 奖池翻倍已生效</p>` : p.outcome === 'draw' && (staked(p) || paidRoom(p)) ? `<p class="rs-sub">已退还底注${UI.fmt(paidRoom(p) ? p.bet : st.bet)}金币</p>` : ''}</div>
          <div class="rs-hero ${cls}">${hero(p)}</div>
          <div class="rs-cards">${card('me', p, true)}${card(p.opp, p, false)}</div>
          ${mateHtml(p)}
          ${practice ? `<div class="rs-panel rs-practice"><p>${UI.ic('bot', 18)} 练习局不影响金币。</p><button class="btn btn-orange btn-md" data-act="ranked">去${st.name} · ${UI.cur('coins', 16)}${UI.fmt(st.bet)}</button></div>` : progress(p)}
          <div class="rs-tasks-box">${practice ? '' : tasksHtml()}</div>
          <div class="bottom-space" style="height:96px"></div>
        </div>
        <div class="rs-actions">
          <button class="btn btn-glass btn-lg rs-share" data-act="share" aria-label="分享">${UI.ic('share', 20)}</button>
          ${p.mode === 'room' ? '<button class="btn btn-primary btn-lg rs-again" data-act="toRoom">返回房间</button>'
            : practice ? '<button class="btn btn-primary btn-lg rs-again" data-act="again">再练一局</button>'
              : `<button class="btn btn-primary btn-lg rs-again" data-act="again">再来一局 <span class="btn-price">${UI.cur('coins', 16)}${UI.fmt(st.bet)}</span></button>`}
          <button class="btn btn-glass btn-lg" data-act="lobby">大厅</button>
        </div>`;
    },
    async shown(el, p) {
      if (p.granted) return;
      p.granted = true;
      scheduleInvite(p);
      await UI.sleep(450);
      if (p.coins) {
        await UI.fly('coins', el.querySelector('.rs-card.is-me .rs-gain'), p.coins);
        UI.release('coins');
      }
    },
    leave: () => clearInvite(),
    act: {
      lobby: () => App.backTo('play'),
      toRoom: () => App.pop(),
      again: () => {
        const p = App.params('result');
        if (p.mode === 'ai') Battle.practice(null, { replace: true });
        else Battle.quick(p.stake, { replace: true });
      },
      ranked: () => Battle.quick(undefined, { replace: true }),
      rematch: async (el) => {
        const p = App.params('result');
        const P = D.people[p.opp];
        const st = Battle.stakeOf(p.stake);
        clearInvite(); // 自己先发起了：演示里对手不再另外发邀请
        if (Battle.canEnter(st) === 'poor') { Shop.lack({ need: st.bet, stake: st.id }); return; }
        el.disabled = true;
        el.classList.add('is-wait');
        el.innerHTML = `<i class="rs-spin"></i> 等待${UI.esc(P.name)}…`;
        await UI.sleep(1600);
        if (App.top() !== 'result' || App.params('result') !== p) return;
        // 演示：好友和赢了的对手一定接受；输给你的对手 75% 接受
        const accept = Store.isFriend(p.opp) || p.outcome !== 'win' || Math.random() < 0.75;
        if (!accept) {
          el.disabled = false;
          el.classList.remove('is-wait');
          el.innerHTML = `${UI.ic('swords', 15)} 再战TA`;
          UI.toast(`${P.name}先休息一下，下次再约`);
          return;
        }
        UI.toast(`${P.name}接受了再战！`);
        Battle.rematch(p.opp, p.stake);
      },
      inviteYes: () => {
        const p = App.params('result');
        clearInvite();
        // 接受时自己金币不够：rematch 里弹金币不足，对方收到拒绝，信息条恢复
        if (!Battle.rematch(p.opp, p.stake, { byMe: true })) restoreMate(p);
      },
      inviteNo: () => restoreMate(App.params('result')),
      addFriend: (el) => {
        const uid = App.params('result').opp;
        Store.request(uid);
        el.outerHTML = `<span class="rs-friend is-done">${UI.ic('check', 15)} 已申请</span>`;
        UI.toast('好友申请已发送');
        clearTimeout(acceptTimer);
        acceptTimer = setTimeout(() => {
          if (!Store.s.sent.includes(uid)) return;
          Store.addFriend(uid);
          UI.notify({ img: D.people[uid].avatar, title: `${D.people[uid].name}通过了你的好友申请`, text: '你们已经是好友了，打个招呼吧！', btn: '聊天', onTap: () => App.go('dm', { id: uid }) });
          const tag = document.querySelector('.page[data-page="result"].is-active .rs-mate .rs-friend');
          if (tag) tag.outerHTML = `<span class="rs-friend is-done">${UI.ic('userCheck', 14)} 已是好友</span>`;
        }, 6000);
      },
      claim: async (el) => {
        const id = el.dataset.id;
        const t = D.tasks.find((x) => x.id === id);
        const r = Store.claim(id);
        if (!r) return;
        el.disabled = true;
        await UI.grant(r, t.title, el);
        const box = document.querySelector('.page[data-page="result"] .rs-tasks-box');
        if (box) { box.innerHTML = tasksHtml(); UI.decorate(box); }
      },
      share: () => {
        const p = App.params('result');
        const g = D.game[p.game];
        const opp = D.people[p.opp];
        const text = p.outcome === 'win' ? `我刚在${g.name}里赢了${opp.name}！🏆` : `来${g.name}和我再战一局！`;
        UI.share({
          title: p.outcome === 'win' ? '分享胜利' : '分享对局',
          text,
          game: g.id,
          preview: `<div class="share-prev"><img src="${g.icon}" alt=""><div><b>${UI.esc(text)}</b><span>${g.name} · Soulgame</span></div></div>`,
        });
      },
    },
  });
})();
