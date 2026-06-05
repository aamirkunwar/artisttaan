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
    instagram: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>',
    youtube: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
    spotify: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.1-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>',
    twitter: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    soundcloud: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.06-.05-.1-.1-.1m-.899.828c-.06 0-.091.037-.104.094L0 14.479l.172 1.308c.013.06.045.094.104.094.059 0 .09-.035.104-.094l.195-1.308-.195-1.332c-.014-.057-.045-.094-.104-.094m1.81-.7c-.067 0-.12.053-.127.12l-.209 2.006.209 1.936c.007.067.06.12.127.12.066 0 .12-.053.127-.12l.239-1.936-.239-2.006c-.007-.067-.06-.12-.127-.12m.896-.205c-.075 0-.135.06-.143.135l-.186 2.211.186 2.1c.008.075.068.135.143.135.074 0 .135-.06.142-.135l.211-2.1-.211-2.211c-.007-.075-.068-.135-.142-.135m.914-.19c-.083 0-.149.065-.158.148l-.164 2.401.164 2.085c.009.082.075.148.158.148.082 0 .149-.066.157-.148l.187-2.085-.187-2.401c-.008-.083-.075-.148-.157-.148m.919-.104c-.09 0-.163.073-.172.163l-.142 2.505.142 2.07c.009.09.082.163.172.163.089 0 .162-.073.171-.163l.162-2.07-.162-2.505c-.009-.09-.082-.163-.171-.163m.924-.064c-.098 0-.178.08-.186.178l-.12 2.569.12 2.056c.008.097.088.177.186.177.097 0 .178-.08.186-.177l.137-2.056-.137-2.569c-.008-.098-.089-.178-.186-.178m.93-.02c-.106 0-.193.086-.2.192l-.099 2.589.099 2.041c.007.106.094.192.2.192.105 0 .192-.086.199-.192l.112-2.041-.112-2.589c-.007-.106-.094-.192-.199-.192m.938.01c-.114 0-.208.094-.214.208l-.077 2.579.077 2.026c.006.114.1.208.214.208.113 0 .207-.094.213-.208l.087-2.026-.087-2.579c-.006-.114-.1-.208-.213-.208m3.848 1.09c-.244 0-.479.046-.696.129-.143-1.647-1.53-2.929-3.222-2.929-.433 0-.852.085-1.231.239-.143.056-.181.114-.182.166v5.768c.001.054.044.098.098.104h5.233c.517 0 .936-.42.936-.936 0-.517-.419-.936-.936-.936"/></svg>'
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
          body: new FormData(demoForm)
        });
        const data = await res.json();
        if (res.ok) {
          demoForm.reset();
          if (fileName) { fileName.textContent = ''; fileName.classList.add('hidden'); }
          showToast("Demo submitted! We'll be in touch within 48 hours.");
        } else {
          const msg = data.errors?.map(err => err.message).join(', ') || 'Submission failed. Please try again.';
          showToast(msg);
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
 
// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  initMobileMenu();
  initDemoForm();
});
