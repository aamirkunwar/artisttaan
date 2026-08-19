# ARTISTTAAN Website

A clean, modern website for ARTISTTAAN — India's hip-hop & indie powerhouse.

## Folder Structure

```
ARTISTTAAN-website/
├── index.html                  # Main page
├── assets/
│   ├── css/
│   │   └── style.css           # All styles
│   ├── js/
│   │   └── main.js             # All JavaScript
│   ├── data/
│   │   └── artists.json        # All content data (artists, releases, socials, settings)
│   └── images/
│       ├── logo/
│       │   └── studio.jpg      # About section studio image
│       ├── artists/
│       │   ├── abir.jpg
│       │   ├── shrey.jpg
│       │   ├── slay.jpg
│       │   └── apoorvv.jpg
│       └── releases/
│           ├── pehle-jaisa.jpg
│           ├── namaskar.jpg
│           ├── na-mila.jpg
│           ├── tum-badli-ho.jpg
│           ├── sifarishein.jpg
│           └── ishq-adhoora.jpg
```

## How to Edit Content

All content lives in one file: **`assets/data/artists.json`**

### Add a New Artist

Open `assets/data/artists.json` and add to the `artists` array:

```json
{
  "id": "newartist",
  "name": "New Artist Name",
  "role": "Hip-Hop / Indie",
  "bio": "Artist bio here...",
  "photo": "assets/images/artists/newartist.jpg",
  "spotify_url": "https://open.spotify.com/artist/...",
  "instagram": "https://instagram.com/newartist",
  "youtube": "https://youtube.com/...",
  "featured": false,
  "monthly_listeners": "—"
}
```

Then add their photo to `assets/images/artists/newartist.jpg`

### Add a New Release

Add to the `releases` array in `assets/data/artists.json`:

```json
{
  "title": "Song Title",
  "artist": "Artist Name",
  "artist_id": "artist-id",
  "year": "2026",
  "spotify_url": "https://open.spotify.com/album/...",
  "spotify_embed": "https://open.spotify.com/embed/album/...",
  "cover": "assets/images/releases/song-title.jpg",
  "type": "single"
}
```

**Important:** The `spotify_embed` URL must use `embed` format:
- Regular URL: `https://open.spotify.com/album/ABC123`
- Embed URL: `https://open.spotify.com/embed/album/ABC123`

Then add the cover art to `assets/images/releases/song-title.jpg`

### Update Social Links

Edit the `socials` array in `assets/data/artists.json`.

### Update Site Settings

Edit the `settings` object in `assets/data/artists.json`:

```json
"settings": {
  "site_title": "ARTISTTAAN",
  "site_description": "...",
  "hero_tagline": "...",
  "hero_cta_primary_url": "...",
  "youtube_embed": "...",
  "formspree_endpoint": "https://formspree.io/f/YOUR_ENDPOINT",
  "footer_year": "2026"
}
```

## How to Deploy to Netlify

