/**
 * V3 好友通话：语音 / 视频（演示，不采集真实音视频）
 *
 * Call.start(uid, 'voice'|'video')  发起通话：只能打给在线好友；会员免费（语音 perk voiceFree、视频 perk videoFree），
 *                                   否则弹付费面板（开通会员 / 用钻石按次付费 / 取消）；首次通话询问麦克风（视频再问摄像头）
 * Call.incoming(uid, kind)          模拟好友来电：全屏来电页，接听同样走价格和授权；20秒没接记“对方已取消”
 * Call._ringNow(uid?, kind?)        测试用：立刻来一通电话（默认莉莉语音）
 *
 * 页面 call：根节点 .call-page，状态 is-ringing（呼叫中 / 来电中）、is-incoming（来电）、is-connected、is-video / is-voice
 * 按钮 data-act：hangup、mute、speaker、cam、flip、accept、decline；计时 .call-time
 * 挂断后往私聊写一条记录：{ from, type: 'call', kind, dur, st, text }
 *   st：done 通话完成、cancel 我取消、missed 对方已取消（来电未接）、declined 已拒绝、noanswer 对方未接
 */
(() => {
  'use strict';

  const C = D.vip.call;
  const NAME = { voice: '语音通话', video: '视频通话' };
  const STATE_CLS = ['is-ringing', 'is-incoming', 'is-connected', 'is-video', 'is-voice', 'is-in', 'is-out', 'is-hide-ui'];

  /* UI.ic 里没有的图标，内联在这里 */
  const P = {
    video: '<path d="m16 13 5.2 3.5a.5.5 0 0 0 .8-.4V7.9a.5.5 0 0 0-.8-.4L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
    videoOff: '<path d="M10.7 6H14a2 2 0 0 1 2 2v2.5l5.2-3a.5.5 0 0 1 .8.4v8.2"/><path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2"/><path d="m2 2 20 20"/>',
    flip: '<path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/><path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5"/><circle cx="12" cy="12" r="3"/><path d="m18 22-3-3 3-3"/><path d="m6 2 3 3-3 3"/>',
    speakerOff: '<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/>',
  };
  const ic = (name, size = 26, cls = '') => (P[name]
    ? `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name]}</svg>`
    : UI.ic(name, size, cls));
  /** 挂断：电话听筒转 135° */
  const hangIc = (size = 30) => UI.ic('phone', size, 'call-ic-hang');

  const nameOf = (uid) => (D.people[uid] ? D.people[uid].name : '');
  const fmt = (sec) => {
    const m = Math.floor(sec / 60);
    return `${String(m).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  };
  const isFree = (kind) => !!Store.perk(kind === 'video' ? 'videoFree' : 'voiceFree');
  /** 会员中心由 vip.js 提供；还没加载时直接进页面 */
  const openVip = (t) => (window.Vip && typeof Vip.open === 'function' ? Vip.open(t) : App.go('vip', { tier: t }, { queue: true }));
  const page = () => document.querySelector('.page[data-page="call"]');

  let sess = null;      // 当前通话
  let starting = false; // 发起流程（付费面板、授权弹窗）进行中
  const active = () => !!(sess && !sess.ended);

  /* ================= 价格与授权 ================= */
  /** 付费面板：返回 'vip' | 'gems' | null */
  function paywall(uid, kind) {
    return new Promise((resolve) => {
      const n = C[kind];
      const video = kind === 'video';
      const memberVideo = video && Store.vipTier() === 1;
      const lead = memberVideo ? '会员视频按次付费，超级会员免费'
        : video ? '开通超级会员，视频通话免费打' : '开通会员，语音通话免费打';
      let picked = null;
      const c = UI.sheet({
        title: NAME[kind],
        sub: `和${UI.esc(nameOf(uid))}${video ? '面对面' : '语音'}聊聊`,
        cls: 'call-pay',
        html: `<div class="cp-hd">${UI.av(uid, 54)}<span class="cp-ic ${video ? 'is-video' : ''}">${ic(video ? 'video' : 'phone', 14)}</span>
            <div class="cp-txt"><b>${lead}</b><span>不开通也能打：每次${n}钻石，最长${C.maxMin}分钟</span></div></div>
          <div class="cp-ops">
            <button class="btn btn-gold btn-lg btn-block" data-act="callVip">${UI.ic('crown', 18)}${video ? '开通超级会员 · 视频免费' : '开通会员 · 语音免费'}</button>
            <button class="btn btn-line btn-lg btn-block cp-gems" data-act="callGems">${UI.cur('gems', 18)}<span>用钻石通话 · ${n}钻石/次<small>（最长${C.maxMin}分钟）</small></span></button>
            <p class="cp-bal">钻石余额 ${UI.cur('gems', 14)}${UI.bind('gems')}</p>
            <button class="btn btn-ghost btn-lg btn-block" data-act="close">取消</button>
          </div>`,
        acts: {
          callVip: () => { picked = 'vip'; c.close(); },
          callGems: () => { picked = 'gems'; c.close(); },
        },
        onClose: () => resolve(picked),
      });
    });
  }

  /** 首次通话询问麦克风，视频再问摄像头；拒绝返回 false（下次还会问） */
  async function askPerm(kind) {
    const p = Store.s.callPerm || (Store.s.callPerm = { mic: false, cam: false });
    if (!p.mic) {
      const ok = await UI.confirm({ title: '允许 Soulgame 使用麦克风？', text: '通话时要用麦克风说话（演示，不会真的录音）', ok: '允许', cancel: '拒绝' });
      if (!ok) { UI.toast('没有麦克风权限，打不了电话'); return false; }
      p.mic = true;
      Store.save();
    }
    if (kind === 'video' && !p.cam) {
      const ok = await UI.confirm({ title: '允许 Soulgame 使用摄像头？', text: '视频通话要用摄像头（演示，不会真的拍摄）', ok: '允许', cancel: '拒绝' });
      if (!ok) { UI.toast('没有摄像头权限，打不了视频'); return false; }
      p.cam = true;
      Store.save();
    }
    return true;
  }

  /**
   * 价格 → 授权 → 扣钻石（授权在扣费之前，拒绝就不用退款）
   * 返回 { paid } 可以通话；{ vip: true } 去开通会员；{ lack } 钻石不够；null 取消
   */
  async function gate(uid, kind) {
    let n = 0;
    if (!isFree(kind)) {
      const pick = await paywall(uid, kind);
      if (pick === 'vip') return { vip: true };
      if (pick !== 'gems') return null;
      n = C[kind];
      if ((Store.s.gems || 0) < n) return { lack: n - (Store.s.gems || 0) };
    }
    if (!(await askPerm(kind))) return null;
    if (n) Store.add('gems', -n, NAME[kind]);
    return { paid: n };
  }
  const vipTierFor = (kind) => (kind === 'video' ? 2 : 1);
  function lack(n) {
    UI.toast(`钻石不够，还差${n}钻石`);
    App.go('shop', { tab: 'topup' }, { queue: true });
  }

  /* ================= 发起 / 来电 ================= */
  async function start(uid, kind = 'voice') {
    kind = kind === 'video' ? 'video' : 'voice';
    const p = D.people[uid];
    if (!p) return false;
    if (active() || starting) { UI.toast('正在通话中'); return false; }
    if (!Store.isFriend(uid)) { UI.toast('加好友后才能通话'); return false; }
    if (!p.online) { UI.toast(`${p.name}现在不在线，晚点再打吧`); return false; }
    starting = true;
    try {
      const g = await gate(uid, kind);
      if (!g) return false;
      if (g.vip) { openVip(vipTierFor(kind)); return false; }
      if (g.lack) { lack(g.lack); return false; }
      App.go('call', { uid, kind, dir: 'out', paid: g.paid }, { anim: 'up', queue: true });
      return true;
    } finally {
      starting = false;
    }
  }

  function incoming(uid, kind = 'voice') {
    kind = kind === 'video' ? 'video' : 'voice';
    if (!D.people[uid] || !Store.isFriend(uid) || active() || starting) return false;
    UI.closeAll();
    App.go('call', { uid, kind, dir: 'in', paid: 0 }, { anim: 'up', queue: true });
    return true;
  }

  /* ================= 通话会话 ================= */
  function later(s, fn, ms) {
    const id = setTimeout(() => { s.timers.delete(id); if (sess === s && !s.ended) fn(); }, ms);
    s.timers.add(id);
    return id;
  }
  function every(s, fn, ms) {
    const id = setInterval(() => { if (sess === s && !s.ended) fn(); }, ms);
    s.loops.add(id);
    return id;
  }
  function stop(s) {
    if (!s) return;
    s.timers.forEach(clearTimeout);
    s.loops.forEach(clearInterval);
    s.timers.clear();
    s.loops.clear();
  }

  function begin(p) {
    if (active()) stop(sess);
    const kind = p.kind === 'video' ? 'video' : 'voice';
    const dir = p.dir === 'in' ? 'in' : 'out';
    const s = {
      p, uid: D.people[p.uid] ? p.uid : 'lily', kind, dir, paid: +p.paid || 0,
      state: dir === 'in' ? 'incoming' : 'ringing',
      t0: 0, sec: 0, muted: false, speaker: kind === 'video', cam: true, front: true, hideUi: false, talking: false,
      ended: false, timers: new Set(), loops: new Set(),
    };
    sess = s;
    if (dir === 'out') {
      // 演示：好友一定会接，2–3秒后接通
      later(s, connect, 2000 + Math.floor(Math.random() * 900));
    } else {
      s.ringTO = later(s, () => finish('timeout'), 20000);
      s.ringLoop = every(s, () => Sfx.play('msg'), 2600);
      Sfx.play('msg');
    }
  }

  function connect() {
    const s = sess;
    if (!s || s.ended) return;
    clearTimeout(s.ringTO);
    clearInterval(s.ringLoop);
    s.state = 'connected';
    s.t0 = Date.now();
    s.sec = 0;
    every(s, tick, 1000);
    if (s.kind === 'voice') later(s, talk, 600);
    // 钻石通话最长 30 分钟
    if (s.paid) later(s, () => finish('limit'), C.maxMin * 60000);
    Sfx.play('tap');
    paint();
  }
  function tick() {
    sess.sec = Math.floor((Date.now() - sess.t0) / 1000);
    const t = page()?.querySelector('.call-time');
    if (t) t.textContent = fmt(sess.sec);
  }
  /** 对方说话：头像外圈声波一阵一阵的 */
  function talk() {
    const s = sess;
    s.talking = !s.talking;
    page()?.querySelector('.call-peer')?.classList.toggle('is-talking', s.talking);
    later(s, talk, s.talking ? 1300 + Math.random() * 1900 : 800 + Math.random() * 1500);
  }

  /**
   * 结束通话并写记录
   * opt.nav   是否退出通话页（默认是；页面已被别的导航带走时传 false）
   * opt.then  退出后再做的事（去开通会员 / 去充值）
   */
  function finish(reason, opt = {}) {
    const s = sess;
    if (!s || s.ended) return;
    s.ended = true;
    stop(s);
    const { uid, kind } = s;
    const word = kind === 'video' ? '视频' : '语音';
    let msg;
    let read = true;
    let toast = '';
    if (s.state === 'connected') {
      const sec = Math.max(1, Math.round((Date.now() - s.t0) / 1000));
      msg = { from: s.dir === 'out' ? 'me' : uid, st: 'done', dur: sec, text: `${NAME[kind]} ${fmt(sec)}` };
      toast = reason === 'limit' ? `已到${C.maxMin}分钟上限，通话结束` : `通话结束 ${fmt(sec)}`;
    } else if (s.dir === 'out') {
      msg = { from: 'me', st: 'cancel', dur: 0, text: '已取消' };
      if (s.paid) {
        Store.add('gems', s.paid, `${NAME[kind]}未接通退回`);
        toast = `没接通，${s.paid}钻石已退回`;
      }
    } else if (reason === 'timeout') {
      msg = { from: uid, st: 'missed', dur: 0, text: '对方已取消' };
      read = false;
      toast = `错过了${nameOf(uid)}的${word}来电`;
    } else {
      msg = { from: uid, st: 'declined', dur: 0, text: '已拒绝' };
    }
    s.state = 'ended';
    Store.dm(uid);
    Store.post(uid, { type: 'call', kind, ...msg }, { read });
    Sfx.play('tick');
    if (opt.nav !== false) {
      const el = page();
      if (el) el.classList.add('is-ended');
      App.whenIdle(() => {
        if (App.top() === 'call') App.pop();
        if (opt.then) App.whenIdle(opt.then);
      });
    }
    if (toast) UI.toast(toast);
  }

  async function accept() {
    const s = sess;
    if (!active() || s.state !== 'incoming' || s.gating) return;
    s.gating = true;
    // 选付费方式、授权的时候先别让来电超时
    clearTimeout(s.ringTO);
    clearInterval(s.ringLoop);
    const g = await gate(s.uid, s.kind);
    s.gating = false;
    if (sess !== s || s.ended) return;
    if (!g) { finish('decline'); return; }
    if (g.vip) { finish('decline', { then: () => openVip(vipTierFor(s.kind)) }); return; }
    if (g.lack) { const n = g.lack; finish('decline', { then: () => lack(n) }); return; }
    s.paid = g.paid;
    connect();
  }

  /* ================= 页面 ================= */
  const btn = (act, icon, label, opt = {}) => `<button class="call-btn ${opt.cls || ''}" data-act="${act}"${opt.pressed === undefined ? '' : ` aria-pressed="${opt.pressed}"`} aria-label="${label}">
      <span class="call-btn-ic">${icon}</span><i>${label}</i></button>`;

  function topHtml(s) {
    const n = C[s.kind];
    const free = isFree(s.kind);
    const t = Store.vipTier();
    let fee;
    if (s.paid) fee = `${UI.cur('gems', 13)}本次${s.paid}钻石 · 最长${C.maxMin}分钟`;
    else if (free) fee = `${UI.vipTag(t)}${s.dir === 'in' ? '会员免费接听' : '会员免费通话'}`;
    else fee = `${UI.cur('gems', 13)}接听${n}钻石/次 · ${s.kind === 'video' ? '超级会员' : '会员'}免费`;
    return `<div class="call-top"><span class="call-lock">${UI.ic('lock', 11)}Soulgame ${NAME[s.kind]} · 演示</span><span class="call-fee">${fee}</span></div>`;
  }
  function statusHtml(s) {
    if (s.state === 'incoming') return `邀请你${s.kind === 'video' ? '视频' : '语音'}通话`;
    if (s.state === 'connected') return `<span class="call-time">${fmt(s.sec)}</span>${s.muted ? `<span class="call-muted">${UI.ic('micOff', 12)}你已静音</span>` : ''}`;
    if (s.state === 'ended') return '通话已结束';
    return `正在呼叫…<small>${s.kind === 'video' ? '等待对方接受视频邀请' : '等待对方接听'}</small>`;
  }
  function selfHtml(s) {
    if (s.kind !== 'video' || s.state === 'incoming') return '';
    let inner;
    if (!s.cam) inner = `<span class="call-self-off">${ic('videoOff', 22)}<i>摄像头已关闭</i></span>`;
    else if (s.front) inner = `<img src="${UI.person('me').avatar}" alt=""><i class="call-self-tag">摄像头画面（演示）</i>`;
    else inner = '<span class="call-self-rear"></span><i class="call-self-tag">后置摄像头（演示）</i>';
    return `<div class="call-self ${s.cam ? '' : 'is-off'}">${inner}</div>`;
  }
  function ctrlsHtml(s) {
    if (s.state === 'incoming') {
      return `<div class="call-row is-two">${btn('decline', hangIc(30), '拒绝', { cls: 'is-hang' })}${btn('accept', s.kind === 'video' ? ic('video', 30) : UI.ic('phone', 30), '接听', { cls: 'is-accept' })}</div>`;
    }
    const hang = btn('hangup', hangIc(30), s.state === 'connected' ? '挂断' : '取消', { cls: 'is-hang' });
    const mute = btn('mute', UI.ic(s.muted ? 'micOff' : 'mic', 24), '静音', { pressed: s.muted });
    if (s.kind === 'voice') {
      return `<div class="call-row">${mute}${hang}${btn('speaker', s.speaker ? UI.ic('volume', 24) : ic('speakerOff', 24), '免提', { pressed: s.speaker })}</div>`;
    }
    return `<div class="call-row">${btn('cam', ic(s.cam ? 'video' : 'videoOff', 24), s.cam ? '关摄像头' : '开摄像头', { pressed: !s.cam })}${btn('flip', ic('flip', 24), '翻转')}${mute}</div>
      <div class="call-row is-one">${hang}</div>`;
  }

  function paint(el = page()) {
    const s = sess;
    if (!el || !s) return;
    const p = D.people[s.uid];
    const video = s.kind === 'video';
    const conn = s.state === 'connected';
    el.classList.remove(...STATE_CLS, 'is-ended');
    el.classList.add('call-page', video ? 'is-video' : 'is-voice', s.dir === 'in' ? 'is-in' : 'is-out');
    if (s.state === 'ringing') el.classList.add('is-ringing');
    if (s.state === 'incoming') el.classList.add('is-ringing', 'is-incoming');
    if (conn) el.classList.add('is-connected');
    if (conn && video && s.hideUi) el.classList.add('is-hide-ui');
    el.innerHTML = `
      <div class="call-bg" style="background-image:url(${p.avatar})"></div>
      ${video && conn ? `<div class="call-video" data-act="toggleUi"><img class="call-feed" src="${p.avatar}" alt="${UI.esc(p.name)}的视频画面"><i class="call-flicker"></i></div>` : ''}
      <div class="call-shade"></div>
      ${topHtml(s)}
      ${selfHtml(s)}
      <div class="call-peer ${s.talking ? 'is-talking' : ''}">
        <div class="call-av"><i class="call-pulse"></i><i class="call-pulse"></i><i class="call-pulse"></i><img src="${p.avatar}" alt=""></div>
        <h2 class="call-name">${UI.name(s.uid)}</h2>
        <p class="call-st">${statusHtml(s)}</p>
        ${!video && conn ? '<div class="call-eq" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>' : ''}
      </div>
      ${video && conn ? '<p class="call-tip">点屏幕可隐藏按钮</p>' : ''}
      <div class="call-ctrls">${ctrlsHtml(s)}</div>`;
  }
  function repaint(part) {
    const el = page();
    const s = sess;
    if (!el || !s) return;
    if (part === 'ctrls') el.querySelector('.call-ctrls').innerHTML = ctrlsHtml(s);
    if (part === 'status') el.querySelector('.call-st').innerHTML = statusHtml(s);
    if (part === 'self') {
      const old = el.querySelector('.call-self');
      if (old) old.outerHTML = selfHtml(s);
    }
  }

  App.page('call', {
    render(el, p) {
      if (!sess || sess.p !== p) begin(p);
      paint(el);
    },
    back() {
      if (active()) finish(sess.state === 'incoming' ? 'decline' : 'hangup');
      else App.pop();
      return false;
    },
    leave() {
      // 被别的导航带走（比如点了通知）也要把记录写上
      if (active()) finish('hangup', { nav: false });
    },
    act: {
      hangup: () => { if (active() && !sess.gating) finish('hangup'); },
      decline: () => { if (active() && sess.state === 'incoming' && !sess.gating) finish('decline'); },
      accept: () => accept(),
      mute: () => {
        if (!active()) return;
        sess.muted = !sess.muted;
        repaint('ctrls');
        repaint('status');
        UI.toast(sess.muted ? '已静音，对方听不到你' : '已取消静音', 1200);
      },
      speaker: () => {
        if (!active()) return;
        sess.speaker = !sess.speaker;
        repaint('ctrls');
        UI.toast(sess.speaker ? '已切换到免提' : '已切换到听筒', 1200);
      },
      cam: () => {
        if (!active()) return;
        sess.cam = !sess.cam;
        repaint('ctrls');
        repaint('self');
        UI.toast(sess.cam ? '摄像头已打开' : '摄像头已关闭，对方看不到你', 1200);
      },
      flip: () => {
        if (!active()) return;
        if (!sess.cam) { UI.toast('先打开摄像头', 1200); return; }
        sess.front = !sess.front;
        repaint('self');
        page()?.querySelector('.call-self')?.classList.add('is-flip');
      },
      toggleUi: () => {
        if (!active() || sess.state !== 'connected' || sess.kind !== 'video') return;
        sess.hideUi = !sess.hideUi;
        page()?.classList.toggle('is-hide-ui', sess.hideUi);
      },
    },
  });

  /* ================= 模拟来电：进入 app 约35秒后，莉莉打来一次语音 ================= */
  let ringTimer = 0;
  function inGame() {
    const st = App.stack();
    return ['match', 'game', 'result'].some((id) => st.includes(id)) || !!document.querySelector('.floater:not([hidden]), [data-floater]:not([hidden])');
  }
  const isFreeNow = () => App.TABS.includes(App.top()) && !App.isBusy() && !UI.hasOverlay() && !document.querySelector('.coach') && !inGame() && !active() && !starting;
  const caller = () => (Store.isFriend('lily') ? 'lily' : Store.s.friends.find((u) => D.people[u] && D.people[u].online));
  function ringNow(uid, kind = 'voice') {
    clearTimeout(ringTimer);
    ringTimer = 0;
    Store.s.rang = true;
    Store.save();
    const who = uid || caller();
    return who ? incoming(who, kind) : false;
  }
  function scheduleRing() {
    if (Store.s.rang || ringTimer) return;
    const tryRing = () => {
      ringTimer = 0;
      if (Store.s.rang) return;
      if (!isFreeNow()) { ringTimer = setTimeout(tryRing, 4000); return; }
      ringNow();
    };
    ringTimer = setTimeout(tryRing, 35000);
  }
  // 从登录完成（已登录时是启动）开始计时，避免在登录页上耗掉这35秒
  Auth.onEnter(scheduleRing);

  window.Call = {
    start, incoming,
    active,
    isFree,
    price: (kind) => C[kind === 'video' ? 'video' : 'voice'],
    _ringNow: ringNow,
  };
})();
