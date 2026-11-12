/**
 * 原型运行时：页面栈路由、转场、全局点击分发、安卓返回、外框缩放
 *
 * 页面   <section class="page" data-page="id">
 *        data-status="light"   深色背景页，状态栏用白字（render 里也可以改）
 *        data-transient        匹配、对局、结算这类临时页，刷新浏览器后回到大厅
 *
 * 注册   App.page(id, {
 *          render(el, params)  进入或返回该页时整页渲染
 *          shown(el, params)   转场结束后调用，适合弹出首次引导
 *          leave(el)           页面出栈时调用，清理定时器
 *          back()              返回前调用，返回 false 可拦截（例如退出挽留）
 *          act: { 名称(el, e) } 本页 data-act 点击
 *        })
 *        App.act({ 名称(el, e) })  注册全局 data-act，页面里没有同名处理时使用
 *
 * 导航   App.go(id, params)   推入新页
 *        App.back()           返回：先关浮层，再问页面 back()，最后出栈
 *        App.pop()            直接出栈，不经过拦截
 *        App.backTo(id)       返回到栈里的某页（不在栈里就插到当前页下面）
 *        App.replace(id, p)   替换当前页（默认淡入）
 *        App.root(id, p)      清空页面栈只留这一页（登录完成进大厅、退出登录回登录页）
 *        App.tab(id)          切换频道底部 Tab
 *        App.refresh()        重渲染当前页并保留滚动位置
 *        App.whenIdle(fn)     等当前转场结束再执行
 *
 * 声明式 data-go="id"（其余 data-* 作为参数）、data-back、data-tab="id"、data-toast="文案"、data-act="名称"
 * 登录   未登录（Auth.ok() 为 false）时一律从登录页启动，地址栏的 #页面ID 只对登录相关页面生效
 * 调试   地址栏 #页面ID 直接打开该页；Esc 等同安卓返回
 */
