/**
 * B1 Game Center 首页：只做互动游戏板块，其他内容和底部 Tab 点了提示「演示不包含」
 */
(() => {
  'use strict';

  const IMG = D.IMG;
  const g = (id) => D.game[id];

  // 现有设计里的分类标签，映射到频道里的游戏分类
  const CHIPS = [
    ['Football games', 'Sports'], ['Match-3 Game', 'Puzzle'], ['Fencing game', 'Action'], ['Poker game', 'Cards'],
    ['Competitive game', 'Action'], ['Battle game', 'Action'], ['Puzzle game', 'Puzzle'], ['Parkour game', 'Racing'],
  ];
  const BANNERS = [
    { img: `${IMG}gc/dust.jpg`, name: 'Dust Settle', rate: '4.3' },
    { img: `${IMG}games/beat-cover.jpg`, name: "Damn it's bollig amazing", rate: '4.3' },
    { img: `${IMG}games/wave-cover.jpg`, name: 'Song Pop Islands', rate: '4.5' },
  ];
  const GRID = [
    ['hexworm', 'danger dash'], ['bloop', 'bloop islands'], ['blade', 'blade hero'], ['gem-grab', 'gem grabber'],
    ['rage', 'rage brawl'], ['dragon', 'top hips', 'png'], ['sweet', 'sweet crunch'], ['raccoon', 'raccoon run'],
  ];

  const tabIcon = {
    home: '<path class="ic-a" d="M8.8 3.2a3.4 3.4 0 0 1 4.3 0l6 4.8a4.4 4.4 0 0 1 1.7 3.4v8.3a3.4 3.4 0 0 1-3.4 3.4H4.6a3.4 3.4 0 0 1-3.4-3.4v-8.3A4.4 4.4 0 0 1 2.8 8z" transform="translate(1 0)"/><path class="ic-b" d="M16 14.3s-1.2 2.3-4 2.3-4-2.3-4-2.3"/>',
    category: '<rect class="ic-a" x="3" y="3" width="7.5" height="7.5" rx="2"/><rect class="ic-a" x="13.5" y="3" width="7.5" height="7.5" rx="3.75"/><rect class="ic-b" x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect class="ic-a" x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
    ranking: '<circle class="ic-a" cx="12" cy="14" r="7"/><circle class="ic-b" cx="12" cy="14" r="2.6"/><path class="ic-b" d="M9 3.5l1.6 3M15 3.5l-1.6 3"/>',
    accel: '<path class="ic-a" d="M10.9 2.4a1.9 1.9 0 0 1 2.2 0l1.9 1.3c2.2 1.5 3.4 3.8 3.4 6.2v7.2c0 1.7-1.4 3-3 3H8.6c-1.7 0-3-1.3-3-3V9.9c0-2.4 1.2-4.7 3.4-6.2z"/><path class="ic-b" d="M10 10h4M14 21.5s-.7 1-2 1-2-1-2-1"/>',
  };

  App.page('gc', {
    render(el) {
      el.innerHTML = `
        <header class="gc-top safe-top">
          <button class="gc-search" data-act="demo">${UI.ic('search', 18)}<span>Pirate Pop</span></button>
          <div class="seg gc-seg"><button class="seg-it is-active">Recommend</button><button class="seg-it" data-act="demo">Category</button></div>
        </header>
        <div class="body" data-scroll="main">
          <div class="sec-hd"><h2>Popular</h2><button class="more" data-act="demo">${UI.ic('right', 20)}</button></div>
          <div class="hscroll gc-banners">${BANNERS.map((b) => `
            <button class="gc-banner" data-act="demo"><span class="gc-banner-img"><img src="${b.img}" alt=""><i class="gc-rate">★ ${b.rate}</i></span><b>${b.name}</b></button>`).join('')}
          </div>

          <section class="gc-play">
            <div class="gc-play-hd">
              <img class="gc-play-logo" src="${IMG}brand/app-icon.png" alt="">
              <div class="gc-play-title"><h2>Play with Friends</h2><span class="live">${UI.fmt(D.games.reduce((a, x) => a + x.online, 0))} playing now</span></div>
              <button class="more" data-act="enter">More ${UI.ic('right', 16)}</button>
            </div>
            <button class="gc-hero" data-act="enter">
              <img class="gc-hero-burst" src="${IMG}fx/speedlines.png" alt="">
              <img class="gc-hero-blobs" src="${IMG}brand/blobs-vs.png" alt="">
              <span class="gc-hero-txt"><b>Real-time matches</b><span>Battle friends &amp; players worldwide.<br>Win Gems, climb the ranks.</span></span>
              <span class="gc-cost">${UI.cur('gems', 14)}${D.COST} / game</span>
              <span class="btn btn-white btn-md gc-hero-play">PLAY</span>
            </button>
            <div class="gc-top3">${['c4', 'clash', 'strike'].map((id, i) => `
              <button class="gc-top-card" data-act="enter" data-game="${id}">
                <span class="gc-top-rank r${i + 1}">TOP ${i + 1}</span>
                <span class="gc-top-img"><img src="${g(id).icon}" alt=""><i class="gc-online">${UI.fmt(g(id).online)}</i></span>
                <b>${g(id).name}</b>
                <span class="gc-top-cost">${UI.cur('gems', 13)}${D.COST}</span>
                <span class="btn btn-primary btn-sm gc-top-play">PLAY</span>
              </button>`).join('')}
            </div>
            <div class="hscroll gc-chips">${CHIPS.map(([label, cat]) => `<button class="gc-chip" data-act="enter" data-cat="${cat}">${label}</button>`).join('')}</div>
          </section>

          <div class="sec-hd"><h2>Popular</h2><button class="more" data-act="demo">${UI.ic('right', 20)}</button></div>
          <div class="gc-grid">${GRID.map(([img, name, ext]) => `
            <button class="gc-app" data-act="demo"><span><img src="${IMG}gc/${img}.${ext || 'jpg'}" alt=""><i>${UI.cur('gems', 11)}200</i></span><b>${name}</b></button>`).join('')}
          </div>
          <div class="bottom-space"></div>
        </div>
        <nav class="tabbar gc-tabbar">
          ${[['home', 'Home'], ['category', 'Category'], ['ranking', 'Ranking'], ['accel', 'Accelerator']].map(([id, label], i) => `
            <button class="tab ${i === 0 ? 'is-active' : ''}" ${i ? 'data-act="demo"' : ''}><span class="tab-ic"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${tabIcon[id]}</svg></span><span class="tab-label">${label}</span></button>`).join('')}
        </nav>`;
    },
    shown() {
      // 第一次打开时提示入口在哪里
      if (!Store.s.welcome) {
        setTimeout(() => {
          if (App.top() === 'gc') UI.coach(document.querySelector('.gc-hero'), 'New! Play real-time games with friends right here in Game Center.', { key: 'gc-entry', place: 'top' });
        }, 500);
      }
    },
    act: {
      demo: () => UI.demo(),
      enter: (el) => Channel.enter({ game: el.dataset.game, cat: el.dataset.cat }),
    },
  });
})();
