// ============================================
// ARTISTTAAN - MAIN JAVASCRIPT
// ============================================

let siteData = null;
let allReleases = [];

async function loadData() {
  try {
    const res = await fetch('assets/data/artists.json');
    siteData = await res.json();
    renderAll();
  } catch (err) {
    console.error('Failed to load data:', err);
    showToast('Error loading site data');
  }
}

// ============================================
// RENDER ARTIST ROSTER
// ============================================
function renderRoster() {
  const container = document.getElementById('roster-container');
  if (!container || !siteData) return;

  container.innerHTML = siteData.artists.map(artist => `
    <div class="artist-card group cursor-pointer" onclick="window.location.href='artist/?artist=${artist.id}'">
      <div class="overflow-hidden mb-4 aspect-[3/4] bg-secondary rounded-sm">
        <img src="${artist.photo}" alt="${artist.name}" class="w-full h-full object-cover artist-img" loading="lazy" />
      </div>
      <div>
        <h3 class="font-bold text-lg flex items-center gap-2">
          ${artist.name}
          ${artist.featured ? '<span class="text-xs font-normal text-muted">★</span>' : ''}
        </h3>
        <p class="text-caption mt-1">${artist.role}</p>
        <p class="text-body text-sm mt-2 line-clamp-3">${artist.bio}</p>
        ${artist.spotify_url ? `<a href="${artist.spotify_url}" target="_blank" rel="noopener noreferrer" class="text-xs text-green-600 font-medium mt-2 inline-block hover:underline underline-offset-4" onclick="event.stopPropagation()">View on Spotify →</a>` : ''}
      </div>
      <div class="flex flex-wrap gap-3 mt-4">
        ${artist.spotify_url ? `<a href="${artist.spotify_url}" target="_blank" rel="noopener noreferrer" class="social-icon text-xs font-medium text-secondary hover:text-primary transition underline underline-offset-4" onclick="event.stopPropagation()">Spotify</a>` : ''}
        ${artist.instagram ? `<a href="${artist.instagram}" target="_blank" rel="noopener noreferrer" class="social-icon text-xs font-medium text-secondary hover:text-primary transition underline underline-offset-4" onclick="event.stopPropagation()">Instagram</a>` : ''}
        ${artist.youtube_url ? `<a href="${artist.youtube_url}" target="_blank" rel="noopener noreferrer" class="social-icon text-xs font-medium text-secondary hover:text-primary transition underline underline-offset-4" onclick="event.stopPropagation()">YouTube</a>` : ''}
        ${artist.apple_music_url ? `<a href="${artist.apple_music_url}" target="_blank" rel="noopener noreferrer" class="social-icon text-xs font-medium text-secondary hover:text-primary transition underline underline-offset-4" onclick="event.stopPropagation()">Apple Music</a>` : ''}
      </div>
    </div>
  `).join('');
}

// ============================================
// RENDER RELEASES with filter support
// ============================================
function renderReleases(filter = 'all') {
  const container = document.getElementById('releases-container');
  if (!container || !siteData) return;

  const releases = filter === 'all'
    ? siteData.releases
    : siteData.releases.filter(r => r.artist_id === filter);

  container.innerHTML = releases.map(release => `
    <div class="release-card group">
      <div class="spotify-embed mb-3">
        <iframe src="${release.spotify_embed}" height="352" allow="encrypted-media" loading="lazy"></iframe>
      </div>
      <p class="font-semibold text-base">${release.title}</p>
      <p class="text-caption mt-1">${release.artist} · ${release.year}</p>
      <a href="${release.spotify_url}" target="_blank" rel="noopener noreferrer" class="text-xs text-secondary hover:text-primary transition underline underline-offset-4 mt-2 inline-block">Open in Spotify</a>
    </div>
  `).join('');
}

function initReleaseFilters() {
  const btns = document.querySelectorAll('.release-filter-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderReleases(btn.dataset.artist);
    });
  });
}

