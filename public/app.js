if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed:', err));
    });
}

const API_BASE = '/api'; 

// --- INDEXEDDB UNTUK HISTORY & FAVORITE ---
const DB_NAME = 'NimeStreamDB';
const STORE_HISTORY = 'history';
const STORE_FAV = 'favorites';

function initDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 2); 
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_HISTORY)) db.createObjectStore(STORE_HISTORY, { keyPath: 'url' });
            if (!db.objectStoreNames.contains(STORE_FAV)) db.createObjectStore(STORE_FAV, { keyPath: 'url' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function saveHistory(animeObj) {
    try {
        const db = await initDB();
        const tx = db.transaction(STORE_HISTORY, 'readwrite');
        animeObj.timestamp = Date.now();
        tx.objectStore(STORE_HISTORY).put(animeObj);
    } catch(e) {}
}

async function getHistory() {
    try {
        const db = await initDB();
        return new Promise((resolve) => {
            const req = db.transaction(STORE_HISTORY, 'readonly').objectStore(STORE_HISTORY).getAll();
            req.onsuccess = () => resolve(req.result.sort((a,b) => b.timestamp - a.timestamp));
        });
    } catch(e) { return []; }
}

async function toggleFavorite(url, title, image, score) {
    try {
        const db = await initDB();
        const isFav = await checkFavorite(url);
        const tx = db.transaction(STORE_FAV, 'readwrite');
        const store = tx.objectStore(STORE_FAV);
        
        if (isFav) {
            store.delete(url);
            document.getElementById('favBtn').classList.remove('active');
        } else {
            store.put({url, title, image, score, timestamp: Date.now()});
            document.getElementById('favBtn').classList.add('active');
        }
    } catch(e) {}
}

async function checkFavorite(url) {
    try {
        const db = await initDB();
        return new Promise((resolve) => {
            const req = db.transaction(STORE_FAV, 'readonly').objectStore(STORE_FAV).get(url);
            req.onsuccess = () => resolve(!!req.result);
        });
    } catch(e) { return false; }
}

async function getFavorites() {
    try {
        const db = await initDB();
        return new Promise((resolve) => {
            const req = db.transaction(STORE_FAV, 'readonly').objectStore(STORE_FAV).getAll();
            req.onsuccess = () => resolve(req.result.sort((a,b) => b.timestamp - a.timestamp));
        });
    } catch(e) { return []; }
}

const HOME_SECTIONS = [
    { title: "Sedang Hangat", mode: "latest" },
    { title: "Isekai & Fantasy", queries: ["isekai", "reincarnation", "world", "maou"] },
    { title: "Action Hits", queries: ["kimetsu", "jujutsu", "piece", "bleach", "hunter", "shingeki"] },
    { title: "Romance & Drama", queries: ["love", "kanojo", "romance", "heroine", "uso"] },
    { title: "School Life", queries: ["school", "gakuen", "classroom", "high school"] },
    { title: "Magic & Adventure", queries: ["magic", "adventure", "dragon", "dungeon"] },
    { title: "Comedy & Chill", queries: ["comedy", "slice of life", "bocchi", "spy"] }
];

const GENRE_KEYWORDS = {
    "Action": ["action", "shounen", "fight", "jujutsu", "kimetsu"],
    "Adventure": ["adventure", "journey", "world", "isekai"],
    "Comedy": ["comedy", "slice of life", "laugh", "bocchi"],
    "Drama": ["drama", "cry", "love", "romance", "kanojo"],
    "Fantasy": ["fantasy", "magic", "maou", "dragon", "hero"],
    "Isekai": ["isekai", "reincarnation", "world", "slime", "tensei"],
    "Magic": ["magic", "mahou", "witch", "wizard"],
    "Romance": ["romance", "love", "kanojo", "couple"],
    "School": ["school", "gakuen", "classroom", "student"],
    "Sci-Fi": ["sci-fi", "science", "gundam", "mecha"],
    "Slice of Life": ["slice of life", "daily", "chill", "camp"],
    "Sports": ["sports", "soccer", "football", "blue lock", "haikyuu"]
};

const KATEGORI_LIST = Object.keys(GENRE_KEYWORDS);
let sliderInterval;

function toggleTheme() {
    const body = document.documentElement;
    const currentTheme = body.getAttribute('data-theme');
    const moonIcon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    const sunIcon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;

    const btn = document.getElementById('themeBtn');

    if(currentTheme === 'light') {
        body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'dark');
        btn.innerHTML = moonIcon;
    } else {
        body.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
        btn.innerHTML = sunIcon;
    }
}

if(localStorage.getItem('theme') === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    document.getElementById('themeBtn').innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
}

const show = (id) => { const el = document.getElementById(id); if(el) el.classList.remove('hidden'); };
const hide = (id) => { 
    const el = document.getElementById(id); 
    if(el) el.classList.add('hidden'); 
    if (id === 'home-view' && sliderInterval) clearInterval(sliderInterval); 
};
const loader = (state) => state ? show('loading') : hide('loading');

// --- FUNGSI MENGAMBIL FOLLOWER WA (REAL-TIME/PROXY) ---
async function fetchWAFollowers() {
    const countEl = document.getElementById('wa-follower-count');
    if(!countEl) return;
    try {
        const res = await fetch(`https://cors.caliph.my.id/https://whatsapp.com/channel/0029VbB3bZLAO7RPl6shiI2C`);
        const html = await res.text();
        
        // Coba temukan angka follower dengan RegEx
        const match = html.match(/([\d\.,]+(?:K|M)?)\s+followers/i) || html.match(/([\d\.,]+(?:K|M)?)\s+pengikut/i);
        if (match && match[1]) {
            countEl.innerText = match[1];
        } else {
            countEl.innerText = "22.2K"; // Fallback aman
        }
    } catch (err) {
        countEl.innerText = "22.2K"; // Fallback jika diblokir server WA
    }
}

function switchTab(tabName) {
    hide('home-view'); hide('anime-view'); hide('recent-view');
    hide('favorite-view'); hide('developer-view'); hide('detail-view'); hide('watch-view');
    show('bottomNav');
    
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));

    if (tabName === 'home') {
        show('home-view');
        document.getElementById('tab-home').classList.add('active');
        if (document.getElementById('home-view').innerHTML === '') loadLatest();
        else {
            const wrapper = document.getElementById('heroWrapper');
            if (wrapper && !sliderInterval) {
                const totalSlides = document.querySelectorAll('.hero-slide').length;
                let currentSlide = 0;
                sliderInterval = setInterval(() => {
                    currentSlide++;
                    wrapper.style.transition = 'transform 0.5s ease-in-out';
                    wrapper.style.transform = `translateX(-${currentSlide * 100}%)`;
                    if (currentSlide >= totalSlides - 1) {
                        setTimeout(() => { wrapper.style.transition = 'none'; currentSlide = 0; wrapper.style.transform = `translateX(0)`; }, 500); 
                    }
                }, 5000);
            }
        }
    } else if (tabName === 'anime') {
        show('anime-view'); document.getElementById('tab-anime').classList.add('active'); renderCategoryPage(); 
    } else if (tabName === 'recent') {
        show('recent-view'); document.getElementById('tab-recent').classList.add('active'); loadRecentHistory(); 
    } else if (tabName === 'favorite') {
        show('favorite-view'); document.getElementById('tab-favorite').classList.add('active'); loadFavorites(); 
    } else if (tabName === 'developer') {
        show('developer-view'); 
        document.getElementById('tab-developer').classList.add('active');
        fetchWAFollowers(); // Auto Load Followers
    }
}

