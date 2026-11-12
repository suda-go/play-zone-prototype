/**
 * 通用 UI：图标、头像与装扮、余额绑定与滚动数字、红点、浮层（底部弹层 / 弹窗 / 全屏）、
 * 领奖飞入动画、Toast、顶部通知、新手引导气泡、分享面板、音效
 */
(() => {
  'use strict';

  const IMG = D.IMG;
  const UI = (window.UI = {});
  const scr = () => document.querySelector('.screen');

  /* ================= 工具 ================= */
  UI.esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  UI.fmt = (n) => {
    n = Math.round(n);
    if (Math.abs(n) >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '万';
    return n.toLocaleString('zh-CN');
  };
  UI.usd = (n) => '$' + n.toFixed(2);
  UI.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  UI.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  UI.rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  // 自己的头像：Google / Facebook 登录用第三方头像，游客和邮箱注册是默认头像 happy（Store.s.user.avatar）
  UI.person = (uid) => (uid === 'me'
    ? { id: 'me', name: Store.s.user.name, lv: Store.s.user.lv, avatar: Store.s.user.avatar || `${IMG}avatars/happy.jpg`, frame: Store.s.equip.frame, bg: Store.s.equip.bg, online: true }
    : D.people[uid]);
  UI.game = (id) => D.game[id];
  /** 屏幕内坐标（外框缩放后也准确） */
  UI.local = (el) => {
    const s = scr();
    const sr = s.getBoundingClientRect();
    const k = sr.width / s.offsetWidth || 1;
    const r = el.getBoundingClientRect ? el.getBoundingClientRect() : el;
    return { x: (r.left - sr.left) / k, y: (r.top - sr.top) / k, w: r.width / k, h: r.height / k };
  };

  /* ================= 图标 ================= */
  const P = {
    back: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    search: '<circle cx="11" cy="11" r="7.5"/><path d="m20.5 20.5-4-4"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4"/><path d="m15.4 6.5-6.8 4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
    userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>',
    userCheck: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m16 11 2 2 4-4"/>',
    userMinus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11h-6"/>',
    msg: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    msgText: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M13 8H7"/><path d="M17 12H7"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    crown: '<path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 20h14"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    edit: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
    more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    ticket: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    volume: '<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/>',
    mute: '<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/>',
    mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>',
    micOff: '<path d="m2 2 20 20"/><path d="M18.9 13.2A7 7 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.3V5a3 3 0 0 0-5.7-1.3"/><path d="M9 9v3a3 3 0 0 0 5.1 2.1"/><path d="M12 19v3"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3-3a2 2 0 0 0-2.8 0L6 21"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.7V17c0 .6-.5 1-1 1.2C7.9 18.8 7 20.2 7 22"/><path d="M14 14.7V17c0 .6.5 1 1 1.2 1.1.6 2 2 2 3.8"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4.1 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    bot: '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
    swords: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="m13 19 6-6"/><path d="m16 16 4 4"/><path d="m19 21 2-2"/><path d="M14.5 6.5 18 3h3v3l-3.5 3.5"/><path d="m5 14 4 4"/><path d="m7 17-3 3"/><path d="m3 19 2 2"/>',
    book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
    bag: '<path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M8 10h8"/><path d="M8 18h8"/><path d="M8 22v-6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.5 12.9 17 22l-5-3-5 3 1.5-9.1"/>',
    chart: '<path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/>',
    gear: '<path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.8l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.8v-.5a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.8 9.8 0 0 1 6.7 2.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.8 9.8 0 0 1-6.7-2.7L3 16"/><path d="M8 16H3v5"/>',
    calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
    gamepad: '<path d="M6 11h4"/><path d="M8 9v4"/><path d="M15 12h.01"/><path d="M18 10h.01"/><path d="M17.3 5H6.7a4 4 0 0 0-4 3.6C2.6 9.4 2 14.5 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.4-1.4a2 2 0 0 1 1.4-.6h4.4a2 2 0 0 1 1.4.6L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.5-.6-6.6-.7-7.3a4 4 0 0 0-4-3.7z"/>',
    door: '<path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h3"/><path d="M13 20h9"/><path d="M10 12v.01"/><path d="M13 4.6v16.1a1 1 0 0 1-1.2 1L5 20V5.6a2 2 0 0 1 1.5-1.9l4-1A2 2 0 0 1 13 4.6Z"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M10.7 5.1A10.4 10.4 0 0 1 12 5c7 0 10 7 10 7a13.2 13.2 0 0 1-1.7 2.7"/><path d="M6.6 6.6A13.5 13.5 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="m2 2 20 20"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    user: '<circle cx="12" cy="8" r="4.5"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    play: '<path d="M7 4.8v14.4a1 1 0 0 0 1.5.86l11.6-7.2a1 1 0 0 0 0-1.72L8.5 3.94A1 1 0 0 0 7 4.8z" fill="currentColor" stroke="none"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    star: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    sparkles: '<path d="M9.9 15.5A2 2 0 0 0 8.5 14l-6.1-1.6a.5.5 0 0 1 0-1L8.5 9.9A2 2 0 0 0 9.9 8.5l1.6-6.1a.5.5 0 0 1 1 0l1.6 6.1a2 2 0 0 0 1.4 1.4l6.1 1.6a.5.5 0 0 1 0 1L15.5 14a2 2 0 0 0-1.4 1.4l-1.6 6.1a.5.5 0 0 1-1 0z"/>',
  };
  UI.ic = (name, size = 22, cls = '') => `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;


  /* ================= 货币与奖励 ================= */
  const CUR = { gems: `${IMG}ui/gem.png`, coins: `${IMG}ui/coin.svg`, exp: `${IMG}ui/exp.svg`, boost: `${IMG}ui/rocket.png`, pass: `${IMG}ui/pass.svg` };
  UI.CUR_NAME = { gems: '钻石', coins: '金币', exp: '经验', boost: '加速卡', pass: '房卡' };
  UI.cur = (k, s = 18, cls = '') => `<img class="cur ${cls}" src="${CUR[k]}" width="${s}" height="${s}" alt="${UI.CUR_NAME[k] || ''}">`;
  /** 奖励对象 → 展示条目 */
  UI.items = (r = {}) => {
    const out = [];
    ['gems', 'coins', 'exp'].forEach((k) => { if (r[k]) out.push({ k, icon: UI.cur(k, 44), label: `${UI.fmt(r[k])}${UI.CUR_NAME[k]}`, short: `+${UI.fmt(r[k])}` }); });
    if (r.boost) out.push({ k: 'boost', icon: UI.cur('boost', 44), label: `加速卡×${r.boost}`, short: `×${r.boost}` });
    if (r.pass) out.push({ k: 'pass', icon: UI.cur('pass', 44), label: `房卡×${r.pass}`, short: `×${r.pass}` });
    if (r.frame) out.push({ k: 'frame', icon: UI.av('me', 44, { frame: r.frame }), label: /框$/.test(D.frames[r.frame].name) ? D.frames[r.frame].name : `${D.frames[r.frame].name}头像框`, short: '头像框' });
    if (r.chest) out.push({ k: 'chest', icon: `<img src="${IMG}brand/mascot-gift.png" width="44" height="44" alt="">`, label: '神秘宝箱', short: '宝箱' });
    return out;
  };
  /** 奖励文字：'+20钻石 · 加速卡×1 · 神秘宝箱' */
  UI.rewardText = (r = {}) => UI.items(r).map((it) => (['gems', 'coins', 'exp'].includes(it.k) ? `${it.short}${UI.CUR_NAME[it.k]}` : it.label)).join(' · ');
  UI.rewardInline = (r = {}) => UI.items(r).map((it) => `<span class="rw-inline">${['gems', 'coins', 'exp', 'boost', 'pass'].includes(it.k) ? UI.cur(it.k, 16) : ''}${it.short}</span>`).join('');
})();

/* ================= 头像、装扮、段位、表情、二维码 ================= */
(() => {
  'use strict';

  const UI = window.UI;

  /** 头像框：图片框按拟合位置摆放；CSS 框是渐变圆环加 3D 装饰物 */
  UI.frame = (id) => {
    const f = D.frames[id];
    if (!f) return '';
    if (f.img) {
      const [l, t, w, h] = f.box;
      return `<img class="av-frame" src="${f.img}" style="left:${l}%;top:${t}%;width:${w}%;height:${h}%" alt="">`;
    }
    return `<i class="av-ring ring-${f.ring}"></i>${f.deco ? `<img class="av-deco deco-${f.pos}" src="${f.deco}" alt="">` : ''}`;
  };

  /**
   * 头像
   * opt.frame  指定头像框（默认用该玩家当前装备的）；false 不显示框
   * opt.on     显示在线绿点
   * opt.lv     显示等级角标
   */
  UI.av = (uid, size = 44, opt = {}) => {
    const p = UI.person(uid);
    if (!p) return '';
    const frame = opt.frame === false ? null : (opt.frame || p.frame);
    const on = opt.on && (uid === 'me' || p.online);
    return `<span class="av ${frame ? 'has-frame' : ''} ${opt.cls || ''}" style="--s:${size}px"><img class="av-img" src="${p.avatar}" alt="${UI.esc(p.name)}">${frame ? UI.frame(frame) : ''}${on ? '<i class="av-on"></i>' : ''}${opt.lv ? `<b class="av-lv">Lv${p.lv}</b>` : ''}</span>`;
  };
  /** 会员档位：自己读 Store，其他人读 D.people[uid].vip */
  UI.vipOf = (uid) => (uid === 'me' ? Store.vipTier() : (D.people[uid] && D.people[uid].vip) || 0);
  /** 会员标签：1 金色“会员”，2 彩色“超级” */
  UI.vipTag = (tier) => (tier ? `<i class="vtag v${tier}">${D.vip.tiers[tier].short}</i>` : '');
  /** 带会员颜色的名字（已转义），opt.tag 为 false 时不带标签 */
  UI.name = (uid, opt = {}) => {
    const p = UI.person(uid);
    if (!p) return '';
    const t = UI.vipOf(uid);
    const n = opt.text || (uid === 'me' && opt.me ? opt.me : p.name);
    return `<span class="vname v${t}">${UI.esc(n)}</span>${opt.tag === false ? '' : UI.vipTag(t)}`;
  };
  UI.bubble = (id) => `bub-${id || 'default'}`;
  UI.bg = (id) => (D.bgs[id] || D.bgs.aurora).css;

  /* ---------- 段位徽章 ---------- */
  const star = (cx, cy, r, inner = 0.45) => {
    let d = '';
    for (let i = 0; i < 10; i += 1) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * inner : r;
      d += `${i ? 'L' : 'M'}${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`;
    }
    return d + 'Z';
  };
  UI.starPath = star;
  UI.tier = (t, s = 36) => `<svg class="tier" width="${s}" height="${s}" viewBox="0 0 48 48" aria-hidden="true">
    ${t >= 3 ? '<path d="M7 16 1 12l2 10 5 4zM41 16l6-4-2 10-5 4z" fill="url(#tier' + t + ')" opacity=".85"/>' : ''}
    <path d="M24 3 41 9v13.5C41 33.5 33.6 41.6 24 45 14.4 41.6 7 33.5 7 22.5V9Z" fill="url(#tier${t})"/>
    <path d="M24 7.5 37 12.2v10.3c0 8.3-5.6 14.6-13 17.6-7.4-3-13-9.3-13-17.6V12.2Z" fill="#fff" opacity=".22"/>
    <path d="${star(24, 23.5, 8.5)}" fill="#fff"/>
    ${t >= 4 ? '<circle cx="24" cy="5" r="2.6" fill="#fff"/>' : ''}
  </svg>`;
  UI.tierName = (r) => D.tiers[r.tier];
  UI.rankLine = (r) => `${D.tiers[r.tier]} · ${r.pts}/100`;

  /* ---------- 局内表情：蓝色团子脸，和 Figma 局内表情同一套造型 ---------- */
  const L = [26.8, 22.8];
  const R = [38.2, 22.8];
  const pill = ([cx, cy], h = 8) => `<rect x="${cx - 1.8}" y="${cy - h / 2}" width="3.6" height="${h}" rx="1.8" fill="#111"/>`;
  const line = (d, w = 2.6, c = '#111') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const NAVY = '#0a1a5c';
  const smile = line('M25.5 39.5q7 6 14 0', 2.6, NAVY);
  const hearts = '<path d="M27.557 14.537C26.395 14.96 25.734 16.505 25.338 17.629C24.312 17.023 22.813 16.264 21.651 16.687C19.556 17.449 18.462 19.746 19.213 21.807C19.66 23.036 20.584 23.677 21.327 24.191C23.485 25.685 27.982 26.885 28.172 26.935C28.356 26.984 28.545 26.973 28.716 26.91C28.887 26.848 29.039 26.735 29.148 26.58C29.262 26.419 31.935 22.61 32.628 20.078C32.867 19.206 33.163 18.121 32.716 16.892C31.966 14.831 29.651 13.775 27.557 14.537Z" fill="#FF5D7D"/><path d="M41.769 20.365C41.014 20.09 40.041 20.583 39.375 20.976C39.118 20.247 38.689 19.244 37.935 18.969C36.575 18.474 35.073 19.16 34.586 20.498C34.295 21.296 34.488 22 34.642 22.566C35.092 24.209 36.828 26.682 36.901 26.787C36.972 26.887 37.071 26.961 37.182 27.001C37.293 27.042 37.416 27.049 37.535 27.017C37.658 26.985 40.578 26.206 41.978 25.236C42.461 24.902 43.061 24.486 43.351 23.688C43.838 22.35 43.128 20.859 41.769 20.365Z" fill="#FF5D7D"/>';
  const FACES = {
    happy: () => pill(L) + pill(R) + smile,
    love: () => hearts + smile,
    laugh: () => line('M24 24.5l2.8-3.6 2.8 3.6') + line('M35.4 24.5l2.8-3.6 2.8 3.6')
      + `<path d="M22.5 37.5h20a10 10 0 0 1-20 0z" fill="${NAVY}"/><ellipse cx="32.5" cy="44.2" rx="5" ry="2.6" fill="#ff5d7d"/>`,
    wink: () => pill(L) + line('M35.4 23.6q2.8-3.2 5.6 0') + smile + '<path d="M33 42.6h4.4v1.6a2.2 2.2 0 0 1-4.4 0z" fill="#ff5d7d"/>',
    cool: () => '<path d="M18.5 18.5h28v3.5c0 4.5-2.8 7.5-6.8 7.5s-6-2.7-6.7-6.2h-1.5c-.7 3.5-2.7 6.2-6.7 6.2s-6.3-3-6.3-7.5z" fill="#111"/>'
      + line('M22 21.6l3-2.2', 1.4, '#fff') + line('M27 40.5q6 3.6 12-1.4', 2.6, NAVY),
    tongue: () => pill(L) + pill(R) + line('M26 39h13', 2.6, NAVY) + '<path d="M30.4 39h5.2v3.4a2.6 2.6 0 0 1-5.2 0z" fill="#ff5d7d"/>',
    shock: () => `<circle cx="${L[0]}" cy="${L[1]}" r="2.6" fill="#111"/><circle cx="${R[0]}" cy="${R[1]}" r="2.6" fill="#111"/><ellipse cx="32.5" cy="42" rx="3.6" ry="4.6" fill="${NAVY}"/>`,
    cry: () => line('M24 21.6q2.8 2.6 5.6 0') + line('M35.4 21.6q2.8 2.6 5.6 0')
      + '<path d="M26.6 27c-1.6 3-2.2 5.4-.9 6.4 1.3 1 3-1 2.4-3.4z" fill="#9fdcff"/><path d="M38.4 27c1.6 3 2.2 5.4.9 6.4-1.3 1-3-1-2.4-3.4z" fill="#9fdcff"/>'
      + line('M26 44.5q6.5-5 13 0', 2.6, NAVY),
    angry: () => line('M22.6 18.4l6.6 3', 2.8) + line('M42.4 18.4l-6.6 3', 2.8) + pill([L[0], 25], 5.6) + pill([R[0], 25], 5.6)
      + line('M26.5 44.5q6-4.6 12 0', 2.6, NAVY) + line('M48 9.5l2.6 2.6M53.8 9.5l-2.6 2.6M48 15.3l2.6-2.6M53.8 15.3l-2.6-2.6', 2.2, '#ff2d55'),
    sleepy: () => line('M24 23.5h5.6') + line('M35.4 23.5h5.6') + `<ellipse cx="32.5" cy="42" rx="2.2" ry="2.6" fill="${NAVY}"/>`
      + '<text x="45" y="13" font-size="9" font-weight="900" fill="#fff" font-family="Arial, sans-serif">z</text><text x="50.5" y="8.5" font-size="12" font-weight="900" fill="#fff" font-family="Arial, sans-serif">Z</text>',
    dizzy: () => [L, R].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="none" stroke="#111" stroke-width="1.6"/><circle cx="${x}" cy="${y}" r="1.2" fill="#111"/>`).join('')
      + line('M24.5 41.5q2-2.6 4 0t4 0 4 0 4 0', 2.4, NAVY),
    star: () => [L, R].map(([x, y]) => `<path d="${star(x, y, 4.8)}" fill="#ffc93c" stroke="#e08a00" stroke-width=".8"/>`).join('')
      + `<path d="M22.5 37.5h20a10 10 0 0 1-20 0z" fill="${NAVY}"/>`,
  };
  UI.blob = (type, size = 48) => `<svg class="blob" width="${size}" height="${size}" viewBox="0 0 65 65" aria-hidden="true">
    <circle cx="32.5" cy="32.5" r="32.5" fill="url(#blobg)"/>${type === 'angry' ? '<circle cx="32.5" cy="32.5" r="32.5" fill="#ff3355" opacity=".3"/>' : ''}
    <ellipse cx="22" cy="12" rx="9" ry="5" fill="#fff" opacity=".18" transform="rotate(-25 22 12)"/>
    <g fill="#fff"><rect x="19.8" y="14.3" width="12.2" height="17.9" rx="6.1" transform="rotate(15 19.8 14.3)"/><rect width="12.2" height="17.9" rx="6.1" transform="matrix(.966 -.259 -.259 -.966 37.9 34.8)"/><rect x="17.85" y="15.6" width="29.3" height="15" rx="7.5"/></g>
    ${(FACES[type] || FACES.happy)()}
  </svg>`;

  /* ---------- 二维码占位：按种子生成的固定图案，带三个定位角 ---------- */
  UI.qr = (seed = 'playzone', size = 92) => {
    let h = 2166136261;
    for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    const rnd = () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
    const N = 25;
    const finder = (x, y) => x < 7 && y < 7;
    let cells = '';
    for (let y = 0; y < N; y += 1) {
      for (let x = 0; x < N; x += 1) {
        if (finder(x, y) || finder(N - 1 - x, y) || finder(x, N - 1 - y)) continue;
        if (rnd() < 0.48) cells += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
      }
    }
    const f = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7" rx="1.2"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" rx=".8" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx=".5"/>`;
    return `<svg class="qr" width="${size}" height="${size}" viewBox="-1 -1 ${N + 2} ${N + 2}" shape-rendering="crispEdges"><rect x="-1" y="-1" width="${N + 2}" height="${N + 2}" fill="#fff"/><g fill="#1a1d2b">${cells}${f(0, 0)}${f(N - 7, 0)}${f(0, N - 7)}</g></svg>`;
  };

  /* ================= 页面骨架片段 ================= */
  UI.nav = ({ title = '', sub = '', back = true, right = '', cls = '' } = {}) => `<header class="nav ${cls}">
    ${back ? `<button class="nav-back" data-back aria-label="返回">${UI.ic('back', 24)}</button>` : ''}
    <div class="nav-title"><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>
    <div class="nav-right">${right}</div>
  </header>`;

  /** 余额胶囊：点数字看钱包，点 + 去充值 */
  UI.chips = (keys = ['gems', 'coins'], opt = {}) => keys.map((k) => `<div class="chip ${opt.cls || ''}">
      <button class="chip-main" data-go="wallet" data-cur="${k}">${UI.cur(k, 20)}${UI.bind(k)}</button>
      ${opt.plus === false ? '' : `<button class="chip-plus" data-act="topup" data-cur="${k}" aria-label="获取更多">${UI.ic('plus', 13)}</button>`}
    </div>`).join('');

  /** 频道底部 Tab */
  UI.tabbar = (active) => {
    const tabs = [
      ['play', '游戏', `<img class="tab-glove g1" src="${D.IMG}ui/glove-blue.png" alt=""><img class="tab-glove g2" src="${D.IMG}ui/glove-red.png" alt="">`, ''],
      ['rooms', '房间', `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${TAB_IC_REF.rooms}</svg>`, ''],
      ['chat', '消息', `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${TAB_IC_REF.chat}</svg>`, UI.count('chat')],
      ['me', '我的', `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${TAB_IC_REF.me}</svg>`, UI.dot('requests')],
    ];
    return `<nav class="tabbar">${tabs.map(([id, label, icon, badge]) => `<button class="tab ${id === active ? 'is-active' : ''}" data-tab="${id}">
      <span class="tab-ic tab-ic-${id}">${icon}${badge}</span><span class="tab-label">${label}</span></button>`).join('')}</nav>`;
  };
  const TAB_IC_REF = {
    rooms: '<path class="ic-a" d="M5 21V5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5V21"/><path class="ic-a" d="M3 21h18"/><path class="ic-b" d="M14.5 12.5v.01"/><path class="ic-b" d="M9 7.5h6"/>',
    chat: '<path class="ic-a" d="M4 6.5A3.5 3.5 0 0 1 7.5 3h9A3.5 3.5 0 0 1 20 6.5v6a3.5 3.5 0 0 1-3.5 3.5H11l-4.5 4v-4A2.5 2.5 0 0 1 4 13.5z"/><path class="ic-b" d="M8.5 9.5h.01M12 9.5h.01M15.5 9.5h.01"/>',
    me: '<circle class="ic-a" cx="12" cy="8" r="4.2"/><path class="ic-a" d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/><path class="ic-b" d="M10.3 8.8s.6.8 1.7.8 1.7-.8 1.7-.8"/>',
  };

  UI.empty = (text, img = `${D.IMG}brand/mascot.png`) => `<div class="empty"><img src="${img}" alt=""><p>${text}</p></div>`;
  UI.toggle = (on, act, extra = '') => `<button class="switch ${on ? 'is-on' : ''}" data-act="${act}" ${extra} role="switch" aria-checked="${on}"><i></i></button>`;
  UI.bar = (v, max, cls = '') => `<div class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, (v / max) * 100))}%"></i></div>`;
})();

