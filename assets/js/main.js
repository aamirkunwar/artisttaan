// ============================================
// ARTISTTAAN - MAIN JAVASCRIPT
// ============================================

let siteData = null;

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
// RENDER ARTIST ROSTER - No banner, just photo + bio + links
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
        ${artist.monthly_listeners !== '—' ? `<p class="text-xs text-green-600 mt-2 font-medium">${artist.monthly_listeners} monthly listeners</p>` : ''}
      </div>
      <div class="flex gap-3 mt-4">
        <a href="${artist.spotify_url}" target="_blank" rel="noopener noreferrer" class="social-icon text-xs font-medium text-secondary hover:text-primary transition underline underline-offset-4" onclick="event.stopPropagation()">Spotify</a>
        <a href="${artist.instagram}" target="_blank" rel="noopener noreferrer" class="social-icon text-xs font-medium text-secondary hover:text-primary transition underline underline-offset-4" onclick="event.stopPropagation()">Instagram</a>
        <a href="${artist.youtube_url}" target="_blank" rel="noopener noreferrer" class="social-icon text-xs font-medium text-secondary hover:text-primary transition underline underline-offset-4" onclick="event.stopPropagation()">YouTube</a>
      </div>
    </div>
  `).join('');
}

// ============================================
// RENDER RELEASES - Spotify embeds ONLY (no other images)
// ============================================
function renderReleases() {
  const container = document.getElementById('releases-container');
  if (!container || !siteData) return;

  container.innerHTML = siteData.releases.map(release => `
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

// ============================================
// RENDER VIDEOS - Latest validated videos only
// ============================================
function renderVideos() {
  const container = document.getElementById('video-container');
  if (!container || !siteData) return;

  // Only include videos with valid YouTube IDs (no placeholders)
  const knownVideos = [
    { title: "KAAGAZ AUR DAAG", artist: "Shrey", embed: "https://www.youtube.com/embed/ZYln3iWRxDk", id: "ZYln3iWRxDk" },
    { title: "NAMASKAR", artist: "Slay", embed: "https://www.youtube.com/embed/bLTVqTJ1hUQ", id: "bLTVqTJ1hUQ" },
    { title: "SIFARISHEIN", artist: "Shrey", embed: "https://www.youtube.com/embed/rcKlMq2uDlk", id: "rcKlMq2uDlk" },
    { title: "THOUGHTS ARE POISON", artist: "Shrey", embed: "https://www.youtube.com/embed/afRnyWvO6PU", id: "afRnyWvO6PU" },
    { title: "THODA AUR", artist: "Shrey ft. Jai", embed: "https://www.youtube.com/embed/Q5E5t5VbVeo", id: "Q5E5t5VbVeo" },
    { title: "MARZ", artist: "Abir", embed: "https://www.youtube.com/embed/U7AdDdqJWUg", id: "U7AdDdqJWUg" },
    { title: "KAHO NA", artist: "Abir", embed: "https://www.youtube.com/embed/lC9X-FtN7AI", id: "lC9X-FtN7AI" }
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
    instagram: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.',
    youtube: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.5',
    spotify: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6',
    twitter: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 ',
    soundcloud: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.2'
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
  document.querySelector('meta[name="description"]').content = s.site_description;
}

// ============================================
// RENDER ALL
// ============================================
function renderAll() {
  applySettings();
  renderRoster();
  renderReleases();
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
// DEMO FORM
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
        const res = await fetch(demoForm.action, {
          method: 'POST',
          body: new FormData(demoForm),
          headers: { Accept: 'application/json' }
        });
        if (res.ok) {
          demoForm.reset();
          if (fileName) { fileName.textContent = ''; fileName.classList.add('hidden'); }
          showToast('Demo submitted successfully. We\'ll be in touch.');
        }
      } catch (_) {}
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

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  initMobileMenu();
  initDemoForm();
});
