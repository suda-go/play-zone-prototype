/**
 * I 商城：I1 余额栏、I2 装扮、I3 道具、I4 商品详情、I5 Coins 充值、I6 Gems 礼包、I7 VIP、
 * I8 小米钱包支付、I9 看广告领 Gems、I10 余额不足弹窗
 */
(() => {
  'use strict';

  const IMG = D.IMG;
  const TABS = [['decor', '装扮'], ['items', '道具'], ['topup', '充值'], ['vip', '会员']];
  const KINDS = [['frame', '头像框', D.frames], ['bubble', '聊天气泡', D.bubbles], ['bg', '主页背景', D.bgs]];
  const KIND_NAME = { frame: '头像框', bubble: '聊天气泡', bg: '主页背景' };

  /* ---------- 预览 ---------- */
  function preview(kind, id, size = 64) {
    if (kind === 'frame') return UI.av('me', size, { frame: id });
    if (kind === 'bubble') return `<span class="sh-bub ${UI.bubble(id)}">好棋！👋</span>`;
    return `<span class="sh-bgprev" style="background:${UI.bg(id)}"></span>`;
  }
  function state(kind, id) {
    const it = Store.catalog(kind)[id];
    const owned = Store.owns(kind, id);
    const equipped = Store.s.equip[kind] === id;
    const lock = !owned && it.vip ? '会员专属' : !owned && it.season ? '达到黄金' : '';
    return { it, owned, equipped, lock };
  }
  function itemCard(kind, id) {
    const { it, owned, equipped, lock } = state(kind, id);
    const price = equipped ? `<span class="sh-state is-eq">${UI.ic('check', 12)} 已装备</span>`
      : owned ? '<span class="sh-state">已拥有</span>'
        : lock ? `<span class="sh-state is-lock">${UI.ic('lock', 12)} ${lock}</span>`
          : `<span class="sh-price">${UI.cur('coins', 16)}${it.price}</span>`;
    const btn = equipped ? '使用中' : owned ? '装备' : lock ? '查看' : '兑换';
    return `<button class="sh-item ${equipped ? 'is-eq' : ''}" data-act="item" data-kind="${kind}" data-id="${id}">
      <span class="sh-prev is-${kind}">${preview(kind, id)}</span>
      <b>${it.name}</b>${price}<span class="sh-btn ${owned || equipped ? 'is-owned' : ''}">${btn}</span>
    </button>`;
  }

  /* ---------- I4 商品详情 ---------- */
  function detailHtml(kind, id) {
    const { it, owned, equipped, lock } = state(kind, id);
    let big;
    if (kind === 'frame') {
      big = `<div class="sd-frame">${UI.av('me', 116, { frame: id })}<b>${UI.esc(Store.s.user.name)}</b><span>Lv${Store.s.user.lv}</span></div>`;
    } else if (kind === 'bubble') {
      big = `<div class="sd-chat"><div class="sd-msg">${UI.av('lily', 30)}<span class="sd-bub">打得漂亮！再来一局？</span></div>
        <div class="sd-msg is-me"><span class="sd-bub ${UI.bubble(id)}">没问题！等我1分钟😎</span>${UI.av('me', 30)}</div></div>`;
    } else {
      big = `<div class="sd-bg" style="background:${UI.bg(id)}"><div class="sd-bg-card">${UI.av('me', 52)}<b>${UI.esc(Store.s.user.name)}</b><span>Lv${Store.s.user.lv} · ID ${Store.s.user.uid}</span></div></div>`;
    }
    const where = { frame: '会显示在个人主页、聊天、房间和对局中。', bubble: '你发出的聊天消息会使用这个样式。', bg: '显示在个人主页顶部。' }[kind];
    const foot = equipped ? `<button class="btn btn-ghost btn-lg btn-block" data-act="unequip">${kind === 'frame' ? '卸下' : '恢复默认'}</button>`
      : owned ? '<button class="btn btn-primary btn-lg btn-block" data-act="equip">装备</button>'
        : lock ? `<button class="btn btn-gold btn-lg btn-block" data-act="unlock">${it.vip ? '开通会员解锁' : '任意游戏达到黄金解锁'}</button>`
          : `<button class="btn btn-orange btn-lg btn-block" data-act="buy">购买 <span class="btn-price">${UI.cur('coins', 18)}${it.price}</span></button>`;
    return `<div class="sd">${big}
      <div class="sd-info"><span class="tag">${KIND_NAME[kind]}</span><p>${where}</p>${owned ? '' : `<p class="sd-bal">我的金币：${UI.cur('coins', 15)}${UI.bind('coins')}</p>`}</div>
      ${foot}</div>`;
  }
  function openItem(kind, id) {
    const it = Store.catalog(kind)[id];
    const c = UI.sheet({
      title: it.name,
      html: detailHtml(kind, id),
      acts: {
        buy: async () => {
          const ok = await UI.confirm({ title: `购买${it.name}？`, text: `将花费${UI.cur('coins', 16)}<b>${it.price}金币</b>，你当前有${UI.fmt(Store.s.coins)}金币。`, ok: '购买' });
          if (!ok) return;
          const res = Store.buy(kind, id);
          if (res === 'poor') { lackCoins(it.price); return; }
          Sfx.play('reward');
          c.$('.sheet-bd').innerHTML = `<div class="sd-done"><img src="${IMG}fx/confetti.png" class="sd-confetti" alt="">${preview(kind, id, 96)}<h3>购买成功！</h3><p>${it.name}已放入背包。</p>
            <button class="btn btn-primary btn-lg btn-block" data-act="equip">立即装备</button><button class="btn btn-ghost btn-lg btn-block" data-act="close">稍后</button></div>`;
          App.refresh('shop');
        },
        equip: () => {
          Store.equip(kind, id);
          c.close();
          App.refresh('shop');
          UI.notify({ img: `${IMG}avatars/stella.jpg`, title: `${it.name}已装备`, text: '去个人主页看看效果吧', btn: '查看', onTap: () => App.tab('me') });
        },
        unequip: () => {
          Store.equip(kind, kind === 'frame' ? null : kind === 'bubble' ? 'default' : 'aurora');
          c.close();
          App.refresh('shop');
          UI.toast('已恢复默认');
        },
        unlock: () => {
          c.close();
          if (it.vip) setTab('vip'); else App.go('detail', { game: 'c4' });
        },
      },
    });
  }

  async function lackCoins(need) {
    const k = await UI.dialog({
      img: `${IMG}ui/coin.svg`, imgCls: 'is-small',
      title: '金币不足',
      text: `需要<b>${UI.fmt(need)}金币</b>，你当前只有<b>${UI.fmt(Store.s.coins)}</b>。`,
      buttons: [{ label: '充值金币', key: 'top', cls: 'btn-orange' }, { label: '暂不', key: 'no', cls: 'btn-ghost' }],
    });
    if (k === 'top') { UI.closeAll(); if (App.top() === 'shop') setTab('topup'); else App.go('shop', { tab: 'topup' }); }
  }

  /* ---------- I8 小米钱包支付 ---------- */
  function pay({ title, usd, sub }) {
    return new Promise((resolve) => {
      let paid = false;
      let processing = false;
      const enough = Store.s.mi >= usd;
      const c = UI.sheet({
        cls: 'sheet-pay',
        html: `<div class="pay-hd"><img src="${IMG}ui/mi-wallet.svg" alt=""><b>小米钱包</b><span>安全支付</span></div>
          <div class="pay-amt"><small>支付金额</small><b>${UI.usd(usd)}</b><span>${title}${sub ? ` · ${sub}` : ''}</span></div>
          <div class="pay-methods">
            <button class="pay-m is-on" data-act="method" data-m="mi"><img src="${IMG}ui/mi-wallet.svg" alt=""><span><b>小米钱包余额</b><small>可用${UI.usd(Store.s.mi)}${enough ? '' : ' · 余额不足'}</small></span><i class="pay-radio"></i></button>
            <button class="pay-m" data-act="method" data-m="card"><span class="pay-card">VISA</span><span><b>Visa •••• 4242</b><small>演示中不可用</small></span><i class="pay-radio"></i></button>
          </div>
          <button class="btn btn-primary btn-lg btn-block pay-btn" data-act="pay">支付${UI.usd(usd)}</button>
          <p class="pay-note">${UI.ic('shield', 13)} 模拟支付 · 不会产生真实扣款</p>`,
        acts: {
          close: () => {
            if (processing) { UI.toast('正在支付，请稍候…'); return; }
            c.close();
          },
          method: (el) => {
            if (el.dataset.m === 'card') { UI.toast('演示暂不支持银行卡支付'); return; }
          },
          pay: async (el) => {
            if (processing) return;
            if (!Store.pay(usd)) { UI.toast('小米钱包余额不足'); Sfx.play('error'); return; }
            processing = true;
            c.opt.closable = false;
            el.disabled = true;
            el.innerHTML = '<i class="spinner"></i> 支付中…';
            await UI.sleep(1200);
            paid = true;
            c.$('.sheet-bd').innerHTML = `<div class="pay-ok"><span class="pay-check">${UI.ic('check', 40)}</span><h3>支付成功</h3><p>已通过小米钱包支付${UI.usd(usd)}<br>余额${UI.usd(Store.s.mi)}</p></div>`;
            Sfx.play('reward');
            await UI.sleep(1100);
            c.close();
          },
        },
        onClose: () => resolve(paid),
      });
    });
  }

  /* ---------- I9 看广告领 Gems ---------- */
  function watchAd() {
    const a = Store.s.ads;
    if (a.watched >= 3) { UI.toast('今日次数已用完（3/3），明天再来吧！'); return; }
    if (Store.s.adFree) { adReward(true); return; }
    const LEN = 15;
    let left = LEN;
    let done = false;
    const c = UI.open({
      type: 'full',
      cls: 'ov-ad',
      closable: false,
      onBack: () => { if (!done) UI.toast('看完广告才能领奖励哦'); else finish(); },
      html: `<div class="ad">
        <img class="ad-bg" src="${IMG}gc/sweet.jpg" alt="">
        <div class="ad-top safe-top"><span class="ad-tag">广告</span><span class="ad-reward">${UI.cur('gems', 16)}<b class="ad-left">${LEN}</b>秒后得奖励</span><button class="ad-x" data-act="x" aria-label="关闭广告">${UI.ic('x', 18)}</button></div>
        <div class="ad-card">
          <img class="ad-icon" src="${IMG}games/sweet.jpg" alt="">
          <b>甜蜜消消</b><span>★ 4.5 · 三消对战 · 免费</span>
          <button class="btn btn-orange btn-lg" data-act="install">安装</button>
        </div>
        <div class="ad-bar"><i></i></div>
      </div>`,
      acts: {
        x: () => { if (!done) { UI.toast('看完广告才能领奖励哦'); return; } finish(); },
        install: () => UI.demo('跳转应用商店'),
      },
    });
    const bar = c.$('.ad-bar i');
    bar.style.transition = `width ${LEN}s linear`;
    requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = '100%'; }));
    const t = setInterval(() => {
      left -= 1;
      c.$('.ad-left').textContent = Math.max(0, left);
      if (left <= 0) {
        clearInterval(t);
        done = true;
        c.$('.ad-reward').innerHTML = `${UI.ic('check', 15)} 奖励已到手`;
        c.el.classList.add('is-done');
      }
    }, 1000);
    function finish() {
      clearInterval(t);
      c.opt.closable = true;
      c.close();
      adReward(false);
    }
  }
  async function adReward(instant) {
    const a = Store.s.ads;
    a.watched += 1;
    Store.count('ads');
    if (instant) UI.toast('免广告卡生效，奖励直接到账');
    await UI.grant({ gems: 10 }, `看广告${a.watched}/3`);
    if (a.watched >= 3 && !a.bonus) {
      a.bonus = true;
      Store.save();
      await UI.reward({ title: '额外奖励解锁！', sub: '今天已看满3次广告，再送你一份奖励。', img: `${IMG}ui/gem.png`, items: { gems: 50 }, note: '看广告额外奖励（3/3）' });
    }
    App.refresh();
  }

  /* ---------- I10 余额不足 ---------- */
  async function lack(need, game) {
    const s = Store.s;
    const waiting = Store.tasks().filter((t) => t.state === 'claim').reduce((a, t) => a + (t.reward.gems || 0), 0);
    const k = await UI.dialog({
      cls: 'dlg-lack',
      img: `${IMG}ui/gem.png`, imgCls: 'is-small',
      title: '钻石不足',
      text: `开局需要<b>${need}钻石</b>，你当前只有<b>${s.gems}</b>。`,
      html: `<div class="lack-ops">
        <button class="lack-op" data-act="__btn" data-key="tasks"><img src="${IMG}ui/calendar.png" alt=""><span><b>做任务</b><small>${waiting ? `${waiting}钻石待领取` : '最多可得400钻石'}</small></span>${UI.ic('right', 18)}</button>
        <button class="lack-op" data-act="__btn" data-key="ad"><span class="lack-tv">${UI.ic('eye', 22)}</span><span><b>看广告</b><small>${s.ads.watched >= 3 ? '今日次数已用完' : `+10钻石 · 今日还剩${3 - s.ads.watched}次`}</small></span>${UI.ic('right', 18)}</button>
        <button class="lack-op" data-act="__btn" data-key="topup"><img src="${IMG}ui/gem.png" alt=""><span><b>充值</b><small>100钻石仅需$0.99</small></span>${UI.ic('right', 18)}</button>
      </div>
      ${game ? '<button class="lack-ai" data-act="__btn" data-key="ai">或者免费人机练习</button>' : ''}`,
    });
    if (k === 'tasks') App.go('tasks');
    else if (k === 'ad') watchAd();
    else if (k === 'topup') App.go('shop', { tab: 'topup' });
    else if (k === 'ai') Battle.practice(game);
  }

  /* ---------- 各 Tab 内容 ---------- */
  function decor() {
    return KINDS.map(([kind, title, cat]) => `<section class="sh-sec">
      <div class="sh-sec-hd"><h2>${title}</h2><span>已拥有${Object.keys(cat).filter((id) => Store.owns(kind, id)).length}/${Object.keys(cat).length}</span></div>
      <div class="sh-grid">${Object.keys(cat).map((id) => itemCard(kind, id)).join('')}</div></section>`).join('');
  }
  function items() {
    return `<section class="sh-sec"><div class="sh-sec-hd"><h2>道具</h2><span>已有 ${UI.cur('boost', 16)}${UI.bind('boost')} ${UI.cur('pass', 16)}${UI.bind('pass')}</span></div>
      <div class="sh-items">${D.items.map((x) => `<div class="sh-prop">
        <span class="sh-prop-ic"><img src="${x.img}" alt="">${x.tag ? `<i class="tag tag-hot">${x.tag}</i>` : ''}</span>
        <div class="row-main"><b>${x.name}</b><span>${x.desc}</span></div>
        <button class="btn btn-orange btn-sm" data-act="buyItem" data-id="${x.id}">${UI.cur('coins', 15)} ${x.price}</button>
      </div>`).join('')}</div>
      <p class="sh-note">${UI.ic('info', 14)} 加速卡在匹配界面使用，房卡可进入高级房。</p></section>`;
  }
  function topup() {
    const s = Store.s;
    const a = s.ads;
    return `<section class="sh-sec">
      <div class="sh-ad">
        <span class="sh-ad-ic">${UI.cur('gems', 40)}</span>
        <div class="row-main"><b>免费钻石</b><span>每次10钻石，看满3次加送50钻石</span>
          <div class="sh-ad-dots">${[0, 1, 2].map((i) => `<i class="${i < a.watched ? 'is-on' : ''}"></i>`).join('')}<em>${a.watched}/3${a.bonus ? ' · 额外奖励已领' : ''}</em></div></div>
        <button class="btn ${a.watched >= 3 ? 'is-disabled' : 'btn-primary'} btn-sm" data-act="ad">${a.watched >= 3 ? '已完成' : s.adFree ? '领取' : '看广告'}</button>
      </div>
    </section>
    <section class="sh-sec"><div class="sh-sec-hd"><h2>金币</h2><span>用于购买装扮和道具</span></div>
      <div class="sh-packs">${D.coinPacks.map((x) => {
        const first = !s.firstPay[x.id];
        return `<button class="sh-pack" data-act="coins" data-id="${x.id}">
          ${first ? '<i class="sh-ribbon">首充×2</i>' : x.bonus ? `<i class="sh-ribbon is-bonus">加送${UI.fmt(x.bonus)}</i>` : ''}
          ${UI.cur('coins', 44)}<b>${UI.fmt(first ? x.coins * 2 : x.coins + (x.bonus || 0))}</b>
          ${first ? `<s>${UI.fmt(x.coins)}</s>` : '<s></s>'}
          <span class="sh-usd">${UI.usd(x.usd)}</span></button>`;
      }).join('')}</div>
      <button class="sh-bundle" data-act="bundle">
        <span class="sh-bundle-ic">${UI.cur('coins', 34)}<i>+</i>${UI.ic('shield', 26)}</span>
        <span class="row-main"><b>${D.bundle.name} ${s.adFree ? '<i class="tag tag-new">生效中</i>' : '<i class="tag tag-hot">超值</i>'}</b><span>${D.bundle.desc}</span></span>
        <span class="sh-usd">${UI.usd(D.bundle.usd)}</span>
      </button>
    </section>
    <section class="sh-sec"><div class="sh-sec-hd"><h2>钻石</h2><span>用于开局对战</span></div>
      <div class="sh-packs is-3">${D.gemPacks.map((x) => `<button class="sh-pack is-gem" data-act="gems" data-id="${x.id}">
        ${x.bonus ? `<i class="sh-ribbon is-bonus">${x.bonus}</i>` : ''}${UI.cur('gems', 44)}<b>${UI.fmt(x.gems)}</b><s></s><span class="sh-usd">${UI.usd(x.usd)}</span></button>`).join('')}</div>
      <p class="sh-note">${UI.ic('wallet', 14)} 使用小米钱包支付 · 余额${UI.usd(s.mi)}</p>
    </section>`;
  }
  function vip() {
    const s = Store.s;
    return `<section class="sh-sec"><div class="vip-card ${s.vip ? 'is-on' : ''}">
        <img class="vip-crown" src="${IMG}ui/crown.png" alt="">
        <b class="vip-title">畅玩空间会员</b>
        <span class="vip-sub">${s.vip ? '生效中 · 按月自动续费' : `${UI.usd(D.vip.usd)}/月 · 随时可取消`}</span>
        <div class="vip-perks">${D.vip.perks.map((x, i) => `<span><i>${UI.ic(['gift', 'zap', 'crown', 'calendar'][i], 18)}</i>${x}</span>`).join('')}</div>
        <div class="vip-frame">${UI.av('me', 64, { frame: 'vip' })}<span>专属<br><b>会员金框</b></span></div>
        ${s.vip ? '<button class="btn btn-ghost btn-lg btn-block" data-act="vipManage">管理订阅</button>' : `<button class="btn btn-gold btn-lg btn-block" data-act="vip">立即开通 · ${UI.usd(D.vip.usd)}/月</button>`}
      </div></section>`;
  }

  let tab = 'decor';
  function setTab(t) {
    tab = t;
    App.params('shop').tab = t;
    App.refresh('shop');
    const body = document.querySelector('.page[data-page="shop"] .sh-body');
    if (body) body.scrollTop = 0;
  }

  App.page('shop', {
    render(el, p) {
      if (p.tab || p.t) { tab = p.tab || p.t; }
      el.innerHTML = `<div class="sh-bg"></div>
        ${UI.nav({ title: '商城', right: `<div class="nav-chips">${UI.chips(['gems', 'coins'])}</div>` })}
        <img class="sh-mascot" src="${IMG}brand/mascot-gift.png" alt="">
        <div class="seg sh-tabs">${TABS.map(([id, label]) => `<button class="seg-it ${id === tab ? 'is-active' : ''}" data-act="tab" data-t="${id}">${label}</button>`).join('')}</div>
        <div class="body sh-body" data-scroll="main">
          <div class="anim-in">${{ decor, items, topup, vip }[tab]()}</div>
          <div class="bottom-space"></div>
        </div>`;
    },
    act: {
      tab: (el) => setTab(el.dataset.t),
      item: (el) => openItem(el.dataset.kind, el.dataset.id),
      buyItem: async (el) => {
        const it = D.items.find((x) => x.id === el.dataset.id);
        const ok = await UI.confirm({ title: `购买${it.name}？`, text: `将花费${UI.cur('coins', 16)}<b>${it.price}金币</b>。`, ok: '购买' });
        if (!ok) return;
        if (Store.buyItem(it.id) === 'poor') { lackCoins(it.price); return; }
        Sfx.play('coin');
        UI.toast(`${it.name}已放入背包`);
        App.refresh('shop');
      },
      ad: () => watchAd(),
      coins: async (el) => {
        const x = D.coinPacks.find((k) => k.id === el.dataset.id);
        const first = !Store.s.firstPay[x.id];
        const amount = first ? x.coins * 2 : x.coins + (x.bonus || 0);
        if (!(await pay({ title: `${UI.fmt(amount)}金币`, usd: x.usd, sub: first ? '首充×2' : '' }))) return;
        Store.s.firstPay[x.id] = true;
        await UI.grant({ coins: amount }, `充值${UI.usd(x.usd)}`);
        App.refresh('shop');
      },
      bundle: async () => {
        if (!(await pay({ title: D.bundle.name, usd: D.bundle.usd }))) return;
        Store.s.adFree = true;
        await UI.grant({ coins: D.bundle.coins }, D.bundle.name);
        UI.toast('免广告卡已生效，有效期30天');
        App.refresh('shop');
      },
      gems: async (el) => {
        const x = D.gemPacks.find((k) => k.id === el.dataset.id);
        if (!(await pay({ title: `${UI.fmt(x.gems)}钻石`, usd: x.usd }))) return;
        await UI.grant({ gems: x.gems }, `钻石礼包${UI.usd(x.usd)}`);
        App.refresh('shop');
      },
      vip: async () => {
        if (!(await pay({ title: '畅玩空间会员', usd: D.vip.usd, sub: '包月' }))) return;
        Store.s.vip = true;
        Store.own('frame', 'vip');
        App.refresh('shop');
        await UI.reward({ title: '欢迎成为会员！', sub: '本月钻石和会员金框已到账。', img: `${IMG}ui/crown.png`, items: { gems: D.vip.gems, frame: 'vip' }, note: '会员每月钻石' });
        App.refresh('shop');
      },
      vipManage: () => UI.demo('订阅管理'),
    },
  });

  App.act({
    topup: (el) => {
      const t = 'topup';
      if (App.top() === 'shop') setTab(t); else App.go('shop', { tab: t, cur: el.dataset.cur });
    },
  });

  window.Shop = { lack, watchAd, pay, openItem };
})();