// ============================================
// RENDER VIDEOS
// ============================================
function renderVideos() {
  const container = document.getElementById('video-container');
  if (!container || !siteData) return;

  const knownVideos = [
    { title: "KAAGAZ AUR DAAG", artist: "Shrey", embed: "https://www.youtube.com/embed/ZYln3iWRxDk" },
    { title: "NAMASKAR", artist: "Slay", embed: "https://www.youtube.com/embed/bLTVqTJ1hUQ" },
    { title: "SIFARISHEIN", artist: "Shrey", embed: "https://www.youtube.com/embed/rcKlMq2uDlk" },
    { title: "THOUGHTS ARE POISON", artist: "Shrey", embed: "https://www.youtube.com/embed/afRnyWvO6PU" },
    { title: "THODA AUR", artist: "Shrey ft. Jai", embed: "https://www.youtube.com/embed/Q5E5t5VbVeo" },
    { title: "MARZ", artist: "Abir", embed: "https://www.youtube.com/embed/U7AdDdqJWUg" },
    { title: "KAHO NA", artist: "Abir", embed: "https://www.youtube.com/embed/lC9X-FtN7AI" }
  ];

  container.innerHTML = knownVideos.map(v => `
    <div class="relative">
      <p class="text-caption mb-2">${v.artist} - ${v.title}</p>
      <div class="aspect-video bg-secondary overflow-hidden rounded-sm">
        <iframe class="w-full h-full" src="${v.embed}" title="${v.title} - ${v.artist}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
      </div>
    </div>
  `).join('');
}

// ============================================
// RENDER SOCIALS
// ============================================
function renderSocials() {
  const container = document.getElementById('socials-container');
  if (!container || !siteData) return;

  const iconMap = {
    instagram: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>',
    youtube: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
    spotify: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.1-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>',
    twitter: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    facebook: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>'
  };

  container.innerHTML = siteData.socials.map(s => `
    <a href="${s.url}" target="_blank" rel="noopener noreferrer" class="hover-lift flex flex-col items-center justify-center gap-2 p-6 border border-subtle hover:border-dark transition group">
      <span class="text-muted group-hover:text-primary transition">${iconMap[s.icon] || s.icon}</span>
      <span class="text-sm font-semibold">${s.platform}</span>
      <span class="text-xs text-muted">${s.handle}</span>
    </a>
  `).join('');
}

// ============================================
// APPLY SETTINGS
// ============================================
function applySettings() {
  if (!siteData) return;
  const s = siteData.settings;
  document.title = s.site_title;
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.content = s.site_description;
}

// ============================================
// RENDER ALL
// ============================================
function renderAll() {
  applySettings();
  renderRoster();
  renderReleases('all');
  initReleaseFilters();
  renderVideos();
  renderSocials();
}

// ============================================
// MOBILE MENU
// ============================================
function initMobileMenu() {
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => mobileMenu.classList.add('hidden'));
    });
  }
}

// ============================================
// DEMO FORM — Netlify Forms handler
// ============================================
function initDemoForm() {
  const demoFile = document.getElementById('demoFile');
  const fileName = document.getElementById('fileName');
  if (demoFile && fileName) {
    demoFile.addEventListener('change', () => {
      if (demoFile.files[0]) {
        fileName.textContent = demoFile.files[0].name;
        fileName.classList.remove('hidden');
      }
    });
  }

  const demoForm = document.getElementById('demoForm');
  if (demoForm) {
    demoForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('submitBtn');
      btn.textContent = 'Sending...';
      btn.disabled = true;
      try {
        const res = await fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(new FormData(demoForm)).toString()
        });
        if (res.ok) {
          demoForm.reset();
          if (fileName) { fileName.textContent = ''; fileName.classList.add('hidden'); }
          showToast("Demo submitted! We'll be in touch within 48 hours.");
        } else {
          showToast('Submission failed. Please try again.');
        }
      } catch (err) {
        console.error('Submit error:', err);
        showToast('Network error. Please check your connection and try again.');
      }
      btn.textContent = 'Send Demo';
      btn.disabled = false;
    });
  }
}

// ============================================
// TOAST
// ============================================
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4000);
  }
}


  let current = 0;

  const iframe = document.getElementById('radio-iframe');
  const trackName = document.getElementById('radio-track-name');
  const artistName = document.getElementById('radio-artist-name');
  const dotsContainer = document.getElementById('radio-dots');
  const skipBtn = document.getElementById('radio-skip');

  if (!iframe || !skipBtn) return;

  function renderDots() {
    dotsContainer.innerHTML = tracks.map((_, i) =>
      `<div style="width:6px;height:6px;border-radius:50%;background:${i === current ? '#000' : '#ddd'};transition:background 0.3s;"></div>`
    ).join('');
  }

  function loadTrack(index) {
    const track = tracks[index];
    trackName.textContent = track.title;
    artistName.textContent = track.artist + ' · ARTISTTAAN';
    iframe.src = track.embed + '?utm_source=generator&theme=0';
    renderDots();
  }

  skipBtn.addEventListener('click', () => {
    current = (current + 1) % tracks.length;
    loadTrack(current);
  });

  loadTrack(current);
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  initMobileMenu();
  initDemoForm();
});