function renderCategoryPage() {
    const grid = document.getElementById('genre-grid');
    if (grid.innerHTML !== '') return; 
    grid.innerHTML = KATEGORI_LIST.map(genre => `<button class="genre-btn" onclick="loadCategory('${genre}', this)">${genre}</button>`).join('');
    loadCategory(KATEGORI_LIST[0], grid.firstElementChild);
}

async function loadCategory(genre, btnElement) {
    document.querySelectorAll('.genre-btn').forEach(btn => btn.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');

    loader(true);
    try {
        let combinedData = [];
        const queriesToFetch = GENRE_KEYWORDS[genre] || [genre];
        const promises = queriesToFetch.map(q => fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`).then(res => res.json()).catch(() => []));
        const results = await Promise.all(promises);
        results.forEach(list => { if(Array.isArray(list)) combinedData = [...combinedData, ...list]; });
        combinedData = removeDuplicates(combinedData, 'url');
        
        const container = document.getElementById('category-results-container');
        if(!combinedData || combinedData.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:var(--text-muted); margin-top:20px;">Tidak ada anime ditemukan.</p>';
            return;
        }

        container.innerHTML = `
            <div class="section-header mt-large">
                <div class="bar-accent"></div>
                <h2>Anime ${genre}</h2>
            </div>
            <div class="anime-grid">
                ${combinedData.map(anime => `
                    <div class="scroll-card" onclick="loadDetail('${anime.url}')" style="min-width: auto; max-width: none;">
                        <div class="scroll-card-img"><img src="${anime.image}" alt="${anime.title}" loading="lazy"><div class="ep-badge">Ep ${anime.score || '?'}</div></div>
                        <h3 class="scroll-card-title">${anime.title}</h3>
                    </div>`).join('')}
            </div>`;
    } catch (err) { console.error(err); } finally { loader(false); }
}

async function loadRecentHistory() {
    const container = document.getElementById('recent-results-container');
    container.innerHTML = '<div class="spinner"></div>';
    const historyData = await getHistory();
    if (!historyData || historyData.length === 0) {
        container.innerHTML = `<div class="empty-state"><svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" style="margin-bottom:15px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg><h2>Belum ada riwayat</h2><p>Anime yang baru saja kamu lihat akan muncul di sini.</p></div>`;
        return;
    }
    container.innerHTML = `<div class="anime-grid">${historyData.map(anime => `<div class="scroll-card" onclick="loadDetail('${anime.url}')" style="min-width: auto; max-width: none;"><div class="scroll-card-img"><img src="${anime.image}" alt="${anime.title}" loading="lazy"><div class="ep-badge">⭐ ${anime.score || '?'}</div></div><h3 class="scroll-card-title">${anime.title}</h3></div>`).join('')}</div>`;
}

async function loadFavorites() {
    const container = document.getElementById('favorite-results-container');
    container.innerHTML = '<div class="spinner"></div>';
    const favData = await getFavorites();
    if (!favData || favData.length === 0) {
        container.innerHTML = `<div class="empty-state"><svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" style="margin-bottom:15px;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg><h2>Belum ada Favorit</h2><p>Simpan anime kesukaanmu dengan menekan ikon hati.</p></div>`;
        return;
    }
    container.innerHTML = `<div class="anime-grid">${favData.map(anime => `<div class="scroll-card" onclick="loadDetail('${anime.url}')" style="min-width: auto; max-width: none;"><div class="scroll-card-img"><img src="${anime.image}" alt="${anime.title}" loading="lazy"><div class="ep-badge">⭐ ${anime.score || '?'}</div></div><h3 class="scroll-card-title">${anime.title}</h3></div>`).join('')}</div>`;
}

async function loadLatest() {
    loader(true);
    const homeContainer = document.getElementById('home-view');
    homeContainer.innerHTML = ''; 

    try {
        const sliderSection = HOME_SECTIONS[0]; 
        let sliderData = [];
        try { const res = await fetch(`${API_BASE}/latest`); sliderData = await res.json(); } catch (e) {}

        if (sliderData && sliderData.length > 0) {
            const top10 = sliderData.slice(0, 10);
            renderHeroSlider(sliderSection.title, top10, homeContainer);
            loader(false); 

            top10.forEach(async (item) => {
                try {
                    const detailRes = await fetch(`${API_BASE}/detail?url=${encodeURIComponent(item.url)}`);
                    const detailData = await detailRes.json();
                    if (detailData && detailData.info) {
                        const score = detailData.info.skor || detailData.info.score || 'N/A';
                        const type = detailData.info.tipe || detailData.info.type || 'Anime';
                        const musim = detailData.info.musim || detailData.info.season || '';
                        const rilis = detailData.info.dirilis || detailData.info.released || '';
                        const year = `${musim} ${rilis}`.trim() || 'Unknown';
                        
                        const metaElements = document.querySelectorAll(`.hero-meta[data-url="${item.url}"]`);
                        metaElements.forEach(el => { el.innerHTML = `<span>⭐ ${score}</span> • <span>${type}</span> • <span>${year}</span>`; });
                    }
                } catch (e) {}
            });
        } else { loader(false); }

        for (let i = 1; i < HOME_SECTIONS.length; i++) {
            const section = HOME_SECTIONS[i];
            (async () => {
                let combinedData = [];
                const promises = section.queries.map(q => fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`).then(res => res.json()).catch(() => []));
                const results = await Promise.all(promises);
                results.forEach(list => { if(Array.isArray(list)) combinedData = [...combinedData, ...list]; });
                combinedData = removeDuplicates(combinedData, 'url');

                if (combinedData.length > 0) {
                    if (combinedData.length < 6) combinedData = [...combinedData, ...combinedData, ...combinedData];
                    renderSection(section.title, combinedData.slice(0, 15), homeContainer);
                }
            })();
        }
    } catch (err) { loader(false); }
}