/* ================= 余额绑定、滚动数字、红点 ================= */
(() => {
  'use strict';

  const UI = window.UI;
  const KEYS = ['gems', 'coins', 'boost', 'pass'];
  const shown = {};          // 当前显示的数值（滚动中可能落后于真实值）
  const held = new Set();    // 正在播放飞入动画的币种，等飞到再滚动
  const timers = {};

  const real = (k) => Store.s[k] || 0;
  UI.val = (k) => (k in shown ? shown[k] : real(k));
  UI.bind = (k, cls = '') => `<b class="num ${cls}" data-bind="${k}" data-fly="${k}">${UI.fmt(UI.val(k))}</b>`;
  // 奖励写入 Store 前先冻结当前显示值，否则首次奖励会把旧余额误判为已同步。
  UI.hold = (k) => {
    if (!(k in shown)) shown[k] = real(k);
    held.add(k);
  };
  UI.release = (k) => { held.delete(k); UI.sync(); };

  function roll(k, from, to) {
    cancelAnimationFrame(timers[k]);
    shown[k] = to;
    const els = [...document.querySelectorAll(`[data-bind="${k}"]`)];
    if (!els.length) return;
    els.forEach((e) => {
      e.classList.remove('is-up', 'is-down');
      void e.offsetWidth;
      e.classList.add(to > from ? 'is-up' : 'is-down');
    });
    const t0 = performance.now();
    const dur = Math.min(900, 380 + Math.abs(to - from) * 3);
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const v = from + (to - from) * (1 - Math.pow(1 - p, 3));
      els.forEach((e) => { e.textContent = UI.fmt(v); });
      if (p < 1) timers[k] = requestAnimationFrame(step);
    };
    timers[k] = requestAnimationFrame(step);
  }

  UI.sync = () => {
    KEYS.forEach((k) => {
      if (held.has(k)) return;
      const to = real(k);
      const from = UI.val(k);
      if (from !== to) roll(k, from, to);
      else shown[k] = to;
    });
    UI.dots();
  };

  UI.dot = (key, cls = '') => `<i class="dot ${cls}" data-dot="${key}"${Store.dots()[key] ? '' : ' hidden'}></i>`;
  UI.count = (key, cls = '') => {
    const v = Store.dots()[key];
    return `<i class="count ${cls}" data-count="${key}"${v ? '' : ' hidden'}>${v > 99 ? '99+' : v || ''}</i>`;
  };
  UI.dots = (root = document) => {
    const d = Store.dots();
    root.querySelectorAll('[data-dot]').forEach((e) => { e.hidden = !d[e.dataset.dot]; });
    root.querySelectorAll('[data-count]').forEach((e) => {
      const v = d[e.dataset.count];
      e.hidden = !v;
      e.textContent = v > 99 ? '99+' : v || '';
    });
  };
  /** 每次整页渲染后由 app.js 调用 */
  UI.decorate = (root) => {
    UI.dots(root);
    root.querySelectorAll('[data-bind]').forEach((e) => { e.textContent = UI.fmt(UI.val(e.dataset.bind)); });
  };
})();