(() => {
  'use strict';

  const DUR = 360;
  const EASE = 'cubic-bezier(.32, .72, 0, 1)';
  const HOME = 'play';
  const TABS = ['play', 'rooms', 'chat', 'me'];
  const LOGIN = 'login';
  const AUTH_PAGES = ['login', 'email']; // 未登录时能打开的页面

  const pages = new Map();
  const hooks = {};
  const acts = {};
  const params = loadParams();
  const idle = [];
  let stack = [];
  let busy = false;

  const top = () => stack[stack.length - 1];
  const device = () => document.getElementById('device');

  function loadParams() {
    try { return JSON.parse(sessionStorage.getItem('pz.params.v6')) || {}; } catch (_) { return {}; }
  }
  function saveParams() {
    try { sessionStorage.setItem('pz.params.v6', JSON.stringify(params)); } catch (_) { /* 隐私模式下忽略 */ }
  }

  function setActive(id, on) {
    const el = pages.get(id);
    if (!el) return;
    el.classList.toggle('is-active', on);
    if (!on) return;
    device().classList.toggle('is-light-status', el.dataset.status === 'light');
    try { history.replaceState(null, '', '#' + id); } catch (_) { /* file:// 下个别环境不允许 */ }
  }

  /** 整页渲染；keep 为 true 时保留 [data-scroll] 容器的滚动位置 */
  function render(id, keep) {
    const el = pages.get(id);
    const h = hooks[id];
    if (!el || !h || !h.render) return;
    const saved = keep ? [...el.querySelectorAll('[data-scroll]')].map((b) => [b.dataset.scroll, b.scrollTop, b.scrollLeft]) : [];
    h.render(el, params[id] || {});
    saved.forEach(([k, t, l]) => {
      const b = el.querySelector(`[data-scroll="${k}"]`);
      if (b) { b.scrollTop = t; b.scrollLeft = l; }
    });
    if (window.UI) UI.decorate(el);
  }

  const shown = (id) => hooks[id]?.shown?.(pages.get(id), params[id] || {});
  const leave = (id) => hooks[id]?.leave?.(pages.get(id));

  function animate(from, to, type, done) {
    const a = pages.get(from);
    const b = pages.get(to);
    if (!a || !b || from === to || type === 'none') { done(); return; }
    busy = true;
    const o = { duration: DUR, easing: EASE, fill: 'both' };
    let x;
    let y;
    if (type === 'push') {
      b.classList.add('is-sliding');
      x = b.animate([{ transform: 'translateX(100%)' }, { transform: 'none' }], o);
      y = a.animate([{ transform: 'none' }, { transform: 'translateX(-24%)' }], o);
    } else if (type === 'pop') {
      a.classList.add('is-sliding');
      x = a.animate([{ transform: 'none' }, { transform: 'translateX(100%)' }], o);
      y = b.animate([{ transform: 'translateX(-24%)' }, { transform: 'none' }], o);
    } else if (type === 'up') {
      b.classList.add('is-sliding');
      x = b.animate([{ transform: 'translateY(100%)' }, { transform: 'none' }], o);
    } else if (type === 'tab') {
      b.classList.add('is-sliding');
      x = b.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out', fill: 'both' });
    } else {
      b.classList.add('is-sliding');
      x = b.animate([{ opacity: 0, transform: 'scale(1.04)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'ease-out', fill: 'both' });
    }
    x.onfinish = () => {
      done();
      a.classList.remove('is-sliding');
      b.classList.remove('is-sliding');
      x.cancel();
      if (y) y.cancel();
      busy = false;
      while (!busy && idle.length) idle.shift()();
    };
  }

  function whenIdle(fn) {
    if (busy) idle.push(fn); else fn();
  }

  function go(id, p = {}, opt = {}) {
    if (busy) { if (opt.queue) idle.push(() => go(id, p, opt)); return; }
    if (!pages.has(id)) { console.warn('[App] 页面不存在：' + id); return; }
    params[id] = p;
    saveParams();
    const from = top();
    if (id === from) { render(id); return; }
    const i = stack.indexOf(id);
    if (i >= 0) stack.splice(i, 1);
    stack.push(id);
    render(id);
    setActive(id, true);
    animate(from, id, opt.anim || 'push', () => { setActive(from, false); shown(id); });
  }

  function pop() {
    if (busy || stack.length < 2) return;
    const from = stack.pop();
    const to = top();
    render(to, true);
    setActive(to, true);
    animate(from, to, 'pop', () => { setActive(from, false); leave(from); shown(to); });
  }

  function back() {
    if (busy) return;
    if (window.UI && UI.closeTop()) return;
    const id = top();
    if (hooks[id]?.back && hooks[id].back() === false) return;
    pop();
  }

  function backTo(id, opt = {}) {
    if (busy) { idle.push(() => backTo(id, opt)); return; }
    if (!pages.has(id)) return;
    const from = top();
    if (from === id) { render(id, true); return; }
    if (!stack.includes(id)) stack.splice(stack.length - 1, 0, id);
    const i = stack.indexOf(id);
    const removed = stack.splice(i + 1);
    removed.forEach((r) => { if (r !== from) { setActive(r, false); leave(r); } });
    render(id, true);
    setActive(id, true);
    animate(from, id, opt.anim || 'pop', () => { setActive(from, false); leave(from); shown(id); });
  }

  function replace(id, p = {}, opt = {}) {
    if (busy) { idle.push(() => replace(id, p, opt)); return; }
    if (!pages.has(id)) return;
    params[id] = p;
    saveParams();
    const from = top();
    if (from === id) { render(id); shown(id); return; }
    const i = stack.indexOf(id);
    if (i >= 0) stack.splice(i, 1);
    stack[stack.length - 1] = id;
    render(id);
    setActive(id, true);
    animate(from, id, opt.anim || 'fade', () => { setActive(from, false); leave(from); shown(id); });
  }

  /** 清空页面栈，只留 id：登录完成进大厅、退出登录回登录页 */
  function root(id, p = {}, opt = {}) {
    if (busy) { idle.push(() => root(id, p, opt)); return; }
    if (!pages.has(id)) return;
    params[id] = p;
    saveParams();
    const from = top();
    const removed = stack.filter((r) => r !== from && r !== id);
    stack = [id];
    removed.forEach((r) => { setActive(r, false); leave(r); });
    render(id);
    setActive(id, true);
    if (from === id) { shown(id); return; }
    animate(from, id, opt.anim || 'fade', () => { setActive(from, false); leave(from); shown(id); });
  }

  function tab(id, p) {
    if (busy) { idle.push(() => tab(id, p)); return; }
    const ri = stack.findIndex((s) => TABS.includes(s));
    if (ri < 0) { go(id, p || {}); return; }
    const from = top();
    if (p) { params[id] = p; saveParams(); }
    if (from === id && stack.length === ri + 1) {
      const body = pages.get(id).querySelector('[data-scroll]');
      if (body) body.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const removed = stack.splice(ri);
    stack.push(id);
    removed.forEach((r) => { if (r !== from && r !== id) { setActive(r, false); leave(r); } });
    render(id);
    setActive(id, true);
    animate(from, id, 'tab', () => { if (from !== id) { setActive(from, false); leave(from); } shown(id); });
  }

  function refresh(id = top()) {
    if (stack.includes(id)) render(id, true);
  }

  /** 从 dataset 里去掉导航用的键，剩下的作为页面参数 */
  function clean(d) {
    const p = { ...d };
    ['go', 'back', 'tab', 'toast', 'act'].forEach((k) => delete p[k]);
    return p;
  }

  function onClick(e) {
    const el = e.target.closest('[data-act], [data-go], [data-back], [data-tab], [data-toast]');
    if (!el) return;
    const d = el.dataset;
    const ov = el.closest('.ov');
    if (d.act) {
      const page = el.closest('.page');
      const fn = (ov && ov._acts && ov._acts[d.act])
        || (page && hooks[page.dataset.page]?.act?.[d.act])
        || acts[d.act];
      if (fn) fn(el, e);
      else console.warn('[App] 未定义的 act：' + d.act);
      return;
    }
    if ((d.go || d.tab) && ov && window.UI) UI.closeAll();
    if (d.go) go(d.go, clean(d));
    else if (d.back !== undefined) back();
    else if (d.tab) tab(d.tab);
    if (d.toast && window.UI) UI.toast(d.toast);
  }

  /** 桌面端：窗口放不下手机时等比缩小 */
  function fit() {
    const dev = device();
    const s = Math.min(1, (innerWidth - 40) / dev.offsetWidth, (innerHeight - 40) / dev.offsetHeight);
    dev.style.setProperty('--scale', Math.max(s, 0.3).toFixed(3));
  }

  function clock() {
    const t = document.querySelector('.status-time');
    if (!t) return;
    const n = new Date();
    t.textContent = `${n.getHours() % 12 || 12}:${String(n.getMinutes()).padStart(2, '0')}`;
  }

  function init() {
    document.querySelectorAll('.page').forEach((el) => pages.set(el.dataset.page, el));
    let start = location.hash.slice(1);
    if (!pages.has(start)) start = HOME;
    if (pages.get(start).hasAttribute('data-transient')) start = 'play';
    const authed = !window.Auth || Auth.ok();
    if (!authed) {
      // 没登录：先到登录页；邮箱页压在登录页上面
      stack = start === LOGIN || !AUTH_PAGES.includes(start) ? [LOGIN] : [LOGIN, start];
    } else if (AUTH_PAGES.includes(start)) {
      stack = [HOME];
    } else if (start === HOME || TABS.includes(start)) {
      // Play 是启动页，也是页面栈的根；其他 Tab 直接作为根，二级页压在 Play 上面
      stack = [start];
    } else stack = [HOME, start];
    hooks.__init?.forEach((fn) => fn());
    render(top());
    setActive(top(), true);
    fit();
    clock();
    setInterval(clock, 15000);
    addEventListener('resize', fit);
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') back();
    });
    requestAnimationFrame(() => shown(top()));
  }

  window.App = {
    TABS,
    go, back, pop, backTo, replace, root, tab, refresh, whenIdle,
    top,
    stack: () => [...stack],
    params: (id) => params[id] || {},
    isBusy: () => busy,
    page: (id, h) => { hooks[id] = h; },
    act: (map) => Object.assign(acts, map),
    onInit: (fn) => { (hooks.__init = hooks.__init || []).push(fn); },
  };
  document.addEventListener('DOMContentLoaded', init);
})();
