/**
 * Ember & Oak — script.js
 * Handles: sticky nav, hamburger menu, active nav links,
 *          menu filtering, live search, reservation form
 *          validation, newsletter validation, back-to-top,
 *          and footer year.
 *
 * Written in vanilla ES6+ with no external dependencies.
 * Author: Principal Frontend Engineer
 */

'use strict';

/* ==============================================
   UTILITY HELPERS
============================================== */

/**
 * Query a single element.
 * @param {string} selector
 * @param {Element} [context=document]
 * @returns {Element|null}
 */
const $ = (selector, context = document) => context.querySelector(selector);

/**
 * Query all matching elements as an array.
 * @param {string} selector
 * @param {Element} [context=document]
 * @returns {Element[]}
 */
const $$ = (selector, context = document) =>
  Array.from(context.querySelectorAll(selector));

/**
 * Debounce a function call.
 * @param {Function} fn
 * @param {number} delay
 * @returns {Function}
 */
const debounce = (fn, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

/* ==============================================
   1. STICKY NAVIGATION — scroll class toggle
============================================== */
const initStickyNav = () => {
  const header = $('.site-header');
  if (!header) return;

  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 40);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run on load
};

/* ==============================================
   2. HAMBURGER MENU — open/close mobile nav
============================================== */
const initHamburgerMenu = () => {
  const btn        = $('#hamburgerBtn');
  const mobileMenu = $('#mobileMenu');
  if (!btn || !mobileMenu) return;

  /** Open the mobile menu */
  const openMenu = () => {
    btn.setAttribute('aria-expanded', 'true');
    mobileMenu.setAttribute('aria-hidden', 'false');
    mobileMenu.classList.add('is-open');
    // Prevent body scroll while menu is open
    document.body.style.overflow = 'hidden';
  };

  /** Close the mobile menu */
  const closeMenu = () => {
    btn.setAttribute('aria-expanded', 'false');
    mobileMenu.setAttribute('aria-hidden', 'true');
    mobileMenu.classList.remove('is-open');
    document.body.style.overflow = '';
  };

  /** Toggle */
  btn.addEventListener('click', () => {
    const isOpen = btn.getAttribute('aria-expanded') === 'true';
    isOpen ? closeMenu() : openMenu();
  });

  // Close on any mobile nav link click
  $$('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Close when clicking outside the menu
  document.addEventListener('click', (e) => {
    const isExpanded = btn.getAttribute('aria-expanded') === 'true';
    if (isExpanded && !mobileMenu.contains(e.target) && e.target !== btn) {
      closeMenu();
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      btn.focus(); // return focus to trigger
    }
  });
};

/* ==============================================
   3. ACTIVE NAV LINK — highlight on scroll
============================================== */
const initActiveNavLinks = () => {
  const sections  = $$('main section[id]');
  const navLinks  = $$('.nav-link');

  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach(link => {
            const isActive = link.getAttribute('href') === `#${id}`;
            link.classList.toggle('active', isActive);
          });
        }
      });
    },
    {
      // Trigger when top 30% of section enters viewport
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0,
    }
  );

  sections.forEach(section => observer.observe(section));
};

/* ==============================================
   4. MENU FILTER + LIVE SEARCH
============================================== */
const initMenuFilter = () => {
  const filterBtns  = $$('.filter-btn');
  const searchInput = $('#menuSearch');
  const menuGrid    = $('#menuGrid');
  const emptyState  = $('#menuEmpty');
  const cards       = $$('.menu-card', menuGrid);

  if (!filterBtns.length || !searchInput || !menuGrid) return;

  let activeFilter = 'all'; // current active category

  /**
   * Evaluates whether a card should be visible based on
   * the active filter category and the current search query.
   * @param {Element} card
   * @param {string} query - trimmed, lowercase search term
   * @returns {boolean}
   */
  const cardIsVisible = (card, query) => {
    const category = card.dataset.category || '';
    const title    = (card.querySelector('.card-title')?.textContent || '').toLowerCase();
    const desc     = (card.querySelector('.card-desc')?.dataset?.ingredients || '').toLowerCase()
                   + ' ' + (card.querySelector('.card-desc')?.textContent || '').toLowerCase();

    const passesFilter = activeFilter === 'all' || category === activeFilter;
    const passesSearch = !query || title.includes(query) || desc.includes(query);

    return passesFilter && passesSearch;
  };

  /**
   * Runs the filter + search logic and updates the DOM.
   */
  const applyFilters = () => {
    const query = searchInput.value.trim().toLowerCase();
    let visibleCount = 0;

    cards.forEach(card => {
      const show = cardIsVisible(card, query);
      card.classList.toggle('is-hidden', !show);
      if (show) visibleCount++;
    });

    // Show/hide empty state message
    if (emptyState) {
      emptyState.hidden = visibleCount > 0;
    }
  };

  // Filter button click handler
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update ARIA states
      filterBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      activeFilter = btn.dataset.filter;
      applyFilters();
    });
  });

  // Live search — debounced for performance
  searchInput.addEventListener(
    'input',
    debounce(() => applyFilters(), 200)
  );

  // Run once on init
  applyFilters();
};

