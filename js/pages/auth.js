/**
 * V4 登录：app 启动先登录。Google / Facebook 三方登录、邮箱登录与注册，或者游客模式直接进入
 *
 * 页面  login   登录页。没登录时 app 从这里启动（见 app.js），登录成功后 App.root('play') 进大厅
 *       email   邮箱登录 / 注册：params.mode = 'login' | 'register'；params.bind = 1 时是游客绑定邮箱（只有注册）
 *
 * Auth.ok()          是否已登录（游客也算）
 * Auth.onEnter(fn)   进入 app 后执行：启动时已登录就马上执行，否则等登录完成（用于“约35秒后好友来电”这类演示计时）
 * Auth.bind()        游客绑定账号（我的页、设置页调用），进度保留
 * Auth.logout()      退出登录；游客退出会清空本机数据，先提示绑定
 * Auth.label()       当前账号的展示文案，例如“Google · xingxing.soul@gmail.com”
 *
 * 数据在 Store.s：auth 当前账号 { by, id, email, name, at }；owner 本机进度属于哪个账号；lastBy 上次的登录方式；
 *   accounts 邮箱注册表 { 邮箱: { h, name, at } }
 * 演示说明：第三方授权页是模拟的，不接真实 SDK；本机只保存最近登录的一个账号的进度，换别的账号登录会从新用户开始；
 *   邮箱密码只存散列，不存明文（真实产品在服务端用加盐的慢哈希保存）
 */
