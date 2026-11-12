/**
 * J 房间：J1 房间列表、J2 快速加入、J3 创建房间、J4 房间内（座位、聊天、准备、人满倒计时开局）、
 * J5 邀请好友、J6 高级房需要房卡
 * 只有四子棋（D.GAME），房间固定2人；房间对局不扣金币、不计段位
 */
(() => {
  'use strict';

  const IMG = D.IMG;
  const rt = {};          // 房间运行时状态（准备、聊天、定时器），不存盘
  let filter = '全部';
  const curRoom = () => (App.top() === 'room' ? App.params('room').id : null);
  const nameOf = (uid) => (uid === 'me' ? '你' : D.people[uid].name);
  const pageEl = () => document.querySelector('.page[data-page="room"]');

  function state(id) {
    if (!rt[id]) rt[id] = { ready: {}, msgs: [], timers: [], cd: 0, n: 0 };
    return rt[id];
  }
  function stopSim(id) {
    const st = rt[id];
    if (!st) return;
    st.timers.forEach(clearTimeout);
    st.timers = [];
    clearInterval(st.cd);
    st.cd = 0;
  }

  /* ================= 加入房间（含 J6 通行证） ================= */
  async function join(id) {
    const r = Store.room(id);
    if (!r) { UI.toast('房间已不存在'); return; }
    if (r.seats.includes('me')) { App.go('room', { id }); return; }
    if (r.seats.length >= r.max) { UI.toast('房间已满，试试快速加入吧'); return; }
    if (r.premium && Store.perk('freePass')) {
      UI.toast('会员免房卡进入');
    } else if (r.premium) {
      if (Store.s.pass <= 0) {
        const k = await UI.dialog({
          img: `${IMG}ui/pass.svg`, imgCls: 'is-small',
          title: '需要房卡',
          text: `<b>${UI.esc(r.name)}</b>是高级房，进入需消耗1张房卡，你现在没有房卡。`,
          buttons: [{ label: `买1张房卡 · ${UI.cur('coins', 16)} 200`, key: 'buy', cls: 'btn-orange' }, { label: '去商城', key: 'shop', cls: 'btn-line' }, { label: '下次再说', key: 'no', cls: 'btn-ghost' }],
        });
        if (k === 'shop') { App.go('shop', { tab: 'items' }); return; }
        if (k !== 'buy') return;
        if (Store.buyItem('pass1') === 'poor') { UI.toast('金币不足'); App.go('shop', { tab: 'topup' }); return; }
      } else {
        const ok = await UI.confirm({ title: '进入高级房？', text: `将消耗1张房卡，你当前有${Store.s.pass}张。`, ok: '使用房卡' });
        if (!ok) return;
      }
      Store.add('pass', -1, `房卡 · ${r.name}`);
    }
    Store.sit(id, 'me');
    const st = state(id);
    st.msgs.push({ type: 'sys', text: '你加入了房间' });
    App.go('room', { id });
  }

  function quickJoin() {
    const open = Store.s.rooms.filter((r) => !r.private && !r.mine && !r.premium && !r.seats.includes('me') && r.seats.length < r.max);
    const best = open.find((r) => r.seats.length === r.max - 1) || open[0];
    if (!best) { UI.toast('暂时没有空房间，自己开一个吧！'); return; }
    UI.toast(`正在加入${best.name}`);
    join(best.id);
  }

  /** 默认房间名：只有四子棋一款游戏 */
  const defName = () => `${Store.s.user.name}的${D.game[D.GAME].name}房间`;

  /** 和好友一起玩：建私密房间并邀请（gameId 可省略，默认四子棋） */
  function withFriend(uid, game = D.GAME) {
    const g = D.game[game] || D.game[D.GAME];
    const r = Store.createRoom({ name: defName(), game: g.id, max: 2, private: true, premium: false, lang: '中文' });
    const st = state(r.id);
    st.msgs.push({ type: 'sys', text: '房间已创建，快邀请好友入座吧。好友房不扣金币、不计段位。' });
    App.go('room', { id: r.id, invite: uid });
  }

  /* ================= J1 房间列表 ================= */
  function roomCard(r) {
    const full = r.seats.length >= r.max;
    const left = r.max - r.seats.length;
    const seats = [...Array(r.max).keys()].map((i) => (r.seats[i] ? UI.av(r.seats[i], 26, { frame: false }) : '<i class="seat-dot"></i>')).join('');
    return `<button class="rcard ${r.premium ? 'is-premium' : ''} ${r.mine ? 'is-mine' : ''}" data-act="join" data-id="${r.id}">
      <span class="rcard-host">${UI.av(r.host, 52, { frame: false })}</span>
      <span class="rcard-m">
        <b>${UI.esc(r.name)}</b>
        <span>${UI.ic('crown', 11)} ${r.host === 'me' ? '我' : nameOf(r.host)} · ${UI.ic('globe', 11)} ${r.lang}${r.private ? ` · ${UI.ic('lock', 11)} 私密` : ''}</span>
        <span class="rcard-seats">${seats}<i class="rcard-left">${full ? '人已满' : `还差${left}人`}</i></span>
      </span>
      <span class="rcard-r">
        ${r.premium ? `<span class="tag tag-event">${UI.ic('ticket', 11)} 高级房</span>` : '<span class="tag tag-new">免费</span>'}
        <b class="rcard-n ${full ? 'is-full' : r.seats.length === r.max - 1 ? 'is-almost' : ''}">${r.seats.length}/${r.max}</b>
        <span class="rcard-join ${full ? 'is-full' : ''}">${r.seats.includes('me') ? '进入' : full ? '已满' : '加入'}</span>
      </span>
    </button>`;
  }

  App.page('rooms', {
    render(el) {
      const list = Store.s.rooms.filter((r) => !r.private || r.mine || r.seats.includes('me'));
      const mine = list.filter((r) => r.mine || r.seats.includes('me'));
      const others = list.filter((r) => !mine.includes(r)).filter((r) => filter === '全部' || (filter === '免费' ? !r.premium : r.premium));
      const inRooms = Store.s.rooms.reduce((a, r) => a + r.seats.length, 0) * 37 + 1204;
      el.innerHTML = `
        <header class="tab-hd safe-top"><h1>房间</h1><div class="nav-right">
          <button class="icon-btn" data-act="search" aria-label="搜索房间">${UI.ic('search', 22)}</button>
          <button class="btn btn-primary btn-sm" data-go="create">${UI.ic('plus', 16)} 创建</button></div></header>
        <div class="body" data-scroll="main">
          <button class="qj" data-act="quick">
            <img class="qj-blobs" src="${IMG}brand/blobs-vs.png" alt="">
            <span class="qj-txt"><b>快速加入</b><span>一键进入只差1人的房间</span></span>
            <span class="btn btn-white btn-md">${UI.ic('zap', 16)} 出发</span>
          </button>
          ${mine.length ? `<div class="sec-hd"><h2>我的房间</h2></div><div class="rm-list">${mine.map(roomCard).join('')}</div>` : ''}
          <div class="sec-hd"><h2>公开房间</h2><span class="live">${UI.fmt(inRooms)}人在房间中</span></div>
          <div class="pills rm-filter">${['全部', '免费', '高级'].map((f) => `<button class="pill ${f === filter ? 'is-active' : ''}" data-act="filter" data-f="${f}">${f === '高级' ? `${UI.ic('ticket', 13)} ` : ''}${f}</button>`).join('')}
            <span class="rm-pass">${UI.cur('pass', 18)}×${UI.bind('pass')}</span></div>
          <div class="rm-list anim-in">${others.map(roomCard).join('') || UI.empty('这里还没有房间')}</div>
          <div class="bottom-space"></div>
        </div>
        ${UI.tabbar('rooms')}`;
    },
    back() { App.tab('play'); return false; },
    act: {
      quick: () => quickJoin(),
      join: (el) => join(el.dataset.id),
      filter: (el) => { filter = el.dataset.f; App.refresh('rooms'); },
      search: () => UI.toast('演示版暂不支持按房间号搜索，试试快速加入吧'),
    },
  });

  /* ================= J3 创建房间 ================= */
  let form = null;
  let formFor = null;
  App.page('create', {
    render(el, p) {
      if (formFor !== p) {
        formFor = p;
        form = { priv: false, premium: false, name: '' };
      }
      const g = D.game[D.GAME];
      el.innerHTML = `${UI.nav({ title: '创建房间', cls: 'is-white' })}
        <div class="body cr-body" data-scroll="main">
          <div class="cr-sec cr-row cr-mode"><img class="cr-mode-ic" src="${g.icon}" alt=""><div><b>${g.name}</b><span>${g.players}对战 · 约${g.dur}一局</span></div></div>
          <div class="cr-sec"><h3>房间名</h3><div class="field"><input class="cr-name" maxlength="28" placeholder="${UI.esc(defName())}" value="${UI.esc(form.name)}"></div></div>
          <div class="cr-sec"><h3>谁能加入</h3><div class="cr-privacy">
            <button class="${!form.priv ? 'is-active' : ''}" data-act="priv" data-v="0">${UI.ic('globe', 22)}<b>公开</b><span>所有人都能找到并加入</span></button>
            <button class="${form.priv ? 'is-active' : ''}" data-act="priv" data-v="1">${UI.ic('lock', 22)}<b>私密</b><span>仅限邀请</span></button></div></div>
          <div class="cr-sec cr-row"><div><b>${UI.ic('ticket', 16)} 高级房</b><span>消耗1张房卡 · 在列表中高亮显示</span></div>${UI.toggle(form.premium, 'premium')}</div>
          <p class="cr-note">${UI.ic('info', 14)}<span>好友房不扣金币、不计段位，只管和朋友玩。你有${UI.cur('pass', 14)}${Store.s.pass}张房卡。</span></p>
          <div class="bottom-space" style="height:90px"></div>
        </div>
        <div class="cr-foot"><button class="btn btn-primary btn-lg btn-block" data-act="create">创建房间</button></div>`;
    },
    act: {
      priv: (el) => { form.name = pageVal(); form.priv = el.dataset.v === '1'; App.refresh('create'); },
      premium: () => { form.name = pageVal(); form.premium = !form.premium; App.refresh('create'); },
      create: async () => {
        const name = pageVal().trim() || defName();
        if (form.premium) {
          if (Store.s.pass <= 0) {
            const k = await UI.dialog({ img: `${IMG}ui/pass.svg`, imgCls: 'is-small', title: '需要房卡', text: '创建高级房需消耗1张房卡。', buttons: [{ label: `买1张房卡 · ${UI.cur('coins', 16)} 200`, key: 'buy', cls: 'btn-orange' }, { label: '改建免费房', key: 'free', cls: 'btn-ghost' }] });
            if (k === 'buy') {
              if (Store.buyItem('pass1') === 'poor') { UI.toast('金币不足'); return; }
            } else if (k === 'free') { form.premium = false; } else return;
          }
          if (form.premium) Store.add('pass', -1, `房卡 · ${name}`);
        }
        const r = Store.createRoom({ name, game: D.GAME, max: 2, private: form.priv, premium: form.premium, lang: '中文' });
        state(r.id).msgs.push({ type: 'sys', text: form.priv ? '私密房间已创建，快邀请好友加入吧。' : '房间已创建，其他玩家可以在列表中找到。' });
        App.replace('room', { id: r.id }, { anim: 'push' });
        UI.toast('房间已创建');
      },
    },
  });
  const pageVal = () => document.querySelector('.page[data-page="create"] .cr-name')?.value || '';

  /* ================= J4 房间内 ================= */
  const PHRASES = ['大家好 👋', '准备好了吗？', '冲冲冲！', '再来一局？', 'GG 🤝'];
  const HELLO = ['嗨！👋', '开整！', '我随时可以', '哈喽哈喽', '大家加油 🍀'];

  function seatsHtml(r, st) {
    let html = '';
    for (let i = 0; i < r.max; i += 1) {
      const uid = r.seats[i];
      if (!uid) {
        html += `<button class="seat is-empty" data-act="invite"><span class="seat-plus">${UI.ic('plus', 22)}</span><b>邀请</b><span class="seat-st">空座位</span></button>`;
        continue;
      }
      const ready = !!st.ready[uid];
      html += `<div class="seat ${ready ? 'is-ready' : ''} ${uid === 'me' ? 'is-me' : ''}">
        ${r.host === uid ? `<i class="seat-host">${UI.ic('crown', 11)} 房主</i>` : ''}
        ${UI.av(uid, 58)}<b>${nameOf(uid)}</b>
        <span class="seat-st">${ready ? `${UI.ic('check', 12)} 已准备` : '未准备'}</span>
      </div>`;
    }
    return `<div class="seats n${r.max}">${html}</div>`;
  }
  function statusText(r, st) {
    if (st.cd) return `<b><em class="rm-cd-n">${st.n}</em>秒后开局…</b>`;
    const full = r.seats.length >= r.max;
    if (!full) return `<b>等待玩家 · ${r.seats.length}/${r.max}</b><span>${r.private ? '邀请好友来坐满吧' : '玩家陆续加入中…也可以邀请好友'}</span>`;
    if (!st.ready.me) return '<b>人齐了！</b><span>点击准备即可开局</span>';
    return '<b>等待所有人准备</b>';
  }
  function msgsHtml(st) {
    return st.msgs.map((m) => (m.type === 'sys'
      ? `<p class="rm-sys">${UI.esc(m.text)}</p>`
      : `<div class="rm-msg ${m.uid === 'me' ? 'is-me' : ''}">${UI.av(m.uid, 26, { frame: false })}<span class="rm-bub ${m.uid === 'me' ? UI.bubble(Store.s.equip.bubble) : ''}">${m.uid === 'me' ? '' : `<i>${nameOf(m.uid)}</i>`}${UI.esc(m.text)}</span></div>`)).join('');
  }
  function footHtml(r, st) {
    if (st.cd) return '<button class="btn btn-ghost btn-lg btn-block" data-act="ready">取消</button>';
    return st.ready.me
      ? '<button class="btn btn-ghost btn-lg btn-block" data-act="ready">取消准备</button>'
      : '<button class="btn btn-orange btn-lg btn-block" data-act="ready">准备</button>';
  }

  /** 局部刷新，不打断输入框和聊天滚动 */
  function paint(r) {
    const el = pageEl();
    if (!el || curRoom() !== r.id) return;
    const st = state(r.id);
    el.querySelector('.rm-seats-box').innerHTML = seatsHtml(r, st);
    el.querySelector('.rm-status').innerHTML = statusText(r, st);
    el.querySelector('.rm-foot').innerHTML = footHtml(r, st);
    el.querySelector('.rm-count').textContent = `${r.seats.length}/${r.max}`;
    const box = el.querySelector('.rm-msgs');
    box.innerHTML = msgsHtml(st);
    box.scrollTop = box.scrollHeight;
  }
  function say(r, uid, text) {
    state(r.id).msgs.push({ type: 'msg', uid, text });
    paint(r);
  }
  function sys(r, text) {
    state(r.id).msgs.push({ type: 'sys', text });
    paint(r);
  }

  /** 有人入座：打招呼，稍后准备 */
  function seat(r, uid, how = '加入了') {
    if (r.seats.includes(uid) || r.seats.length >= r.max) return;
    Store.sit(r.id, uid);
    const st = state(r.id);
    st.msgs.push({ type: 'sys', text: `${nameOf(uid)}${how}房间` });
    paint(r);
    if (curRoom() !== r.id) {
      UI.notify({ img: D.people[uid].avatar, title: `${nameOf(uid)}加入了你的房间`, text: `${UI.esc(r.name)} · ${r.seats.length}/${r.max}`, btn: '进入', onTap: () => App.go('room', { id: r.id }) });
    }
    st.timers.push(setTimeout(() => say(r, uid, UI.pick(HELLO)), 1100));
    st.timers.push(setTimeout(() => { st.ready[uid] = true; paint(r); check(r); }, 1900 + Math.random() * 900));
  }

  /** 公开房间：陌生人陆续加入 */
  function simulate(r) {
    const st = state(r.id);
    const pool = Object.keys(D.people).filter((id) => !['stella', 'bot'].includes(id) && !Store.isFriend(id));
    const step = () => {
      if (!Store.room(r.id) || r.seats.length >= r.max) return;
      if (curRoom() !== r.id) { st.timers.push(setTimeout(step, 3000)); return; }
      const cand = pool.filter((id) => !r.seats.includes(id));
      seat(r, UI.pick(cand));
      st.timers.push(setTimeout(step, 4500 + Math.random() * 3000));
    };
    st.timers.push(setTimeout(step, 3500 + Math.random() * 2000));
  }

  /** 人满且都准备好 → 3 秒倒计时开局 */
  function check(r) {
    const st = state(r.id);
    const full = r.seats.length >= r.max;
    const all = full && r.seats.every((u) => st.ready[u]);
    if (!all || st.cd) return;
    st.n = 3;
    Sfx.play('tick');
    st.cd = setInterval(() => {
      st.n -= 1;
      if (st.n > 0) { Sfx.play('tick'); paint(r); return; }
      clearInterval(st.cd);
      st.cd = 0;
      // 好友房不扣金币、不计段位，直接开局
      st.ready.me = false;
      paint(r);
      const opp = UI.pick(r.seats.filter((u) => u !== 'me'));
      Battle.fromRoom(r, opp);
    }, 1000);
    paint(r);
  }

  async function invite(r, uid) {
    if (!uid) {
      uid = await UI.pickFriend({ title: '邀请好友', sub: '在线好友可以马上加入', onlineOnly: true, exclude: r.seats });
      if (!uid) return;
    }
    if (r.seats.length >= r.max) { UI.toast('房间已满'); return; }
    Store.count('invites');
    sys(r, `你邀请了${nameOf(uid)}`);
    UI.toast(`已向${nameOf(uid)}发送邀请`);
    state(r.id).timers.push(setTimeout(() => seat(r, uid), 2400));
  }

  async function leave(r) {
    const ok = await UI.confirm({ title: '离开房间？', text: r.mine ? '你离开后房间会解散，所有人都会退出。' : '只要还有空位，随时可以回来。', ok: '离开', cancel: '留下' });
    if (!ok) return;
    stopSim(r.id);
    delete rt[r.id];
    Store.leaveRoom(r.id);
    App.pop();
  }

  App.page('room', {
    render(el, p) {
      const r = Store.room(p.id);
      if (!r) { el.innerHTML = `${UI.nav({ title: '房间' })}${UI.empty('房间已关闭')}`; return; }
      const g = D.game[r.game] || D.game[D.GAME];
      const st = state(r.id);
      r.seats.forEach((u) => { if (u !== 'me' && st.ready[u] === undefined) st.ready[u] = true; });
      el.innerHTML = `
        <div class="rm-bg"><img src="${g.cover || g.icon}" alt=""></div>
        ${UI.nav({ title: UI.esc(r.name), sub: `房间号 ${String(parseInt(r.id.replace(/\D/g, '') || '4829', 10) % 900000 + 100000)} · ${r.private ? '私密' : '公开'} · ${r.lang}`, cls: 'is-light', right: `<button class="icon-btn" data-act="invite" aria-label="邀请">${UI.ic('userPlus', 21)}</button><button class="icon-btn" data-act="shareRoom" aria-label="分享">${UI.ic('share', 20)}</button>` })}
        <div class="rm-game">
          <img src="${g.icon}" alt="">
          <div class="row-main"><b>${g.name}</b><span>${g.players} · 不扣金币 · 不计段位${r.premium ? ` · ${UI.ic('ticket', 11)} 高级房` : ''}</span></div>
          <span class="rm-count">${r.seats.length}/${r.max}</span>
        </div>
        <div class="rm-seats-box">${seatsHtml(r, st)}</div>
        <div class="rm-status">${statusText(r, st)}</div>
        <div class="rm-chat">
          <div class="rm-msgs" data-scroll="chat">${msgsHtml(st)}</div>
          <div class="hscroll rm-phrases">${PHRASES.map((t) => `<button class="rm-ph" data-act="phrase" data-t="${UI.esc(t)}">${UI.esc(t)}</button>`).join('')}</div>
          <form class="rm-input" onsubmit="return false"><input class="rm-in" maxlength="60" placeholder="说点什么…" enterkeyhint="send"><button type="button" class="rm-send" data-act="send" aria-label="发送">${UI.ic('send', 18)}</button></form>
        </div>
        <div class="rm-foot">${footHtml(r, st)}</div>`;
      const box = el.querySelector('.rm-msgs');
      requestAnimationFrame(() => { box.scrollTop = box.scrollHeight; });
      const input = el.querySelector('.rm-in');
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); el.querySelector('.rm-send').click(); } });
    },
    shown(el, p) {
      const r = Store.room(p.id);
      if (!r) return;
      const st = state(r.id);
      if (!st.started) {
        st.started = true;
        if (!r.private) simulate(r);
        (r.auto || (r.id === 'squad' ? ['mia'] : [])).forEach((u, i) => st.timers.push(setTimeout(() => seat(r, u), 5000 + i * 2500)));
      }
      if (p.invite) {
        const uid = p.invite;
        p.invite = '';
        invite(r, uid);
      }
    },
    back() {
      const r = Store.room(App.params('room').id);
      if (!r) { App.pop(); return false; }
      leave(r);
      return false;
    },
    act: {
      ready: () => {
        const r = Store.room(App.params('room').id);
        const st = state(r.id);
        if (st.cd) { clearInterval(st.cd); st.cd = 0; st.ready.me = false; sys(r, '已取消倒计时'); return; }
        st.ready.me = !st.ready.me;
        Sfx.play('tap');
        paint(r);
        check(r);
      },
      invite: () => invite(Store.room(App.params('room').id)),
      phrase: (el) => {
        const r = Store.room(App.params('room').id);
        say(r, 'me', el.dataset.t);
        reply(r);
      },
      send: () => {
        const el = pageEl();
        const input = el.querySelector('.rm-in');
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        const r = Store.room(App.params('room').id);
        say(r, 'me', text);
        reply(r);
      },
      shareRoom: () => {
        const r = Store.room(App.params('room').id);
        UI.share({ title: '邀请进房', text: `快来 Soulgame，加入我的房间「${r.name}」！`, game: r.game });
      },
    },
  });
  function reply(r) {
    const others = r.seats.filter((u) => u !== 'me');
    if (!others.length) return;
    state(r.id).timers.push(setTimeout(() => say(r, UI.pick(others), UI.pick(['😂', '好嘞！', '+1', '冲冲冲', '准备好了！', 'GG'])), 1400 + Math.random() * 1200));
  }

  window.Rooms = { join, withFriend, quickJoin };
})();