function removeDuplicates(array, key) { return [ ...new Map(array.map(item => [item[key], item])).values() ]; }

function renderHeroSlider(title, data, container) {
    const sectionContainer = document.createElement('div');
    sectionContainer.className = 'hero-section-container';

    const sliderDiv = document.createElement('div');
    sliderDiv.className = 'hero-slider';

    const loopData = [...data, data[0]];

    const slidesHtml = loopData.map((anime, index) => {
        const score = anime.score || 'N/A'; const type = anime.type || 'Anime'; const year = anime.year || 'Unknown';
        let epNumMatch = anime.episode ? anime.episode.match(/\d+(\.\d+)?/) : null;
        let eps = epNumMatch ? `Ep ${epNumMatch[0]}` : (anime.episode ? `Ep ${anime.episode}` : '');

        return `
            <div class="hero-slide">
                <img src="${anime.image}" class="hero-bg" alt="${anime.title}" loading="${index === 0 ? 'eager' : 'lazy'}">
                <div class="hero-overlay"></div>
                <div class="hero-content">
                    ${eps ? `<div class="hero-badge">${eps}</div>` : ''}
                    <h2 class="hero-title">${anime.title}</h2>
                    <div class="hero-meta" data-url="${anime.url}"><span>⭐ ${score}</span> • <span>${type}</span> • <span>${year}</span></div>
                    <button onclick="loadDetail('${anime.url}')" class="hero-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Nonton Sekarang</button>
                </div>
            </div>`;
    }).join('');

    sliderDiv.innerHTML = `<div class="hero-wrapper" id="heroWrapper">${slidesHtml}</div>`;
    sectionContainer.appendChild(sliderDiv);
    
    if (container.firstChild) container.insertBefore(sectionContainer, container.firstChild);
    else container.appendChild(sectionContainer);

    const wrapper = document.getElementById('heroWrapper');
    let currentSlide = 0;
    const totalSlides = loopData.length;

    if (sliderInterval) clearInterval(sliderInterval);

    sliderInterval = setInterval(() => {
        if (!wrapper || document.getElementById('home-view').classList.contains('hidden')) return;
        currentSlide++;
        wrapper.style.transition = 'transform 0.5s ease-in-out';
        wrapper.style.transform = `translateX(-${currentSlide * 100}%)`;
        if (currentSlide === totalSlides - 1) {
            setTimeout(() => { wrapper.style.transition = 'none'; currentSlide = 0; wrapper.style.transform = `translateX(0)`; }, 500); 
        }
    }, 5000); 
}

function renderSection(title, data, container) {
    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'category-section';
    const searchKeyword = title.split(' ')[0];

    const headerHtml = `
        <div class="header-flex">
            <div class="section-header"><div class="bar-accent"></div><h2>${title}</h2></div>
            <a href="#" class="more-link" onclick="handleSearch('${searchKeyword}')">Lainnya</a>
        </div>`;

    const cardsHtml = data.map(anime => {
        const eps = anime.episode || anime.score || '?'; 
        const displayTitle = anime.title.length > 35 ? anime.title.substring(0, 35) + '...' : anime.title;
        return `
        <div class="scroll-card" onclick="loadDetail('${anime.url}')">
            <div class="scroll-card-img"><img src="${anime.image}" alt="${anime.title}" loading="lazy"><div class="ep-badge">Ep ${eps}</div></div>
            <div class="scroll-card-title">${displayTitle}</div>
        </div>`;
    }).join('');

    sectionDiv.innerHTML = headerHtml + `<div class="horizontal-scroll">${cardsHtml}</div>`;
    container.appendChild(sectionDiv);
}

asyn