/* ==============================================
   5. RESERVATION FORM VALIDATION
============================================== */
const initReservationForm = () => {
  const form          = $('#reservationForm');
  const successPanel  = $('#reservationSuccess');
  const successMsg    = $('#successMsg');
  const newResBtn     = $('#newReservationBtn');

  if (!form || !successPanel) return;

  /* ---- Validators ---- */

  /**
   * Validates a single field and returns an error message or ''.
   * @param {HTMLElement} field
   * @returns {string} error message (empty string = valid)
   */
  const validateField = (field) => {
    const { id, value, required } = field;
    const trimmed = value.trim();

    if (required && !trimmed) {
      return 'This field is required.';
    }

    switch (id) {
      case 'resDate': {
        if (!trimmed) return '';
        const selected = new Date(trimmed);
        const today    = new Date();
        today.setHours(0, 0, 0, 0);
        if (isNaN(selected.getTime())) return 'Please enter a valid date.';
        if (selected < today) return 'Reservation date must be in the future.';
        return '';
      }

      case 'resName': {
        if (trimmed.length < 2) return 'Name must be at least 2 characters.';
        if (!/^[\p{L}\s'-]+$/u.test(trimmed)) return 'Name contains invalid characters.';
        return '';
      }

      case 'resPhone': {
        // Allow: +1 (555) 000-0000, 555-000-0000, 5550000000, etc.
        const cleaned = trimmed.replace(/[\s().+\-]/g, '');
        if (!/^\d{7,15}$/.test(cleaned)) return 'Enter a valid phone number.';
        return '';
      }

      case 'resEmail': {
        if (!trimmed) return ''; // optional
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Enter a valid email address.';
        return '';
      }

      default:
        return '';
    }
  };

  /**
   * Shows or clears the error for a field.
   * @param {HTMLElement} field
   * @param {string} message
   */
  const setFieldError = (field, message) => {
    const errorEl = $(`#${field.id}-error`);
    if (!errorEl) return;

    if (message) {
      field.classList.add('is-error');
      errorEl.textContent = message;
    } else {
      field.classList.remove('is-error');
      errorEl.textContent = '';
    }
  };

  // Inline validation on blur (after first interaction)
  const validatedFields = $$('[data-touched]', form);

  const addBlurListener = (field) => {
    field.addEventListener('blur', () => {
      field.dataset.touched = 'true';
      setFieldError(field, validateField(field));
    });

    field.addEventListener('input', () => {
      if (field.dataset.touched) {
        setFieldError(field, validateField(field));
      }
    });
  };

  $$('.form-control', form).forEach(addBlurListener);

  /* ---- Submit Handler ---- */
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const fields = $$('.form-control', form);
    let isValid = true;

    fields.forEach(field => {
      const error = validateField(field);
      setFieldError(field, error);
      if (error) isValid = false;
    });

    if (!isValid) {
      // Focus the first invalid field for accessibility
      const firstError = form.querySelector('.is-error');
      if (firstError) firstError.focus();
      return;
    }

    // Gather data for confirmation message
    const date      = $('#resDate', form).value;
    const time      = $('#resTime', form).options[$('#resTime', form).selectedIndex]?.text || '';
    const partySize = $('#partySize', form).options[$('#partySize', form).selectedIndex]?.text || '';
    const name      = $('#resName', form).value.trim();

    // Format date nicely
    const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      year:    'numeric',
      month:   'long',
      day:     'numeric',
    });

    // Show success state
    if (successMsg) {
      successMsg.textContent = `${name}, your table for ${partySize} is confirmed for ${formattedDate} at ${time}.`;
    }

    form.hidden          = true;
    successPanel.hidden  = false;
    successPanel.focus?.();

    // Scroll confirmation into view
    successPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // "Make Another Reservation" button — reset form
  if (newResBtn) {
    newResBtn.addEventListener('click', () => {
      form.reset();

      // Clear all error states
      $$('.form-control', form).forEach(field => {
        field.classList.remove('is-error');
        delete field.dataset.touched;
      });
      $$('.form-error', form).forEach(el => { el.textContent = ''; });

      form.hidden         = false;
      successPanel.hidden = true;

      // Focus first field
      $('#resDate', form)?.focus();
    });
  }
};

