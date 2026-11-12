/**
 * H 排行榜（只有四子棋）：H1 好友榜 / 全服榜、H2 赛季奖励、H3 我的位置与差距、H4 名次变化、H5 分享海报
 * 分数 = 段位 × 100 + 段内分；我的分数随对局实时变化，排名跟着变
 * 旧调用传入的 game 参数会被忽略，一律按 D.GAME 计算
 */
(() => {
  'use strict';

  const IMG = D.IMG;
  const BASE_GLOBAL = 1284; // 初始全服名次
  let scope = 'friends';

  /* ---------- 榜单数据 ---------- */
  const seed = (str) => {
    let h = 2166136261;
    for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return (h >>> 0) / 4294967296;
  };
  const G = D.GAME;
  /** 好友榜：固定分数的好友用 D.boardFriends，新加的好友按 id 生成稳定分数 */
  function friends() {
    const fixed = Object.fromEntries(D.boardFriends.map((x) => [x.id, x]));
    const list = Store.s.friends.map((id) => fixed[id] || { id, score: Math.round(40 + seed(G + id) * 230), move: Math.round(seed(id + G) * 6) - 3 });
    list.push({ id: 'me', score: Store.score(G), move: 0, me: true });
    return list.sort((a, b) => b.score - a.score || (a.me ? -1 : 1));
  }
  const global = () => D.boardGlobal.map((x) => ({ ...x }));
  const myGlobalPos = () => Math.max(16, Math.round(BASE_GLOBAL - (Store.score(G) - 160) * 6));
  /** 好友榜里我的名次和上一名 */
  function friendPos() {
    const list = friends();
    const i = list.findIndex((x) => x.me);
    const ahead = i > 0 ? list[i - 1] : null;
    const gap = ahead ? ahead.score - list[i].score : 0;
    return { pos: i + 1, total: list.length, ahead: ahead ? { id: ahead.id, gap, wins: Math.max(1, Math.ceil((gap + 1) / 25)) } : null };
  }

  const tierOf = (score) => Math.min(4, Math.floor(score / 100));
  const moveHtml = (m) => (m > 0 ? `<span class="rk-move is-up">▲${m}</span>` : m < 0 ? `<span class="rk-move is-down">▼${-m}</span>` : '<span class="rk-move">–</span>');
  const nameOf = (id) => (id === 'me' ? '我' : D.people[id].name);

  /** 排行预览卡片：前三 + 我 */
  function preview() {
    const list = friends();
    const top = list.slice(0, 3);
    const fp = friendPos();
    const me = list[fp.pos - 1];
    const rows = [...top];
    if (fp.pos > 3) rows.push(me);
    return `<div class="rk-mini">${rows.map((x) => {
      const pos = list.indexOf(x) + 1;
      return `<div class="rk-mini-row ${x.me ? 'is-me' : ''}"><span class="rk-no n${pos}">${pos}</span>${UI.av(x.id, 34)}<b>${nameOf(x.id)}</b>${UI.tier(tierOf(x.score), 22)}<em>${x.score}</em></div>`;
    }).join('')}
      ${fp.ahead ? `<p class="rk-mini-tip">${UI.ic('flame', 14)} 再赢<b>${fp.ahead.wins}</b>局就能超过${nameOf(fp.ahead.id)}</p>` : `<p class="rk-mini-tip">${UI.ic('crown', 14)} 你是好友中的第一！</p>`}
    </div>`;
  }

  /* ---------- H5 分享海报 ---------- */
  function poster() {
    const g = D.game[G];
    const fp = friendPos();
    const r = Store.rank(G);
    const c = UI.sheet({
      title: '分享海报',
      sub: '晒晒你本赛季的排名',
      html: `<div class="poster" style="background:${UI.bg(Store.s.equip.bg)}">
          <div class="poster-in">
            <div class="poster-top"><img src="${IMG}brand/app-icon.png" alt=""><span>Soulgame<br><small>${D.season.name}</small></span></div>
            <div class="poster-av">${UI.av('me', 86)}</div>
            <b class="poster-name">${UI.esc(Store.s.user.name)}</b>
            <div class="poster-rank"><em>#${scope === 'friends' ? fp.pos : UI.fmt(myGlobalPos())}</em><span>${g.name}<br>${scope === 'friends' ? '好友排名' : '全服排名'}</span></div>
            <div class="poster-tier">${UI.tier(r.tier, 30)}${D.tiers[r.tier]} · ${r.pts}/100</div>
            <div class="poster-foot">${UI.qr(`pz-${Store.s.user.uid}-${G}`, 64)}<span><b>扫码和我一起玩</b>ID ${Store.s.user.uid}</span></div>
          </div>
        </div>
        <div class="poster-btns">
          <button class="btn btn-ghost btn-lg" data-act="save">${UI.ic('download', 18)} 保存图片</button>
          <button class="btn btn-primary btn-lg" data-act="share">${UI.ic('share', 18)} 分享</button>
        </div>`,
      acts: {
        save: () => { c.close(); UI.toast('海报已保存到相册'); },
        share: () => {
          c.close();
          const pos = scope === 'friends' ? fp.pos : myGlobalPos();
          const place = scope === 'friends' ? '好友中' : '全服';
          UI.share({ title: '分享海报', text: `我在 Soulgame 四子棋${place}排第${pos}名，来挑战我吧！`, game: G });
        },
      },
    });
  }

  function seasonSheet() {
    const best = Store.rank(G).tier;
    UI.sheet({
      title: D.season.name,
      sub: `${D.season.left}后结束 · 赛季结束时发放奖励`,
      html: `<div class="ss-list">${D.season.rewards.map((x) => `<div class="ss-row ${x.tier <= best ? 'is-got' : ''}">
          ${UI.tier(x.tier, 40)}<div class="row-main"><b>${D.tiers[x.tier]}</b><span>${x.text}</span></div>
          ${x.tier <= best ? `<span class="tag tag-new">${UI.ic('check', 11)} 已达成</span>` : `<span class="tag tag-gray">${x.tier * 100}分</span>`}
        </div>`).join('')}</div>
        <p class="ss-note">${UI.ic('info', 14)} 按你的四子棋段位计算。达到黄金即可立刻解锁赛季头像框。</p>`,
    });
  }

  App.page('rank', {
    render(el) {
      const list = scope === 'friends' ? friends() : global();
      const fp = friendPos();
      const myScore = Store.score(G);
      const myPos = scope === 'friends' ? fp.pos : myGlobalPos();
      const top = list.slice(0, 3);
      const rest = list.slice(3);
      const podium = [top[1], top[0], top[2]].map((x, i) => (x ? `<div class="rk-pod p${[2, 1, 3][i]} ${x.me ? 'is-me' : ''}">
          ${[2, 1, 3][i] === 1 ? `<img class="rk-crown" src="${IMG}ui/crown.png" alt="">` : ''}
          ${UI.av(x.id, [2, 1, 3][i] === 1 ? 72 : 60)}
          <b>${nameOf(x.id)}</b><span>${x.score}</span><i class="rk-place">${[2, 1, 3][i]}</i>
        </div>` : '<div class="rk-pod is-empty"></div>')).join('');
      const gapText = scope === 'friends'
        ? (fp.ahead ? `再赢<b>${fp.ahead.wins}</b>局超过${nameOf(fp.ahead.id)}（差${fp.ahead.gap}分）` : '你是好友中的第一！')
        : `再赢<b>1</b>局，排名约上升150位`;
      el.innerHTML = `
        <div class="rk-hero">
          ${UI.nav({ title: '四子棋排行榜', cls: 'is-light', right: `<button class="icon-btn" data-act="poster" aria-label="分享海报">${UI.ic('share', 21)}</button>` })}
          <button class="rk-season" data-act="season">
            <img src="${IMG}ui/trophy.png" alt="">
            <span><b>${D.season.name}</b><em>${UI.ic('clock', 12)} ${D.season.left}后结束</em></span>
            <span class="rk-season-r">奖励 ${UI.ic('right', 14)}</span>
          </button>
          <div class="rk-scope">
            <button class="${scope === 'friends' ? 'is-active' : ''}" data-act="scope" data-s="friends">好友榜</button>
            <button class="${scope === 'global' ? 'is-active' : ''}" data-act="scope" data-s="global">全服榜</button>
          </div>
          <div class="rk-podium">${podium}<img class="rk-podium-base" src="${IMG}ui/podium.png" alt=""></div>
        </div>
        <div class="body rk-body" data-scroll="main">
          <div class="rk-list">${rest.map((x, i) => `<div class="rk-row ${x.me ? 'is-me' : ''}" ${x.me ? '' : `data-go="profile" data-uid="${x.id}"`}>
              <span class="rk-no">${i + 4}</span>${UI.av(x.id, 40)}
              <div class="row-main"><b>${nameOf(x.id)}</b><span>${UI.tier(tierOf(x.score), 16)} ${D.tiers[tierOf(x.score)]}</span></div>
              <em class="rk-score">${x.score}</em>${moveHtml(x.me ? 0 : x.move)}
            </div>`).join('')}
            ${scope === 'global' ? '<p class="rk-more">显示前15名 · 每10分钟更新</p>' : ''}
          </div>
          <div class="bottom-space" style="height:120px"></div>
        </div>
        <div class="rk-me">
          <span class="rk-no">#${UI.fmt(myPos)}</span>${UI.av('me', 42)}
          <div class="row-main"><b>我 · ${myScore}分</b><span>${gapText}</span></div>
          <button class="btn btn-orange btn-sm" data-act="play">开玩</button>
        </div>`;
    },
    act: {
      scope: (el) => { scope = el.dataset.s; App.refresh('rank'); },
      season: () => seasonSheet(),
      poster: () => poster(),
      // 按上次选的金币场开始匹配
      play: () => Battle.quick(),
    },
  });

  window.Rank = { friendPos, preview, friends, myGlobalPos };
})();
