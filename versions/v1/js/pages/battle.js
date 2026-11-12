/**
 * 对局链路：四子棋引擎、开局入口、B4 玩法引导、D 游戏详情、E 匹配与对局、F 结算
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
  D.people.bot = { id: 'bot', name: '诺娃', lv: 5, avatar: `${IMG}brand/blob-face.png`, ai: true, online: true, frame: null, bg: 'aurora', fav: ['c4'], status: 'AI' };

  /** B4 玩法引导：15 秒图解，3 步各 5 秒，可跳过 */
  function howto(gameId, { manual = false } = {}) {
    return new Promise((resolve) => {
      const g = D.game[gameId];
      const steps = gameId === 'c4' ? [
        { t: '点击一列', d: '棋子会落到这一列最下面的空位。', art: 'drop' },
        { t: '四子连珠', d: '横、竖、斜连成4颗同色棋子就赢了。', art: 'line' },
        { t: '堵住对手', d: '及时拦截对手的连线。堵住3次及以上，就算输了也有段位保护。', art: 'block' },
      ] : [
        { t: '快速匹配', d: `优先匹配好友，其次是${g.name}中段位相近的玩家。`, art: 'cover' },
        { t: '全力取胜', d: g.desc, art: 'cover2' },
        { t: '领取奖励', d: '获胜可得钻石、经验和段位分，每一局都计入任务进度。', art: 'reward' },
      ];
      const art = (a) => {
        if (a === 'drop') return `<div class="ht-board">${C4.html([[0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0], [0, 0, 2, 0, 0, 0, 0], [0, 1, 2, 1, 0, 0, 0]], { cls: 'is-howto' })}<b class="disc p1 ht-falling"></b><span class="ht-hand">👆</span></div>`;
        if (a === 'line') return `<div class="ht-board">${C4.html([[0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 1, 0, 0], [0, 0, 0, 1, 2, 0, 0], [0, 0, 1, 2, 2, 0, 0], [0, 1, 2, 1, 2, 0, 0]], { cls: 'is-howto ht-line' })}</div>`;
        if (a === 'block') return `<div class="ht-board">${C4.html([[0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0], [0, 2, 2, 2, 0, 1, 1]], { cls: 'is-howto' })}<b class="disc p1 ht-falling is-block"></b><span class="ht-shield">${UI.ic('shield', 30)}</span></div>`;
        if (a === 'reward') return `<div class="ht-reward"><img src="${IMG}ui/trophy.png" alt=""><span>${UI.cur('gems', 30)}+30</span><span>${UI.cur('exp', 30)}+50</span></div>`;
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
      function finish() {
        cancelAnimationFrame(raf);
        Store.s.howto[gameId] = 1;
        Store.save();
        c.close();
        setTimeout(resolve, 200);
      }
      show(0);
      raf = requestAnimationFrame(tick);
    });
  }

  /** 普通匹配：检查 Gems → 第一次玩先看引导 → 扣 Gems → 匹配页 */
  function quick(gameId, opt = {}) {
    const g = D.game[gameId];
    if (Store.s.gems < D.COST) { Shop.lack(D.COST, gameId); return; }
    const start = () => {
      if (Store.s.gems < D.COST) { Shop.lack(D.COST, gameId); return; }
      Store.add('gems', -D.COST, `${g.name} · 对局入场`);
      const p = { game: gameId, mode: 'quick', double: Store.s.doubleNext ? 1 : 0 };
      if (opt.replace) App.replace('match', p, { anim: 'fade' }); else App.go('match', p, { anim: 'up' });
    };
    if (!Store.s.howto[gameId]) howto(gameId).then(start); else start();
  }
  /** vs AI 免费练习：不扣 Gems、不计段位 */
  function practice(gameId, opt = {}) {
    const p = { game: gameId, mode: 'ai', opp: 'bot', first: Math.random() < 0.6 ? 1 : 2 };
    const start = () => (opt.replace ? App.replace('game', p) : App.go('game', p, { anim: 'up' }));
    if (!Store.s.howto[gameId]) howto(gameId).then(start); else start();
  }
  /** 房间开局：由房间页扣费后调用 */
  function fromRoom(room, opp) {
    App.go('game', { game: room.game, mode: 'room', room: room.id, opp, first: Math.random() < 0.5 ? 1 : 2 }, { anim: 'fade' });
  }

  window.Battle = { quick, practice, fromRoom, howto };
})();

