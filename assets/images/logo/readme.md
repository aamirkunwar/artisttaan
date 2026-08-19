# ARTISTTAAN Logo Files

## Where to Add Your Logo

Place your logo files in this folder: `assets/images/logo/`

## Required Files

| File | Purpose | Specs |
|------|---------|-------|
| `logo-nav.png` | Navbar (top of every page) | Transparent PNG, ~200×50px, black text |
| `logo-white.png` | Footer (dark background) | Transparent PNG, ~200×50px, white text |
| `logo-icon.png` | Browser tab favicon | PNG, 32×32px or 64×64px |
| `apple-touch-icon.png` | iOS home screen icon | PNG, 180×180px |
| `og-image.jpg` | Social media preview | JPG, 1200×630px |
| `studio.jpg` | About section image | Any size, portrait preferred |

## Logo Behavior

- If `logo-nav.png` exists → Shows logo image in navbar
- If `logo-nav.png` missing → Falls back to "ARTISTTAAN" text
- If `logo-white.png` exists → Shows logo in footer
- If `logo-white.png` missing → Falls back to "ARTISTTAAN" text

## Tips

- Use **SVG** instead of PNG for sharper logos (rename to `.svg` and update HTML)
- Keep navbar logo under 40px height for best fit
- White logo should have white/light text for dark footer background
- OG image should include your logo + tagline for social sharing