### Method 1: Drag & Drop
1. Zip the entire `ARTISTTAAN-website` folder
2. Go to [app.netlify.com](https://app.netlify.com)
3. Drag and drop the zip file
4. Done!

### Method 2: Git (Recommended)
1. Push this folder to a GitHub repo
2. In Netlify dashboard: **Add new site** → **Import from Git**
3. Select your repo
4. Build settings: leave blank (it's static HTML)
5. Deploy!

## Getting Spotify Embed URLs

1. Open the song/album on Spotify (web or app)
2. Click **Share** → **Embed track**
3. Copy the URL from the embed code
4. It will look like: `https://open.spotify.com/embed/track/ABC123`

## Getting Spotify Cover Art

1. Right-click on the album/song in Spotify web
2. Click **Share** → **Copy link to...**
3. Open the link in browser
4. Right-click the album art → **Save image as...**
5. Save to `assets/images/releases/`

## Contact

For questions, reach out via the demo submission form on the site.


## Artist Detail Pages

Each artist now has their own dedicated page with full information.

### URL Format
```
artist/?artist=abir
artist/?artist=shrey
artist/?artist=slay
artist/?artist=apoorvv
```

### What's on the Artist Page
- **Banner image** + profile photo
- **Name, role, monthly listeners**
- **Platform buttons**: Spotify, Apple Music, YouTube, Instagram, Twitter, SoundCloud
- **Download Artist Deck (PDF)** button
- **Stats**: Monthly listeners, total streams, release count, status
- **Full bio**
- **Genres** & **Top Cities**
- **Spotify embed player**
- **All releases** by that artist
- **Contact email** for bookings

### How to Add Artist Deck PDF

1. Create a PDF press kit for each artist (include bio, photos, stats, press quotes)
2. Save as: `assets/decks/[artist-id]-deck.pdf`
   - Example: `assets/decks/abir-deck.pdf`
3. Update the `deck_pdf` field in `assets/data/artists.json`

### Artist Page Data Fields

Each artist in `artists.json` now supports:

```json
{
  "id": "artist-id",
  "name": "Artist Name",
  "role": "Genre/Role",
  "bio": "Short bio (for roster card)",
  "full_bio": "Long detailed bio (for artist page)",
  "photo": "assets/images/artists/artist.jpg",
  "banner": "assets/images/artists/artist-banner.jpg",
  "deck_pdf": "assets/decks/artist-deck.pdf",
  "spotify_url": "https://open.spotify.com/artist/...",
  "apple_music_url": "https://music.apple.com/in/artist/...",
  "youtube_url": "https://youtube.com/...",
  "instagram": "https://instagram.com/...",
  "twitter": "https://twitter.com/...",
  "soundcloud": "https://soundcloud.com/...",
  "featured": true/false,
  "monthly_listeners": "103,560",
  "total_streams": "2.1M+",
  "top_cities": ["Delhi", "Mumbai", "Bangalore"],
  "genres": ["Hip-Hop", "Indie", "R&B"],
  "contact_email": "artist@ARTISTTAAN.com"
}
```

### Clicking Artist Cards

On the main page roster section, clicking any artist card now takes you to their dedicated artist page. Social links on the card still work separately (they open in new tab).


## Logo Setup

### Where to Add Your Logo

Drop your logo files into `assets/images/logo/`:

| File | Purpose | Background |
|------|---------|------------|
| `logo-nav.png` | Top navbar | Transparent, black text |
| `logo-white.png` | Footer (dark) | Transparent, white text |
| `logo-icon.png` | Browser tab | Any |
| `apple-touch-icon.png` | iOS home screen | Any |
| `og-image.jpg` | Social media preview | Any |

### How It Works

The site tries to load the logo image first. If the file doesn't exist, it automatically falls back to "ARTISTTAAN" text. So your site works even before you add the logo.

### Creating Your Logo

1. Design your logo in any tool (Canva, Figma, Illustrator)
2. Export two versions:
   - **Dark version** (for white navbar): black/dark text, transparent background
   - **Light version** (for dark footer): white/light text, transparent background
3. Save as PNG with transparency
4. Drop into `assets/images/logo/`
5. Redeploy to Netlify

### SVG Alternative

For sharper logos, use SVG instead:
- Save as `logo-nav.svg` and `logo-white.svg`
- Update the HTML files to use `.svg` extension


## Our Team Page (`team/`)

Lists the people behind the label. Driven by the `team` array in `assets/data/artists.json`:

```json
{
  "id": "member-id",
  "name": "Member Name",
  "role": "Video Director",
  "photo": "assets/images/team/member.jpg",
  "bio": "Short bio...",
  "instagram_handle": "@handle",
  "instagram": "https://instagram.com/handle"
}
```

Add the member photo to `assets/images/team/`.


## Upcoming Releases Page (`upcoming/`)

Showcases unreleased work — EPs, audio demos, posters, teasers. Driven by the `upcoming` array in `assets/data/artists.json`:

```json
{
  "id": "release-id",
  "title": "Release Title",
  "artist": "Artist Name",
  "type": "EP Poster",
  "image": "assets/images/upcoming/release.jpg",
  "status": "Coming Soon",
  "description": "Optional short description."
}
```

`type` can be anything (e.g. "Audio Demo", "Poster Release", "Teaser"). Add the artwork to `assets/images/upcoming/`.
