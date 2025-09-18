// Quiz toggle
const quizBtn = document.getElementById('quiz-btn');
if (quizBtn) {
  quizBtn.addEventListener('click', function () {
    const quizSection = document.getElementById('quiz');
    const isHidden = quizSection.classList.contains('hidden');
    quizSection.classList.toggle('hidden');
    if (isHidden) quizSection.scrollIntoView({ behavior: 'smooth' });
  });
}

// Quiz option selection
document.querySelectorAll('.quiz-option').forEach((option) => {
  option.addEventListener('click', function () {
    const question = this.closest('.quiz-question');
    question.querySelectorAll('.quiz-option').forEach((opt) => {
      opt.classList.remove('selected');
      opt.setAttribute('aria-pressed', 'false');
    });
    this.classList.add('selected');
    this.setAttribute('aria-pressed', 'true');
  });

  option.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.click();
    }
  });
});

// Quiz submission
const quizSubmit = document.getElementById('quiz-submit');
if (quizSubmit) {
  quizSubmit.addEventListener('click', function () {
    const selectedOptions = document.querySelectorAll('.quiz-option.selected');
    if (selectedOptions.length < 2) {
      alert('Please answer all questions to get your style recommendation.');
      return;
    }

    const hairType = document.querySelector('.quiz-question:nth-child(1) .quiz-option.selected')
      ?.dataset.value;
    const lifestyle = document.querySelector('.quiz-question:nth-child(2) .quiz-option.selected')
      ?.dataset.value;

    let recommendation = '';
    if (hairType === 'straight' && lifestyle === 'low-maintenance') {
      recommendation =
        'Classic Bob - Clean lines that work with your natural texture and require minimal styling.';
    } else if (hairType === 'wavy' && lifestyle === 'moderate') {
      recommendation = 'Layered Lob - Enhances your natural waves with versatile styling options.';
    } else if (hairType === 'curly' && lifestyle === 'low-maintenance') {
      recommendation =
        'Curly Shag - Embraces your curls with low-maintenance layers for natural movement.';
    } else if (hairType === 'coily' && lifestyle === 'high-maintenance') {
      recommendation =
        'Defined Curl Pattern - Structured cut that showcases your natural texture with styling versatility.';
    } else {
      recommendation = `Based on your ${hairType} hair and ${lifestyle?.replace('-', ' ')} lifestyle, we recommend a consultation to find your perfect custom style.`;
    }

    document.getElementById('style-recommendation').textContent = recommendation;
    document.getElementById('quiz-results').style.display = 'block';
  });
}

// Booking form submission
const bookingForm = document.getElementById('booking-form');
if (bookingForm) {
  bookingForm.addEventListener('submit', function (e) {
    e.preventDefault();
    alert(
      'Thank you for your booking request! We will contact you within 24 hours to confirm your appointment.'
    );
  });
}

// Set minimum date to today
const dateInput = document.getElementById('date');
if (dateInput) {
  dateInput.min = new Date().toISOString().split('T')[0];
}

// Support ID helper
function setSupportIdFromResponse(res) {
  try {
    const hasGet = res && res.headers && res.headers.get;
    const id = hasGet ? res.headers.get('X-Request-Id') : null;
    const el = document.getElementById('support-id');
    if (id && el) {
      el.textContent = `Support ID: ${id}`;
    }
  } catch (_) {
    // noop
  }
}

// Products rendering
async function renderProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;
  try {
    const res = await fetch('/api/products');
    setSupportIdFromResponse(res);
    if (!res.ok) throw new Error('Failed to load products');
    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) {
      grid.innerHTML = '<p class="muted">Products coming soon.</p>';
      return;
    }
    grid.innerHTML = items
      .map((p) => {
        const safe = {
          brand: (p.brand || '').toString(),
          name: (p.name || '').toString(),
          price: typeof p.price === 'number' ? p.price.toFixed(2) : p.price || '',
          stock: typeof p.stock === 'number' ? p.stock : p.stock || '',
        };
        const inStock = Number(safe.stock) > 0;
        const buy = p.url
          ? `<a href="${p.url}" class="cta-button cta-secondary" target="_blank" rel="noopener">Buy</a>`
          : '';
        return `
        <div class="tile" role="article">
          <div class="flex-between gap-2">
            <div>
              <strong>${safe.brand}</strong>
              <div>${safe.name}</div>
            </div>
            <div class="text-right">
              <div>€ ${safe.price}</div>
              <div class="muted">${inStock ? `${safe.stock} in stock` : 'Out of stock'}</div>
            </div>
          </div>
          <div class="mt-4">${buy}</div>
        </div>`;
      })
      .join('');
  } catch (e) {
    grid.innerHTML =
      '<p class="muted">Could not load products. Please reference the Support ID if contacting us.</p>';
  }
}
renderProducts();

// Load and display version
(async function showVersion() {
  try {
    const r = await fetch('/info');
    setSupportIdFromResponse(r);
    if (!r.ok) return;
    const j = await r.json();
    const el = document.getElementById('app-version');
    if (el && j.version) el.textContent = `v${j.version}`;
  } catch (err) {
    // noop for version fetch failure
    console.warn('version fetch failed');
  }
})();

// Populate inspiration gallery
(async function populateGallery() {
  const grid = document.querySelector('.gallery-grid');
  if (!grid) return;
  try {
    const r = await fetch('/api/inspiration');
    setSupportIdFromResponse(r);
    if (!r.ok) throw new Error('Failed to fetch inspiration');
    const photos = await r.json();
    if (!Array.isArray(photos) || photos.length === 0) return;
    grid.innerHTML = photos
      .slice(0, 12)
      .map((p) => {
        const src = (p && p.src) || '';
        const alt = (p && p.alt) || 'hairstyle inspiration';
        const author = (p && p.author) || '';
        const link = (p && p.link) || '';
        const credit = author
          ? `<span class="credit">Photo${author ? ` by ${author}` : ''}${link ? ` · <a href="${link}" target="_blank" rel="noopener noreferrer">Unsplash</a>` : ''}</span>`
          : '';
        return `<figure class="gallery-item">${src ? `<img src="${src}" alt="${alt}">` : ''}${credit}</figure>`;
      })
      .join('');
  } catch (e) {
    // keep the default placeholders
    const el = document.getElementById('support-id');
    if (el && !el.textContent) el.textContent = 'Support ID unavailable (offline)';
  }
})();

// Mobile nav toggle
const navToggle = document.getElementById('nav-toggle');
const primaryNav = document.getElementById('primary-nav');
if (navToggle && primaryNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = primaryNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
  primaryNav.querySelectorAll('a').forEach((link) =>
    link.addEventListener('click', () => {
      primaryNav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    })
  );
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      primaryNav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });
}
