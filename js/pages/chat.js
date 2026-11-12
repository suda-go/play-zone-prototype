/**
 * K 社交：K1 消息列表与最近玩家、K2 聊天、K3 邀请卡片、K4 好友列表（顶部「最近一起玩」）、K5 好友申请、
 * K6 添加好友、K7 群聊、K8 好友主页；V5 好友私聊顶部的亲密度和一起养的宠物（静态展示）
 * 只有四子棋（D.GAME），邀请好友直接建房，不再选游戏
 */
(() => {
  'use strict';

  const IMG = D.IMG;
  let seg = 'msgs';
  const typing = {};
  const EMOJI = ['😀', '😂', '😍', '😎', '🥳', '👍', '🔥', '🎉', '😭', '😡', '🤝', '❤️', '👋', '🙏', '💯', '🎮'];
  const nameOf = (uid) => (uid === 'me' ? '你' : D.people[uid].name);
  /* 通话（V3）：UI.ic 没有视频图标，内联一个 */
  const VIDEO_IC = (size = 22) => `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 13 5.2 3.5a.5.5 0 0 0 .8-.4V7.9a.5.5 0 0 0-.8-.4L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>`;
  const callIc = (kind, size = 22) => (kind === 'video' ? VIDEO_IC(size) : UI.ic('phone', size));
  const CALL_NAME = { voice: '语音通话', video: '视频通话' };
  const mmss = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  /** 通话记录文案：语音通话 · 02:13 / 已取消 / 对方已取消 / 已拒绝 / 对方未接 */
  function callLabel(m) {
    const st = m.st || (m.dur ? 'done' : '');
    if (st === 'done') return `${CALL_NAME[m.kind] || '语音通话'} · ${mmss(m.dur || 0)}`;
    return { cancel: '已取消', missed: '对方已取消', declined: '已拒绝', noanswer: '对方未接' }[st] || m.text || CALL_NAME[m.kind];
  }
  const call = (uid, kind) => (window.Call ? Call.start(uid, kind) : UI.toast('通话功能加载中'));
  /** 打开会员中心（vip.js 提供 Vip.open；还没加载时直接进页面） */
  const openVip = (t) => (window.Vip && typeof Vip.open === 'function' ? Vip.open(t) : App.go('vip', { tier: t }));

  function chatTitle(c) {
    if (c.type === 'dm') return D.people[c.with].name;
    return c.name;
  }
  function chatAvatar(c, size = 48) {
    if (c.type === 'dm') return UI.av(c.with, size, { on: true });
    if (c.type === 'system') return `<span class="sys-av" style="--s:${size}px"><img src="${IMG}brand/app-icon.png" alt=""></span>`;
    const m = c.members.slice(0, 2);
    return `<span class="grp-av" style="--s:${size}px">${m.map((u) => `<img src="${D.people[u].avatar}" alt="">`).join('')}</span>`;
  }
  function preview(m) {
    if (!m) return '';
    const who = m.from === 'me' ? '你：' : '';
    if (m.type === 'invite') return `${who}[游戏邀请] ${(D.game[m.game] || D.game[D.GAME]).name}`;
    if (m.type === 'share') return `${who}[分享] ${m.text}`;
    if (m.type === 'call') return `${who}[${CALL_NAME[m.kind] || '语音通话'}]`;
    return who + m.text;
  }

  /* ================= K1 / K4 Chat Tab ================= */
  function msgsSeg() {
    const s = Store.s;
    const recent = s.recent.filter((u) => D.people[u]);
    const rows = s.chatOrder.filter((id) => s.chats[id]).map((id) => {
      const c = s.chats[id];
      const last = c.msgs[c.msgs.length - 1];
      return `<button class="ch-row" data-go="dm" data-id="${id}">
        ${chatAvatar(c)}
        <span class="row-main"><b>${UI.esc(chatTitle(c))}${c.type === 'group' ? ` <i class="ch-n">${c.members.length + 1}</i>` : ''}${c.type === 'system' ? ' <i class="tag">官方</i>' : ''}</b>
          <span class="${last && last.type === 'invite' && last.from !== 'me' ? 'is-invite' : ''}${last && last.type === 'call' && last.st === 'missed' && c.unread ? 'is-miss' : ''}">${UI.esc(preview(last))}</span></span>
        <span class="ch-meta"><em>${last ? last.t : ''}</em>${c.unread ? `<i class="count is-inline">${c.unread}</i>` : ''}</span>
      </button>`;
    }).join('');
    return `${recent.length ? `<div class="sec-hd"><h2>最近一起玩</h2><button class="more" data-go="addfriend">找更多 ${UI.ic('right', 14)}</button></div>
      <div class="hscroll ch-recent" data-scroll="recent">${recent.map((u) => {
        const f = Store.isFriend(u);
        const sent = Store.s.sent.includes(u);
        return `<div class="ch-rp"><button data-go="profile" data-uid="${u}">${UI.av(u, 52, { on: true })}</button><b>${D.people[u].name}</b>
          ${f ? `<span class="ch-rp-st">${UI.ic('userCheck', 12)} 好友</span>` : sent ? '<span class="ch-rp-st">已申请</span>' : `<button class="ch-rp-add" data-act="add" data-uid="${u}">${UI.ic('plus', 12)} 加好友</button>`}</div>`;
      }).join('')}</div>` : ''}
      ${s.requests.length ? `<button class="ch-req" data-go="requests">${UI.ic('userPlus', 20)}<span class="row-main"><b>好友申请</b><span>${s.requests.map((u) => D.people[u].name).join('、')}想加你为好友</span></span><i class="count is-inline">${s.requests.length}</i>${UI.ic('right', 18)}</button>` : ''}
      <div class="ch-list">${rows}</div>`;
  }
  /** 和某人一起下过的局数：对局记录（最多30条）和好友局计数取较大值 */
  function playedWith(uid) {
    const n = Store.s.history.filter((h) => h.vs === uid).length;
    return Math.max(n, Store.s.mateGames[uid] || 0);
  }
  /** 最近一起玩：一行说明，优先用最近一局的结果 */
  function recentLine(uid) {
    const h = Store.s.history.find((x) => x.vs === uid);
    if (!h) return '刚刚和你下过一局';
    const when = /^\d/.test(h.t) ? '今天' : h.t;
    return `${when}和你下过一局 · ${h.draw ? '平局' : h.win ? '你赢了' : '你输了'}`;
  }
  function recentBtn(uid) {
    const P = D.people[uid];
    if (Store.isFriend(uid)) {
      return P.online
        ? `<span class="fr-rc-r"><i class="fr-rc-ok">${UI.ic('userCheck', 11)} 已是好友</i><button class="btn btn-line btn-sm" data-act="playRecent" data-uid="${uid}">一起玩</button></span>`
        : `<span class="af-st">${UI.ic('userCheck', 14)} 已是好友</span>`;
    }
    if (Store.s.sent.includes(uid)) return '<span class="af-st">已申请</span>';
    return `<button class="btn btn-primary btn-sm" data-act="addRecent" data-uid="${uid}">${UI.ic('plus', 14)} 加好友</button>`;
  }
  /** 好友页顶部「最近一起玩」：最新的在前，每人带加好友按钮 */
  function recentSec() {
    const list = Store.s.recent.filter((u) => D.people[u]);
    const rows = list.map((u) => {
      const P = D.people[u];
      return `<div class="fr-row fr-rc" data-go="profile" data-uid="${u}">${UI.av(u, 46, { on: true })}
        <span class="row-main"><b>${P.name} <i class="fr-lv">Lv${P.lv}</i></b><span>${recentLine(u)}</span></span>
        ${recentBtn(u)}</div>`;
    }).join('');
    return `<section class="fr-recent" id="fr-recent">
      <div class="fr-hd fr-recent-hd">最近一起玩${list.length ? ` · ${list.length}` : ''}<span>加个好友，下次直接约</span></div>
      ${rows || '<p class="fr-recent-empty">和别人对局后，会出现在这里</p>'}
    </section>`;
  }
  function friendsSeg() {
    const list = Store.s.friends.map((u) => D.people[u]);
    const on = list.filter((p) => p.online);
    const off = list.filter((p) => !p.online);
    const row = (p) => `<div class="fr-row" data-go="profile" data-uid="${p.id}">${UI.av(p.id, 46, { on: true })}
      <span class="row-main"><b>${p.name} <i class="fr-lv">Lv${p.lv}</i></b><span class="${p.online ? 'is-on' : ''}">${p.online ? UI.esc(p.status) : `${p.seen}在线`}</span></span>
      ${p.online ? `<button class="fr-call" data-act="callVoice" data-uid="${p.id}" aria-label="和${UI.esc(p.name)}语音通话">${UI.ic('phone', 16)}</button><button class="btn btn-line btn-sm" data-act="invite" data-uid="${p.id}">邀请</button>` : `<button class="btn btn-ghost btn-sm" data-go="dm" data-id="${p.id}">发消息</button>`}
    </div>`;
    const tier = Store.vipTier();
    const cap = Store.perk('friendCap');
    return `<div class="fr-search field" data-go="addfriend">${UI.ic('search', 18)}<span>搜索昵称或ID</span></div>
      <div class="fr-cap"><span>好友 <b>${list.length}</b>/${cap}</span>${UI.bar(list.length, cap, 'fr-cap-bar')}
        ${tier < 2 ? `<button class="fr-cap-up" data-act="capVip" data-tier="${tier + 1}">${UI.ic('crown', 13)}${tier ? `超级会员上限${D.vip.tiers[2].friendCap}` : '会员提升上限'}${UI.ic('right', 12)}</button>` : `<i class="fr-cap-max">${UI.vipTag(2)}已是最高上限</i>`}</div>
      <button class="ch-req" data-go="requests">${UI.ic('userPlus', 20)}<span class="row-main"><b>好友申请</b><span>${Store.s.requests.length ? `${Store.s.requests.length}条待处理` : '暂无新申请'}</span></span>${Store.s.requests.length ? `<i class="count is-inline">${Store.s.requests.length}</i>` : ''}${UI.ic('right', 18)}</button>
      ${recentSec()}
      <div class="fr-hd">在线 · ${on.length}</div>${on.map(row).join('')}
      <div class="fr-hd">离线 · ${off.length}</div>${off.map(row).join('')}`;
  }

  App.page('chat', {
    render(el, p) {
      if (p.seg) { seg = p.seg === 'friends' ? 'friends' : 'msgs'; p.seg = ''; }
      // { seg: 'friends', focus: 'recent' }：滚到「最近一起玩」并闪一下
      const focus = seg === 'friends' && p.focus === 'recent';
      if (p.focus) p.focus = '';
      el.innerHTML = `
        <header class="tab-hd safe-top"><h1>消息</h1><div class="nav-right">
          <button class="icon-btn" data-go="newgroup" aria-label="发起群聊">${UI.ic('users', 22)}</button>
          <button class="icon-btn" data-go="addfriend" aria-label="添加好友">${UI.ic('userPlus', 22)}</button></div></header>
        <div class="seg ch-seg">
          <button class="seg-it ${seg === 'msgs' ? 'is-active' : ''}" data-act="seg" data-s="msgs">聊天${Store.unread() ? `<i class="count">${Store.unread()}</i>` : ''}</button>
          <button class="seg-it ${seg === 'friends' ? 'is-active' : ''}" data-act="seg" data-s="friends">好友 <em class="seg-n">${Store.s.friends.length}/${Store.perk('friendCap')}</em></button>
        </div>
        <div class="body ch-body" data-scroll="main">${seg === 'msgs' ? msgsSeg() : friendsSeg()}<div class="bottom-space"></div></div>
        ${UI.tabbar('chat')}`;
      if (focus) {
        requestAnimationFrame(() => {
          const sec = el.querySelector('.fr-recent');
          const body = el.querySelector('[data-scroll="main"]');
          if (!sec || !body) return;
          const top = sec.offsetParent === body ? sec.offsetTop : sec.offsetTop - body.offsetTop;
          body.scrollTo({ top: Math.max(0, top - 8), behavior: 'smooth' });
          sec.classList.add('is-flash');
        });
      }
    },
    back() { App.tab('play'); return false; },
    act: {
      seg: (el) => { seg = el.dataset.s; App.refresh('chat'); },
      add: (el) => { Store.request(el.dataset.uid); UI.toast('好友申请已发送'); App.refresh('chat'); scheduleAccept(el.dataset.uid); },
      invite: (el) => Rooms.withFriend(el.dataset.uid),
      callVoice: (el) => call(el.dataset.uid, 'voice'),
      capVip: (el) => openVip(+el.dataset.tier || 1),
      addRecent: (el) => {
        const uid = el.dataset.uid;
        if (Store.isFriend(uid)) return;
        if (Store.s.requests.includes(uid)) {
          // 对方已经申请过加你：直接成为好友
          Store.addFriend(uid);
          UI.toast(`你和${nameOf(uid)}已经是好友了`);
          App.refresh('chat');
          return;
        }
        Store.request(uid);
        UI.toast('好友申请已发送');
        App.refresh('chat');
        scheduleAccept(uid, 4000);
      },
      playRecent: (el) => {
        const uid = el.dataset.uid;
        if (!D.people[uid].online) { UI.toast(`${nameOf(uid)}现在不在线`); return; }
        Rooms.withFriend(uid);
      },
    },
  });

  /** 模拟对方几秒后通过好友申请 */
  function scheduleAccept(uid, ms = 5000) {
    setTimeout(() => {
      if (!Store.s.sent.includes(uid)) return;
      Store.addFriend(uid);
      UI.notify({ img: D.people[uid].avatar, title: `${nameOf(uid)}通过了你的好友申请`, text: '你们已经是好友了，打个招呼吧！', btn: '去聊天', onTap: () => App.go('dm', { id: uid }) });
      if (['chat', 'addfriend', 'profile'].includes(App.top())) App.refresh();
    }, ms);
  }

  /* ================= K2 聊天 / K3 邀请卡片 ================= */
  function inviteCard(m) {
    const g = D.game[m.game] || D.game[D.GAME];
    const r = m.room ? Store.room(m.room) : null;
    const mine = m.from === 'me';
    const inRoom = r && r.seats.includes('me');
    const full = r && r.seats.length >= r.max && !inRoom;
    const label = !r ? '已过期' : inRoom ? '进入房间' : full ? '已满' : mine ? '进入房间' : '加入';
    return `<div class="ivc">
      <div class="ivc-cover" style="background-image:url(${g.cover || g.icon})"><span class="tag tag-dark">${UI.ic('gamepad', 11)} 游戏邀请</span></div>
      <div class="ivc-b"><img src="${g.icon}" alt=""><span class="row-main"><b>${g.name}</b><span>${r ? `${UI.esc(r.name)} · ${r.seats.length}/${r.max} · ${r.bet ? `底注${UI.fmt(r.bet)}` : '免费房'}` : '房间已关闭'}</span></span></div>
      <p>${UI.esc(m.text)}</p>
      <button class="btn ${!r || full ? 'is-disabled' : 'btn-primary'} btn-md btn-block" data-act="join" data-room="${m.room || ''}">${label}</button>
    </div>`;
  }
  function bubble(c, m, prev) {
    if (m.from === 'system') return `<div class="dm-sys"><span>${UI.esc(m.text)}</span></div>`;
    const me = m.from === 'me';
    const showName = c.type === 'group' && !me && (!prev || prev.from !== m.from);
    let body;
    if (m.type === 'invite') body = inviteCard(m);
    else if (m.type === 'call') {
      // 通话记录：点一下再打一次
      const st = m.st || (m.dur ? 'done' : 'cancel');
      body = `<div role="button" tabindex="0" class="dm-bub dm-call is-${st} ${me ? UI.bubble(Store.s.equip.bubble) : ''}" data-act="callAgain" data-kind="${m.kind === 'video' ? 'video' : 'voice'}" aria-label="再打一次">
        <span class="dm-call-ic">${callIc(m.kind, 16)}</span><span>${UI.esc(callLabel(m))}</span></div>`;
    } else if (m.type === 'share') {
      body = `<div class="dm-bub ${me ? UI.bubble(Store.s.equip.bubble) : ''} is-share">${m.game ? `<img src="${D.game[m.game].icon}" alt="">` : ''}<span>${UI.esc(m.text)}</span></div>`;
    } else body = `<div class="dm-bub ${me ? UI.bubble(Store.s.equip.bubble) : ''}">${UI.esc(m.text)}</div>`;
    return `<div class="dm-row ${me ? 'is-me' : ''}">
      ${me ? '' : `<button class="dm-av" data-go="profile" data-uid="${m.from}">${UI.av(m.from, 34)}</button>`}
      <div class="dm-col">${showName ? `<i class="dm-name">${nameOf(m.from)}</i>` : ''}${body}</div>
      ${me ? `<span class="dm-av">${UI.av('me', 34)}</span>` : ''}
    </div>`;
  }
  function msgsHtml(id) {
    const c = Store.s.chats[id];
    let out = '';
    let lastT = null;
    c.msgs.forEach((m, i) => {
      if (m.t !== lastT && (i === 0 || /[^\d:]/.test(m.t) || /[^\d:]/.test(lastT || ''))) out += `<div class="dm-time">${m.t}</div>`;
      lastT = m.t;
      out += bubble(c, m, c.msgs[i - 1]);
    });
    if (typing[id]) out += `<div class="dm-row"><span class="dm-av">${UI.av(typing[id], 34)}</span><div class="dm-bub is-typing"><i></i><i></i><i></i></div></div>`;
    return out || `<div class="dm-empty">${UI.av(c.with || 'me', 64)}<p>和${UI.esc(chatTitle(c))}打个招呼吧 👋</p></div>`;
  }
  function paintMsgs(id) {
    const el = document.querySelector('.page[data-page="dm"]');
    if (!el || App.top() !== 'dm' || App.params('dm').id !== id) return;
    const box = el.querySelector('.dm-msgs');
    box.innerHTML = msgsHtml(id);
    box.scrollTop = box.scrollHeight;
    Store.read(id);
  }

  /** V5 好友私聊顶部：亲密度等级，以及两个人一起养的宠物（演示：读 D.intimacy 的静态数据，只展示，没有交互） */
  const HEART = '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-10-9.2C.3 8.5 2.2 4.5 6 4.1c2.2-.2 4.2 1 6 3.1 1.8-2.1 3.8-3.3 6-3.1 3.8.4 5.7 4.4 4 7.7C19.5 16.4 12 21 12 21z"/></svg>';
  function intimacyHtml(uid) {
    if (!Store.isFriend(uid)) return '';
    const I = D.intimacy;
    const pts = I.pts[uid] ?? I.def;
    const cur = [...I.levels].reverse().find((l) => pts >= l.need);
    const next = I.levels.find((l) => l.need > pts);
    const pet = I.pets[uid];
    return `<div class="im-card ${pet ? 'has-pet' : ''}">
      <div class="im-main">
        <div class="im-top"><span class="im-pair">${UI.av('me', 26, { frame: false })}<i class="im-heart">${HEART}</i>${UI.av(uid, 26, { frame: false })}</span><b>亲密度 Lv${cur.lv} · ${cur.name}</b><em class="im-num">${next ? `${pts}/${next.need}` : pts}</em></div>
        ${next ? UI.bar(pts - cur.need, next.need - cur.need, 'im-bar') : UI.bar(1, 1, 'im-bar')}
        <span class="im-sub">${next ? '聊天、一起下棋、通话都能涨亲密度' : '已是最高等级'}</span>
      </div>
      ${pet ? `<div class="im-pet"><img src="${pet.img}" alt="${pet.name}"><span><b>${pet.name}</b><small>一起养了${pet.days}天</small></span><i class="im-tag">示意</i></div>` : ''}
    </div>`;
  }

  /** 模拟回复：私聊在线好友会回，群里随机一人回 */
  function autoReply(id, text) {
    const c = Store.s.chats[id];
    if (!c || c.type === 'system') return;
    const who = c.type === 'dm' ? c.with : UI.pick(c.members);
    const P = D.people[who];
    if (c.type === 'dm' && !P.online) return;
    setTimeout(() => {
      typing[id] = who;
      paintMsgs(id);
      setTimeout(() => {
        delete typing[id];
        let reply = UI.pick(D.replies);
        if (/play|game|room|match|玩|游戏|房|匹配|开黑/i.test(text || '')) reply = '快给我发邀请！🎮';
        if (/hi|hello|hey|你好|嗨|哈喽|在吗/i.test(text || '')) reply = '嗨！👋';
        Store.post(id, { from: who, text: reply }, { read: App.top() === 'dm' && App.params('dm').id === id });
        Sfx.play('msg');
        paintMsgs(id);
      }, 1300 + Math.random() * 900);
    }, 700);
  }

  App.page('dm', {
    render(el, p) {
      const id = p.id;
      const c = id === 'system' || Store.s.chats[id] ? Store.s.chats[id] : Store.dm(id);
      const title = chatTitle(c);
      let sub = '';
      if (c.type === 'dm') { const P = D.people[c.with]; sub = P.online ? `在线 · ${P.status}` : `${P.seen}在线`; }
      else if (c.type === 'group') sub = `${c.members.length + 1}位成员`;
      else sub = '官方账号';
      const right = c.type === 'dm' ? `<button class="icon-btn dm-callbtn" data-act="callVoice" aria-label="语音通话">${UI.ic('phone', 20)}</button>
          <button class="icon-btn dm-callbtn" data-act="callVideo" aria-label="视频通话">${VIDEO_IC(23)}</button>
          <button class="icon-btn" data-go="profile" data-uid="${c.with}" aria-label="个人主页">${UI.ic('users', 21)}</button>`
        : c.type === 'group' ? `<button class="icon-btn" data-act="groupInfo" aria-label="群信息">${UI.ic('more', 22)}</button>` : '';
      el.innerHTML = `${UI.nav({ title: c.type === 'dm' ? UI.name(c.with) : UI.esc(title), sub: UI.esc(sub), cls: 'is-white dm-nav', right })}
        ${c.type === 'dm' ? intimacyHtml(c.with) : ''}
        <div class="body dm-msgs" data-scroll="chat">${msgsHtml(id)}</div>
        ${c.type === 'system' ? '<div class="dm-ro">官方账号暂不支持回复</div>' : `
        <div class="dm-emoji" hidden>${EMOJI.map((e) => `<button data-act="emoji" data-e="${e}">${e}</button>`).join('')}</div>
        <form class="dm-bar" onsubmit="return false">
          <button type="button" class="icon-btn dm-game" data-act="game" aria-label="发送游戏邀请">${UI.ic('gamepad', 22)}</button>
          <div class="dm-field"><input class="dm-in" maxlength="120" placeholder="发消息…" enterkeyhint="send"><button type="button" class="dm-emo" data-act="emojiPanel" aria-label="表情">${UI.ic('smile', 21)}</button></div>
          <button type="button" class="dm-send" data-act="send" aria-label="发送">${UI.ic('send', 19)}</button>
        </form>`}`;
      Store.read(id);
      const box = el.querySelector('.dm-msgs');
      requestAnimationFrame(() => { box.scrollTop = box.scrollHeight; });
      el.querySelector('.dm-in')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); el.querySelector('.dm-send').click(); } });
    },
    act: {
      callVoice: () => { const c = Store.s.chats[App.params('dm').id]; if (c && c.type === 'dm') call(c.with, 'voice'); },
      callVideo: () => { const c = Store.s.chats[App.params('dm').id]; if (c && c.type === 'dm') call(c.with, 'video'); },
      callAgain: (el) => { const c = Store.s.chats[App.params('dm').id]; if (c && c.type === 'dm') call(c.with, el.dataset.kind); },
      send: () => {
        const el = document.querySelector('.page[data-page="dm"]');
        const input = el.querySelector('.dm-in');
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        el.querySelector('.dm-emoji').hidden = true;
        const id = App.params('dm').id;
        Store.post(id, { from: 'me', text });
        Sfx.play('tap');
        paintMsgs(id);
        autoReply(id, text);
      },
      emojiPanel: () => {
        const p = document.querySelector('.page[data-page="dm"] .dm-emoji');
        p.hidden = !p.hidden;
      },
      emoji: (el) => {
        const input = document.querySelector('.page[data-page="dm"] .dm-in');
        input.value += el.dataset.e;
        input.focus();
      },
      game: async () => {
        // 只有四子棋：先选入场金币（V6，含免费档），再建私密房间并发邀请卡片
        const id = App.params('dm').id;
        const c = Store.s.chats[id];
        const gm = D.game[D.GAME];
        const bet = await Rooms.pickBet();
        if (bet === null || App.top() !== 'dm' || App.params('dm').id !== id) return;
        const r = Store.createRoom({ name: `${Store.s.user.name}的${gm.name}房间`, game: D.GAME, max: 2, private: true, premium: false, lang: '中文', bet });
        Store.post(id, { from: 'me', type: 'invite', game: D.GAME, room: r.id, text: bet ? `来我房间下一局四子棋！底注${UI.fmt(bet)}金币，赢家拿走奖池` : '来我房间下一局四子棋！免费房' });
        Store.count('invites');
        paintMsgs(id);
        const who = c.type === 'dm' ? c.with : UI.pick(c.members);
        if (!D.people[who].online) { UI.toast(`${nameOf(who)}不在线，上线后会看到邀请`); return; }
        setTimeout(() => {
          Store.post(id, { from: who, text: '马上来！🏃' }, { read: App.top() === 'dm' });
          paintMsgs(id);
          setTimeout(() => {
            if (r.seats.length >= r.max || r.seats.includes(who)) return;
            Store.sit(r.id, who);
            UI.notify({ img: D.people[who].avatar, title: `${nameOf(who)}加入了你的房间`, text: `${gm.name} · ${r.seats.length}/${r.max}`, btn: '进入', onTap: () => App.go('room', { id: r.id }) });
            paintMsgs(id);
          }, 2200);
        }, 1500);
      },
      join: async (el) => {
        const rid = el.dataset.room;
        const r = rid && Store.room(rid);
        if (!r) { UI.toast('邀请已过期'); return; }
        if (r.seats.includes('me')) { App.go('room', { id: rid }); return; }
        if (r.seats.length >= r.max) { UI.toast('房间已经满了'); return; }
        Rooms.join(rid);
      },
      groupInfo: () => {
        const c = Store.s.chats[App.params('dm').id];
        UI.sheet({
          title: UI.esc(c.name), sub: `${c.members.length + 1}位成员`,
          html: `<div class="pick-list">${['me', ...c.members].map((u) => `<div class="row pick-row">${UI.av(u, 40, { on: true })}<div class="row-main"><b>${nameOf(u)}</b><span>${u === 'me' ? '我' : D.people[u].online ? '在线' : '离线'}</span></div></div>`).join('')}</div>`,
        });
      },
    },
  });

  /* ================= K5 好友申请 ================= */
  App.page('requests', {
    render(el) {
      const list = Store.s.requests;
      el.innerHTML = `${UI.nav({ title: '好友申请', cls: 'is-white' })}
        <div class="body" data-scroll="main">${list.length ? `<div class="req-list">${list.map((u) => {
          const P = D.people[u];
          return `<div class="req-row">${UI.av(u, 52, { on: true })}
            <span class="row-main" data-go="profile" data-uid="${u}"><b>${P.name} <i class="fr-lv">Lv${P.lv}</i></b><span>${playedWith(u) ? `和你玩过${playedWith(u)}局` : `四子棋${P.games}局`} · 胜率${P.win}%</span></span>
            <button class="btn btn-ghost btn-sm" data-act="decline" data-uid="${u}">拒绝</button>
            <button class="btn btn-primary btn-sm" data-act="accept" data-uid="${u}">同意</button>
          </div>`;
        }).join('')}</div>` : UI.empty('暂时没有好友申请', `${IMG}brand/mascot.png`)}</div>`;
    },
    act: {
      accept: (el) => {
        const u = el.dataset.uid;
        Store.addFriend(u);
        UI.toast(`你和${nameOf(u)}已经是好友了`);
        Sfx.play('reward');
        App.refresh('requests');
      },
      decline: (el) => {
        Store.decline(el.dataset.uid);
        UI.toast('已拒绝申请');
        App.refresh('requests');
      },
    },
  });

  /* ================= K6 添加好友 ================= */
  let query = '';
  function results() {
    const q = query.trim().toLowerCase();
    if (!q) return '';
    const hits = Object.values(D.people).filter((p) => !['stella', 'bot'].includes(p.id) && (p.uid.includes(q) || p.name.toLowerCase().includes(q)));
    if (!hits.length) return `<p class="af-none">没有找到“${UI.esc(query)}”，试试搜“${UI.esc(D.people.noah.name)}”。</p>`;
    return hits.slice(0, 6).map(personRow).join('');
  }
  function personRow(p) {
    const f = Store.isFriend(p.id);
    const sent = Store.s.sent.includes(p.id);
    const req = Store.s.requests.includes(p.id);
    const btn = f ? `<span class="af-st">${UI.ic('userCheck', 14)} 已是好友</span>`
      : sent ? '<span class="af-st">已申请</span>'
        : req ? `<button class="btn btn-primary btn-sm" data-act="accept" data-uid="${p.id}">同意</button>`
          : `<button class="btn btn-primary btn-sm" data-act="add" data-uid="${p.id}">${UI.ic('plus', 14)} 加好友</button>`;
    return `<div class="fr-row" data-go="profile" data-uid="${p.id}">${UI.av(p.id, 46, { on: true })}<span class="row-main"><b>${p.name} <i class="fr-lv">Lv${p.lv}</i></b><span>ID ${p.uid}</span></span>${btn}</div>`;
  }
  App.page('addfriend', {
    render(el) {
      const recent = Store.s.recent.filter((u) => D.people[u]);
      el.innerHTML = `${UI.nav({ title: '添加好友', cls: 'is-white' })}
        <div class="body af-body" data-scroll="main">
          <form class="field af-search" onsubmit="return false">${UI.ic('search', 18)}<input class="af-in" placeholder="搜索昵称或ID" value="${UI.esc(query)}" enterkeyhint="search"><button type="button" class="btn btn-primary btn-sm" data-act="search">搜索</button></form>
          <div class="af-results">${results()}</div>
          <div class="af-me card"><div class="row-main"><b>我的ID · ${Store.s.user.uid}</b><span>分享ID，让好友快速找到你</span></div><button class="btn btn-line btn-sm" data-act="copy">${UI.ic('copy', 14)} 复制</button><button class="btn btn-primary btn-sm" data-act="shareId">${UI.ic('share', 14)} 分享</button></div>
          <div class="fr-hd">最近一起玩过</div>
          ${recent.map((u) => personRow(D.people[u])).join('') || UI.empty('玩一局就能认识新朋友')}
          <div class="fr-hd">可能认识的人</div>
          ${['noah', 'zoe', 'jade', 'ethan'].filter((u) => !recent.includes(u)).map((u) => personRow(D.people[u])).join('')}
          <div class="bottom-space"></div>
        </div>`;
      const input = el.querySelector('.af-in');
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); el.querySelector('[data-act="search"]').click(); } });
    },
    act: {
      search: () => {
        query = document.querySelector('.page[data-page="addfriend"] .af-in').value;
        App.refresh('addfriend');
      },
      add: (el) => {
        Store.request(el.dataset.uid);
        UI.toast('好友申请已发送');
        scheduleAccept(el.dataset.uid);
        App.refresh('addfriend');
      },
      accept: (el) => { Store.addFriend(el.dataset.uid); UI.toast(`你和${nameOf(el.dataset.uid)}已经是好友了`); App.refresh('addfriend'); },
      copy: () => UI.toast(`已复制ID ${Store.s.user.uid}`),
      shareId: () => UI.share({ title: '分享我的ID', text: `来 Soulgame 加我好友吧！我的ID是${Store.s.user.uid}` }),
    },
  });

  /* ================= K7 建群 ================= */
  let picked = new Set();
  App.page('newgroup', {
    render(el, p) {
      if (p !== this._p) { this._p = p; picked = new Set(); }
      const list = Store.s.friends.map((u) => D.people[u]);
      el.innerHTML = `${UI.nav({ title: '发起群聊', sub: '至少选择2位好友', cls: 'is-white' })}
        <div class="body" data-scroll="main">${list.map((P) => `<button class="ng-row ${picked.has(P.id) ? 'is-on' : ''}" data-act="toggle" data-uid="${P.id}">
            ${UI.av(P.id, 44, { on: true })}<span class="row-main"><b>${P.name}</b><span>${P.online ? '在线' : `${P.seen}在线`}</span></span><i class="ng-check">${UI.ic('check', 16)}</i></button>`).join('')}
          <div class="bottom-space" style="height:90px"></div></div>
        <div class="cr-foot"><button class="btn ${picked.size >= 2 ? 'btn-primary' : 'is-disabled'} btn-lg btn-block" data-act="create">创建群聊${picked.size ? `（${picked.size + 1}人）` : ''}</button></div>`;
    },
    act: {
      toggle: (el) => {
        const u = el.dataset.uid;
        if (picked.has(u)) picked.delete(u); else picked.add(u);
        App.refresh('newgroup');
      },
      create: () => {
        if (picked.size < 2) { UI.toast('至少选择2位好友'); return; }
        const id = Store.newGroup([...picked]);
        App.replace('dm', { id }, { anim: 'push' });
        setTimeout(() => {
          const c = Store.s.chats[id];
          Store.post(id, { from: c.members[0], text: '耶，新战队成立！🎉' }, { read: App.top() === 'dm' });
          paintMsgs(id);
        }, 1800);
      },
    },
  });

  /* ================= K8 好友主页 ================= */
  App.page('profile', {
    render(el, p) {
      const P = D.people[p.uid];
      if (!P) { el.innerHTML = UI.nav({ title: '个人主页' }); return; }
      const f = Store.isFriend(P.id);
      const sent = Store.s.sent.includes(P.id);
      const req = Store.s.requests.includes(P.id);
      const rank = Math.min(4, Math.floor((D.boardFriends.find((x) => x.id === P.id)?.score || P.lv * 18) / 100));
      const g = D.game[D.GAME];
      const played = playedWith(P.id);
      el.innerHTML = `
        <div class="pf-bg" style="background:${UI.bg(P.bg)}"></div>
        ${UI.nav({ cls: 'is-light', right: `<button class="icon-btn" data-act="more" aria-label="更多">${UI.ic('more', 22)}</button>` })}
        <div class="body pf-body" data-scroll="main">
          <div class="pf-card">
            <div class="pf-av">${UI.av(P.id, 92, { on: true })}</div>
            <h1>${UI.name(P.id)} <span class="tag tag-event">Lv${P.lv}</span></h1>
            <p class="pf-id">ID ${P.uid} · ${P.online ? `<span class="is-on">${UI.esc(P.status)}</span>` : `${P.seen}在线`}</p>
            <p class="pf-bio">${UI.esc(P.bio || '—')}</p>
            <div class="pf-stats"><span><b>${P.games}</b>对局</span><span><b>${P.win}%</b>胜率</span><span>${UI.tier(rank, 26)}<b>${D.tiers[rank]}</b></span></div>
            ${f ? `<div class="pf-calls">${['voice', 'video'].map((k) => {
              const free = Store.perk(k === 'video' ? 'videoFree' : 'voiceFree');
              return `<button class="pf-call ${P.online ? '' : 'is-off'}" data-act="${k === 'video' ? 'callVideo' : 'callVoice'}">
                <span class="pf-call-ic is-${k}">${callIc(k, 18)}</span><span class="row-main"><b>${CALL_NAME[k]}</b><span>${free ? '会员免费' : `${D.vip.call[k]}钻石/次 · ${k === 'video' ? '超级会员' : '会员'}免费`}</span></span></button>`;
            }).join('')}</div>` : ''}
          </div>
          <div class="sec-hd"><h2>${g.name}战绩</h2></div>
          <div class="pf-c4 card">
            <img class="pf-c4-ic" src="${g.icon}" alt="">
            <span class="row-main"><b>${g.name} · ${D.tiers[rank]}</b><span>共${P.games}局 · 胜率${P.win}%</span></span>
            <span class="pf-c4-vs">${played ? `<b>${played}<small>局</small></b><i>和你玩过</i>` : '<i>还没和你<br>一起玩过</i>'}</span>
          </div>
          <div class="sec-hd"><h2>徽章</h2></div>
          <div class="pf-badges">${D.badges.slice(0, 3 + (P.lv % 4)).map((b) => `<span title="${b.name}"><img src="${b.img}" alt=""><i>${b.name}</i></span>`).join('')}</div>
          <div class="bottom-space" style="height:100px"></div>
        </div>
        <div class="pf-foot">
          ${f ? `<button class="btn btn-ghost btn-lg" data-go="dm" data-id="${P.id}">${UI.ic('msg', 18)} 发消息</button><button class="btn btn-primary btn-lg" data-act="invite">${UI.ic('gamepad', 18)} 邀请</button>`
            : req ? `<button class="btn btn-primary btn-lg btn-block" data-act="accept">${UI.ic('userCheck', 18)} 同意申请</button>`
              : sent ? `<button class="btn is-disabled btn-lg btn-block">${UI.ic('check', 18)} 已发送申请</button>`
                : `<button class="btn btn-primary btn-lg btn-block" data-act="add">${UI.ic('userPlus', 18)} 加好友</button>`}
        </div>`;
    },
    act: {
      callVoice: () => call(App.params('profile').uid, 'voice'),
      callVideo: () => call(App.params('profile').uid, 'video'),
      invite: () => {
        const uid = App.params('profile').uid;
        if (!D.people[uid].online) { UI.toast(`${nameOf(uid)}现在不在线`); return; }
        Rooms.withFriend(uid);
      },
      add: () => {
        const uid = App.params('profile').uid;
        Store.request(uid);
        UI.toast('好友申请已发送');
        scheduleAccept(uid);
        App.refresh('profile');
      },
      accept: () => {
        const uid = App.params('profile').uid;
        Store.addFriend(uid);
        UI.toast(`你和${nameOf(uid)}已经是好友了`);
        App.refresh('profile');
      },
      more: () => {
        const uid = App.params('profile').uid;
        const f = Store.isFriend(uid);
        const c = UI.sheet({
          html: `<div class="cells sheet-cells">
            ${f ? `<button class="cell" data-act="remove">${UI.ic('userMinus', 20, 'cell-ic')}<span class="cell-main">删除好友</span></button>` : ''}
            <button class="cell" data-act="report">${UI.ic('flag', 20, 'cell-ic')}<span class="cell-main">举报</span></button>
            <button class="cell" data-act="close"><span class="cell-main" style="text-align:center">取消</span></button></div>`,
          acts: {
            remove: async () => {
              c.close();
              const ok = await UI.confirm({ title: `删除好友${nameOf(uid)}？`, text: '删除后你们将从彼此的好友列表中消失。', ok: '删除', danger: true });
              if (!ok) return;
              Store.unfriend(uid);
              UI.toast('已删除好友');
              App.refresh('profile');
            },
            report: () => { c.close(); UI.toast('感谢反馈，我们会尽快核实'); },
          },
        });
      },
    },
  });
})();
