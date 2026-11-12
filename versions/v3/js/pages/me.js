/**
 * L 我的：L1 主页头部（含会员条）、谁看过我、L2 编辑资料、L3 战绩、L4 钱包、L5 背包、L6 徽章、L7 设置（含重置演示）
 */
(() => {
  'use strict';

  const IMG = D.IMG;
  const md = (t) => { const d = new Date(t); return `${d.getMonth() + 1}月${d.getDate()}日`; };
  const ago = (t) => {
    const s = Math.round((Date.now() - t) / 1000);
    if (s < 60) return '刚刚';
    if (s < 3600) return `${Math.floor(s / 60)}分钟前`;
    if (s < 86400) return `${Math.floor(s / 3600)}小时前`;
    return md(t);
  };
  const pct = (w, g) => (g ? Math.round((w / g) * 100) : 0);
  /** 对局记录右侧：排位局显示金币净变化，好友房 / 练习单独标注 */
  function matchVal(m) {
    if (m.practice || m.mode === 'ai') return '<i class="st-tag">练习</i>';
    if (m.mode === 'room') return '<i class="st-tag">好友局</i>';
    const n = m.coins || 0;
    if (!n) return m.draw ? `<i>${UI.cur('coins', 14)}退还底注</i>` : '';
    return `<i class="${n > 0 ? 'is-up' : 'is-down'}">${UI.cur('coins', 14)}${n > 0 ? '+' : '-'}${UI.fmt(Math.abs(n))}金币</i>`;
  }

  /** 主页会员条：非会员引导开通；会员提示今日福利或展示权益 */
  function vipBanner() {
    const tier = Store.vipTier();
    const T = D.vip.tiers;
    if (!tier) {
      return `<button class="me-vip is-t0" data-act="vip"><img class="me-vip-crown" src="${IMG}ui/crown.png" alt="">
        <span class="me-vip-main"><b>开通会员 · 每天领${UI.fmt(T[1].dailyCoins)}金币</b><small>签到×${T[1].sign} · 破产补助 · 会员金框</small></span>
        <span class="me-vip-btn">去开通</span></button>`;
    }
    const t = T[tier];
    const sub = Store.canVipDaily()
      ? `<small class="is-hot">今日福利待领取 ${UI.dot('vip')}</small>`
      : `<small>每天${UI.fmt(t.dailyCoins)}金币 · 签到×${t.sign} · 保护卡${Store.protectLeft()}张</small>`;
    return `<button class="me-vip is-t${tier}" data-act="vip"><img class="me-vip-crown" src="${IMG}ui/crown.png" alt="">
      <span class="me-vip-main"><b>${t.name}生效中</b>${sub}</span>
      <span class="me-vip-btn">${Store.canVipDaily() ? '去领取' : '会员中心'}</span></button>`;
  }

  /* ================= L1 Me ================= */
  App.page('me', {
    render(el) {
      const s = Store.s;
      const need = Store.need(s.user.lv);
      const r = Store.rank(D.GAME);
      const winRate = pct(s.record.wins, s.record.games);
      const badges = D.badges.filter((b) => s.badges[b.id]).length;
      const owned = s.owned.frame.length + s.owned.bubble.length + s.owned.bg.length;
      el.innerHTML = `
        <div class="me-bg" style="background:${UI.bg(s.equip.bg)}"><i></i></div>
        <header class="me-top safe-top">
          <button class="icon-btn" data-go="edit" aria-label="编辑资料">${UI.ic('edit', 20)}</button>
          <button class="icon-btn" data-go="settings" aria-label="设置">${UI.ic('gear', 22)}</button>
        </header>
        <div class="body me-body" data-scroll="main">
          <div class="me-card">
            <div class="me-av">${UI.av('me', 92)}</div>
            <h1>${UI.name('me')}</h1>
            <button class="me-id" data-act="copy">ID ${s.user.uid} ${UI.ic('copy', 13)}</button>
            <p class="me-bio">${UI.esc(s.user.bio)}</p>
            <div class="me-lv"><span class="me-lv-tag">Lv${s.user.lv}</span>${UI.bar(s.user.exp, need, 'is-green')}<em>${s.user.exp}/${need}经验</em></div>
          </div>
          ${vipBanner()}
          <div class="me-wallet">
            <button data-go="wallet" data-cur="exp">${UI.cur('exp', 30)}<b>Lv${s.user.lv}</b><span>经验${s.user.exp}</span></button>
            <button data-go="wallet" data-cur="gems">${UI.cur('gems', 30)}${UI.bind('gems')}<span>钻石</span></button>
            <button data-go="wallet" data-cur="coins">${UI.cur('coins', 30)}${UI.bind('coins')}<span>金币</span></button>
          </div>
          <button class="me-stats card" data-go="stats">
            <span><b>${s.record.games}</b>对局</span><span><b>${winRate}%</b>胜率</span>
            <span>${UI.tier(r.tier, 24)}<b>${D.tiers[r.tier]}</b>四子棋段位</span>
            ${UI.ic('right', 18, 'cell-arrow')}
          </button>
          <div class="cells me-cells">
            <button class="cell" data-go="bag"><span class="cell-ic">${UI.ic('bag', 21)}</span><span class="cell-main">背包</span><span class="cell-val">${owned}件 · ${UI.cur('boost', 16)}${s.boost}</span>${UI.ic('right', 18, 'cell-arrow')}</button>
            <button class="cell" data-go="badges"><span class="cell-ic">${UI.ic('award', 21)}</span><span class="cell-main">徽章</span><span class="cell-val">${badges}/${D.badges.length}</span>${UI.ic('right', 18, 'cell-arrow')}</button>
            <button class="cell" data-go="wallet"><span class="cell-ic">${UI.ic('wallet', 21)}</span><span class="cell-main">钱包与明细</span><span class="cell-val">${s.log.length}条记录</span>${UI.ic('right', 18, 'cell-arrow')}</button>
            <button class="cell" data-act="friends"><span class="cell-ic">${UI.ic('users', 21)}</span><span class="cell-main">好友</span><span class="cell-val">${s.friends.length}${s.requests.length ? ` <i class="count is-inline">${s.requests.length}</i>` : ''}</span>${UI.ic('right', 18, 'cell-arrow')}</button>
            <button class="cell me-visitors" data-go="visitors"><span class="cell-ic">${UI.ic('eye', 21)}</span><span class="cell-main">谁看过我</span><span class="cell-val">${Store.perk('visitors') ? `${s.visitors.length}位访客` : `${UI.ic('lock', 13)} ${s.visitors.length}位访客`}</span>${UI.ic('right', 18, 'cell-arrow')}</button>
            <button class="cell" data-go="shop"><span class="cell-ic">${UI.ic('gift', 21)}</span><span class="cell-main">商城</span><span class="cell-val">装扮、道具和充值</span>${UI.ic('right', 18, 'cell-arrow')}</button>
            <button class="cell" data-go="settings"><span class="cell-ic">${UI.ic('gear', 21)}</span><span class="cell-main">设置</span>${UI.ic('right', 18, 'cell-arrow')}</button>
          </div>
          <div class="bottom-space"></div>
        </div>
        ${UI.tabbar('me')}`;
    },
    back() { App.tab('play'); return false; },
    act: {
      copy: () => UI.toast(`已复制ID ${Store.s.user.uid}`),
      vip: () => (Store.vipTier() ? App.go('vip') : Vip.open(1)),
      friends: () => App.tab('chat', { seg: 'friends' }),
    },
  });

  /* ================= 谁看过我（超级会员可见） ================= */
  App.page('visitors', {
    render(el) {
      const list = Store.s.visitors || [];
      const open = !!Store.perk('visitors');
      const rows = list.map((v) => {
        const p = D.people[v.id];
        if (!p) return '';
        return `<div class="row vs-row" data-uid="${v.id}">${UI.av(v.id, 44, { on: open })}
          <span class="row-main"><b>${open ? UI.name(v.id) : '***'}</b><span>${v.t}看过你的主页${open ? ` · Lv${p.lv}` : ''}</span></span>
          ${open ? `<button class="btn btn-line btn-sm" data-act="see" data-uid="${v.id}">去看看</button>` : ''}</div>`;
      }).join('');
      el.innerHTML = `${UI.nav({ title: '谁看过我', sub: '最近7天', cls: 'is-white' })}
        <div class="body vs-body" data-scroll="main">
          <div class="vs-sum"><span class="vs-sum-ic">${UI.ic('eye', 24)}</span><span><b>最近有${list.length}人看过你</b><span>${open ? '去打个招呼，说不定能多个好友' : '开通超级会员，看看是谁对你感兴趣'}</span></span></div>
          ${list.length ? `<div class="vs-list ${open ? '' : 'is-locked'}">${rows}
            ${open ? '' : `<div class="vs-lock"><span class="vs-lock-ic">${UI.ic('lock', 24)}</span><b>超级会员专属</b><p>开通后能看到所有访客，并直接去TA的主页</p>
              <button class="btn btn-lg vs-cta" data-act="unlock">开通超级会员查看访客</button></div>`}</div>` : UI.empty('还没有人来看过你，多去对局交朋友吧')}
          <p class="vs-tip">${UI.ic('info', 13)} 访客记录保留7天</p>
          <div class="bottom-space"></div>
        </div>`;
    },
    act: {
      see: (el) => App.go('profile', { uid: el.dataset.uid }),
      unlock: () => Vip.open(2),
    },
  });

  /* ================= L2 编辑资料 ================= */
  let pickBg = null;
  App.page('edit', {
    render(el, p) {
      const s = Store.s;
      if (p !== this._p) { this._p = p; pickBg = s.equip.bg; }
      el.innerHTML = `${UI.nav({ title: '编辑资料', cls: 'is-white', right: '<button class="btn btn-primary btn-sm" data-act="save">保存</button>' })}
        <div class="body ed-body" data-scroll="main">
          <div class="ed-prev" style="background:${UI.bg(pickBg)}">${UI.av('me', 72)}<b>${UI.esc(s.user.name)}</b></div>
          <div class="ed-sec"><h3>个性签名</h3><textarea class="ed-bio" maxlength="60" rows="3">${UI.esc(s.user.bio)}</textarea><span class="ed-n">${s.user.bio.length}/60</span></div>
          <div class="ed-sec"><h3>主页背景</h3><div class="ed-bgs">${Object.entries(D.bgs).map(([id, b]) => {
            const own = Store.owns('bg', id);
            return `<button class="ed-bg ${id === pickBg ? 'is-on' : ''} ${own ? '' : 'is-lock'}" data-act="bg" data-id="${id}"><span style="background:${b.css}"></span><b>${b.name}</b>${own ? '' : `<i>${UI.ic('lock', 12)} ${b.price}</i>`}</button>`;
          }).join('')}</div>
          <p class="ed-tip">${UI.ic('info', 14)} 未解锁的背景可以在商城用金币购买。</p></div>
          <div class="ed-sec"><h3>头像框</h3><button class="cell card" data-go="bag" data-kind="frame"><span class="cell-ic">${UI.av('me', 34)}</span><span class="cell-main">${s.equip.frame ? D.frames[s.equip.frame].name : '未佩戴头像框'}<small>去背包更换</small></span>${UI.ic('right', 18, 'cell-arrow')}</button></div>
        </div>`;
      const ta = el.querySelector('.ed-bio');
      ta.addEventListener('input', () => { el.querySelector('.ed-n').textContent = `${ta.value.length}/60`; });
    },
    act: {
      bg: (el) => {
        const id = el.dataset.id;
        if (!Store.owns('bg', id)) {
          UI.dialog({ title: `${D.bgs[id].name}未解锁`, text: `去商城花${UI.cur('coins', 15)}${D.bgs[id].price}金币就能获得。`, buttons: [{ label: '去商城', key: 'shop' }, { label: '取消', key: 'no', cls: 'btn-ghost' }] })
            .then((k) => { if (k === 'shop') { const bio = document.querySelector('.page[data-page="edit"] .ed-bio').value; Store.s.user.bio = bio; Store.save(); Shop.openItem('bg', id); } });
          return;
        }
        Store.s.user.bio = document.querySelector('.page[data-page="edit"] .ed-bio').value;
        pickBg = id;
        App.refresh('edit');
      },
      save: () => {
        const bio = document.querySelector('.page[data-page="edit"] .ed-bio').value.trim();
        Store.s.user.bio = bio || '嗨，我超爱玩游戏！';
        Store.equip('bg', pickBg);
        UI.toast('资料已保存');
        App.back();
      },
    },
  });

  /* ================= L4 钱包 ================= */
  App.page('wallet', {
    render(el, p) {
      const s = Store.s;
      const f = p.cur && ['gems', 'coins', 'exp'].includes(p.cur) ? p.cur : 'all';
      const logs = s.log.filter((x) => f === 'all' || x.cur === f);
      const tabs = [['all', '全部'], ['gems', '钻石'], ['coins', '金币'], ['exp', '经验']];
      el.innerHTML = `${UI.nav({ title: '钱包', cls: 'is-white' })}
        <div class="body wl-body" data-scroll="main">
          <div class="wl-sum">
            <div><span>${UI.cur('gems', 26)}钻石</span>${UI.bind('gems')}<button class="btn btn-white btn-sm" data-act="topup" data-cur="gems">获取更多</button></div>
            <div><span>${UI.cur('coins', 26)}金币</span>${UI.bind('coins')}<button class="btn btn-white btn-sm" data-act="topup" data-cur="coins">充值</button></div>
            <div><span>${UI.cur('exp', 26)}等级</span><b class="num">Lv${s.user.lv}</b><em>${s.user.exp}/${Store.need(s.user.lv)}经验</em></div>
          </div>
          <p class="wl-rule">金币：对局底注、买装扮和道具 · 钻石：充值获得，可兑换金币 · 经验：用于升级<span class="nowrap">（胜+50，负+20）</span></p>
          <div class="pills wl-tabs">${tabs.map(([id, label]) => `<button class="pill ${id === f ? 'is-active' : ''}" data-act="f" data-f="${id}">${label}</button>`).join('')}</div>
          <div class="wl-list">${logs.length ? logs.map((x) => `<div class="wl-row">${UI.cur(x.cur, 30)}<span class="row-main"><b>${UI.esc(x.note)}</b><span>${ago(x.t)}</span></span><em class="${x.n > 0 ? 'is-in' : 'is-out'}">${x.n > 0 ? '+' : ''}${UI.fmt(x.n)}</em></div>`).join('')
            : UI.empty('还没有记录，先去领新手礼包吧！')}</div>
          <div class="bottom-space"></div>
        </div>`;
    },
    act: {
      f: (el) => { App.params('wallet').cur = el.dataset.f; App.refresh('wallet'); },
    },
  });

  /* ================= L5 背包 ================= */
  const KINDS = [['frame', '头像框'], ['bubble', '气泡'], ['bg', '背景'], ['items', '道具']];
  App.page('bag', {
    render(el, p) {
      const s = Store.s;
      const kind = KINDS.some(([k]) => k === p.kind) ? p.kind : 'frame';
      let grid;
      if (kind === 'items') {
        grid = `<div class="bag-items">
          <div class="sh-prop"><span class="sh-prop-ic"><img src="${IMG}ui/rocket.png" alt=""></span><div class="row-main"><b>加速卡×${s.boost}</b><span>匹配时使用，1秒内找到对手</span></div><button class="btn btn-line btn-sm" data-go="shop" data-t="items">获取更多</button></div>
          <div class="sh-prop"><span class="sh-prop-ic"><img src="${IMG}ui/pass.svg" alt=""></span><div class="row-main"><b>房卡×${s.pass}</b><span>可进入或创建高级房</span></div><button class="btn btn-line btn-sm" data-go="shop" data-t="items">获取更多</button></div>
          ${s.adFree ? `<div class="sh-prop"><span class="sh-prop-ic">${UI.ic('shield', 30)}</span><div class="row-main"><b>免广告卡</b><span>生效中 · 看广告奖励直接到账</span></div></div>` : ''}
        </div>`;
      } else {
        const cat = Store.catalog(kind);
        const ids = s.owned[kind];
        grid = ids.length || kind === 'frame' ? `<div class="sh-grid">${kind === 'frame' ? `<button class="sh-item ${!s.equip.frame ? 'is-eq' : ''}" data-act="equip" data-kind="frame" data-id=""><span class="sh-prev is-frame">${UI.av('me', 64, { frame: false })}</span><b>不戴头像框</b><span class="sh-state ${!s.equip.frame ? 'is-eq' : ''}">${!s.equip.frame ? '使用中' : '默认'}</span></button>` : ''}
          ${ids.map((id) => {
            const eq = s.equip[kind] === id;
            const prev = kind === 'frame' ? UI.av('me', 64, { frame: id }) : kind === 'bubble' ? `<span class="sh-bub ${UI.bubble(id)}">好棋！👋</span>` : `<span class="sh-bgprev" style="background:${UI.bg(id)}"></span>`;
            return `<button class="sh-item ${eq ? 'is-eq' : ''}" data-act="equip" data-kind="${kind}" data-id="${id}"><span class="sh-prev is-${kind}">${prev}</span><b>${cat[id].name}</b><span class="sh-state ${eq ? 'is-eq' : ''}">${eq ? `${UI.ic('check', 12)} 使用中` : '点击装备'}</span></button>`;
          }).join('')}</div>` : '';
        if (!ids.length && kind !== 'frame') grid = UI.empty('这里还空空的');
        grid += `<button class="bag-more" data-go="shop" data-t="decor">${UI.ic('gift', 18)} 去商城获取更多</button>`;
      }
      el.innerHTML = `${UI.nav({ title: '背包', cls: 'is-white' })}
        <div class="seg bag-seg">${KINDS.map(([k, label]) => `<button class="seg-it ${k === kind ? 'is-active' : ''}" data-act="kind" data-k="${k}">${label}</button>`).join('')}</div>
        <div class="body bag-body" data-scroll="main">${grid}<div class="bottom-space"></div></div>`;
    },
    act: {
      kind: (el) => { App.params('bag').kind = el.dataset.k; App.refresh('bag'); },
      equip: (el) => {
        const kind = el.dataset.kind;
        const id = el.dataset.id || null;
        if (Store.s.equip[kind] === id) return;
        Store.equip(kind, id);
        Sfx.play('tap');
        UI.toast(id ? `${Store.catalog(kind)[id].name}已装备` : '已卸下头像框');
        App.refresh('bag');
      },
    },
  });

  /* ================= L3 战绩（只有四子棋） ================= */
  App.page('stats', {
    render(el) {
      const s = Store.s;
      const g = D.game[D.GAME];
      const r = Store.rank(D.GAME);
      const gs = s.gstats[D.GAME] || { g: 0, w: 0 };
      const name = (id) => (D.people[id] ? D.people[id].name : id === 'bot' ? '人机' : '—');
      el.innerHTML = `${UI.nav({ title: '战绩', cls: 'is-white' })}
        <div class="body st-body" data-scroll="main">
          <div class="st-sum card"><span><b>${s.record.games}</b>对局</span><span><b>${s.record.wins}</b>胜场</span><span><b>${pct(s.record.wins, s.record.games)}%</b>胜率</span><span><b>${Math.floor(s.cnt.all.seconds / 60)}分钟</b>游戏时长</span></div>
          <div class="sec-hd"><h2>本赛季段位</h2></div>
          <div class="st-game card">
            <img class="st-ic" src="${g.icon}" alt="">
            <div class="st-game-main"><b>${g.name}</b><span>${UI.tier(r.tier, 20)}${D.tiers[r.tier]} · ${r.pts}/100分</span>
              <small>${gs.g}局 · 胜${gs.w}局 · 胜率${pct(gs.w, gs.g)}%</small></div>
            <button class="btn btn-orange btn-sm" data-tab="play">去对局</button>
          </div>
          <div class="sec-hd"><h2>最近对局</h2></div>
          <div class="st-list">${s.history.length ? s.history.map((m) => {
            const st = m.stake && D.stake[m.stake];
            return `<div class="st-row"><img src="${(D.game[m.game] || g).icon}" alt=""><span class="row-main"><b>VS ${name(m.vs)}</b><span>${m.t}${st ? ` · ${st.name}` : ''}</span></span>
            <em class="${m.win ? 'is-win' : m.draw ? '' : 'is-lose'}">${m.win ? '胜利' : m.draw ? '平局' : '失败'}</em>${matchVal(m)}</div>`;
          }).join('') : UI.empty('还没有对局记录')}</div>
          <div class="bottom-space"></div>
        </div>`;
    },
  });

  /* ================= L6 徽章 ================= */
  App.page('badges', {
    render(el) {
      const s = Store.s;
      const n = D.badges.filter((b) => s.badges[b.id]).length;
      el.innerHTML = `${UI.nav({ title: '徽章', sub: `已解锁${n}/${D.badges.length}`, cls: 'is-white' })}
        <div class="body bd-body" data-scroll="main"><div class="bd-grid">${D.badges.map((b) => {
          const got = s.badges[b.id];
          return `<button class="bd-it ${got ? 'is-got' : ''}" data-act="info" data-id="${b.id}"><span class="bd-ic"><img src="${b.img}" alt=""></span><b>${b.name}</b><span>${got ? md(got) : '未解锁'}</span></button>`;
        }).join('')}</div><div class="bottom-space"></div></div>`;
    },
    act: {
      info: (el) => {
        const b = D.badges.find((x) => x.id === el.dataset.id);
        const got = Store.s.badges[b.id];
        UI.dialog({ img: b.img, imgCls: got ? '' : 'is-gray', title: b.name, text: `${b.desc}${got ? `<br><b>${md(got)}解锁</b>` : '<br>尚未解锁'}`, buttons: [{ label: '知道了', key: 'ok' }] });
      },
    },
  });

  /* ================= L7 设置 ================= */
  const LANGS = [['简体中文', '简体中文'], ['English', '英语'], ['Español', '西班牙语'], ['Bahasa Indonesia', '印尼语'], ['हिन्दी', '印地语']];
  const langName = (l) => (LANGS.find(([v]) => v === l) || [l, l])[1];
  App.page('settings', {
    render(el) {
      const st = Store.s.settings;
      const row = (key, title, sub) => `<div class="cell"><span class="cell-main">${title}<small>${sub}</small></span>${UI.toggle(st[key], 'toggle', `data-k="${key}"`)}</div>`;
      el.innerHTML = `${UI.nav({ title: '设置', cls: 'is-white' })}
        <div class="body set-body" data-scroll="main">
          <div class="set-hd">通用</div>
          <div class="cells">
            <button class="cell" data-act="lang"><span class="cell-ic">${UI.ic('globe', 20)}</span><span class="cell-main">语言</span><span class="cell-val">${langName(st.lang)}</span>${UI.ic('right', 18, 'cell-arrow')}</button>
            <div class="cell"><span class="cell-ic">${UI.ic('volume', 20)}</span><span class="cell-main">音效</span>${UI.toggle(st.sound, 'toggle', 'data-k="sound"')}</div>
          </div>
          <div class="set-hd">通知</div>
          <div class="cells">${row('invite', '游戏邀请', '好友邀请你一起玩时提醒')}${row('friend', '好友申请', '有人想加你好友时提醒')}${row('turn', '回合提醒', '回合制游戏轮到你时提醒')}</div>
          <div class="set-hd">演示调试</div>
          <div class="cells">
            <button class="cell" data-act="nextDay"><span class="cell-ic">${UI.ic('calendar', 20)}</span><span class="cell-main">跳到下一天<small>当前第${Store.s.day}天 · 刷新每日任务、签到和广告次数</small></span>${UI.ic('right', 18, 'cell-arrow')}</button>
            <button class="cell" data-act="coins"><span class="cell-ic">${UI.cur('coins', 20)}</span><span class="cell-main">金币清零<small>用于演示“金币不足”流程</small></span>${UI.ic('right', 18, 'cell-arrow')}</button>
            <button class="cell" data-act="gems"><span class="cell-ic">${UI.cur('gems', 20)}</span><span class="cell-main">钻石清零<small>演示没有钻石、无法兑换金币</small></span>${UI.ic('right', 18, 'cell-arrow')}</button>
            <button class="cell set-reset" data-act="reset"><span class="cell-ic">${UI.ic('refresh', 20)}</span><span class="cell-main">重置演示<small>恢复成全新玩家</small></span>${UI.ic('right', 18, 'cell-arrow')}</button>
          </div>
          <p class="set-foot">Soulgame 原型 · 小米游戏中心<br>所有数据仅保存在当前浏览器中。</p>
          <div class="bottom-space"></div>
        </div>`;
    },
    act: {
      toggle: (el) => {
        const k = el.dataset.k;
        Store.s.settings[k] = !Store.s.settings[k];
        Store.emit('settings');
        el.classList.toggle('is-on', Store.s.settings[k]);
        el.setAttribute('aria-checked', String(Store.s.settings[k]));
        if (k === 'turn' && Store.s.settings.turn) UI.toast('回合提醒已开启 · 任务进度已更新');
      },
      lang: () => {
        const cur = Store.s.settings.lang;
        const c = UI.sheet({
          title: '语言',
          html: `<div class="cells sheet-cells">${LANGS.map(([l, name]) => `<button class="cell" data-act="pick" data-l="${l}"><span class="cell-main">${name}</span>${l === cur ? UI.ic('check', 20, 'cell-ic') : ''}</button>`).join('')}</div>`,
          acts: { pick: (el) => { c.close(); if (el.dataset.l !== '简体中文') UI.toast('演示仅提供中文界面'); } },
        });
      },
      nextDay: () => {
        Store.nextDay();
        App.refresh('settings');
        UI.toast(`已进入第${Store.s.day}天，每日任务、签到和广告已刷新`);
      },
      coins: () => {
        if (Store.s.coins) Store.add('coins', -Store.s.coins, '演示：金币清零');
        UI.toast('金币已清零');
      },
      gems: () => {
        if (Store.s.gems) Store.add('gems', -Store.s.gems, '演示：钻石清零');
        UI.toast('钻石已清零');
      },
      reset: async () => {
        const ok = await UI.confirm({ title: '确定重置演示？', text: '所有进度、购买和聊天记录都会清空，你将以新玩家身份重新开始。', ok: '重置', danger: true });
        if (ok) Store.reset();
      },
    },
  });
})();
