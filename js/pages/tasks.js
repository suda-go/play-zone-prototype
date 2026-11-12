/**
 * G 任务中心：顶部 B3 7 日签到，下面是 G1 连续 7 天、G2–G5 各类任务、G6 盲盒任务、G7 神秘宝箱、G8 Go 跳转
 */
(() => {
  'use strict';

  const IMG = D.IMG;
  const CHEST = `${IMG}ui/chest.svg`;

  /* ---------- G8 Go：跳到能完成任务的地方 ---------- */
  async function go(target) {
    switch (target) {
      case 'c4': App.go('detail', { game: 'c4' }); break;
      case 'addfriend': App.go('addfriend'); break;
      case 'shop': App.go('shop', { tab: 'decor' }); break;
      case 'share': UI.share({ title: '分享畅玩空间', text: '快来畅玩空间和我一起玩！', onShared: () => App.refresh('tasks') }); break;
      case 'ad': Shop.watchAd(); break;
      case 'lobby': App.backTo('play'); break;
      case 'create': App.go('create', {}); break;
      case 'action': Lobby.setCat('动作'); App.backTo('play'); break;
      case 'notify': {
        const k = await UI.dialog({
          art: `<span class="perm-ic">${UI.ic('bell', 40)}</span>`,
          title: '允许畅玩空间给你发通知吗？',
          text: '回合制游戏轮到你、好友邀请你时，第一时间提醒你。',
          x: false,
          buttons: [{ label: '允许', key: 'ok' }, { label: '不允许', key: 'no', cls: 'btn-ghost' }],
        });
        if (k === 'ok') {
          Store.s.settings.turn = true;
          Store.emit('settings');
          UI.toast('已开启回合提醒');
          App.refresh('tasks');
        }
        break;
      }
      default: App.backTo('play');
    }
  }

  /* ---------- B3 7 日签到（任务列表顶部，入口是大厅顶栏的日历按钮） ---------- */
  function signCard() {
    const s = Store.s;
    const can = Store.canSign();
    const cell = (i) => {
      const r = Store.signReward(i);
      const st = i < s.sign.count ? 'is-done' : i === s.sign.count ? (can ? 'is-today' : 'is-next') : '';
      const it = UI.items(r);
      const main = it[0];
      const label = i < s.sign.count ? '已领取' : i === s.sign.count ? (can ? '今天' : '明天') : `第${i + 1}天`;
      if (i === 6) {
        return `<button class="sign-day sign-big ${st}" data-act="sign" data-i="6">
          <span class="sign-d">第7天 · 大奖</span>
          <img class="sign-gift" src="${IMG}brand/mascot-gift.png" alt="">
          <span class="sign-big-items">${it.map((x) => `<b>${x.label}</b>`).join('')}</span>
          <i class="sign-check">${UI.ic('check', 18)}</i>
        </button>`;
      }
      return `<button class="sign-day ${st}" data-act="sign" data-i="${i}">
        <span class="sign-d">${label}</span>
        <span class="sign-ic">${main.icon}</span>
        <b>${main.short}</b>
        <i class="sign-check">${UI.ic('check', 18)}</i>
      </button>`;
    };
    return `<div class="tk-sign card">
      <div class="tk-sign-hd"><h2>7日签到</h2><span>已签到${s.sign.count}/7天</span></div>
      <div class="sign-grid">${[0, 1, 2, 3, 4, 5, 6].map(cell).join('')}</div>
      <button class="btn ${can ? 'btn-orange' : 'is-disabled'} btn-lg btn-block tk-sign-btn" data-act="sign">${can ? `签到 · 第${s.sign.count + 1}天` : s.sign.count >= 7 ? '7天奖励已全部领取🎉' : '今日已签到 · 明天再来'}</button>
      <p class="sign-note">${s.vip ? '会员特权：签到奖励已翻倍' : '开通会员，签到奖励翻倍'}</p>
      <button class="demo-link" data-act="nextDay">跳到明天（演示）</button>
    </div>`;
  }

  /* ---------- G1 连续 7 天 ---------- */
  function streak() {
    const s = Store.s.streak;
    const today = Store.s.streak.last === Store.s.day;
    const daily = Store.tasks('daily');
    const done = daily.filter((t) => t.state === 'done').length;
    return `<div class="tk-streak">
      <div class="tk-streak-hd">
        <div><b>连续7天</b><span>连续7天完成全部每日任务，即可打开大宝箱</span></div>
        <button class="tk-chest ${s.chest ? 'is-ready' : ''} ${s.opened ? 'is-opened' : ''}" data-act="streakChest"><img src="${CHEST}" alt="大宝箱"></button>
      </div>
      <div class="tk-days">${[1, 2, 3, 4, 5, 6, 7].map((d) => {
        const st = d <= s.days ? 'is-done' : d === s.days + 1 && !today ? 'is-now' : '';
        return `<span class="tk-day ${st}"><i>${d <= s.days ? UI.ic('check', 14) : d}</i><em>第${d}天</em></span>`;
      }).join('')}</div>
      <p class="tk-streak-ft">${today ? `今日已完成！${UI.ic('check', 13)} 明天再来完成第${Math.min(7, s.days + 1)}天` : `今日：已领取${done}/${daily.length}个每日任务`}</p>
    </div>`;
  }

  /* ---------- G6 盲盒任务 ---------- */
  function mystery() {
    const m = Store.mystery();
    if (!m.revealed) {
      return `<button class="tk-mys" data-act="reveal">
        <span class="tk-mys-card"><b>?</b><i>???</i></span>
        <span class="tk-mys-txt"><b>神秘任务</b><span>翻开今日惊喜任务，赢神秘宝箱！</span></span>
        <span class="tk-mys-cta">翻开</span>
      </button>`;
    }
    const btn = m.chest ? '<span class="tk-btn is-done">已打开</span>'
      : m.state === 'claim' ? '<button class="btn btn-orange btn-sm" data-act="mysClaim">领取</button>'
        : m.state === 'done' ? '<button class="btn btn-gold btn-sm" data-act="openChest">打开</button>'
          : `<button class="btn btn-line btn-sm" data-act="go" data-go-to="${m.go}">去完成</button>`;
    return `<div class="tk-mys is-open">
      <span class="tk-mys-card is-front"><img src="${CHEST}" alt=""></span>
      <span class="tk-mys-txt"><b>神秘任务：${m.title}</b>${UI.bar(m.cur, m.goal, 'is-thin is-purple')}<span>${m.cur}/${m.goal} · 奖励：神秘宝箱</span></span>
      ${btn}
    </div>`;
  }

  /* ---------- 任务行 ---------- */
  function row(t) {
    const btn = t.state === 'claim' ? `<button class="btn btn-orange btn-sm tk-claim" data-act="claim" data-id="${t.id}">领取</button>`
      : t.state === 'done' ? `<span class="tk-btn is-done">${UI.ic('check', 14)} 已完成</span>`
        : `<button class="btn btn-line btn-sm" data-act="go" data-go-to="${t.go}">去完成</button>`;
    return `<div class="tk-row is-${t.state}">
      ${t.period ? `<span class="tk-period">${t.period}</span>` : ''}
      <div class="tk-main">
        <b>${t.title}</b>
        <div class="tk-prog">${UI.bar(t.cur, t.goal, 'is-thin')}<em>${t.cur}/${t.goal}${t.unit || ''}</em></div>
        <span class="tk-reward">${UI.rewardInline(t.reward)}</span>
      </div>
      ${btn}
    </div>`;
  }

  async function openMysteryChest() {
    const art = `<span class="chest-art is-shake"><img src="${CHEST}" alt=""><i class="chest-burst"></i></span>`;
    const k = await UI.dialog({
      cls: 'dlg-chest', art, title: '恭喜！神秘宝箱已解锁', text: '神秘任务完成啦，打开宝箱看看里面有什么！',
      x: false, buttons: [{ label: '打开宝箱', key: 'open', cls: 'btn-orange' }], closable: false,
    });
    if (k !== 'open') return;
    Sfx.play('chest');
    const r = Store.openChest();
    await UI.reward({ title: '宝箱已打开！', sub: '神秘宝箱里开出了这些：', img: CHEST, items: r, note: '神秘宝箱' });
    App.refresh('tasks');
  }

  App.page('tasks', {
    render(el) {
      el.innerHTML = `<div class="tk-bg"></div>
        ${UI.nav({ title: '任务中心', right: `<div class="nav-chips">${UI.chips(['gems', 'coins'])}</div>` })}
        <div class="body tk-body" data-scroll="main">
          ${signCard()}
          ${streak()}
          <div class="tk-sec"><div class="tk-sec-hd"><h2>神秘任务</h2><span>每天都有新惊喜</span></div>${mystery()}</div>
          ${D.taskGroups.map((gr) => {
            const list = Store.tasks(gr.id);
            const n = list.filter((t) => t.state === 'claim').length;
            return `<div class="tk-sec"><div class="tk-sec-hd"><h2>${gr.name}${n ? ` <i class="count is-inline">${n}</i>` : ''}</h2><span>${gr.sub}</span></div>
              <div class="tk-list">${list.map(row).join('')}</div></div>`;
          }).join('')}
          <p class="tk-foot">每日任务0点刷新 · 每周任务每周一刷新</p>
          <div class="bottom-space"></div>
        </div>`;
    },
    act: {
      sign: async () => {
        if (!Store.canSign()) {
          UI.toast(Store.s.sign.count >= 7 ? '7天奖励已全部领取！' : '今天已经签到过了，明天见！');
          return;
        }
        const i = Store.s.sign.count;
        const tile = document.querySelector(`.page[data-page="tasks"] .sign-day[data-i="${i}"]`);
        const r = Store.sign();
        tile.classList.add('is-claiming');
        Sfx.play('reward');
        await UI.grant(r, `签到第${i + 1}天`, tile.querySelector('.sign-ic, .sign-gift'));
        App.refresh('tasks');
      },
      nextDay: () => {
        Store.nextDay();
        App.refresh('tasks');
        UI.toast(`现在是第${Store.s.day}天（演示），每日任务已刷新`);
      },
      go: (el) => go(el.dataset.goTo),
      claim: async (el) => {
        const id = el.dataset.id;
        const t = D.tasks.find((x) => x.id === id);
        const before = Store.s.streak.days;
        const r = Store.claim(id);
        if (!r) return;
        el.disabled = true;
        el.textContent = '已领取';
        await UI.grant(r, t.title, el);
        App.refresh('tasks');
        if (Store.s.streak.days > before) {
          UI.toast(Store.s.streak.chest ? '连续7天达成！快去打开大宝箱' : `每日任务全部完成 · 已连续${Store.s.streak.days}/7天！`);
        }
      },
      reveal: (el) => {
        const card = el.querySelector('.tk-mys-card');
        card.classList.add('is-flip');
        Sfx.play('reward');
        setTimeout(() => {
          const m = Store.revealMystery();
          App.refresh('tasks');
          UI.toast(m.state === 'claim' ? `神秘任务「${m.title}」已完成，快去领取！` : `神秘任务：${m.title}`);
        }, 520);
      },
      mysClaim: () => {
        if (!Store.claimMystery()) return;
        App.refresh('tasks');
        openMysteryChest();
      },
      openChest: () => openMysteryChest(),
      streakChest: async () => {
        const s = Store.s.streak;
        if (s.opened) { UI.toast('大宝箱已经打开过了，下周开启新一轮'); return; }
        if (!s.chest) { UI.toast(`再完成${7 - s.days}天的全部每日任务，就能打开大宝箱`); return; }
        Sfx.play('chest');
        const r = Store.openStreakChest();
        await UI.reward({ title: '大宝箱已打开！', sub: '连续7天全勤，你就是每日达人！', img: CHEST, items: r, note: '连续7天宝箱' });
        App.refresh('tasks');
      },
    },
  });
})();
