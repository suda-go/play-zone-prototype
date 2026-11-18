/**
 * I 商城：I1 余额栏、I2 装扮、I3 道具、I4 商品详情、I5 金币充值（V7 只有金币一种货币）、I7 会员入口（详见 vip.js）、
 * I8 小米钱包支付、I10 金币不足弹窗（V7 暂不集成广告，没有 I9 看广告领金币）
 */
(() => {
  'use strict';

  const IMG = D.IMG;
  const TABS = [['decor', '装扮'], ['topup', '充值'], ['vip', '会员']];
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
    // 会员到期后：会员框还在背包里（owned），但不能用，按“会员专属”显示（我的与设置 4.8）
    const usable = Store.canUse(kind, id);
    const lock = (!owned || !usable) && it.vip ? (it.vip === 2 ? '超级会员专属' : '会员专属') : '';
    return { it, owned: owned && usable, equipped, lock };
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
      big = `<div class="sd-frame">${UI.av('me', 116, { frame: id })}<b>${UI.esc(Store.s.user.name)}</b></div>`;
    } else if (kind === 'bubble') {
      big = `<div class="sd-chat"><div class="sd-msg">${UI.av('lily', 30)}<span class="sd-bub">打得漂亮！再来一局？</span></div>
        <div class="sd-msg is-me"><span class="sd-bub ${UI.bubble(id)}">没问题！等我1分钟😎</span>${UI.av('me', 30)}</div></div>`;
    } else {
      big = `<div class="sd-bg" style="background:${UI.bg(id)}"><div class="sd-bg-card">${UI.av('me', 52)}<b>${UI.esc(Store.s.user.name)}</b><span>ID ${Store.s.user.uid}</span></div></div>`;
    }
    const where = { frame: '会显示在个人主页、聊天、房间和对局中。', bubble: '你发出的聊天消息会使用这个样式。', bg: '显示在个人主页顶部。' }[kind];
    const foot = equipped ? `<button class="btn btn-ghost btn-lg btn-block" data-act="unequip">${kind === 'frame' ? '卸下' : '恢复默认'}</button>`
      : owned ? '<button class="btn btn-primary btn-lg btn-block" data-act="equip">装备</button>'
        : lock ? `<button class="btn btn-gold btn-lg btn-block" data-act="unlock">${it.vip ? (it.vip === 2 ? '开通超级会员解锁' : '开通会员解锁') : '四子棋达到黄金解锁'}</button>`
          : `<button class="btn btn-orange btn-lg btn-block" data-act="buy">购买 <span class="btn-price">${UI.cur('coins', 18)}${it.price}</span></button>`;
    return `<div class="sd">${big}
      <div class="sd-info"><span class="tag">${KIND_NAME[kind]}</span><p>${where}</p>${owned ? '' : `<p class="sd-bal">我的金币：${UI.cur('coins', 15)}${UI.bind('coins')}</p>`}</div>
      ${foot}</div>`;
  }
  /** opt.onBought(id)：买到后回调（编辑资料里买背景，买到后回到编辑资料并选中它） */
  function openItem(kind, id, opt = {}) {
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
          if (opt.onBought) {
            c.$('.sheet-bd').innerHTML = `<div class="sd-done"><img src="${IMG}fx/confetti.png" class="sd-confetti" alt="">${preview(kind, id, 96)}<h3>购买成功！</h3><p>${it.name}已放入背包，已为你选中，点“保存”就能用上。</p>
              <button class="btn btn-primary btn-lg btn-block" data-act="close">知道了</button></div>`;
            opt.onBought(id);
            return;
          }
          c.$('.sheet-bd').innerHTML = `<div class="sd-done"><img src="${IMG}fx/confetti.png" class="sd-confetti" alt="">${preview(kind, id, 96)}<h3>购买成功！</h3><p>${it.name}已放入背包。</p>
            <button class="btn btn-primary btn-lg btn-block" data-act="equip">立即装备</button><button class="btn btn-ghost btn-lg btn-block" data-act="close">稍后</button></div>`;
          App.refresh('shop');
        },
        equip: () => {
          if (!Store.equip(kind, id)) { c.close(); if (it.vip) Vip.open(it.vip === 2 ? 2 : 1); return; }
          c.close();
          App.refresh('shop');
          UI.notify({ img: UI.person('me').avatar, title: `${it.name}已装备`, text: '去个人主页看看效果吧', btn: '查看', onTap: () => App.tab('me') });
        },
        unequip: () => {
          Store.equip(kind, kind === 'frame' ? null : kind === 'bubble' ? 'default' : 'aurora');
          c.close();
          App.refresh('shop');
          UI.toast('已恢复默认');
        },
        unlock: () => {
          c.close();
          if (it.vip) Vip.open(it.vip === 2 ? 2 : 1); else App.backTo('play');
        },
      },
    });
  }

  /* ---------- 金币不足：会员福利 / 任务 / 充值（V7 单一货币，没有钻石兑换和人机练习；暂不集成广告） ---------- */
  function goTopup(sec) {
    UI.closeAll();
    if (App.top() === 'shop') { setTab('topup'); if (sec) scrollToSec(sec); } else App.go('shop', { tab: 'topup', sec });
  }
  async function lackDialog({ text }) {
    const s = Store.s;
    const waiting = Store.tasks().filter((t) => t.state === 'claim').reduce((a, t) => a + (t.reward.coins || 0), 0);
    const waitText = waiting ? `${UI.fmt(waiting)}金币` : '';
    const pack = D.coinPacks[0];
    const first = !s.firstPay[pack.id];
    // 会员：破产补助、每日福利；非会员：开通会员入口。都放在最上面
    const tier = Store.vipTier();
    const aid = tier ? Store.aidLeft() : 0;
    const vt = D.vip.tiers[tier || 1];
    const vipOps = [
      aid > 0 && `<button class="lack-op is-vip" data-act="__btn" data-key="aid"><span class="lack-vip-ic">${UI.ic('shield', 20)}</span><span><b>领取破产补助 · +${Store.AID}金币</b><small>${vt.name}特权 · 今日还剩${aid}次</small></span>${UI.ic('right', 18)}</button>`,
      tier && Store.canVipDaily() && `<button class="lack-op is-vip" data-act="__btn" data-key="vipdaily"><span class="lack-vip-ic">${UI.ic('gift', 20)}</span><span><b>领取会员每日福利</b><small>+${UI.fmt(vt.dailyCoins)}金币</small></span>${UI.ic('right', 18)}</button>`,
      !tier && `<button class="lack-op is-vip" data-act="__btn" data-key="vip"><span class="lack-vip-ic">${UI.ic('crown', 20)}</span><span><b>开通会员 · 每天领${UI.fmt(vt.dailyCoins)}金币</b><small>还有破产补助、签到×${vt.sign}等特权</small></span>${UI.ic('right', 18)}</button>`,
    ].filter(Boolean).join('');
    const k = await UI.dialog({
      cls: 'dlg-lack',
      img: `${IMG}ui/coin.svg`, imgCls: 'is-small',
      title: '金币不足',
      text,
      html: `<div class="lack-ops">${vipOps}
        <button class="lack-op" data-act="__btn" data-key="tasks"><img src="${IMG}ui/calendar.png" alt=""><span><b>做任务</b><small>${waitText ? `${waitText}待领取` : '完成任务领金币'}</small></span>${UI.ic('right', 18)}</button>
        <button class="lack-op" data-act="__btn" data-key="topup"><img src="${IMG}ui/coin.svg" alt=""><span><b>充值金币</b><small>${first ? `首充双倍 · ${UI.usd(pack.usd)}得${UI.fmt(pack.coins * 2)}金币` : `${UI.fmt(pack.coins)}金币仅需${UI.usd(pack.usd)}`}</small></span>${UI.ic('right', 18)}</button>
      </div>`,
    });
    if (k === 'aid') {
      const n = Store.useAid();
      if (!n) { UI.toast('今天的破产补助已用完'); return; }
      await UI.grant({ coins: n }, '会员破产补助');
      UI.toast('补助已到账，再点一次就能开局');
      App.refresh();
    } else if (k === 'vipdaily') {
      const r = Store.vipDaily();
      if (!r) { UI.toast('今日福利已领取'); return; }
      await UI.grant(r, '会员每日福利');
      App.refresh();
    } else if (k === 'vip') Vip.open(1);
    else if (k === 'tasks') { UI.closeAll(); App.go('tasks'); } else if (k === 'topup') goTopup();
  }
  /** 商城内购买时金币不够 */
  function lackCoins(need) {
    return lackDialog({ text: `需要<b>${UI.fmt(need)}金币</b>，你当前只有<b>${UI.fmt(Store.s.coins)}</b>。` });
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

  /* ---------- I10 金币不足（快速开始入场、好友房入场；where 是文案里“底注”前面的说明） ---------- */
  function lack(o = {}) {
    // 兼容旧调用 lack(need)
    const { need, stake, where } = typeof o === 'object' && o ? o : { need: o };
    const st = D.stake[stake];
    const bet = need || (st ? st.bet : 0);
    const label = where || (st ? st.name : '开局');
    return lackDialog({ text: `${label}底注<b>${UI.fmt(bet)}金币</b>，你只有<b>${UI.fmt(Store.s.coins)}</b>` });
  }

  /* ---------- 各 Tab 内容 ---------- */
  function decor() {
    return KINDS.map(([kind, title, cat]) => `<section class="sh-sec">
      <div class="sh-sec-hd"><h2>${title}</h2><span>已拥有${Object.keys(cat).filter((id) => Store.owns(kind, id)).length}/${Object.keys(cat).length}</span></div>
      <div class="sh-grid">${Object.keys(cat).map((id) => itemCard(kind, id)).join('')}</div></section>`).join('');
  }
  function items() {
    return `<section class="sh-sec"><div class="sh-sec-hd"><h2>道具</h2><span>已有 ${UI.cur('boost', 16)}${UI.bind('boost')}</span></div>
      <div class="sh-items">${D.items.map((x) => `<div class="sh-prop">
        <span class="sh-prop-ic"><img src="${x.img}" alt="">${x.tag ? `<i class="tag tag-hot">${x.tag}</i>` : ''}</span>
        <div class="row-main"><b>${x.name}</b><span>${x.desc}</span></div>
        <button class="btn btn-orange btn-sm" data-act="buyItem" data-id="${x.id}">${UI.cur('coins', 15)} ${x.price}</button>
      </div>`).join('')}</div>
      <p class="sh-note">${UI.ic('info', 14)} 加速卡在匹配界面使用，1秒内就能找到对手。</p></section>`;
  }
  function topup() {
    const s = Store.s;
    return `<section class="sh-sec"><div class="sh-sec-hd"><h2>金币</h2><span>对局底注、买装扮和道具</span></div>
      <div class="sh-packs">${D.coinPacks.map((x) => {
        const first = !s.firstPay[x.id];
        return `<button class="sh-pack" data-act="coins" data-id="${x.id}">
          ${first ? '<i class="sh-ribbon">首充×2</i>' : x.bonus ? `<i class="sh-ribbon is-bonus">加送${UI.fmt(x.bonus)}</i>` : ''}
          ${UI.cur('coins', 44)}<b>${UI.fmt(first ? x.coins * 2 : x.coins + (x.bonus || 0))}</b>
          ${first ? `<s>${UI.fmt(x.coins)}</s>` : '<s></s>'}
          <span class="sh-usd">${UI.usd(x.usd)}</span></button>`;
      }).join('')}</div>
    </section>
    <p class="sh-note">${UI.ic('wallet', 14)} 使用小米钱包支付 · 余额${UI.usd(s.mi)}</p>`;
  }
  /** 会员 Tab：两档会员的简要介绍，详细权益去会员中心 */
  function vip() {
    const cur = Store.vipTier();
    const T = D.vip.tiers;
    const card = (k) => {
      const t = T[k];
      const on = cur === k;
      const covered = cur === 2 && k === 1;
      const pts = k === 1
        ? [`每天${UI.fmt(t.dailyCoins)}金币`, `签到×${t.sign}`, '破产补助', '会员金框']
        : [`每天${UI.fmt(t.dailyCoins)}金币`, `签到×${t.sign}`, '视频通话免费', `好友上限${t.friendCap}人`];
      const btn = on || covered ? '查看权益' : cur === 1 && k === 2 ? `升级 · ${UI.usd(t.usd)}/月` : `开通 · ${UI.usd(t.usd)}/月`;
      return `<button class="shv-card is-t${k} ${on ? 'is-on' : ''}" data-act="vip" data-t="${k}">
        <span class="shv-hd">${UI.av('me', 46, { frame: t.frame })}<span class="shv-tt"><b>${t.name}${on ? '<i class="shv-on">生效中</i>' : ''}</b><em>${covered ? '已包含在超级会员中' : `${UI.usd(t.usd)}/月 · 开通送${UI.fmt(t.bonus)}金币`}</em></span></span>
        <span class="shv-pts">${pts.map((x) => `<i>${UI.ic('check', 12)}${x}</i>`).join('')}</span>
        <span class="shv-btn">${btn}</span>
      </button>`;
    };
    return `<section class="sh-sec shv"><div class="sh-sec-hd"><h2>Soulgame 会员</h2><span>${cur ? `${T[cur].name}生效中` : '两档可选 · 随时可取消'}</span></div>
      <div class="shv-list">${card(1)}${card(2)}</div>
      <button class="shv-more" data-act="vip" data-t="${cur === 1 ? 2 : cur || 1}">查看全部权益和对比 ${UI.ic('right', 14)}</button>
    </section>`;
  }

  let tab = 'decor';
  function setTab(t) {
    tab = t;
    App.params('shop').tab = t;
    App.refresh('shop');
    const body = document.querySelector('.page[data-page="shop"] .sh-body');
    if (body) body.scrollTop = 0;
  }
  /** 把充值页里的某个区块滚到可见处 */
  function scrollToSec(sec) {
    requestAnimationFrame(() => {
      const body = document.querySelector('.page[data-page="shop"] .sh-body');
      const el = body && body.querySelector(`.sh-${sec}`);
      if (!el) return;
      const top = body.scrollTop + el.getBoundingClientRect().top - body.getBoundingClientRect().top - 8;
      body.scrollTo({ top, behavior: 'smooth' });
    });
  }

  App.page('shop', {
    render(el, p) {
      if (p.tab || p.t) { tab = p.tab || p.t; }
      // sec：进入时滚到指定区块，只生效一次
      const sec = p.sec;
      delete p.sec;
      el.innerHTML = `<div class="sh-bg"></div>
        ${UI.nav({ title: '商城', right: `<div class="nav-chips">${UI.chips(['coins'])}</div>` })}
        <img class="sh-mascot" src="${IMG}brand/mascot-gift.png" alt="">
        <div class="seg sh-tabs">${TABS.map(([id, label]) => `<button class="seg-it ${id === tab ? 'is-active' : ''}" data-act="tab" data-t="${id}">${label}</button>`).join('')}</div>
        <div class="body sh-body" data-scroll="main">
          <div class="anim-in">${{ decor, items, topup, vip }[tab]()}</div>
          <div class="bottom-space"></div>
        </div>`;
      if (sec && tab === 'topup') scrollToSec(sec);
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
      coins: async (el) => {
        const x = D.coinPacks.find((k) => k.id === el.dataset.id);
        const first = !Store.s.firstPay[x.id];
        const amount = first ? x.coins * 2 : x.coins + (x.bonus || 0);
        if (!(await pay({ title: `${UI.fmt(amount)}金币`, usd: x.usd, sub: first ? '首充×2' : '' }))) return;
        Store.s.firstPay[x.id] = true;
        await UI.grant({ coins: amount }, `充值${UI.usd(x.usd)}`);
        App.refresh('shop');
      },
      vip: (el) => Vip.open(+el.dataset.t || 0),
    },
  });

  App.act({
    topup: (el) => {
      const t = 'topup';
      if (App.top() === 'shop') setTab(t); else App.go('shop', { tab: t, cur: el.dataset.cur });
    },
  });

  window.Shop = { lack, pay, openItem };
})();
