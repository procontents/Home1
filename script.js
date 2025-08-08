(function () {
  const postsListElement = document.getElementById('postsList');
  const searchInputElement = document.getElementById('searchInput');
  const emptyStateElement = document.getElementById('emptyState');
  const yearSpan = document.getElementById('year');

  if (yearSpan) {
    yearSpan.textContent = String(new Date().getFullYear());
  }

  const placeholderThumb = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44"><rect width="44" height="44" rx="10" fill="%23111827"/><path d="M12 22h20" stroke="%239ca3af" stroke-width="2"/><path d="M22 12v20" stroke="%239ca3af" stroke-width="2"/></svg>';

  function normalizeString(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const iabBanner = document.getElementById('iabBanner');
  const iabOpenBtn = document.getElementById('iabOpenBtn');
  const iabCopyBtn = document.getElementById('iabCopyBtn');
  const iabCloseBtn = document.getElementById('iabCloseBtn');

  function isInAppBrowser() {
    const ua = (navigator.userAgent || navigator.vendor || '').toLowerCase();
    const patterns = ['instagram', 'fb_iab', 'fbav', 'fban', 'line', 'twitter', 'pinterest', 'tiktok', 'snapchat'];
    return patterns.some((p) => ua.includes(p));
  }

  function isAndroid() { return /android/i.test(navigator.userAgent || ''); }
  function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent || ''); }

  function buildAndroidIntentUrl() {
    const scheme = location.protocol.replace(':', '');
    const hostAndPath = location.host + location.pathname + location.search;
    return `intent://${hostAndPath}#Intent;scheme=${scheme};package=com.android.chrome;end`;
  }

  function showIabBannerIfNeeded() {
    try {
      if (!iabBanner) return;
      const dismissed = localStorage.getItem('iab:dismissed') === '1';
      if (!dismissed && isInAppBrowser()) iabBanner.hidden = false;
      else iabBanner.hidden = true;
    } catch (_) {}
  }

  iabOpenBtn?.addEventListener('click', (e) => {
    const ua = (navigator.userAgent || '').toLowerCase();
    const isAndroid = /android/.test(ua);
    if (isAndroid && isInAppBrowser()) {
      e.preventDefault();
      window.location.href = buildAndroidIntentUrl();
      setTimeout(() => { try { window.open(location.href, '_blank'); } catch (_) {} }, 400);
    } else {
      iabOpenBtn.setAttribute('href', location.href);
      iabOpenBtn.setAttribute('target', '_blank');
    }
  });

  iabCopyBtn?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(location.href); iabCopyBtn.textContent = 'Copied!'; }
    catch (_) { iabCopyBtn.textContent = 'Copy failed'; }
    setTimeout(() => (iabCopyBtn.textContent = 'Copy link'), 1200);
  });

  iabCloseBtn?.addEventListener('click', () => {
    try { localStorage.setItem('iab:dismissed', '1'); } catch (_) {}
    if (iabBanner) iabBanner.hidden = true;
  });

  showIabBannerIfNeeded();

  async function tryFetchText(url) {
    try { const r = await fetch(url, { cache: 'no-store' }); if (!r.ok) return null; return await r.text(); }
    catch { return null; }
  }

  function normalizeKey(rawKey) {
    const key = String(rawKey || '').trim().toLowerCase();
    if (key === 'post.no' || key === 'postno' || key === 'no' || key === 'post') return 'id';
    if (key === 'title' || key === 'name') return 'title';
    if (key === 'link' || key === 'url') return 'url';
    if (key === 'img' || key === 'image' || key === 'thumbnail' || key === 'thumb') return 'thumbnail';
    return key;
  }

  function parseLinksTxt(text) {
    if (!text) return [];
    const lines = text.split(/\r?\n/);
    const posts = [];
    const tokenRegex = /(\w+(?:\.\w+)?)\s*:\s*(.*?)(?=\s+\w+(?:\.\w+)?\s*:|$)/g;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const post = {};
      let match;
      while ((match = tokenRegex.exec(line)) !== null) {
        const key = normalizeKey(match[1]);
        const value = (match[2] || '').trim();
        post[key] = value;
      }
      if (post.id != null) {
        const maybe = Number(String(post.id).replace(/[^0-9.-]/g, ''));
        if (!Number.isNaN(maybe)) post.id = maybe;
      }
      if (post.title || post.url) posts.push(post);
    }
    return posts;
  }

  async function fetchPosts() {
    const linksText = await tryFetchText('links.txt');
    if (!linksText) return [];
    return parseLinksTxt(linksText);
  }

  function getClickCount(postId) {
    const key = `clicks:${postId}`;
    const value = localStorage.getItem(key);
    return value ? Number(value) : 0;
  }

  function incrementClickCount(postId) {
    const key = `clicks:${postId}`;
    const current = getClickCount(postId);
    const next = current + 1;
    localStorage.setItem(key, String(next));
    return next;
  }

  function providerIconForUrl(url) {
    const href = String(url || '').toLowerCase();
    if (href.startsWith('mailto:')) {
      return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%23e5e7eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z"/><path d="m22 6-10 7L2 6"/></svg>';
    }
    if (href.includes('instagram')) return 'images/insta.svg';
    if (href.includes('youtube') || href.includes('youtu.be')) return 'images/youtube.svg';
    return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%23e5e7eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M2 12h20"/></svg>';
  }

  function createPostItem(post, index) {
    const listItem = document.createElement('li');
    listItem.className = 'post-item';

    const rank = document.createElement('div');
    rank.className = 'post-rank';
    const displayedRank = post.id != null && !Number.isNaN(Number(post.id)) ? Number(post.id) : index + 1;

    const providerIcon = document.createElement('img');
    providerIcon.className = 'rank-icon';
    providerIcon.alt = 'provider';
    providerIcon.src = providerIconForUrl(post.url);

    const rankCount = document.createElement('span');
    rankCount.className = 'rank-count';
    rankCount.textContent = String(displayedRank);

    rank.appendChild(providerIcon);
    rank.appendChild(rankCount);

    const thumb = document.createElement('img');
    thumb.className = 'post-thumb';
    thumb.alt = post.title || 'thumbnail';
    thumb.src = post.thumbnail || placeholderThumb;

    const content = document.createElement('div');
    content.className = 'post-content';

    const title = document.createElement('h3');
    title.className = 'post-title';
    title.textContent = post.title || 'Untitled';

    const url = document.createElement('div');
    url.className = 'post-url';
    url.textContent = post.url || '';

    const clicks = document.createElement('div');
    clicks.className = 'post-url';
    const postKey = post.id ?? post.title ?? index;
    clicks.textContent = `${getClickCount(postKey)} clicks`;

    const openLink = document.createElement('a');
    openLink.href = post.url || '#';
    openLink.target = '_blank';
    openLink.rel = 'noopener';
    openLink.className = 'post-open';
    openLink.textContent = 'Open';
    openLink.addEventListener('click', () => {
      const updated = incrementClickCount(postKey);
      clicks.textContent = `${updated} clicks`;
    });

    content.appendChild(title);
    content.appendChild(url);
    content.appendChild(clicks);

    listItem.appendChild(rank);
    listItem.appendChild(thumb);
    listItem.appendChild(content);
    listItem.appendChild(openLink);

    return listItem;
  }

  function renderPosts(posts, query) {
    postsListElement.innerHTML = '';
    const normalizedQuery = normalizeString(query || '');

    const withIds = posts.map((p, i) => ({
      ...p,
      id: p.id != null && !Number.isNaN(Number(p.id)) ? Number(p.id) : i + 1,
    }));

    const sorted = withIds.slice().sort((a, b) => Number(b.id || 0) - Number(a.id || 0));

    const filtered = !normalizedQuery
      ? sorted
      : sorted.filter((p, i) => {
          const idString = String(p.id != null ? p.id : i + 1);
          return (
            normalizeString(p.title).includes(normalizedQuery) ||
            normalizeString(p.url).includes(normalizedQuery) ||
            normalizeString(idString).includes(normalizedQuery)
          );
        });

    if (filtered.length === 0) {
      emptyStateElement.hidden = false;
    } else {
      emptyStateElement.hidden = true;
      filtered.forEach((post, i) => {
        const listItem = createPostItem(post, i);
        postsListElement.appendChild(listItem);
      });
    }
  }

  function hashPosts(posts) {
    try {
      const s = JSON.stringify(posts, Object.keys(posts[0] || {}).sort());
      let h = 5381, i = s.length;
      while (i) h = (h * 33) ^ s.charCodeAt(--i);
      return (h >>> 0).toString(36);
    } catch { return String(Date.now()); }
  }

  let allPosts = [];
  let lastHash = '';

  async function loadAndRenderIfChanged() {
    const posts = await fetchPosts();
    const currentHash = hashPosts(posts);
    if (currentHash !== lastHash) {
      allPosts = posts;
      renderPosts(allPosts, searchInputElement?.value || '');
      lastHash = currentHash;
    }
  }

  loadAndRenderIfChanged();
  setInterval(loadAndRenderIfChanged, 3000);

  function handleSearch() {
    renderPosts(allPosts, searchInputElement?.value || '');
  }

  if (searchInputElement) {
    ['input', 'keyup', 'change', 'search'].forEach((ev) => {
      searchInputElement.addEventListener(ev, handleSearch);
    });
    searchInputElement.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') { searchInputElement.value = ''; handleSearch(); }
    });
  }
})();
