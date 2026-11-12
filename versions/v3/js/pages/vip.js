/**
 * V 会员中心：两档会员（会员 / 超级会员），参考 Yalla Ludo Knight / Baron
 * 入口统一用 Vip.open(tier?)：打开会员中心并选中档位
 */
(() => {
  'use strict';

  const IMG = D.IMG;
  const T = D.vip.tiers;
  const CROWN = `${IMG}ui/crown.png`;
  const VIDEO = '<svg class="ic" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 13 5.2 3.1a.5.5 0 0 0 .8-.4V8.3a.5.5 0 0 0-.8-.4L16 11"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>';
  // 对比表只列关键几行
  const CMP = ['dailyCoins', 'aid', 'protect', 'freePass', 'vipStake', 'voiceFree', 'videoFree', 'friendCap', 'visitors', 'frame', 'sign', 'expBonus', 'gems'];
  // 对比表格子窄，几项用短文案
  const SHORT = {
    dailyCoins: (t) => `${UI.fmt(t.dailyCoins)}/天`,
    aid: (t) => `${t.aid}次/天`,
    protect: (t) => `${t.protect}张/周`,
    frame: (t) => (t.frame === 'svip' ? '动态框' : '金框'),
  };
  const ITEMS = Object.fromEntries(D.vip.groups.flatMap((g) => g.items).map((it) => [it.key, it]));

  const icon = (name, size = 22) => (name === 'coin' ? UI.cur('coins', size) : name === 'gem' ? UI.cur('gems', size) : name === 'video' ? VIDEO : UI.ic(name, size));
  const off = (txt) => txt === '—';
  const selTier = () => {
    const t = +App.params('vip').tier;
    return t === 1 || t === 2 ? t : (Store.vipTier() === 1 ? 2 : 1);
  };

  /* ---------- 顶部：档位切换 + 会员卡 ---------- */
  function hero(sel) {
    const cur = Store.vipTier();
    const t = T[sel];
    const on = cur === sel;
    const tabs = [1, 2].map((k) => `<button class="vp-tab is-t${k} ${k === sel ? 'is-on' : ''}" data-act="tier" data-t="${k}">
      ${k === 2 ? UI.ic('crown', 15) : ''}${T[k].name}${cur === k ? '<i class="vp-tab-on">生效中</i>' : ''}</button>`).join('');
    const sub = on ? '生效中 · 按月自动续费' : cur === 2 && sel === 1 ? '超级会员已包含全部会员权益' : `${UI.usd(t.usd)}/月 · 随时可取消`;
    return `<div class="vp-tabs">${tabs}</div>
      <div class="vp-hero is-t${sel} ${on ? 'is-on' : ''}">
        <i class="vp-shine"></i>
        <div class="vp-hero-hd">
          <div class="vp-hero-tt"><b>Soulgame ${t.name}</b><span>${sub}</span></div>
          <img class="vp-crown" src="${CROWN}" alt="">
        </div>
        <div class="vp-me">
          ${UI.av('me', 64, { frame: t.frame })}
          <div class="vp-me-main">
            <b><span class="vname v${sel}">${UI.esc(Store.s.user.name)}</span>${UI.vipTag(sel)}</b>
            <span>${on ? '你的专属身份' : '开通后的身份预览'} · ${D.frames[t.frame].name}</span>
          </div>
          ${on ? '<i class="vp-on">生效中</i>' : ''}
        </div>
        ${cur ? daily(cur) : `<div class="vp-gift">${UI.cur('gems', 20)}<span>开通立得<b>${UI.fmt(t.gems)}钻石</b>，每天还能领<b>${UI.fmt(t.dailyCoins)}金币</b></span></div>`}
      </div>`;
  }
  /** 会员：今日福利 + 剩余补助 / 保护卡 */
  function daily(cur) {
    const t = T[cur];
    const can = Store.canVipDaily();
    return `<div class="vp-daily">
        <div class="vp-daily-hd">
          <span class="vp-daily-tt"><b>今日福利</b><em>${UI.cur('coins', 16)}+${UI.fmt(t.dailyCoins)} ${UI.cur('gems', 16)}+${t.dailyGems}</em></span>
          ${can ? '<button class="btn btn-gold btn-sm vp-daily-btn" data-act="daily">领取</button>' : '<span class="vp-daily-done">今日已领取 · 明天再来</span>'}
        </div>
        <div class="vp-left">
          <span>${UI.ic('shield', 14)}破产补助<b>${Store.aidLeft()}/${t.aid}</b>次/天</span>
          <span>${UI.ic('shield', 14)}段位保护卡<b>${Store.protectLeft()}/${t.protect}</b>张/周</span>
        </div>
      </div>`;
  }

  /* ---------- 权益分组 ---------- */
  function groups(sel) {
    const t = T[sel];
    return D.vip.groups.map((g) => {
      const n = g.items.filter((it) => !off(it.text(t))).length;
      return `<section class="vp-sec">
        <div class="vp-sec-hd"><h2>${g.name}</h2><span>${n}/${g.items.length}项</span></div>
        <div class="vp-grid">${g.items.map((it) => {
          const txt = it.text(t);
          const no = off(txt);
          return `<div class="vp-perk ${no ? 'is-off' : ''}" data-key="${it.key}">
            <span class="vp-perk-ic">${icon(it.icon)}${no ? `<i class="vp-lock">${UI.ic('lock', 10)}</i>` : ''}</span>
            <b>${it.title}</b><span>${no ? (sel === 1 ? '超级会员专属' : '暂未开放') : txt}</span></div>`;
        }).join('')}</div></section>`;
    }).join('');
  }

  /* ---------- 对比表 ---------- */
  function cell(it, t) {
    const v = T[t.id][it.key];
    const txt = it.text(t);
    if (off(txt)) return '<i class="vp-no">—</i>';
    if (v === true) return `<i class="vp-yes">${UI.ic('check', 16)}</i>`;
    return `<span>${SHORT[it.key] ? SHORT[it.key](t) : txt}</span>`;
  }
  function compare(sel) {
    const rows = CMP.map((k) => ITEMS[k]).filter(Boolean);
    return `<section class="vp-sec vp-cmp-sec">
      <div class="vp-sec-hd"><h2>权益对比</h2><span>普通 / 会员 / 超级会员</span></div>
      <div class="vp-cmp is-sel${sel}">
        <div class="vp-cmp-row is-hd"><span>权益</span><span>普通</span><span class="is-c1">会员</span><span class="is-c2">超级会员</span></div>
        ${rows.map((it) => `<div class="vp-cmp-row"><span>${it.title}</span>${T.map((t) => `<span class="is-c${t.id}">${cell(it, t)}</span>`).join('')}</div>`).join('')}
        <div class="vp-cmp-row is-price"><span>价格</span><span>免费</span><span class="is-c1">${UI.usd(T[1].usd)}/月</span><span class="is-c2">${UI.usd(T[2].usd)}/月</span></div>
      </div></section>`;
  }

  /* ---------- 底部按钮 ---------- */
  function cta(sel) {
    const cur = Store.vipTier();
    const t = T[sel];
    if (cur === sel) return '<button class="btn btn-ghost btn-lg btn-block vip-cta is-manage" data-act="buy">管理订阅</button>';
    if (cur === 2) return '<button class="btn btn-ghost btn-lg btn-block vip-cta is-manage" data-act="buy">你已是超级会员</button>';
    const label = cur === 1 ? `升级超级会员 · ${UI.usd(t.usd)}/月` : `开通${t.name} · ${UI.usd(t.usd)}/月`;
    return `<button class="btn btn-lg btn-block vip-cta is-t${sel}" data-act="buy">${label}</button>`;
  }

  async function buy() {
    const sel = selTier();
    const cur = Store.vipTier();
    if (cur === sel) { UI.demo('订阅管理'); return; }
    if (cur === 2) { UI.toast('超级会员已包含全部会员权益'); return; }
    const t = T[sel];
    const up = cur === 1;
    if (!(await Shop.pay({ title: `Soulgame ${t.name}`, usd: t.usd, sub: '包月' }))) return;
    Store.setVip(sel);
    App.refresh('vip');
    await UI.reward({
      title: sel === 2 ? '欢迎成为超级会员！' : '欢迎成为会员！',
      sub: `${up ? '已升级，' : ''}${UI.fmt(t.gems)}钻石和${D.frames[t.frame].name}已到账，记得每天来领福利。`,
      img: CROWN,
      items: { gems: t.gems, frame: t.frame },
      note: '会员开通',
    });
    App.refresh();
  }

  App.page('vip', {
    render(el) {
      const sel = selTier();
      el.innerHTML = `<div class="vp-bg is-t${sel}"></div>
        ${UI.nav({ title: '会员中心', right: `<div class="nav-chips">${UI.chips(['gems', 'coins'])}</div>` })}
        <div class="body vp-body" data-scroll="main">
          ${hero(sel)}
          ${groups(sel)}
          ${compare(sel)}
          <p class="vp-note">${UI.ic('info', 13)} 模拟订阅，按月自动续费，可随时取消</p>
          <div class="vp-foot-space"></div>
        </div>
        <div class="vp-foot">${cta(sel)}</div>`;
    },
    act: {
      tier: (el) => {
        const t = +el.dataset.t;
        if (t === selTier()) return;
        App.params('vip').tier = t;
        App.refresh('vip');
      },
      buy: () => buy(),
      daily: (el) => {
        const r = Store.vipDaily();
        if (!r) { UI.toast('今日福利已领取，明天再来'); App.refresh('vip'); return; }
        const p = UI.grant(r, '会员每日福利', el); // 起点位置在调用时就已记录，可以马上刷新页面
        App.refresh('vip');
        return p;
      },
    },
  });

  window.Vip = {
    open(tier) {
      UI.closeAll();
      App.go('vip', { tier: tier || (Store.vipTier() === 1 ? 2 : 1) });
    },
  };
})();