/* ================= 浮层：底部弹层、弹窗、全屏 ================= */
(() => {
  'use strict';

  const UI = window.UI;
  const ovs = [];
  const scr = () => document.querySelector('.screen');

  /**
   * opt.type      sheet | dialog | full
   * opt.html      面板内容
   * opt.acts      面板内 data-act 处理；自带 close
   * opt.closable  false 时返回键和遮罩都关不掉（看广告、领奖）
   * opt.maskClose 点遮罩是否关闭，sheet 默认 true，dialog 默认 false
   * opt.onClose   关闭时回调（参数为 close(value) 的 value）
   * opt.onBack    closable 为 false 时按返回键的回调
   */
  UI.open = (opt) => {
    const type = opt.type || 'sheet';
    const el = document.createElement('div');
    el.className = `ov ov-${type} ${opt.cls || ''}`;
    el.innerHTML = `<div class="ov-mask"></div><div class="ov-panel">${opt.html || ''}</div>`;
    const panel = el.querySelector('.ov-panel');
    const ctrl = {
      el, panel, opt, closed: false,
      close: (v) => close(ctrl, v),
      set: (html) => { panel.innerHTML = html; UI.decorate(panel); },
      $: (sel) => panel.querySelector(sel),
    };
    el._acts = { close: () => ctrl.close(), ...(opt.acts || {}) };
    const maskClose = opt.maskClose ?? type === 'sheet';
    el.querySelector('.ov-mask').addEventListener('click', () => {
      if (opt.closable !== false && maskClose) ctrl.close();
    });
    scr().appendChild(el);
    UI.decorate(panel);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-open')));
    ovs.push(ctrl);
    opt.onOpen?.(ctrl);
    return ctrl;
  };

  function close(ctrl, v) {
    if (ctrl.closed) return;
    ctrl.closed = true;
    const i = ovs.indexOf(ctrl);
    if (i >= 0) ovs.splice(i, 1);
    ctrl.el.classList.remove('is-open');
    ctrl.el.classList.add('is-closing');
    setTimeout(() => ctrl.el.remove(), 280);
    ctrl.opt.onClose?.(v);
  }

  /** 返回键：关最上面的浮层；关不掉的浮层吞掉返回键 */
  UI.closeTop = () => {
    const t = ovs[ovs.length - 1];
    if (!t) return false;
    if (t.opt.closable === false) { t.opt.onBack?.(); return true; }
    t.close();
    return true;
  };
  UI.closeAll = () => [...ovs].reverse().forEach((o) => { if (o.opt.closable !== false) o.close(); });
  UI.hasOverlay = () => ovs.length > 0;

  UI.sheet = (opt) => UI.open({
    ...opt,
    type: 'sheet',
    html: `<div class="sheet-grab"></div>
      ${opt.title ? `<div class="sheet-hd"><div><h3>${opt.title}</h3>${opt.sub ? `<p>${opt.sub}</p>` : ''}</div><button class="sheet-x" data-act="close" aria-label="关闭">${UI.ic('x', 20)}</button></div>` : ''}
      <div class="sheet-bd" data-scroll="sheet">${opt.html || ''}</div>${opt.foot ? `<div class="sheet-ft">${opt.foot}</div>` : ''}`,
  });

  /**
   * 弹窗，返回 Promise，值为点中按钮的 key；点 × 或返回键为 null
   * buttons: [{ label, key, cls }]，cls 默认 btn-primary
   */
  UI.dialog = (opt) => new Promise((resolve) => {
    const btns = (opt.buttons || []).map((b) => `<button class="btn ${b.cls || 'btn-primary'} btn-lg" data-act="__btn" data-key="${b.key}">${b.label}</button>`).join('');
    const c = UI.open({
      type: 'dialog',
      cls: opt.cls,
      closable: opt.closable,
      maskClose: opt.maskClose,
      onBack: opt.onBack,
      html: `${opt.art ? `<div class="dlg-art">${opt.art}</div>` : ''}${opt.img ? `<div class="dlg-art"><img class="${opt.imgCls || ''}" src="${opt.img}" alt=""></div>` : ''}
        ${opt.x === false ? '' : `<button class="dlg-x" data-act="close" aria-label="关闭">${UI.ic('x', 18)}</button>`}
        ${opt.title ? `<h3 class="dlg-title">${opt.title}</h3>` : ''}
        ${opt.text ? `<p class="dlg-text">${opt.text}</p>` : ''}
        ${opt.html || ''}
        ${btns ? `<div class="dlg-btns ${opt.row ? 'is-row' : ''}">${btns}</div>` : ''}`,
      acts: { ...(opt.acts || {}), __btn: (el) => c.close(el.dataset.key) },
      onClose: (v) => resolve(v ?? null),
      onOpen: opt.onOpen,
    });
  });

  UI.confirm = ({ title, text, ok = '确定', cancel = '取消', danger = false, img }) => UI.dialog({
    title, text, img, x: false, row: true,
    buttons: [
      { label: cancel, key: 'cancel', cls: 'btn-ghost' },
      { label: ok, key: 'ok', cls: danger ? 'btn-danger' : 'btn-primary' },
    ],
  }).then((k) => k === 'ok');

  /* ---------- Toast（安卓样式，底部居中） ---------- */
  let toastTimer = 0;
  UI.toast = (msg, ms = 2000) => {
    const el = document.getElementById('toast');
    el.innerHTML = msg;
    el.classList.toggle('is-high', !!document.querySelector('.page.is-active .tabbar, .ov-sheet.is-open'));
    el.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-show'), ms);
  };
  UI.demo = (what = '此功能') => UI.toast(`演示不包含${what}`);

  /* ---------- 顶部通知横幅（好友邀请、对方出招等） ----------
   * 登录页上不弹 app 内的通知（退出登录后还在跑的定时器），force 为 true 时照常弹（例如邮箱验证码） */
  UI.notify = ({ img, title, text, btn, onTap, ms = 6000, force = false }) => {
    if (!force && window.Auth && !Auth.ok()) return () => {};
    document.querySelectorAll('.notif').forEach((n) => n.remove());
    const el = document.createElement('div');
    el.className = 'notif';
    el.innerHTML = `<img class="notif-img" src="${img}" alt=""><div class="notif-txt"><b>${title}</b><span>${text}</span></div>${btn ? `<span class="notif-btn">${btn}</span>` : ''}`;
    scr().appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-show')));
    const hide = () => { el.classList.remove('is-show'); setTimeout(() => el.remove(), 320); };
    el.addEventListener('click', () => { hide(); onTap?.(); });
    setTimeout(hide, ms);
    Sfx.play('msg');
    return hide;
  };

  /* ---------- 新手引导气泡：高亮目标元素，点任意处关闭 ---------- */
  UI.coach = (target, text, { key, place = 'bottom' } = {}) => new Promise((res) => {
    if (!target || (key && Store.s.tips[key])) { res(); return; }
    const r = UI.local(target);
    const el = document.createElement('div');
    el.className = 'coach';
    const tipTop = place === 'bottom' ? r.y + r.h + 16 : null;
    const tipBottom = place === 'top' ? `bottom:${document.querySelector('.screen').offsetHeight - r.y + 16}px;` : '';
    const cx = Math.max(24, Math.min(368, r.x + r.w / 2));
    el.innerHTML = `<div class="coach-hole" style="left:${r.x - 6}px;top:${r.y - 6}px;width:${r.w + 12}px;height:${r.h + 12}px"></div>
      <div class="coach-tip is-${place}" style="${tipTop !== null ? `top:${tipTop}px;` : ''}${tipBottom}--ax:${cx}px">${text}<small>点击任意处继续</small></div>`;
    document.querySelector('.screen').appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-show'));
    el.addEventListener('click', () => {
      el.remove();
      if (key) { Store.s.tips[key] = 1; Store.save(); }
      res();
    });
  });
})();