/* ================= D 游戏详情 ================= */
(() => {
  'use strict';

  const IMG = D.IMG;
  const winRate = (id) => {
    const gs = Store.s.gstats[id];
    return gs && gs.g ? `${Math.round((gs.w / gs.g) * 100)}%` : '—';
  };
  window.Battle.winRate = winRate;

  App.page('detail', {
    render(el, p) {
      const g = D.game[p.game] || D.game.c4;
      if (!D.game[p.game]) {
        p.game = g.id;
        try {
          const all = JSON.parse(sessionStorage.getItem('pz.params') || '{}');
          all.detail = p;
          sessionStorage.setItem('pz.params', JSON.stringify(all));
        } catch (_) { /* sessionStorage 不可用时仅保留内存参数 */ }
      }
      const r = Store.rank(g.id);
      const toNext = Math.ceil((100 - r.pts) / 25);
      const gs = Store.s.gstats[g.id] || { g: 0, w: 0 };
      el.innerHTML = `
        <div class="dt-hero">${g.cover ? `<img class="dt-hero-img" src="${g.cover}" alt="">` : `<img class="dt-hero-img is-blur" src="${g.icon}" alt=""><img class="dt-hero-icon" src="${g.icon}" alt="">`}<i class="dt-shade"></i></div>
        ${UI.nav({ cls: 'is-light dt-nav', right: `<button class="icon-btn" data-act="share" aria-label="分享">${UI.ic('share', 21)}</button>` })}
        <div class="body dt-body" data-scroll="main">
          <div class="dt-head card">
            <div class="dt-head-row">
              <img class="dt-icon" src="${g.icon}" alt="">
              <div class="dt-info">
                <h1>${g.name}</h1>
                <div class="dt-meta"><span class="dt-star">★ ${g.rating}</span><span class="live">${UI.fmt(g.online)}人在玩</span></div>
                <div class="dt-tags">${Lobby.tagHtml(g.tag)}<span class="tag tag-gray">${g.cat}</span><span class="tag tag-gray">${g.players}</span><span class="tag tag-gray">${UI.ic('clock', 11)} ${g.dur}</span></div>
              </div>
            </div>
            <p class="dt-desc">${g.desc}</p>
          </div>

          <div class="dt-modes">
            <button class="mode mode-quick" data-act="quick">
              <b>快速匹配</b><span>每局${UI.cur('gems', 15)}${D.COST} · 段位相近</span>
              <img src="${IMG}brand/blobs-vs.png" alt="">
            </button>
            <button class="mode" data-act="friends"><i class="mode-ic is-blue">${UI.ic('users', 22)}</i><b>和好友玩</b><span>邀请在线好友</span></button>
            <button class="mode" data-act="create"><i class="mode-ic is-purple">${UI.ic('door', 22)}</i><b>创建房间</b><span>公开或私密</span></button>
            <button class="mode" data-act="ai"><i class="mode-ic is-green">${UI.ic('bot', 22)}</i><b>人机练习</b><span>免费练习</span></button>
          </div>

          <button class="dt-rank card" data-go="rank" data-game="${g.id}">
            ${UI.tier(r.tier, 58)}
            <span class="dt-rank-m">
              <b>${D.tiers[r.tier]} <small>${r.pts}/100分</small></b>
              ${UI.bar(r.pts, 100, 'is-gold')}
              <span>${r.tier < 4 ? `再赢<em>${toNext}</em>局升至${D.tiers[r.tier + 1]}` : '已达最高段位！'}</span>
            </span>
            <span class="dt-rank-s"><b>${winRate(g.id)}</b><span>胜率</span><small>${gs.g}局</small></span>
          </button>

          <div class="sec-hd"><h2>排行榜</h2><button class="more" data-go="rank" data-game="${g.id}">查看全部 ${UI.ic('right', 16)}</button></div>
          <div class="dt-board card">${Rank.preview(g.id)}</div>

          <div class="cells dt-cells">
            <button class="cell" data-act="howto"><span class="cell-ic">${UI.ic('book', 20)}</span><span class="cell-main">玩法说明<small>15秒图解教程</small></span>${UI.ic('right', 18, 'cell-arrow')}</button>
            <button class="cell" data-go="rooms"><span class="cell-ic">${UI.ic('door', 20)}</span><span class="cell-main">公开房间<small>${Store.s.rooms.filter((x) => x.game === g.id && !x.private).length}个房间正在玩${g.name}</small></span>${UI.ic('right', 18, 'cell-arrow')}</button>
          </div>
          <div class="bottom-space" style="height:110px"></div>
        </div>
        <div class="dt-cta">
          <div class="dt-bal"><span>余额</span><b>${UI.cur('gems', 16)}${UI.bind('gems')}</b></div>
          <button class="btn btn-primary btn-lg" data-act="quick">快速匹配 <span class="btn-price">${UI.cur('gems', 16)}${D.COST}</span></button>
        </div>`;
    },
    act: {
      quick: () => Battle.quick(App.params('detail').game),
      friends: async () => {
        const id = App.params('detail').game;
        const uid = await UI.pickFriend({ title: `邀请好友玩${D.game[id].name}`, sub: '目前只有在线好友可以加入', onlineOnly: true });
        if (uid) Rooms.withFriend(uid, id);
      },
      create: () => App.go('create', { game: App.params('detail').game }),
      ai: () => Battle.practice(App.params('detail').game),
      howto: () => Battle.howto(App.params('detail').game, { manual: true }),
      share: () => {
        const g = D.game[App.params('detail').game];
        UI.share({ title: `分享${g.name}`, text: `来畅玩空间和我一起玩${g.name}吧！`, game: g.id });
      },
    },
  });
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
    const r = Store.rank(M.p.game);
    el.querySelector('.mt-title').innerHTML = how === 'boost' ? '加速成功！已匹配' : '匹配成功！';
    el.querySelector('.mt-fast').hidden = true;
    el.querySelector('.mt-tip').textContent = P.ai ? '极速匹配：对手是AI' : `${P.name} · 段位相近`;
    el.querySelector('.mt-opp').innerHTML = `${UI.av(opp, 92)}<b>${P.name}${P.ai ? ' <i class="ai-tag">AI</i>' : ''}</b><span>${P.ai ? '极速匹配' : `${D.tiers[Math.min(4, r.tier + (Math.random() < 0.3 ? 1 : 0))]} · Lv ${P.lv}`}</span>`;
    el.classList.add('is-found');
    Sfx.play('reward');
    const p = M.p;
    M.timers.push(setTimeout(() => el.classList.add('is-loading'), 1200));
    M.timers.push(setTimeout(() => {
      stop();
      App.replace('game', { game: p.game, mode: P.ai ? 'fast' : 'quick', opp, double: p.double, first: Math.random() < 0.55 ? 1 : 2 });
    }, 3000));
  }

  async function cancel() {
    if (!M) return;
    if (M.found) { UI.toast('匹配成功！游戏加载中…'); return; }
    const current = M;
    current.paused = true;
    const ok = await UI.confirm({ title: '取消匹配？', text: `入场的<b>${D.COST}钻石</b>将全额退还。`, ok: '取消匹配', cancel: '继续等待' });
    if (!M || M !== current) return;
    M.paused = false;
    if (!ok) {
      const pending = M.pendingFound;
      M.pendingFound = null;
      if (pending) found(pending.opp, pending.how);
      return;
    }
    stop();
    Store.add('gems', D.COST, '取消匹配 · 退还');
    App.pop();
    UI.toast(`已取消匹配 · 退还${D.COST}钻石`);
  }

  async function boost() {
    if (!M || M.found) return;
    if (Store.s.boost <= 0) {
      const k = await UI.dialog({
        img: `${IMG}ui/rocket.png`,
        title: '加速卡用完了',
        text: '使用加速卡，1秒内就能匹配到对手。',
        buttons: [{ label: `${UI.cur('coins', 18)}100 买1张`, key: 'buy', cls: 'btn-orange' }, { label: '继续等待', key: 'no', cls: 'btn-ghost' }],
      });
      if (k !== 'buy' || !M || M.found) return;
      if (Store.buyItem('boost1') === 'poor') { UI.toast('金币不足'); return; }
    }
    Store.add('boost', -1, '使用加速卡');
    Store.badge('speed');
    M.el.classList.add('is-boost');
    Sfx.play('match');
    M.timers.push(setTimeout(() => found(pickOpp(), 'boost'), 900));
  }

  App.page('match', {
    render(el, p) {
      const g = D.game[p.game];
      const r = Store.rank(g.id);
      el.innerHTML = `
        <div class="mt-sky"><img src="${IMG}fx/galaxy.jpg" alt=""><i class="mt-glow g1"></i><i class="mt-glow g2"></i></div>
        <header class="mt-top safe-top"><button class="icon-btn mt-x" data-act="cancel" aria-label="取消匹配">${UI.ic('x', 26)}</button></header>
        <div class="mt-game">
          <span class="mt-icon"><img src="${g.icon}" alt=""></span>
          <b>${g.name}</b>
          <p>本局消耗<em>${D.COST}</em>${UI.cur('gems', 18)}</p>
          ${p.double ? `<span class="mt-double">${UI.ic('zap', 13)} 获胜得2×钻石</span>` : ''}
        </div>
        <h2 class="mt-title">匹配中<i class="mt-dots"><b>.</b><b>.</b><b>.</b></i></h2>
        <div class="mt-wait"><span class="mt-time">00:00</span><span class="mt-tip">优先匹配好友和段位相近的玩家</span></div>
        <div class="mt-fast" hidden>
          <button class="btn btn-glass btn-md" data-act="fast">${UI.ic('bot', 17)} 极速匹配 · 人机</button>
          <button class="btn btn-gold btn-md" data-act="boost">${UI.cur('boost', 18)} 使用加速卡 <em class="mt-boost-n">×${Store.s.boost}</em></button>
        </div>
        <div class="mt-arena">
          <div class="mt-half is-blue"><img class="mt-lines" src="${IMG}fx/speedlines.png" alt=""><img class="mt-tone" src="${IMG}fx/halftone.png" alt=""></div>
          <div class="mt-half is-red"><img class="mt-lines" src="${IMG}fx/speedlines.png" alt=""><img class="mt-tone" src="${IMG}fx/halftone.png" alt=""></div>
          <i class="mt-split"></i>
          <img class="mt-blobs" src="${IMG}brand/blobs-vs.png" alt="">
          <div class="mt-p mt-me">${UI.av('me', 92)}<b>${UI.esc(Store.s.user.name)}</b><span>${D.tiers[r.tier]} · Lv ${Store.s.user.lv}</span></div>
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
        el.querySelector('.mt-time').textContent = `00:${String(sec).padStart(2, '0')}`;
        if (sec >= 5 && !M.fast) {
          M.fast = true;
          el.querySelector('.mt-fast').hidden = false;
          el.querySelector('.mt-tip').textContent = '等太久？试试极速匹配或加速卡';
        }
      }, 250);
      M.timers.push(setTimeout(() => found(pickOpp()), Store.s.vip ? 3200 : 9500));
    },
    leave: () => stop(),
    back() { cancel(); return false; },
    act: {
      cancel: () => cancel(),
      fast: () => found('bot', 'fast'),
      boost: () => boost(),
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

  const player = (uid, who) => {
    const p = UI.person(uid);
    return `<div class="gm-pl p${who}">
      <span class="gm-av"><svg class="gm-ring" viewBox="0 0 70 70"><circle cx="35" cy="35" r="32"/></svg>${UI.av(uid, 54)}<span class="gm-pop"></span></span>
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
    el.querySelector('.gm-turn').innerHTML = who === 1 ? '<b>轮到你了</b> · 点击一列落子' : `<b>${name(G.opp)}</b>思考中…`;
    if (who === 1) closePanel();
    setClock(15);
    ring(who, 15);
    clearInterval(G.tick);
    G.tick = setInterval(() => {
      if (!G || G.paused) return;
      G.left -= 1;
      setClock(Math.max(0, G.left));
      if (who === 1 && G.left <= 5 && G.left > 0) Sfx.play('tick');
      if (G.left <= 0) { clearInterval(G.tick); if (who === 1) timeout(); }
    }, 1000);
    if (who === 2) later(botMove, 800 + Math.random() * 1300);
  }
  function timeout() {
    if (!G || G.over || G.turn !== 1) return;
    UI.toast('时间到！已帮你随机落子');
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
    if (G.paused) { later(botMove, 600); return; }
    const mine = C4.winningCols(G.board, 1);
    const col = C4.bot(G.board, 2, 1, G.opp === 'bot' ? 0.7 : 0.85);
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
  function settle(who) {
    const line = C4.wins(G.board, who);
    if (line) {
      G.over = true;
      ring(0);
      G.el.querySelector('.gm-turn').innerHTML = who === 1 ? '<b>四子连珠！</b>' : `<b>${name(G.opp)}</b>连成了四子`;
      later(() => { C4.highlight(board(), line); Sfx.play(who === 1 ? 'win' : 'lose'); }, 420);
      later(() => end(who === 1 ? 'win' : 'lose'), 2000);
      return;
    }
    if (C4.full(G.board)) {
      G.over = true;
      ring(0);
      G.el.querySelector('.gm-turn').innerHTML = '<b>棋盘已满</b> · 平局';
      later(() => end('draw'), 1200);
      return;
    }
    later(() => startTurn(who === 1 ? 2 : 1), 450);
  }

  /* ---------- E6 局内表情：自己回合置灰，对手回合放大高亮；以弹幕飘过 ---------- */
  function locked() { return G && G.g.playable && G.turn === 1 && !G.over; }
  function openPanel(tab) {
    if (locked()) { UI.toast('专心落子！对手回合才能发表情'); return; }
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
    if (locked()) { UI.toast('专心落子！对手回合才能发表情'); return; }
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

  /* ---------- 占位游戏 ---------- */
  function startPlaceholder() {
    let score = 0;
    let t = 180;
    G.el.querySelector('.gm-turn').innerHTML = '<b>对局进行中</b>';
    setClock('3:00');
    G.tick = setInterval(() => {
      if (!G || G.paused) return;
      t -= 1;
      score += UI.rand(15, 90);
      const mm = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
      G.el.querySelector('.ph-score').textContent = UI.fmt(score);
      setClock(mm);
      if (t <= 0) { G.over = true; end(Math.random() < 0.5 ? 'win' : 'lose'); }
    }, 1000);
  }

  /* ---------- E7 中途退出 ---------- */
  async function quit() {
    if (!G || G.over) return;
    const practice = G.p.mode === 'ai';
    G.paused = true;
    const ok = await UI.confirm({
      title: practice ? '退出练习？' : '退出对局？',
      text: practice ? '练习局退出没有惩罚。' : `现在退出算作失败，入场的<b>${D.COST}钻石</b>不予退还。`,
      ok: '退出', cancel: '继续玩', danger: !practice,
    });
    if (!G) return;
    G.paused = false;
    if (ok) {
      G.over = true;
      end('lose', { forfeit: true });
    } else if (G.turn) ring(G.turn, G.left);
  }

  /* ---------- 结束：先更新数据，结算页负责动画和飞入 ---------- */
  function end(outcome, opt = {}) {
    if (!G) return;
    clearAll();
    const { p, g, opp, blocks, moves } = G;
    const sec = Math.max(1, Math.round((Date.now() - G.t0) / 1000));
    G = null;
    const practice = p.mode === 'ai';
    const before = { ...Store.rank(g.id) };
    let gems = 0;
    let exp = 0;
    let delta = 0;
    let protect = false;
    Store.count('seconds', sec);
    if (!practice) {
      if (outcome === 'win') { gems = 30 * (p.double ? 2 : 1); exp = 50; delta = 25; }
      else if (outcome === 'draw') { gems = D.COST; exp = 30; }
      else { exp = opt.forfeit ? 10 : 20; protect = !opt.forfeit && blocks >= 3; delta = protect ? 0 : -15; }
      if (p.double) Store.s.doubleNext = false;
      Store.count('games');
      if (outcome === 'win') Store.count('wins');
      Store.count('distinct', 1, g.id);
      if (g.cat === '动作') Store.count('action', 1, g.id);
    }
    const rk = practice || !delta ? null : Store.addRank(g.id, delta);
    Store.addMatch({ game: g.id, vs: opp, win: outcome === 'win', draw: outcome === 'draw', gems, practice, mode: p.mode });
    if (!D.people[opp].ai) Store.addRecent(opp);
    if (gems) {
      UI.hold('gems');
      Store.add('gems', gems, outcome === 'win' ? `${g.name} · 胜利${p.double ? '（2×）' : ''}` : `${g.name} · 平局退还`);
    }
    App.replace('result', {
      game: g.id, mode: p.mode, room: p.room || '', opp, outcome,
      forfeit: opt.forfeit ? 1 : 0, gems, exp, delta, protect: protect ? 1 : 0,
      before, after: rk ? rk.after : before, up: rk && rk.up ? 1 : 0, down: rk && rk.down ? 1 : 0,
      blocks, moves, sec, double: p.double || 0,
    });
  }

  App.page('game', {
    render(el, p) {
      const g = D.game[p.game];
      const opp = p.opp || 'bot';
      const mode = { quick: '排位赛', fast: '极速匹配 · 人机', ai: '人机练习', room: '房间对局' }[p.mode] || '对局';
      el.classList.remove('is-myturn', 'is-oppturn');
      el.innerHTML = `
        <div class="gm-bg"><img class="gm-tone" src="${IMG}fx/halftone.png" alt=""></div>
        <header class="gm-top safe-top">
          <button class="icon-btn" data-act="quit" aria-label="退出">${UI.ic('back', 24)}</button>
          <div class="gm-title"><b>${g.name}</b><span>${mode}${p.double ? ' · 2×钻石' : ''}</span></div>
          <button class="icon-btn" data-act="sound" aria-label="音效">${UI.ic(Store.s.settings.sound ? 'volume' : 'mute', 21)}</button>
          <button class="icon-btn" data-act="help" aria-label="玩法说明">${UI.ic('help', 21)}</button>
        </header>
        <div class="gm-players">
          ${player('me', 1)}
          <div class="gm-mid"><span class="gm-clock">15</span><span class="gm-clock-l">秒</span></div>
          ${player(opp, 2)}
        </div>
        <div class="gm-stage ${g.playable ? '' : 'is-ph'}">
          <div class="gm-turn">准备开始…</div>
          ${g.playable ? `${C4.html(C4.empty(), { cls: 'is-game', cols: true })}
            <div class="gm-stats"><span>${UI.ic('shield', 14)} 拦截 <b class="gm-blocks">0</b></span><span>${UI.ic('gamepad', 14)} 步数 <b class="gm-moves">0</b></span>${p.mode !== 'ai' ? `<span>${UI.ic('info', 14)} 拦截3次＝段位保护</span>` : ''}</div>`
            : `<div class="ph-screen"><img class="ph-bg" src="${g.cover || g.icon}" alt="">
                <div class="ph-hud"><span>第<b>1</b>/3回合</span><span>得分 <b class="ph-score">0</b></span></div>
                <div class="ph-center"><img class="ph-icon" src="${g.icon}" alt=""><b>${g.name}</b><span>对局进行中…</span></div></div>
              <div class="ph-demo"><p>${UI.ic('info', 14)} 占位画面，本演示仅四子棋可试玩。请选择结果：</p>
                <div class="ph-btns"><button class="btn btn-green btn-lg" data-act="phWin">${UI.ic('trophy', 18)} 胜利</button><button class="btn btn-danger btn-lg" data-act="phLose">失败</button></div></div>`}
        </div>
        <div class="gm-dm"></div>
        <div class="gm-bar">
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
      clearAll();
      G = { p, el, g: D.game[p.game], opp: p.opp || 'bot', board: C4.empty(), turn: 0, left: 15, blocks: 0, moves: 0, t0: Date.now(), timers: [], over: false, paused: false };
      if (G.g.playable) {
        const first = p.first || 1;
        const intro = document.createElement('div');
        intro.className = 'gm-intro';
        intro.innerHTML = `${UI.av(first === 1 ? 'me' : G.opp, 64)}<b>${first === 1 ? '你先手！' : `${name(G.opp)}先手`}</b><span>连成4子即可获胜</span>`;
        el.querySelector('.gm-stage').appendChild(intro);
        later(() => { intro.remove(); startTurn(first); }, 1500);
      } else {
        startPlaceholder();
      }
      later(() => { if (G && G.turn !== 1) emote('opp', UI.pick(['happy', 'wink', 'cool'])); }, 2600);
    },
    leave() { clearAll(); G = null; },
    back() {
      const panel = G && G.el.querySelector('.gm-panel');
      if (panel && !panel.hidden) { closePanel(); return false; }
      quit();
      return false;
    },
    act: {
      col: (el) => myMove(+el.dataset.c),
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
      help: () => {
        if (!G) return;
        G.paused = true;
        Battle.howto(G.g.id, { manual: true }).then(() => {
          if (!G) return;
          G.paused = false;
          if (G.turn) ring(G.turn, G.left);
        });
      },
      phWin: () => { if (G && !G.over) { G.over = true; end('win'); } },
      phLose: () => { if (G && !G.over) { G.over = true; end('lose'); } },
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

  function friendTag(uid) {
    const P = D.people[uid];
    if (P.ai) return '';
    if (Store.isFriend(uid)) return `<span class="rs-friend is-done">${UI.ic('userCheck', 14)} 已是好友</span>`;
    if (Store.s.sent.includes(uid)) return `<span class="rs-friend is-done">${UI.ic('check', 14)} 已申请</span>`;
    return `<button class="rs-friend" data-act="addFriend">${UI.ic('userPlus', 14)} 加好友</button>`;
  }
  function card(uid, p, me) {
    const win = p.outcome === 'win';
    const draw = p.outcome === 'draw';
    const winner = draw ? false : me ? win : !win;
    const P = UI.person(uid);
    const gems = me ? p.gems : p.mode === 'ai' ? 0 : winner ? 30 : draw ? D.COST : 0;
    return `<div class="rs-card ${me ? 'is-me' : 'is-opp'} ${winner ? 'is-winner' : ''}">
      ${winner ? `<img class="rs-crown" src="${IMG}ui/crown.png" alt="">` : ''}
      ${UI.av(uid, 70)}
      <b>${me ? UI.esc(Store.s.user.name) : UI.esc(P.name)}${P.ai ? ' <i class="ai-tag">AI</i>' : ''}</b>
      <span class="rs-gain">${UI.cur('gems', 24)}<em>×${gems}</em></span>
      ${me ? '' : friendTag(uid)}
    </div>`;
  }

  function rankTip(r) {
    if (r.tier >= 4) return `${D.tiers[4]}！已经登顶啦。`;
    const n = Math.ceil((100 - r.pts) / 25);
    return `再赢${n}局升至${D.tiers[r.tier + 1]}`;
  }
  function progress(p) {
    const s = Store.s;
    const need = Store.need(s.user.lv);
    const b = p.before;
    const dl = p.protect ? '±0 · 已保护' : p.delta > 0 ? `段位分+${p.delta}` : p.delta < 0 ? `段位分${p.delta}` : '段位分±0';
    const playable = D.game[p.game].playable;
    return `<div class="rs-panel">
      <div class="rs-row">
        <span class="rs-row-ic">${UI.cur('exp', 34)}</span>
        <div class="rs-row-m"><div class="rs-row-t"><b>经验+${p.exp}</b><span class="rs-exp-txt">Lv ${s.user.lv} · ${s.user.exp}/${need}</span></div>${UI.bar(s.user.exp, need, 'is-green rs-exp-bar')}</div>
      </div>
      <div class="rs-row">
        <span class="rs-row-ic rs-tier">${UI.tier(b.tier, 36)}</span>
        <div class="rs-row-m"><div class="rs-row-t"><b class="${p.delta < 0 ? 'is-neg' : ''}">${dl}</b><span class="rs-rank-txt">${D.tiers[b.tier]} · ${b.pts}/100</span></div>${UI.bar(b.pts, 100, 'is-gold rs-rank-bar')}<span class="rs-rank-tip">${rankTip(p.after)}</span></div>
      </div>
      ${p.protect ? `<div class="rs-protect">${UI.ic('shield', 18)}<span><b>段位保护</b> 你拦截了${p.blocks}次，本局不扣分。</span></div>` : ''}
      ${!p.protect && p.outcome === 'lose' && !p.forfeit && playable ? `<div class="rs-protect is-hint">${UI.ic('info', 16)}<span>单局拦截3次及以上，输了也不扣分。本局你拦截了${p.blocks}次。</span></div>` : ''}
      <div class="rs-stats">${playable ? `<span>步数 <b>${p.moves}</b></span><span>拦截 <b>${p.blocks}</b></span>` : ''}<span>用时 <b>${mmss(p.sec)}</b></span></div>
    </div>`;
  }

  function taskList() {
    const ids = ['n_first', 'd_win', 'd_play', 'd_emoji', 'n_time', 'w_variety', 'l_action'];
    const list = ids.map((id) => Store.task(D.tasks.find((t) => t.id === id))).filter((t) => t.state !== 'done');
    list.sort((a, b) => (b.state === 'claim') - (a.state === 'claim'));
    return list.slice(0, 3);
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

  function animRank(el, p) {
    const bar = el.querySelector('.rs-rank-bar > i');
    const txt = el.querySelector('.rs-rank-txt');
    const tierEl = el.querySelector('.rs-tier');
    if (!bar) return;
    const b = p.before;
    const a = p.after;
    const finish = () => { txt.textContent = `${D.tiers[a.tier]} · ${a.pts}/100`; };
    if (a.tier === b.tier) { bar.style.width = `${a.pts}%`; finish(); return; }
    bar.style.width = a.tier > b.tier ? '100%' : '0%';
    setTimeout(() => {
      tierEl.innerHTML = UI.tier(a.tier, 36);
      tierEl.classList.add('is-pop');
      bar.style.transition = 'none';
      bar.style.width = a.tier > b.tier ? '0%' : '100%';
      void bar.offsetWidth;
      bar.style.transition = '';
      bar.style.width = `${a.pts}%`;
      finish();
    }, 950);
  }

  async function grantExp(el, p) {
    const s = Store.s;
    const bar = el.querySelector('.rs-exp-bar > i');
    const txt = el.querySelector('.rs-exp-txt');
    const ups = Store.addExp(p.exp, `${D.game[p.game].name} · ${{ win: '胜利', lose: '失败', draw: '平局' }[p.outcome] || p.outcome}`);
    const settle = () => {
      bar.style.width = `${(s.user.exp / Store.need(s.user.lv)) * 100}%`;
      txt.textContent = `Lv ${s.user.lv} · ${s.user.exp}/${Store.need(s.user.lv)}`;
    };
    if (!ups.length) { settle(); return; }
    bar.style.width = '100%';
    await UI.sleep(950);
    bar.style.transition = 'none';
    bar.style.width = '0%';
    void bar.offsetWidth;
    bar.style.transition = '';
    settle();
    for (const lv of ups) {
      // eslint-disable-next-line no-await-in-loop
      await UI.reward({
        title: `升到${lv}级啦！`, sub: '恭喜升级，这是你的升级奖励', img: `${IMG}brand/mascot-cheer.png`,
        badge: `Lv${lv}`, items: { gems: 50, coins: 100 }, note: `Lv${lv}升级奖励`, cls: 'is-levelup', sfx: 'win',
      });
    }
  }

  async function promoted(el, p) {
    const a = p.after;
    const unlock = a.tier === 2;
    const k = await UI.dialog({
      cls: 'dlg-promo',
      art: `<span class="promo-tier">${UI.tier(a.tier, 112)}</span>`,
      title: `晋升${D.tiers[a.tier]}！`,
      text: unlock ? `你在${D.game[p.game].name}中达到${D.tiers[a.tier]}，解锁了<b>夏日激战</b>赛季头像框。` : `你在${D.game[p.game].name}中达到${D.tiers[a.tier]}，继续冲吧！`,
      buttons: unlock ? [{ label: '装备头像框', key: 'equip', cls: 'btn-orange' }, { label: '稍后', key: 'ok', cls: 'btn-ghost' }] : [{ label: '太棒了！', key: 'ok' }],
    });
    if (k === 'equip') {
      Store.equip('frame', 'season');
      const av = el.querySelector('.rs-card.is-me .av');
      if (av) av.outerHTML = UI.av('me', 70);
      UI.toast('已装备夏日激战头像框');
    }
  }

  App.page('result', {
    render(el, p) {
      const g = D.game[p.game];
      const practice = p.mode === 'ai';
      const cls = p.outcome === 'win' ? 'is-win' : p.outcome === 'draw' ? 'is-draw' : 'is-lose';
      el.innerHTML = `
        <div class="rs-bg ${cls}"><img src="${IMG}fx/galaxy.jpg" alt=""><i class="rs-blue"></i><i class="rs-red"></i></div>
        <header class="rs-top safe-top">
          ${UI.chips(['gems'], { plus: false, cls: 'is-dark' })}
          <span class="rs-game"><img src="${g.icon}" alt="">${g.name}</span>
          <button class="icon-btn rs-x" data-act="lobby" aria-label="关闭">${UI.ic('x', 24)}</button>
        </header>
        <div class="body rs-body ${cls}" data-scroll="main">
          <div class="rs-head"><b class="rs-ghost">${title(p)}</b><h1 class="rs-title">${title(p)}</h1>
            ${p.forfeit ? '<p class="rs-sub">你已退出对局</p>' : p.double && p.outcome === 'win' ? `<p class="rs-sub">${UI.ic('zap', 14)} 双倍钻石已生效</p>` : p.outcome === 'draw' && !practice ? `<p class="rs-sub">已退还${D.COST}钻石</p>` : ''}</div>
          <div class="rs-hero ${cls}">${hero(p)}</div>
          <div class="rs-cards">${card('me', p, true)}${card(p.opp, p, false)}</div>
          ${practice ? `<div class="rs-panel rs-practice"><p>${UI.ic('bot', 18)} 练习局不影响段位和钻石。</p><button class="btn btn-orange btn-md" data-act="ranked">来局排位 · ${UI.cur('gems', 16)}${D.COST}</button></div>` : progress(p)}
          <div class="rs-tasks-box">${practice ? '' : tasksHtml()}</div>
          <div class="bottom-space" style="height:96px"></div>
        </div>
        <div class="rs-actions">
          <button class="btn btn-glass btn-lg rs-share" data-act="share" aria-label="分享">${UI.ic('share', 20)}</button>
          ${p.mode === 'room' ? '<button class="btn btn-primary btn-lg rs-again" data-act="toRoom">返回房间</button>'
            : practice ? '<button class="btn btn-primary btn-lg rs-again" data-act="again">再练一局</button>'
              : `<button class="btn btn-primary btn-lg rs-again" data-act="again">再来一局 <span class="btn-price">${UI.cur('gems', 16)}${D.COST}</span></button>`}
          <button class="btn btn-glass btn-lg" data-act="lobby">大厅</button>
        </div>`;
    },
    async shown(el, p) {
      if (p.granted) return;
      p.granted = true;
      await UI.sleep(450);
      animRank(el, p);
      if (p.gems) {
        await UI.fly('gems', el.querySelector('.rs-card.is-me .rs-gain'), p.gems);
        UI.release('gems');
      }
      if (p.exp) await grantExp(el, p);
      if (p.up) await promoted(el, p);
    },
    act: {
      lobby: () => App.backTo('play'),
      toRoom: () => App.pop(),
      again: () => {
        const p = App.params('result');
        if (p.mode === 'ai') Battle.practice(p.game, { replace: true });
        else Battle.quick(p.game, { replace: true });
      },
      ranked: () => Battle.quick(App.params('result').game, { replace: true }),
      addFriend: (el) => {
        const uid = App.params('result').opp;
        Store.request(uid);
        el.outerHTML = `<span class="rs-friend is-done">${UI.ic('check', 14)} 已申请</span>`;
        UI.toast('好友申请已发送');
        clearTimeout(acceptTimer);
        acceptTimer = setTimeout(() => {
          if (!Store.s.sent.includes(uid)) return;
          Store.addFriend(uid);
          UI.notify({ img: D.people[uid].avatar, title: `${D.people[uid].name}通过了你的好友申请`, text: '你们已经是好友了，打个招呼吧！', btn: '聊天', onTap: () => App.go('dm', { id: uid }) });
          const tag = document.querySelector('.page[data-page="result"].is-active .rs-card.is-opp .rs-friend');
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
          preview: `<div class="share-prev"><img src="${g.icon}" alt=""><div><b>${UI.esc(text)}</b><span>${g.name} · ${D.tiers[p.after.tier]} · ${p.after.pts}/100</span></div></div>`,
        });
      },
    },
  });
})();