/* ==============================================
   6. NEWSLETTER FORM VALIDATION
============================================== */
const initNewsletterForm = () => {
  const form       = $('#newsletterForm');
  const emailInput = $('#newsletterEmail');
  const errorEl   = $('#newsletter-error');
  const successEl = $('#newsletter-success');

  if (!form || !emailInput) return;

  const validateEmail = (val) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const val = emailInput.value.trim();

    if (!val) {
      if (errorEl) errorEl.textContent = 'Please enter your email address.';
      return;
    }

    if (!validateEmail(val)) {
      if (errorEl) errorEl.textContent = 'Please enter a valid email address.';
      return;
    }

    // Clear error, show success
    if (errorEl) errorEl.textContent = '';
    if (successEl) successEl.hidden = false;

    emailInput.value    = '';
    emailInput.disabled = true;

    const submitBtn = form.querySelector('.newsletter-btn');
    if (submitBtn) submitBtn.disabled = true;
  });

  // Clear error on input
  emailInput.addEventListener('input', () => {
    if (errorEl) errorEl.textContent = '';
  });
};

/* ==============================================
   7. BACK TO TOP BUTTON
============================================== */
const initBackToTop = () => {
  const btn = $('#backToTop');
  if (!btn) return;

  const SHOW_THRESHOLD = 500; // px scrolled before showing

  const onScroll = () => {
    const show = window.scrollY > SHOW_THRESHOLD;
    btn.hidden = !show;
    // Animate via class when visible
    requestAnimationFrame(() => {
      btn.classList.toggle('is-visible', show);
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  onScroll(); // initial check
};

/* ==============================================
   8. DYNAMIC FOOTER YEAR
============================================== */
const initFooterYear = () => {
  const el = $('#currentYear');
  if (el) el.textContent = new Date().getFullYear();
};

/* ==============================================
   9. SMOOTH SCROLL — internal anchor fallback
   (CSS scroll-behavior handles it in modern browsers,
    this enhances older ones and provides offset correction)
============================================== */
const initSmoothScroll = () => {
  $$('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href === '#') return; // plain #, skip

      const target = $(href);
      if (!target) return;

      e.preventDefault();

      const navH   = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--nav-h'),
        10
      ) || 72;

      const targetTop = target.getBoundingClientRect().top + window.scrollY - navH;

      window.scrollTo({ top: targetTop, behavior: 'smooth' });
    });
  });
};

/* ==============================================
   10. INTERSECTION OBSERVER — fade-in on scroll
============================================== */
const initScrollAnimations = () => {
  // Only animate if user hasn't requested reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const style = document.createElement('style');
  style.textContent = `
    .anim-fade-up {
      opacity: 0;
      transform: translateY(28px);
      transition: opacity 0.6s ease, transform 0.6s ease;
    }
    .anim-fade-up.in-view {
      opacity: 1;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);

  // Targets to animate
  const targets = $$(
    '.menu-card, .gallery-item, .stat-item, .pillar, .about-img-main, .about-img-secondary, .about-badge'
  );

  targets.forEach((el, i) => {
    el.classList.add('anim-fade-up');
    // Stagger delay: cap at 400ms so late items don't feel sluggish
    el.style.transitionDelay = `${Math.min(i % 4 * 80, 320)}ms`;
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target); // animate once
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  );

  targets.forEach(el => observer.observe(el));
};

/* ==============================================
   11. SET MIN DATE FOR RESERVATION DATE INPUT
============================================== */
const initDateConstraints = () => {
  const dateInput = $('#resDate');
  if (!dateInput) return;

  // Minimum date = today
  const today = new Date().toISOString().split('T')[0];
  dateInput.setAttribute('min', today);

  // Max advance booking = 90 days
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 90);
  dateInput.setAttribute('max', maxDate.toISOString().split('T')[0]);
};

/* ==============================================
   INITIALISE ALL MODULES
============================================== */
const init = () => {
  initStickyNav();
  initHamburgerMenu();
  initActiveNavLinks();
  initMenuFilter();
  initReservationForm();
  initNewsletterForm();
  initBackToTop();
  initFooterYear();
  initSmoothScroll();
  initScrollAnimations();
  initDateConstraints();
};

// Run after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
