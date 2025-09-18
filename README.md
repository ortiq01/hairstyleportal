# hairstyleportal

Simple Node.js/Express app served by PM2 and Nginx Proxy Manager.

## Run locally
- Node.js 18+
- npm install
- npm start (or `node index.js`)
- Visit http://localhost:3008

Endpoints: `/health`, `/info`, and static `/` from `public/`.

## PM2
- pm2 start ecosystem.config.js --env development
- pm2 start ecosystem.config.js --env production
- pm2 save

## Docker (optional)
- docker build -t hairstyleportal:dev .
- docker run -p 3008:3008 hairstyleportal:dev

## Design System

The application uses a consistent design system with CSS variables for maintainable styling.

### Design Tokens

**Colors:**
- Primary: `--color-primary` (#0d9488, teal-600) - Main brand color for links and accents
- Accent: `--color-accent` (#f9a8d4, soft pink) - Secondary color for highlights and focus states
- Neutrals: `--color-neutral-*` - Grayscale palette from 50 (lightest) to 900 (darkest)

**Typography:**
- Display Font: `--font-family-display` - Playfair Display for headings
- Body Font: `--font-family-body` - Inter for body text with system font fallbacks
- Type Scale: Responsive sizing with clamp() functions for mobile-first approach

**Spacing:**
- Scale: `--space-1` (0.25rem) to `--space-8` (2rem)
- Used consistently for margins, padding, and layout gaps

**Other:**
- Border radius: `--radius-sm` to `--radius-xl`
- Shadows: `--shadow-sm` and `--shadow-base` for subtle depth
- All tokens defined in `public/styles.css`

### Features
- Mobile-first responsive design
- Accessible focus states and color contrast
- Font loading optimization with `font-display: swap`
- Reduced motion support for accessibility
- Under 4KB CSS file size

## CI
A minimal GitHub Actions workflow can be added under `.github/workflows/ci.yml` to run basic checks.

## Inspiration Gallery (Unsplash)

- The Gallery section on the homepage fetches hairstyle photos from Unsplash.
- Works locally without credentials using a safe fallback (`source.unsplash.com`).
- For higher-quality results and author attributions, set an API key:

```bash
export UNSPLASH_ACCESS_KEY=your_unsplash_access_key
npm start
```

Security & CSP:
- Images are allowed from `https://images.unsplash.com` and `https://source.unsplash.com` via CSP.
- No inline styles or scripts are used.

Privacy (NL/AVG):
- Third-party images are requested from Unsplash CDN. No tracking scripts are included.
- If you add analytics or cookies later, ensure compliance with AVG (GDPR): provide purpose, consent, and data retention info.
- Consider documenting data processing activities (verwerkingsregister) and updating your privacy policy accordingly.

## Local SEO & Booking (NL)
- Meta tags include Dutch keywords for visibility.
- Booking links to Treatwell, Fresha, and Salonized are present. Replace with your salon profiles for best conversion in NL.