(() => {
  'use strict';

  const IMG = D.IMG;
  const STELLA = `${IMG}avatars/stella.jpg`;
  // 默认头像和昵称：游客、邮箱注册的新账号用（Google / Facebook 用第三方的）
  const DEFAULT_AV = `${IMG}avatars/happy.jpg`;
  const DEFAULT_NAME = 'happy';
  const DEMO = { email: 'demo@soulgame.com', pwd: 'soul2026', name: '星星' }; // 预置的演示邮箱账号
  const CODE_TTL = 10 * 60 * 1000; // 验证码 10 分钟有效
  const RESEND = 60;               // 重新获取验证码的间隔（秒）
  const EMAIL_RE = /^[^\s@<>"'()]+@[^\s@<>"'()]+\.[a-z]{2,}$/i;

  /* 第三方账号（模拟授权页里显示的账号） */
  const PROVIDER = {
    google: { name: '星星', email: 'xingxing.soul@gmail.com', avatar: STELLA },
    facebook: { name: '星星', fbid: '100078224031', avatar: STELLA },
  };
  const BY_NAME = { google: 'Google', facebook: 'Facebook', email: '邮箱', guest: '游客' };

  const ICON = {
    google: `<svg class="lg-logo" width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A11.9 11.9 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/>
    </svg>`,
    facebook: `<svg class="lg-logo" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9.1 23.7v-8H6.6V12h2.5v-1.6c0-4.1 1.8-6 5.9-6 .8 0 2.1.2 2.6.3v3.3h-1.4c-1.5 0-2 .6-2 2V12h3.3l-.6 3.7h-2.7v8.2C19.4 23.2 24 18.2 24 12c0-6.6-5.4-12-12-12S0 5.4 0 12c0 5.6 3.9 10.4 9.1 11.7z"/></svg>`,
  };

  /* ================= 账号数据 ================= */
  const ok = () => !!Store.s.auth;
  const isGuest = () => !!Store.s.auth && Store.s.auth.by === 'guest';

  /** 演示用散列：本机只存它，不存明文密码 */
  function hash(email, pwd) {
    let h = 2166136261;
    for (const c of `soulgame|${email}|${pwd}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return (h >>> 0).toString(16).padStart(8, '0');
  }
  const account = (email) => Store.s.accounts[email]
    || (email === DEMO.email ? { h: hash(DEMO.email, DEMO.pwd), name: DEMO.name, demo: true } : null);

  const idGoogle = () => ({ by: 'google', id: `google:${PROVIDER.google.email}`, email: PROVIDER.google.email, name: PROVIDER.google.name, avatar: PROVIDER.google.avatar });
  const idFacebook = () => ({ by: 'facebook', id: `facebook:${PROVIDER.facebook.fbid}`, name: PROVIDER.facebook.name, avatar: PROVIDER.facebook.avatar });
  const idEmail = (email, name = DEFAULT_NAME, avatar = DEFAULT_AV) => ({ by: 'email', id: `email:${email}`, email, name, avatar });
  const idGuest = () => ({ by: 'guest', id: `guest:${Store.s.user.uid}`, name: DEFAULT_NAME, avatar: DEFAULT_AV });
  const authOf = (idt) => ({ by: idt.by, id: idt.id, email: idt.email || '', name: idt.name, at: Date.now() });

  function label() {
    const a = Store.s.auth;
    if (!a) return '未登录';
    if (a.by === 'guest') return '游客 · 未绑定';
    if (a.by === 'facebook') return `Facebook · ${a.name}`;
    return `${BY_NAME[a.by]} · ${a.email}`;
  }

  /* ================= 进入 app ================= */
  const enterFns = [];
  let entered = false;
  function runEnter() {
    if (entered) return;
    entered = true;
    enterFns.forEach((fn) => fn());
  }
  App.onInit(() => { if (ok()) runEnter(); });

  /** 登录成功进大厅。本机进度属于别的账号时，换成这个账号的新用户进度（刷新页面） */
  function enter(idt) {
    const s = Store.s;
    if (s.owner && s.owner !== idt.id) {
      Store.reset({ auth: authOf(idt), owner: idt.id, lastBy: idt.by, accounts: s.accounts, user: { name: idt.name, avatar: idt.avatar || null } });
      return;
    }
    const first = !s.owner;
    s.auth = authOf(idt);
    s.owner = idt.id;
    s.lastBy = idt.by;
    if (first) { s.user.name = idt.name; s.user.avatar = idt.avatar || null; }
    Store.emit('auth');
    UI.closeAll();
    App.root('play', {}, { anim: 'fade' });
    runEnter();
    App.whenIdle(() => {
      if (idt.by === 'guest') UI.toast('已用游客身份进入，可在设置里绑定账号', 3000);
      else UI.toast(first ? `${BY_NAME[idt.by]}登录成功` : `欢迎回来，${UI.esc(s.user.name)}`);
    });
  }

  /** 游客绑定账号：进度保留，变成正式账号。Google / Facebook 顺便换成它们的昵称和头像 */
  function link(idt) {
    const s = Store.s;
    s.auth = authOf(idt);
    s.owner = idt.id;
    s.lastBy = idt.by;
    if (idt.by !== 'email') { s.user.name = idt.name; s.user.avatar = idt.avatar; }
    Store.emit('auth');
    UI.toast(`绑定成功，进度已保存到你的${BY_NAME[idt.by]}账号`, 2600);
    App.refresh();
  }

  async function logout() {
    const s = Store.s;
    if (!s.auth) return;
    if (window.Battle && Battle.active && Battle.active()) { UI.toast('你有一局正在进行，先下完这局'); return; }
    if (s.auth.by === 'guest') {
      const k = await UI.dialog({
        title: '退出游客账号？',
        text: '游客数据只保存在这台手机上，退出后等级、金币、钻石和好友都会清空，无法找回。',
        buttons: [{ label: '先绑定账号', key: 'bind' }, { label: '仍然退出', key: 'out', cls: 'btn-ghost' }],
      });
      if (k === 'bind') bind();
      else if (k === 'out') Store.reset({ accounts: s.accounts });
      return;
    }
    const yes = await UI.confirm({ title: '退出登录？', text: `进度已保存在你的${BY_NAME[s.auth.by]}账号里，下次登录可以接着玩。`, ok: '退出登录', danger: true });
    if (!yes) return;
    s.auth = null;
    Store.emit('auth');
    UI.closeAll();
    App.root('login', {}, { anim: 'fade' });
  }

  /* ================= 三方登录（模拟授权页） ================= */
  /** Google：安卓的“选择账号”底部弹层 */
  function google(opt = {}) {
    const p = PROVIDER.google;
    let busy = false;
    const c = UI.sheet({
      cls: 'sheet-google',
      html: `<div class="gg">
        <div class="gg-hd">${ICON.google}<span>使用 Google 账号${opt.bind ? '绑定' : '登录'}</span></div>
        <div class="gg-app"><img src="${IMG}brand/app-icon.png" alt=""><b>选择账号</b><span>以继续使用 <em>Soulgame</em></span></div>
        <button class="gg-acc" data-act="pick"><img src="${p.avatar}" alt=""><span class="gg-acc-m"><b>${p.name}</b><small>${p.email}</small></span><i class="gg-spin" hidden></i></button>
        <button class="gg-acc" data-act="other"><span class="gg-add">${UI.ic('userPlus', 18)}</span><span class="gg-acc-m"><b>使用其他账号</b></span></button>
        <p class="gg-note">为继续操作，Google 会与 Soulgame 分享你的姓名、电子邮件地址和个人资料照片。</p>
      </div>`,
      acts: {
        pick: async (el) => {
          if (busy) return;
          busy = true;
          el.classList.add('is-busy');
          el.querySelector('.gg-spin').hidden = false;
          await UI.sleep(900);
          c.close();
          await UI.sleep(220);
          if (opt.bind) link(idGoogle()); else enter(idGoogle());
        },
        other: () => UI.toast('演示中只能用这个 Google 账号'),
      },
    });
  }

  /** Facebook：授权确认页 */
  function facebook(opt = {}) {
    const p = PROVIDER.facebook;
    let busy = false;
    const c = UI.open({
      type: 'sheet',
      cls: 'sheet-fb',
      html: `<div class="fb">
        <div class="fb-bar">facebook</div>
        <div class="fb-bd">
          <div class="fb-pair"><img src="${p.avatar}" alt=""><i class="fb-link">${UI.ic('link', 16)}</i><img class="fb-app" src="${IMG}brand/app-icon.png" alt=""></div>
          <h3>Soulgame 想获取你的公开资料</h3>
          <p>包括你的名字和头像。Soulgame 不会在 Facebook 上替你发布任何内容。</p>
          <button class="fb-go" data-act="go"><span>以 ${p.name} 的身份继续</span><i class="gg-spin is-white" hidden></i></button>
          <button class="fb-cancel" data-act="close">取消</button>
          <p class="fb-note">继续即表示你允许 Soulgame 按照其隐私政策使用这些信息。</p>
        </div>
      </div>`,
      acts: {
        go: async (el) => {
          if (busy) return;
          busy = true;
          el.querySelector('.gg-spin').hidden = false;
          await UI.sleep(900);
          c.close();
          await UI.sleep(220);
          if (opt.bind) link(idFacebook()); else enter(idFacebook());
        },
      },
    });
  }

  /** 三个登录按钮，登录页和绑定弹层共用；登录页上给上次用过的方式标“上次使用” */
  function btnsHtml(opt = {}) {
    const last = opt.bind ? '' : Store.s.lastBy;
    const tag = (by) => (last === by ? '<i class="lg-last">上次使用</i>' : '');
    return `<button class="lg-btn is-google" data-act="google">${ICON.google}<span>${opt.bind ? '绑定 Google 账号' : '使用 Google 账号登录'}</span>${tag('google')}</button>
      <button class="lg-btn is-facebook" data-act="facebook">${ICON.facebook}<span>${opt.bind ? '绑定 Facebook 账号' : '使用 Facebook 账号登录'}</span>${tag('facebook')}</button>
      <button class="lg-btn is-email" data-act="email">${UI.ic('mail', 20)}<span>${opt.bind ? '绑定邮箱' : '使用邮箱登录 / 注册'}</span>${tag('email')}</button>`;
  }

  /** 游客绑定账号 */
  function bind() {
    if (!isGuest()) return;
    const c = UI.sheet({
      title: '绑定账号',
      sub: '绑定后换手机、重装 app 也能找回进度',
      html: `<div class="lg-btns is-sheet">${btnsHtml({ bind: true })}</div>`,
      acts: {
        google: () => { c.close(); google({ bind: true }); },
        facebook: () => { c.close(); facebook({ bind: true }); },
        email: () => { c.close(); openEmail({ mode: 'register', bind: 1 }); },
      },
    });
  }

  /* ================= 登录页 ================= */
  App.page('login', {
    render(el) {
      el.innerHTML = `
        <div class="lg-bg"><img src="${IMG}fx/galaxy.jpg" alt=""><i></i></div>
        <div class="lg-hero">
          <img class="lg-icon" src="${IMG}brand/app-icon.png" alt="">
          <h1 class="lg-name">Soulgame</h1>
          <p class="lg-slogan">Soulgame, play with your soulmates.</p>
          <img class="lg-art" src="${IMG}brand/blobs-vs.png" alt="">
          <p class="lg-online"><i class="live-dot"></i>${UI.fmt(D.game[D.GAME].online)}人正在下四子棋</p>
        </div>
        <div class="lg-panel">
          <div class="lg-btns">${btnsHtml()}</div>
          <button class="lg-guest" data-act="guest">${UI.ic('user', 17)}游客模式，直接进入${UI.ic('right', 16)}</button>
          <p class="lg-terms">登录即表示你同意<button data-act="terms">《用户协议》</button>和<button data-act="terms">《隐私政策》</button></p>
        </div>`;
    },
    // 登录页是启动页：返回键退出 app
    back() { if (window.Channel) Channel.exit(); return false; },
    act: {
      google: () => google(),
      facebook: () => facebook(),
      // 用过邮箱登录（或在本机注册过）先显示登录，否则先显示注册
      email: () => openEmail({ mode: Store.s.lastBy === 'email' || Object.keys(Store.s.accounts).length ? 'login' : 'register' }),
      guest: () => enter(idGuest()),
      terms: () => UI.demo('协议页面'),
    },
  });

  /* ================= 邮箱登录 / 注册 ================= */
  // 表单状态（不存盘）：sent 是最近一次发出的验证码 { email, code, at }
  // v：每次进入邮箱页的编号（App.go 时带上），变了就清空上次的错误和密码
  const F = { v: null, mode: 'login', email: '', pwd: '', code: '', show: false, err: {}, sent: null, left: 0, busy: false };
  const openEmail = (p) => App.go('email', { ...p, v: Date.now() });
  let tick = 0;
  const emailPage = () => document.querySelector('.page[data-page="email"]');
  const isReg = () => !!App.params('email').bind || F.mode === 'register';

  const field = (name, label, inner) => `<div class="em-field ${F.err[name] ? 'is-err' : ''}" data-f="${name}">
      <label class="em-lab" for="em-${name}">${label}</label><div class="em-box">${inner}</div><em class="em-err">${F.err[name] || ''}</em></div>`;

  function setErr(name, msg) {
    F.err[name] = msg;
    const f = emailPage().querySelector(`.em-field[data-f="${name}"]`);
    if (!f) return;
    f.classList.toggle('is-err', !!msg);
    f.querySelector('.em-err').innerHTML = msg;
  }
  /** 校验邮箱，通过返回小写邮箱 */
  function checkEmail() {
    const v = F.email.trim().toLowerCase();
    if (!v) { setErr('email', '请输入邮箱'); return null; }
    if (!EMAIL_RE.test(v)) { setErr('email', '邮箱格式不对，例如 name@example.com'); return null; }
    return v;
  }
  const pwdOk = (p) => p.length >= 8 && p.length <= 20 && /[a-z]/i.test(p) && /\d/.test(p);
  const taken = () => (App.params('email').bind ? '这个邮箱已被其他账号使用' : '这个邮箱已经注册过了，<button type="button" class="em-link" data-act="mode" data-m="login">直接登录</button>');

  function stopTick() { clearInterval(tick); tick = 0; }
  function startTick() {
    stopTick();
    tick = setInterval(() => {
      F.left = Math.max(0, F.left - 1);
      const b = emailPage().querySelector('.em-send');
      if (b) { b.disabled = F.left > 0; b.textContent = F.left ? `${F.left}秒后重发` : '重新获取'; }
      if (!F.left) stopTick();
    }, 1000);
  }
  function fillCode(code) {
    if (App.top() !== 'email') return;
    F.code = code;
    const inp = emailPage().querySelector('input[name="code"]');
    if (inp) inp.value = code;
    setErr('code', '');
  }
  /** 获取验证码：演示里用一条“新邮件”通知把验证码送过来，点通知自动填入 */
  function sendCode() {
    const email = checkEmail();
    if (!email) return;
    if (account(email)) { setErr('email', taken()); return; }
    const code = String(UI.rand(100000, 999999));
    F.sent = { email, code, at: Date.now() };
    F.left = RESEND;
    const b = emailPage().querySelector('.em-send');
    if (b) { b.disabled = true; b.textContent = `${RESEND}秒后重发`; }
    startTick();
    setErr('code', '');
    UI.toast(`验证码已发送到 ${UI.esc(email)}`);
    setTimeout(() => UI.notify({
      force: true, img: `${IMG}brand/app-icon.png`, title: '新邮件 · Soulgame 验证码', text: `你的验证码是 ${code}，10分钟内有效`, btn: '填入', ms: 8000,
      onTap: () => fillCode(code),
    }), 1200);
  }

  async function wait() {
    F.busy = true;
    const b = emailPage().querySelector('.em-submit');
    b.disabled = true;
    b.innerHTML = '<i class="gg-spin is-white"></i>请稍候…';
    await UI.sleep(700);
    F.busy = false;
  }

  async function submit() {
    if (F.busy) return;
    const bindMode = !!App.params('email').bind;
    const email = checkEmail();
    if (isReg()) {
      let good = !!email;
      if (email && account(email)) { setErr('email', taken()); good = false; }
      const code = F.code.trim();
      if (!F.sent) { setErr('code', '先获取验证码'); good = false; }
      else if (!/^\d{6}$/.test(code)) { setErr('code', '请输入6位验证码'); good = false; }
      else if (email && F.sent.email !== email) { setErr('code', '邮箱改过了，请重新获取验证码'); good = false; }
      else if (F.sent.code !== code) { setErr('code', '验证码不对，请看看邮件'); good = false; }
      else if (Date.now() - F.sent.at > CODE_TTL) { setErr('code', '验证码过期了，请重新获取'); good = false; }
      if (!pwdOk(F.pwd)) { setErr('pwd', '密码要8–20位，同时包含字母和数字'); good = false; }
      if (!good) { Sfx.play('error'); return; }
      await wait();
      const name = DEFAULT_NAME;
      Store.s.accounts[email] = { h: hash(email, F.pwd), name, at: Date.now() };
      Store.save();
      F.pwd = ''; F.code = ''; F.sent = null; F.left = 0;
      stopTick();
      if (bindMode) { link(idEmail(email, name)); App.back(); } else enter(idEmail(email, name));
      return;
    }
    let good = !!email;
    if (!F.pwd) { setErr('pwd', '请输入密码'); good = false; }
    if (!good) { Sfx.play('error'); return; }
    const acc = account(email);
    if (!acc) { setErr('email', '这个邮箱还没注册，<button type="button" class="em-link" data-act="mode" data-m="register">去注册</button>'); Sfx.play('error'); return; }
    if (acc.h !== hash(email, F.pwd)) { setErr('pwd', '密码不对，再试一次'); Sfx.play('error'); return; }
    await wait();
    F.pwd = '';
    enter(acc.demo ? idEmail(email, DEMO.name, STELLA) : idEmail(email, acc.name));
  }

  App.page('email', {
    render(el, p) {
      // 每次从登录页进来：清掉上次的错误和密码，邮箱保留
      if (p.v !== F.v) { Object.assign(F, { v: p.v, mode: p.mode === 'register' ? 'register' : 'login', pwd: '', code: '', show: false, err: {}, busy: false }); }
      const bindMode = !!p.bind;
      const reg = isReg();
      el.innerHTML = `${UI.nav({ title: bindMode ? '绑定邮箱' : reg ? '邮箱注册' : '邮箱登录', cls: 'is-white' })}
        <div class="body em-body" data-scroll="main">
          ${bindMode ? '<p class="em-lead">绑定后，用这个邮箱和密码登录就能找回进度。</p>'
            : `<div class="seg em-seg"><button class="seg-it ${reg ? '' : 'is-active'}" data-act="mode" data-m="login">登录</button><button class="seg-it ${reg ? 'is-active' : ''}" data-act="mode" data-m="register">注册</button></div>`}
          <form class="em-form" novalidate>
            ${field('email', '邮箱', `<input class="em-in" id="em-email" name="email" type="email" inputmode="email" autocomplete="email" placeholder="name@example.com" maxlength="60" value="${UI.esc(F.email)}">`)}
            ${reg ? field('code', '验证码', `<input class="em-in" id="em-code" name="code" inputmode="numeric" autocomplete="one-time-code" placeholder="6位数字" maxlength="6" value="${UI.esc(F.code)}"><button type="button" class="em-send" data-act="send" ${F.left ? 'disabled' : ''}>${F.left ? `${F.left}秒后重发` : F.sent ? '重新获取' : '获取验证码'}</button>`) : ''}
            ${field('pwd', reg ? '设置密码' : '密码', `<input class="em-in" id="em-pwd" name="pwd" type="${F.show ? 'text' : 'password'}" autocomplete="${reg ? 'new-password' : 'current-password'}" placeholder="${reg ? '8–20位，包含字母和数字' : '输入密码'}" maxlength="20" value="${UI.esc(F.pwd)}"><button type="button" class="em-eye" data-act="eye" aria-label="${F.show ? '隐藏密码' : '显示密码'}">${UI.ic(F.show ? 'eye' : 'eyeOff', 20)}</button>`)}
            ${reg ? '' : '<div class="em-row"><button type="button" class="em-link" data-act="forgot">忘记密码？</button></div>'}
            <button type="submit" class="btn btn-primary btn-lg btn-block em-submit">${bindMode ? '绑定' : reg ? '注册并登录' : '登录'}</button>
          </form>
          ${reg ? '' : `<div class="em-demo">${UI.ic('info', 15)}<span>演示账号 ${DEMO.email}<br>密码 ${DEMO.pwd}</span><button type="button" class="em-link" data-act="fill">一键填入</button></div>`}
          <p class="em-safe">${UI.ic('lock', 13)}演示环境，数据只存在这个浏览器里，请不要输入常用密码</p>
          <div class="bottom-space"></div>
        </div>`;
      const form = el.querySelector('.em-form');
      form.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
      form.querySelectorAll('.em-in').forEach((inp) => inp.addEventListener('input', () => {
        F[inp.name] = inp.value;
        if (F.err[inp.name]) setErr(inp.name, '');
      }));
    },
    leave() { stopTick(); F.left = 0; },
    act: {
      mode: (el) => {
        F.mode = el.dataset.m;
        F.err = {};
        F.pwd = '';
        App.refresh('email');
      },
      send: () => sendCode(),
      eye: (el) => {
        F.show = !F.show;
        const inp = emailPage().querySelector('input[name="pwd"]');
        inp.type = F.show ? 'text' : 'password';
        el.innerHTML = UI.ic(F.show ? 'eye' : 'eyeOff', 20);
        el.setAttribute('aria-label', F.show ? '隐藏密码' : '显示密码');
      },
      forgot: () => UI.demo('找回密码'),
      fill: () => {
        Object.assign(F, { mode: 'login', email: DEMO.email, pwd: DEMO.pwd, err: {} });
        App.refresh('email');
      },
    },
  });

  window.Auth = {
    ok, isGuest, label, logout, bind,
    by: () => (Store.s.auth ? Store.s.auth.by : ''),
    onEnter: (fn) => { enterFns.push(fn); if (entered) fn(); },
    ICON,
  };
})();