/* ================= 领奖：飞入余额、升级、奖励弹窗 ================= */
(() => {
  'use strict';

  const UI = window.UI;
  const IMG = D.IMG;
  const scr = () => document.querySelector('.screen');

  function visible(e) {
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  /** 找飞入目标：最上层浮层优先，其次当前页 */
  function target(k) {
    const ov = [...document.querySelectorAll('.ov.is-open:not(.is-closing)')].pop();
    const page = document.querySelector(`.page[data-page="${App.top()}"]`);
    for (const root of [ov, page]) {
      if (!root) continue;
      const el = [...root.querySelectorAll(`[data-fly="${k}"]`)].find(visible);
      if (el) return el;
    }
    return null;
  }
  function bump(el) {
    const chip = el.closest('.chip') || el;
    chip.classList.remove('is-bump');
    void chip.offsetWidth;
    chip.classList.add('is-bump');
  }
  const toRect = (f) => (!f ? null : f.nodeType ? UI.local(f) : f);

  /** 图标从 from 飞到对应余额；没有余额显示时在右上角飘一个 +N */
  UI.fly = (k, from, amount) => new Promise((resolve) => {
    const layer = scr().querySelector('.fly-layer');
    const s = toRect(from) || { x: 176, y: 415, w: 40, h: 40 };
    const t = target(k);
    const e = t ? UI.local(t) : { x: 300, y: 52, w: 40, h: 20 };
    const sx = s.x + s.w / 2;
    const sy = s.y + s.h / 2;
    const ex = t ? e.x - 10 : e.x + 20;
    const ey = e.y + e.h / 2;
    const n = 8;
    let left = n;
    for (let i = 0; i < n; i += 1) {
      const tmp = document.createElement('div');
      tmp.innerHTML = UI.cur(k, 28, 'fly-ic');
      const img = tmp.firstChild;
      layer.appendChild(img);
      const a = Math.random() * Math.PI * 2;
      const r = 26 + Math.random() * 42;
      const mx = sx + Math.cos(a) * r;
      const my = sy + Math.sin(a) * r;
      const anim = img.animate([
        { transform: `translate(${sx - 14}px, ${sy - 14}px) scale(.3)`, opacity: 0, easing: 'cubic-bezier(.2,.8,.3,1)' },
        { transform: `translate(${mx - 14}px, ${my - 14}px) scale(1.1)`, opacity: 1, offset: 0.32, easing: 'cubic-bezier(.6,0,.9,.5)' },
        { transform: `translate(${ex - 14}px, ${ey - 14}px) scale(.55)`, opacity: 0.95 },
      ], { duration: 860 + i * 50, fill: 'forwards' });
      anim.onfinish = () => {
        img.remove();
        if (t) bump(t);
        if (i % 3 === 0) Sfx.play('coin');
        left -= 1;
        if (left === 0) {
          if (!t && amount) {
            const lab = document.createElement('div');
            lab.className = 'fly-label';
            lab.innerHTML = `${UI.cur(k, 18)}+${UI.fmt(amount)}`;
            lab.style.left = `${ex - 30}px`;
            lab.style.top = `${ey}px`;
            layer.appendChild(lab);
            setTimeout(() => lab.remove(), 1400);
          }
          resolve();
        }
      };
    }
  });

  /**
   * 发放奖励：先改数据，再播飞入动画，飞到后余额滚动
   * from 可以是元素、坐标，或 { gems: 元素, coins: 元素 }
   */
  UI.grant = async (r = {}, note = '奖励', from) => {
    const keys = ['gems', 'coins', 'boost', 'pass'].filter((k) => r[k] > 0);
    const pickFrom = (k) => (from && !from.nodeType && !('x' in from) ? toRect(from[k]) : toRect(from));
    const rects = Object.fromEntries(keys.map((k) => [k, pickFrom(k)]));
    keys.forEach((k) => UI.hold(k));
    keys.forEach((k) => Store.add(k, r[k], note));
    if (r.frame) Store.own('frame', r.frame);
    await Promise.all(keys.map((k, i) => UI.sleep(i * 160).then(() => UI.fly(k, rects[k], r[k])).then(() => UI.release(k))));
    if (r.frame) { const n = D.frames[r.frame].name; UI.toast(`${/框$/.test(n) ? n : `${n}头像框`}已放入背包`); }
    if (r.exp) await UI.exp(r.exp, note);
  };

  /** 加 EXP，升级时依次弹出升级奖励 */
  UI.exp = async (n, note = '经验') => {
    const ups = Store.addExp(n, note);
    for (const lv of ups) {
      // eslint-disable-next-line no-await-in-loop
      await UI.reward({
        title: `升到${lv}级啦！`, sub: '恭喜升级，这是你的升级奖励', img: `${IMG}brand/mascot-cheer.png`,
        badge: `Lv${lv}`, items: { gems: 50, coins: 100 }, note: `Lv${lv}升级奖励`, cls: 'is-levelup', sfx: 'win',
      });
    }
    return ups;
  };

  /** 奖励弹窗：Claim 后奖励飞入余额；grant:false 时只展示，由调用方发放 */
  UI.reward = (opt) => new Promise((resolve) => {
    const items = UI.items(opt.items);
    const c = UI.open({
      type: 'dialog',
      cls: `dlg-reward ${opt.cls || ''}`,
      closable: false,
      html: `<div class="rw-glow"><i class="rw-rays"></i>${opt.img ? `<img class="rw-art" src="${opt.img}" alt="">` : ''}${opt.badge ? `<b class="rw-badge">${opt.badge}</b>` : ''}</div>
        <h3 class="rw-title">${opt.title || '恭喜获得'}</h3>
        ${opt.sub ? `<p class="rw-sub">${opt.sub}</p>` : ''}
        <div class="rw-items n${items.length}">${items.map((it) => `<div class="rw-item" data-k="${it.k}"><span class="rw-ic">${it.icon}</span><b>${it.label}</b></div>`).join('')}</div>
        <button class="btn btn-orange btn-lg rw-btn" data-act="claim">${opt.btn || '领取'}</button>`,
      acts: {
        claim: async () => {
          const from = {};
          c.panel.querySelectorAll('.rw-item').forEach((e) => { from[e.dataset.k] = UI.local(e.querySelector('.rw-ic')); });
          c.close();
          if (opt.grant !== false) await UI.grant(opt.items, opt.note || opt.title, from);
          resolve(from);
        },
      },
    });
    Sfx.play(opt.sfx || 'reward');
  });

  /* ---------- 选好友（邀请、分享给好友） ---------- */
  UI.pickFriend = ({ title = '选择好友', btn = '邀请', onlineOnly = false, exclude = [], sub } = {}) => new Promise((resolve) => {
    const list = Store.s.friends.filter((u) => !exclude.includes(u)).map((u) => D.people[u]).sort((a, b) => b.online - a.online);
    let picked = null;
    const c = UI.sheet({
      title, sub,
      html: list.length ? `<div class="pick-list">${list.map((p) => {
        const off = onlineOnly && !p.online;
        return `<div class="row pick-row ${off ? 'is-off' : ''}">${UI.av(p.id, 44, { on: true })}
          <div class="row-main"><b>${p.name}</b><span>${p.online ? UI.esc(p.status || '在线') : `离线 · ${p.seen}`}</span></div>
          <button class="btn btn-sm ${off ? 'btn-ghost' : 'btn-primary'}" data-act="pick" data-uid="${p.id}">${off ? '离线' : btn}</button></div>`;
      }).join('')}</div>` : UI.empty('还没有好友'),
      acts: {
        pick: (el) => {
          const p = D.people[el.dataset.uid];
          if (onlineOnly && !p.online) { UI.toast(`${p.name}现在不在线`); return; }
          picked = p.id;
          c.close();
        },
      },
      onClose: () => resolve(picked),
    });
  });

  /* ---------- 分享面板 ---------- */
  UI.share = (opt = {}) => {
    const chans = [
      ['link', '复制链接', '#6b7bff', UI.ic('link', 22)],
      ...(opt.poster ? [['poster', '海报', '#ff8a3d', UI.ic('image', 22)]] : []),
      ['chats', '好友', '#2c7bff', UI.ic('msg', 22)],
      ['whatsapp', 'WhatsApp', '#25d366', UI.ic('phone', 20)],
      ['facebook', 'Facebook', '#1877f2', '<b class="sh-glyph">f</b>'],
      ['messenger', 'Messenger', 'linear-gradient(135deg,#00b2ff,#a033ff 60%,#ff5c87)', UI.ic('zap', 20)],
      ['x', 'X', '#111', '<b class="sh-glyph">X</b>'],
      ['telegram', 'Telegram', '#29a9eb', UI.ic('send', 20)],
    ];
    const done = (msg) => {
      Store.count('shares');
      UI.toast(msg);
      opt.onShared?.();
    };
    const c = UI.sheet({
      title: opt.title || '分享到',
      sub: opt.sub,
      html: `${opt.preview || ''}<div class="share-grid">${chans.map(([id, label, bg, icon]) => `<button class="share-op" data-act="ch" data-ch="${id}" data-label="${label}"><span style="background:${bg}">${icon}</span>${label}</button>`).join('')}</div>`,
      acts: {
        ch: (el) => {
          const ch = el.dataset.ch;
          c.close();
          if (ch === 'poster') { opt.poster(); return; }
          if (ch === 'chats') {
            UI.pickFriend({ title: '发给好友', btn: '发送' }).then((uid) => {
              if (!uid) return;
              Store.dm(uid);
              Store.post(uid, { from: 'me', type: 'share', text: opt.text || '快来 Soulgame 和我一起玩吧！', game: opt.game || null });
              done(`已发送给${D.people[uid].name}`);
            });
            return;
          }
          done(ch === 'link' ? '链接已复制' : `已分享到${el.dataset.label}`);
        },
      },
    });
    return c;
  };
})();

/* ================= 音效（WebAudio 合成，不依赖音频文件） ================= */
window.Sfx = (() => {
  let ctx;
  function tone(f, t0, dur, type = 'sine', vol = 0.12, f2) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  }
  const SFX = {
    tap: (t) => tone(660, t, 0.05, 'sine', 0.05),
    coin: (t) => { tone(1046, t, 0.09, 'triangle', 0.09); tone(1568, t + 0.07, 0.14, 'triangle', 0.09); },
    drop: (t) => tone(240, t, 0.16, 'sine', 0.22, 90),
    win: (t) => [523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.11, 0.24, 'triangle', 0.13)),
    lose: (t) => [392, 330, 262].forEach((f, i) => tone(f, t + i * 0.16, 0.3, 'sine', 0.12)),
    match: (t) => { tone(300, t, 0.25, 'sawtooth', 0.035, 900); tone(880, t + 0.25, 0.2, 'triangle', 0.1); },
    tick: (t) => tone(1250, t, 0.04, 'square', 0.025),
    reward: (t) => [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + i * 0.07, 0.2, 'triangle', 0.09)),
    chest: (t) => [523, 784, 1046, 1318, 1568, 2093].forEach((f, i) => tone(f, t + i * 0.06, 0.32, 'triangle', 0.08)),
    msg: (t) => { tone(880, t, 0.08, 'sine', 0.07); tone(1320, t + 0.08, 0.1, 'sine', 0.07); },
    error: (t) => tone(190, t, 0.18, 'square', 0.04),
  };
  return {
    play(name) {
      if (!window.Store || !Store.s.settings.sound) return;
      try {
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
        if (SFX[name]) SFX[name](ctx.currentTime + 0.01);
      } catch (_) { /* 不支持音频时静默 */ }
    },
  };
})();

