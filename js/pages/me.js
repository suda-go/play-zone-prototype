/**
 * L 我的：L1 主页头部（含会员条、游客绑定提示）、L2 编辑资料、L3 战绩、L4 钱包、L5 背包（V7 首发版不做 L6 徽章）、
 * L7 设置（含账号与退出登录、黑名单、关于、重置演示）
 * 规则见《Soulgame V7 需求文档——我的与设置模块》
 */
(() => {
  'use strict';

  const IMG = D.IMG;
  const pad = (n) => String(n).padStart(2, '0');
  const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const mdOf = (d) => `${d.getMonth() + 1}月${d.getDate()}日`;
  /** 收支明细的时间：刚刚 / N分钟前 / N小时前 / 11月17日 21:08 / 2025年11月17日 21:08 */
  const ago = (t) => {
    const s = Math.round((Date.now() - t) / 1000);
    if (s < 60) return '刚刚';
    if (s < 3600) return `${Math.floor(s / 60)}分钟前`;
    if (s < 86400) return `${Math.floor(s / 3600)}小时前`;
    const d = new Date(t);
    const md = `${mdOf(d)} ${hm(d)}`;
    return d.getFullYear() === new Date().getFullYear() ? md : `${d.getFullYear()}年${md}`;
  };
  /** 对局记录的时间：今天 21:08 / 昨天 21:08 / 11月16日 21:08 / 2025年11月16日 */
  const dayTime = (t) => {
    const d = new Date(t);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (t >= today) return hm(d);
    if (t >= today - 86400000) return `昨天 ${hm(d)}`;
    return d.getFullYear() === now.getFullYear() ? `${mdOf(d)} ${hm(d)}` : `${d.getFullYear()}年${mdOf(d)}`;
  };
  /** 胜率：还没有对局时显示“—” */
  const rateText = (w, g) => (g ? `${Math.round((w / g) * 100)}%` : '—');
  /** 游戏时长：不到 1 小时“N分钟”；1 小时及以上“N小时”，保留 1 位小数、向下取整，去掉末尾的“.0” */
  const playTime = (sec) => {
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}分钟`;
    return `${String(Math.floor(sec / 360) / 10).replace(/\.0$/, '')}小时`;
  };

  /* ---------- 个性签名：按“用户看到的一个字”计数，一个 emoji 算 1 个；不支持换行 ---------- */
  const BIO_MAX = 60;
  const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('zh', { granularity: 'grapheme' }) : null;
  const chars = (str) => (segmenter ? [...segmenter.segment(str)].map((x) => x.segment) : Array.from(str));
  const bioLen = (str) => chars(str).length;
  const bioClip = (str) => chars(str).slice(0, BIO_MAX).join('');
  /** 演示用的签名审核（正式产品由服务端检查）：网址、手机号、其他社交账号、几个示例敏感词 */
  const BAD_BIO = [/https?:\/\//i, /www\./i, /\.(com|net|org|cn|io|me)\b/i, /(微信|vx|wechat|whatsapp|telegram|t\.me)/i, /(赌博|色情|代练|外挂)/];
  const badBio = (str) => BAD_BIO.some((re) => re.test(str)) || /\d{9,}/.test(str.replace(/[\s-]/g, ''));

  /** 对局记录右侧：排位局显示金币净变化，好友房 / 练习单独标注 */
  function matchVal(m) {
    if (m.practice || m.mode === 'ai') return '<i class="st-tag">练习</i>';
    if (m.mode === 'room' && !m.bet) return '<i class="st-tag">好友局</i>';
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
      : `<small>每天${UI.fmt(t.dailyCoins)}金币 · 签到×${t.sign} · 破产补助</small>`;
    return `<button class="me-vip is-t${tier}" data-act="vip"><img class="me-vip-crown" src="${IMG}ui/crown.png" alt="">
      <span class="me-vip-main"><b>${t.name}生效中</b>${sub}</span>
      <span class="me-vip-btn">${Store.canVipDaily() ? '去领取' : '会员中心'}</span></button>`;
  }

  /** V4 游客提示：绑定账号后换手机也能找回进度 */
  function guestBanner() {
    if (!Auth.isGuest()) return '';
    return `<button class="me-guest" data-act="bind"><span class="me-guest-ic">${UI.ic('user', 20)}</span>
      <span class="me-guest-m"><b>你正在使用游客账号</b><small>绑定账号，换手机也不会丢进度</small></span><span class="me-guest-btn">去绑定</span></button>`;
  }

  /* ================= L1 Me ================= */
  App.page('me', {
    render(el) {
      const s = Store.s;
      const bio = s.user.bio
        ? `<p class="me-bio">${UI.esc(s.user.bio)}</p>`
        : '<button class="me-bio is-empty" data-go="edit">写一句个性签名吧</button>';
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
            ${bio}
          </div>
          ${guestBanner()}
          ${vipBanner()}
          <div class="me-coin">
            <button class="me-coin-hit" data-go="wallet" aria-label="收支明细"></button>
            <span class="me-coin-ic">${UI.cur('coins', 46)}</span>
            <span class="me-coin-m"><small>我的金币</small>${UI.bind('coins', 'me-coin-n')}<em>收支明细 ${UI.ic('right', 12)}</em></span>
            <button class="btn btn-orange btn-md me-coin-btn" data-act="topup" data-cur="coins">${UI.ic('plus', 15)} 充值</button>
          </div>
          <button class="me-stats card" data-go="stats">
            <span><b>${UI.fmt(s.record.games)}</b>对局</span><span><b>${UI.fmt(s.record.wins)}</b>胜场</span>
            <span><b>${rateText(s.record.wins, s.record.games)}</b>胜率</span>
            ${UI.ic('right', 18, 'cell-arrow')}
          </button>
          <div class="cells me-cells">
            <button class="cell" data-go="bag" data-kind="frame"><span class="cell-ic">${UI.ic('bag', 21)}</span><span class="cell-main">背包</span><span class="cell-val">${Store.ownedCount()}件</span>${UI.ic('right', 18, 'cell-arrow')}</button>
            <button class="cell" data-go="wallet"><span class="cell-ic">${UI.ic('wallet', 21)}</span><span class="cell-main">钱包与明细</span>${UI.ic('right', 18, 'cell-arrow')}</button>
            <button class="cell" data-act="friends"><span class="cell-ic">${UI.ic('users', 21)}</span><span class="cell-main">好友</span><span class="cell-val">${s.friends.length}${s.requests.length ? ` <i class="count is-inline">${s.requests.length}</i>` : ''}</span>${UI.ic('right', 18, 'cell-arrow')}</button>
            <button class="cell" data-go="shop"><span class="cell-ic">${UI.ic('gift', 21)}</span><span class="cell-main">商城</span><span class="cell-val">装扮、充值和会员</span>${UI.ic('right', 18, 'cell-arrow')}</button>
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
      bind: () => Auth.bind(),
    },
  });


  /* ================= L2 编辑资料 =================
   * 改的内容先放在草稿 ed 里，点“保存”才一起提交；去背包换头像框再回来，草稿还在。
   * 有没保存的改动时按返回，先问“放弃修改？”
   */
  let ed = null; // { p, bio, bg }
  const edDirty = () => !!ed && (ed.bio.trim() !== Store.s.user.bio || ed.bg !== Store.s.equip.bg);
  const edPage = () => document.querySelector('.page[data-page="edit"]');
  App.page('edit', {
    render(el, p) {
      const s = Store.s;
      if (!ed || ed.p !== p) ed = { p, bio: s.user.bio || '', bg: s.equip.bg };
      el.innerHTML = `${UI.nav({ title: '编辑资料', cls: 'is-white', right: '<button class="btn btn-primary btn-sm" data-act="save">保存</button>' })}
        <div class="body ed-body" data-scroll="main">
          <div class="ed-prev" style="background:${UI.bg(ed.bg)}">${UI.av('me', 72)}<b>${UI.esc(s.user.name)}</b></div>
          <div class="ed-sec"><h3>个性签名</h3><textarea class="ed-bio" rows="3" placeholder="写一句个性签名吧">${UI.esc(ed.bio)}</textarea><span class="ed-n">${bioLen(ed.bio)}/${BIO_MAX}</span></div>
          <div class="ed-sec"><h3>主页背景</h3><div class="ed-bgs">${Object.entries(D.bgs).map(([id, b]) => {
            const own = Store.owns('bg', id);
            return `<button class="ed-bg ${id === ed.bg ? 'is-on' : ''} ${own ? '' : 'is-lock'}" data-act="bg" data-id="${id}"><span style="background:${b.css}"></span><b>${b.name}</b>${own ? '' : `<i>${UI.ic('lock', 12)} ${b.price}</i>`}</button>`;
          }).join('')}</div>
          <p class="ed-tip">${UI.ic('info', 14)} 未解锁的背景可以在商城用金币购买。</p></div>
          <div class="ed-sec"><h3>头像框</h3><button class="cell card" data-go="bag" data-kind="frame"><span class="cell-ic">${UI.av('me', 34)}</span><span class="cell-main">${s.equip.frame ? D.frames[s.equip.frame].name : '未佩戴头像框'}<small>去背包更换</small></span>${UI.ic('right', 18, 'cell-arrow')}</button></div>
        </div>`;
      const ta = el.querySelector('.ed-bio');
      const n = el.querySelector('.ed-n');
      // 不支持换行：回车没有反应，粘贴进来的换行换成空格；超过 60 个字截掉
      const tidy = () => {
        let v = ta.value.replace(/[\r\n]+/g, ' ');
        if (bioLen(v) > BIO_MAX) v = bioClip(v);
        if (v !== ta.value) ta.value = v;
        ed.bio = v;
        n.textContent = `${bioLen(v)}/${BIO_MAX}`;
      };
      ta.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });
      ta.addEventListener('input', (e) => { if (e.isComposing) { n.textContent = `${bioLen(ta.value)}/${BIO_MAX}`; return; } tidy(); });
      ta.addEventListener('compositionend', tidy);
    },
    back() {
      if (!edDirty()) return true;
      UI.confirm({ title: '放弃修改？', text: '你改的内容还没有保存。', ok: '放弃', cancel: '继续编辑', danger: true })
        .then((yes) => { if (yes) { ed = null; App.pop(); } });
      return false;
    },
    act: {
      bg: (el) => {
        const id = el.dataset.id;
        if (!Store.owns('bg', id)) {
          UI.dialog({ title: `${D.bgs[id].name}未解锁`, text: `去商城花${UI.cur('coins', 15)}${D.bgs[id].price}金币就能获得。`, buttons: [{ label: '去商城', key: 'shop' }, { label: '取消', key: 'no', cls: 'btn-ghost' }] })
            .then((k) => {
              if (k !== 'shop') return;
              // 买到后回到编辑资料，自动选中这个背景，点“保存”生效
              Shop.openItem('bg', id, { onBought: () => { if (ed) { ed.bg = id; App.refresh('edit'); } } });
            });
          return;
        }
        ed.bg = id;
        App.refresh('edit');
      },
      save: () => {
        if (!edDirty()) { App.back(); return; }
        const bio = ed.bio.trim();
        if (badBio(bio)) {
          Sfx.play('error');
          UI.toast('签名包含不适合展示的内容，请修改');
          edPage()?.querySelector('.ed-bio')?.focus();
          return;
        }
        const s = Store.s;
        ed.bio = bio;
        s.user.bio = bio;
        if (ed.bg !== s.equip.bg) Store.equip('bg', ed.bg); else Store.emit('profile');
        UI.toast('资料已保存');
        App.back();
      },
    },
  });

  /* ================= L4 钱包（收支明细） =================
   * 筛选：全部 / 收入 / 支出；余额和金额都显示完整数字；只显示最近 90 天，一页 20 条，滑到底加载下一页
   */
  const WL_PAGE = 20;
  const WL_DAYS = 90;
  let wlShown = WL_PAGE;
  const wlBody = () => document.querySelector('.page[data-page="wallet"] [data-scroll="main"]');
  App.page('wallet', {
    render(el, p) {
      const s = Store.s;
      if (p !== this._p) { this._p = p; wlShown = WL_PAGE; }
      const f = ['in', 'out'].includes(p.f) ? p.f : 'all';
      const since = Date.now() - WL_DAYS * 86400000;
      const logs = s.log.filter((x) => x.cur === 'coins' && x.t >= since && (f === 'all' || (f === 'in' ? x.n > 0 : x.n < 0)));
      const page = logs.slice(0, wlShown);
      const more = logs.length > page.length;
      const tabs = [['all', '全部'], ['in', '收入'], ['out', '支出']];
      el.innerHTML = `${UI.nav({ title: '钱包', cls: 'is-white' })}
        <div class="body wl-body" data-scroll="main">
          <div class="wl-sum">
            <div><span>${UI.cur('coins', 26)}金币</span>${UI.bind('coins', '', { full: true })}<button class="btn btn-white btn-sm" data-act="topup" data-cur="coins">充值</button></div>
          </div>
          <p class="wl-rule">金币：对局底注、买装扮、付费通话；赢了拿走奖池，做任务、签到也能领</p>
          <div class="pills wl-tabs">${tabs.map(([id, label]) => `<button class="pill ${id === f ? 'is-active' : ''}" data-act="f" data-f="${id}">${label}</button>`).join('')}</div>
          <div class="wl-list">${page.length ? page.map((x) => `<div class="wl-row">${UI.cur(x.cur, 30)}<span class="row-main"><b>${UI.esc(x.note)}</b><span>${ago(x.t)}</span></span><em class="${x.n > 0 ? 'is-in' : 'is-out'}">${x.n > 0 ? '+' : '-'}${UI.fmtFull(Math.abs(x.n))}</em></div>`).join('')
            : UI.empty('还没有收支记录')}</div>
          ${more ? '<p class="wl-end">加载中…</p>' : page.length ? `<p class="wl-end">只显示最近 ${WL_DAYS} 天的记录</p>` : ''}
          <div class="bottom-space"></div>
        </div>`;
      if (more) {
        const body = el.querySelector('.wl-body');
        const onScroll = () => {
          if (body.scrollTop + body.clientHeight < body.scrollHeight - 120) return;
          body.removeEventListener('scroll', onScroll);
          wlShown += WL_PAGE;
          setTimeout(() => App.refresh('wallet'), 250);
        };
        body.addEventListener('scroll', onScroll, { passive: true });
      }
    },
    act: {
      f: (el) => {
        App.params('wallet').f = el.dataset.f;
        wlShown = WL_PAGE;
        App.refresh('wallet');
        const b = wlBody();
        if (b) b.scrollTop = 0;
      },
    },
  });
  // 停留在钱包页时金币有变化：余额马上更新（data-bind），列表顶部插入新的一行
  Store.on((type) => { if (type === 'wallet' && App.top() === 'wallet') App.refresh('wallet'); });

  /* ================= L5 背包 =================
   * 第一个格子固定（不戴头像框 / 经典 / 极光），其余按获得时间倒序；会员到期后会员框盖灰、显示“会员专属”
   */
  const KINDS = [['frame', '头像框'], ['bubble', '气泡'], ['bg', '背景']]; // V7 首发版没有道具
  const DEF = { frame: null, bubble: 'default', bg: 'aurora' };
  const needTier = (id) => (D.frames[id] && D.frames[id].vip === 2 ? 2 : 1);
  App.page('bag', {
    render(el, p) {
      const s = Store.s;
      const kind = KINDS.some(([k]) => k === p.kind) ? p.kind : 'frame';
      const cat = Store.catalog(kind);
      const rest = s.owned[kind].filter((id) => cat[id] && id !== DEF[kind]).reverse();
      const list = [DEF[kind], ...rest];
      const card = (id) => {
        const eq = (s.equip[kind] || null) === id;
        const usable = Store.canUse(kind, id);
        const prev = kind === 'frame' ? UI.av('me', 64, { frame: id || false }) : kind === 'bubble' ? `<span class="sh-bub ${UI.bubble(id)}">好棋！👋</span>` : `<span class="sh-bgprev" style="background:${UI.bg(id)}"></span>`;
        const name = id ? cat[id].name : '不戴头像框';
        const st = eq ? `${UI.ic('check', 12)} 使用中` : !usable ? `${UI.ic('lock', 12)} 会员专属` : id === null ? '默认' : '点击装备';
        return `<button class="sh-item ${eq ? 'is-eq' : ''} ${usable ? '' : 'is-vlock'}" data-act="equip" data-kind="${kind}" data-id="${id || ''}"><span class="sh-prev is-${kind}">${prev}</span><b>${name}</b><span class="sh-state ${eq ? 'is-eq' : ''}">${st}</span></button>`;
      };
      el.innerHTML = `${UI.nav({ title: '背包', cls: 'is-white' })}
        <div class="seg bag-seg">${KINDS.map(([k, label]) => `<button class="seg-it ${k === kind ? 'is-active' : ''}" data-act="kind" data-k="${k}">${label}</button>`).join('')}</div>
        <div class="body bag-body" data-scroll="main"><div class="sh-grid">${list.map(card).join('')}</div>
          <button class="bag-more" data-go="shop" data-t="decor">${UI.ic('gift', 18)} 去商城获取更多</button>
          <div class="bottom-space"></div></div>`;
    },
    act: {
      kind: (el) => { App.params('bag').kind = el.dataset.k; App.refresh('bag'); },
      equip: (el) => {
        const kind = el.dataset.kind;
        const id = el.dataset.id || null;
        if ((Store.s.equip[kind] || null) === id) return;
        if (!Store.canUse(kind, id)) {
          const name = Store.catalog(kind)[id].name;
          Sfx.play('error');
          UI.dialog({ title: `开通会员后才能使用${name}`, text: '会员到期后，会员框还留在背包里，重新开通就能接着用。', x: false, buttons: [{ label: '去开通', key: 'go' }, { label: '取消', key: 'no', cls: 'btn-ghost' }] })
            .then((k) => { if (k === 'go') Vip.open(needTier(id)); });
          return;
        }
        Store.equip(kind, id);
        Sfx.play('tap');
        UI.toast(id ? `${Store.catalog(kind)[id].name}已装备` : '已卸下头像框');
        App.refresh('bag');
      },
    },
  });

  /* ================= L3 战绩（只有四子棋） =================
   * 最近 50 局；人机对手名字后带“AI”；点真人对手打开 TA 的主页（方便把一起玩过的人加为好友）
   */
  App.page('stats', {
    render(el) {
      const s = Store.s;
      const g = D.game[D.GAME];
      el.innerHTML = `${UI.nav({ title: '战绩', cls: 'is-white' })}
        <div class="body st-body" data-scroll="main">
          <div class="st-sum card"><span><b>${UI.fmt(s.record.games)}</b>对局</span><span><b>${UI.fmt(s.record.wins)}</b>胜场</span><span><b>${rateText(s.record.wins, s.record.games)}</b>胜率</span><span><b>${playTime(s.cnt.all.seconds)}</b>游戏时长</span></div>
          <div class="sec-hd"><h2>最近对局</h2></div>
          <div class="st-list">${s.history.length ? s.history.map((m) => {
            const P = D.people[m.vs];
            const ai = !!(P && P.ai) || m.vs === 'bot';
            const st = m.stake && D.stake[m.stake];
            const how = m.mode === 'room' ? '好友房' : st ? st.name : '';
            const tap = P && !ai && !P.local;
            return `<div class="st-row ${tap ? 'is-tap' : ''}" ${tap ? `data-go="profile" data-uid="${m.vs}"` : ''}><img src="${(D.game[m.game] || g).icon}" alt="">
              <span class="row-main"><b>VS ${UI.esc(P ? P.name : '—')}${ai ? '<i class="st-ai">AI</i>' : ''}</b><span>${m.ts ? dayTime(m.ts) : m.t}${how ? ` · ${how}` : ''}</span></span>
              <em class="${m.win ? 'is-win' : m.draw ? '' : 'is-lose'}">${m.win ? '胜利' : m.draw ? '平局' : '失败'}</em>${matchVal(m)}</div>`;
          }).join('') : `${UI.empty('还没有对局记录')}<div class="st-go"><button class="btn btn-primary btn-md" data-act="play">去开一局</button></div>`}</div>
          <div class="bottom-space"></div>
        </div>`;
    },
    act: {
      play: () => App.tab('play'),
    },
  });


  /* ================= L7 设置 ================= */
  // 每种语言用它自己的文字显示（看不懂中文的用户也能找到自己的语言）；原型只有中文界面
  const LANGS = ['简体中文', 'English', 'Español', 'Bahasa Indonesia', 'हिन्दी'];
  const VERSION = '1.0.0';
  App.page('settings', {
    render(el) {
      const st = Store.s.settings;
      const row = (key, title, sub) => `<div class="cell"><span class="cell-main">${title}<small>${sub}</small></span>${UI.toggle(st[key], 'toggle', `data-k="${key}"`)}</div>`;
      // V4 账号：游客可以绑定；正式账号显示登录方式
      const by = Auth.by();
      const guest = Auth.isGuest();
      const accIc = Auth.ICON[by] || UI.ic(by === 'email' ? 'mail' : 'user', 20);
      const account = guest
        ? `<button class="cell set-acc" data-act="bind"><span class="set-acc-ic is-guest">${accIc}</span><span class="cell-main">账号与绑定<small>${UI.esc(Auth.label())}</small></span><span class="cell-val set-bind">去绑定</span>${UI.ic('right', 18, 'cell-arrow')}</button>`
        : `<div class="cell set-acc"><span class="set-acc-ic is-${by}">${accIc}</span><span class="cell-main">当前账号<small>${UI.esc(Auth.label())}</small></span><span class="cell-val">已登录</span></div>`;
      const blocked = (Store.s.blocked || []).length;
      const vip = Store.vipTier();
      el.innerHTML = `${UI.nav({ title: '设置', cls: 'is-white' })}
        <div class="body set-body" data-scroll="main">
          <div class="set-hd">账号</div>
          <div class="cells">
            ${account}
            <button class="cell set-logout" data-act="logout"><span class="cell-ic">${UI.ic('logout', 20)}</span><span class="cell-main">${guest ? '退出游客账号' : '退出登录'}</span></button>
            <button class="cell set-del" data-go="delete"><span class="cell-main">注销账号</span>${UI.ic('right', 18, 'cell-arrow')}</button>
          </div>
          <div class="set-hd">通用</div>
          <div class="cells">
            <button class="cell" data-act="lang"><span class="cell-ic">${UI.ic('globe', 20)}</span><span class="cell-main">语言</span><span class="cell-val">${UI.esc(LANGS.includes(st.lang) ? st.lang : LANGS[0])}</span>${UI.ic('right', 18, 'cell-arrow')}</button>
            <div class="cell"><span class="cell-ic">${UI.ic('volume', 20)}</span><span class="cell-main">音效</span>${UI.toggle(st.sound, 'toggle', 'data-k="sound"')}</div>
          </div>
          <div class="set-hd">通知</div>
          <div class="cells">
            ${st.sysNotifOff ? `<div class="cell set-sys"><span class="cell-ic">${UI.ic('bell', 20)}</span><span class="cell-main">系统通知已关闭，开启后才能收到提醒</span><button class="btn btn-primary btn-sm" data-act="sysOn">去开启</button></div>` : ''}
            ${row('invite', '游戏邀请', '好友邀请你一起玩时提醒')}${row('friend', '好友申请', '有人想加你好友时提醒')}
          </div>
          <div class="set-hd">隐私</div>
          <div class="cells">
            <button class="cell" data-go="blocks"><span class="cell-ic">${UI.ic('ban', 20)}</span><span class="cell-main">黑名单</span>${blocked ? `<span class="cell-val">${blocked}人</span>` : ''}${UI.ic('right', 18, 'cell-arrow')}</button>
          </div>
          <div class="set-hd">关于</div>
          <div class="cells">
            <button class="cell" data-act="terms"><span class="cell-main">用户协议</span>${UI.ic('right', 18, 'cell-arrow')}</button>
            <button class="cell" data-act="terms"><span class="cell-main">隐私政策</span>${UI.ic('right', 18, 'cell-arrow')}</button>
            <button class="cell" data-act="contact"><span class="cell-main">联系我们<small>发邮件给客服，会自动带上你的 ID 和版本号</small></span>${UI.ic('right', 18, 'cell-arrow')}</button>
            <div class="cell"><span class="cell-main">版本</span><span class="cell-val">${VERSION}</span></div>
          </div>
          <div class="set-hd">演示调试</div>
          <div class="cells">
            <button class="cell" data-act="seedFriends"><span class="cell-ic">${UI.ic('users', 20)}</span><span class="cell-main">填充示例好友<small>${Store.s.friends.length ? `已有${Store.s.friends.length}位好友` : '纯新用户没有好友；点这里变成有好友和聊天记录的老用户'}</small></span>${UI.ic('right', 18, 'cell-arrow')}</button>
            <div class="cell"><span class="cell-ic">${UI.ic('phone', 20)}</span><span class="cell-main">模拟 iOS 设备<small>打开后登录页和绑定弹层显示“通过 Apple 登录”</small></span>${UI.toggle(Auth.isIOS(), 'plat')}</div>
            <div class="cell"><span class="cell-ic">${UI.ic('bell', 20)}</span><span class="cell-main">模拟系统通知已关闭<small>打开后“通知”上方提示去系统设置里开启</small></span>${UI.toggle(!!st.sysNotifOff, 'sysDemo')}</div>
            ${vip ? `<button class="cell" data-act="vipExpire"><span class="cell-ic">${UI.ic('crown', 20)}</span><span class="cell-main">让会员到期<small>会员框留在背包里但不能用，正在用的会员框卸下</small></span>${UI.ic('right', 18, 'cell-arrow')}</button>` : ''}
            <button class="cell" data-act="nextDay"><span class="cell-ic">${UI.ic('calendar', 20)}</span><span class="cell-main">跳到下一天<small>当前第${Store.s.day}天 · 刷新每日任务和签到</small></span>${UI.ic('right', 18, 'cell-arrow')}</button>
            <button class="cell" data-act="coins"><span class="cell-ic">${UI.cur('coins', 20)}</span><span class="cell-main">金币清零<small>用于演示“金币不足”流程</small></span>${UI.ic('right', 18, 'cell-arrow')}</button>
            <button class="cell set-reset" data-act="reset"><span class="cell-ic">${UI.ic('refresh', 20)}</span><span class="cell-main">重置演示<small>恢复成全新玩家，从登录页重新开始</small></span>${UI.ic('right', 18, 'cell-arrow')}</button>
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
      },
      lang: () => {
        const cur = LANGS.includes(Store.s.settings.lang) ? Store.s.settings.lang : LANGS[0];
        const c = UI.sheet({
          title: '语言',
          html: `<div class="cells sheet-cells">${LANGS.map((l) => `<button class="cell" data-act="pick" data-l="${l}"><span class="cell-main">${l}</span>${l === cur ? UI.ic('check', 20, 'cell-ic') : ''}</button>`).join('')}</div>`,
          acts: { pick: (el) => { c.close(); if (el.dataset.l !== '简体中文') UI.toast('演示仅提供中文界面'); } },
        });
      },
      terms: () => UI.demo('协议页面'),
      contact: () => UI.demo('打开邮件 app'),
      sysOn: () => {
        Store.s.settings.sysNotifOff = false;
        Store.emit('settings');
        App.refresh('settings');
        UI.toast('演示：已在系统设置里打开通知');
      },
      sysDemo: () => {
        Store.s.settings.sysNotifOff = !Store.s.settings.sysNotifOff;
        Store.emit('settings');
        App.refresh('settings');
      },
      vipExpire: () => {
        if (!Store.vipTier()) return;
        Store.setVip(0);
        App.refresh('settings');
        UI.toast('会员已到期（演示）');
      },
      nextDay: () => {
        Store.nextDay();
        App.refresh('settings');
        UI.toast(`已进入第${Store.s.day}天，每日任务和签到已刷新`);
      },
      coins: () => {
        if (Store.s.coins) Store.add('coins', -Store.s.coins, '演示：金币清零');
        UI.toast('金币已清零');
      },
      reset: async () => {
        const ok = await UI.confirm({ title: '确定重置演示？', text: '所有进度、购买、聊天记录和登录信息都会清空，你将以新玩家身份重新开始。', ok: '重置', danger: true });
        if (ok) Store.reset();
      },
      bind: () => Auth.bind(),
      logout: () => Auth.logout(),
      // 演示：模拟 iOS（iOS 才有 Apple 登录）
      plat: (el) => {
        const ios = !Auth.isIOS();
        Auth.setPlatform(ios ? 'ios' : 'android');
        el.classList.toggle('is-on', ios);
        el.setAttribute('aria-checked', String(ios));
        UI.toast(ios ? '已切换为 iOS 演示，登录页和绑定弹层会显示 Apple 登录' : '已切换为 Android 演示');
      },
      seedFriends: () => {
        Store.seedFriends();
        App.refresh('settings');
        UI.toast(`已填充示例好友，现在有${Store.s.friends.length}位好友`);
      },
    },
  });

  /* ================= L8 黑名单（设置 → 隐私）：查看和移出；拉黑的入口在玩家主页 ================= */
  App.page('blocks', {
    render(el) {
      const list = (Store.s.blocked || []).filter((b) => D.people[b.id]);
      el.innerHTML = `${UI.nav({ title: '黑名单', cls: 'is-white' })}
        <div class="body bl-body" data-scroll="main">${list.length ? `<div class="bl-list">${list.map((b) => {
          const P = D.people[b.id];
          return `<div class="bl-row">${UI.av(b.id, 44, { frame: false })}<span class="row-main"><b>${UI.esc(P.name)}</b><span>ID ${P.uid}</span></span><button class="btn btn-ghost btn-sm" data-act="unblock" data-uid="${b.id}">移出</button></div>`;
        }).join('')}</div>` : UI.empty('你还没有拉黑任何人')}
          <div class="bottom-space"></div>
        </div>`;
    },
    act: {
      unblock: async (el) => {
        const uid = el.dataset.uid;
        const ok = await UI.confirm({ title: `把${D.people[uid].name}移出黑名单？`, text: '移出后对方可以再给你发消息、加你好友。', ok: '移出' });
        if (!ok) return;
        Store.unblock(uid);
        UI.toast('已移出黑名单');
        App.refresh('blocks');
      },
    },
  });
})();