/* 数据变化 → 同步余额与红点；拿到新徽章时顶部提示 */
Store.on((type, meta) => {
  UI.sync();
  if (type === 'badge') {
    (meta.got || []).forEach((id, i) => {
      const b = D.badges.find((x) => x.id === id);
      if (b) setTimeout(() => UI.notify({ img: b.img, title: '解锁新徽章！', text: `${b.name} · ${b.desc}`, onTap: () => App.go('badges') }), 900 + i * 2500);
    });
  }
});

/* ================= 悬浮窗：进行中的对局、回合制“轮到你了”（右下角，可拖动吸边） =================
 * UI.floater.add(fn, prio)  注册数据源（prio 大的优先），fn() 返回 null 或
 *   { id, uid, title, sub, urgent, board, close, onTap }
 *   id + key 用于记住“收起”（key 变了会重新出现），close 为 true 时显示 ×
 * UI.floater.refresh() 立即刷新；对局页、匹配页、结算页、通话页、登录页不显示
 */
(() => {
  'use strict';

  const UI = window.UI;
  const HIDE_ON = ['game', 'match', 'result', 'call', 'login', 'email'];
  const providers = [];
  const dismissed = {};
  const pos = { side: 'right', y: null };
  let el = null;
  let cur = null;
  let last = '';
  let drag = null;

  function mount() {
    el = document.createElement('div');
    el.className = 'floater';
    el.setAttribute('role', 'button');
    el.hidden = true;
    document.querySelector('.screen').appendChild(el);
    el.addEventListener('pointerdown', down);
    el.addEventListener('click', (e) => {
      if (el._moved) { el._moved = false; return; }
      if (!cur) return;
      if (e.target.closest('.fl-x')) { dismissed[cur.id] = cur.key || 1; render(); return; }
      cur.onTap && cur.onTap();
    });
  }
  function down(e) {
    if (e.target.closest('.fl-x')) return;
    const r = el.getBoundingClientRect();
    drag = { x: e.clientX, y: e.clientY, top: r.top, moved: false };
    el.setPointerCapture(e.pointerId);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up, { once: true });
  }
  function move(e) {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    drag.moved = true;
    const k = UI.local(el).w / el.getBoundingClientRect().width || 1;
    el.classList.add('is-drag');
    el.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
  }
  function up(e) {
    el.removeEventListener('pointermove', move);
    if (!drag) return;
    if (drag.moved) {
      el._moved = true;
      const s = document.querySelector('.screen');
      const sr = UI.local(s);
      const r = UI.local(el);
      pos.side = r.x + r.w / 2 < sr.w / 2 ? 'left' : 'right';
      pos.y = Math.max(90, Math.min(sr.h - r.h - 90, r.y));
      el.classList.remove('is-drag');
      el.style.transform = '';
      place();
    }
    drag = null;
  }
  function place() {
    el.classList.toggle('is-left', pos.side === 'left');
    el.style.top = pos.y == null ? '' : `${pos.y}px`;
    el.style.bottom = pos.y == null ? '' : 'auto';
  }

  function pick() {
    for (const { fn } of providers) {
      const st = fn();
      if (st && !(st.close && dismissed[st.id] === (st.key || 1))) return st;
    }
    return null;
  }
  function render() {
    if (!el) { if (!document.querySelector('.screen') || !window.App) return; mount(); }
    const top = App.top();
    const st = HIDE_ON.includes(top) || document.querySelector('.ov-full.is-open') ? null : pick();
    cur = st;
    if (!st) { el.hidden = true; last = ''; return; }
    const tabs = !!document.querySelector('.page.is-active .tabbar');
    el.classList.toggle('is-low', !tabs);
    const html = `${st.board ? `<span class="fl-board">${st.board}</span>` : `<span class="fl-av">${UI.av(st.uid, 40)}</span>`}
      <span class="fl-m"><b>${st.title}</b><span>${st.sub || ''}</span></span>
      ${st.board ? `<span class="fl-who">${UI.av(st.uid, 22)}</span>` : ''}
      ${st.close ? '<button class="fl-x" aria-label="收起">×</button>' : ''}`;
    el.classList.toggle('is-urgent', !!st.urgent);
    el.dataset.floater = st.id;
    if (html !== last) { el.innerHTML = html; last = html; }
    if (el.hidden) { el.hidden = false; place(); el.animate([{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.34,1.56,.64,1)' }); }
  }

  UI.floater = { add: (fn, prio = 0) => { providers.push({ fn, prio }); providers.sort((x, y) => y.prio - x.prio); }, refresh: render, current: () => cur };
  setInterval(render, 300);
})();
