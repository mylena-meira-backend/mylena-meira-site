/* ============================================================
   MAIN — Mylena Meira Site
   ============================================================ */

// ─── Configuração global ──────────────────────────────────────
// Em produção, define PRODUCTION_API_URL no index.html antes deste script
window.API_BASE = window.PRODUCTION_API_URL || 'http://localhost:3000';

// ─── Navegação ────────────────────────────────────────────────
const nav = document.querySelector('.nav');
const hamburger = document.querySelector('.nav-hamburger');
const mobileNav = document.querySelector('.nav-mobile');
const mobileLinks = document.querySelectorAll('.nav-mobile .nav-link');

// Scroll → nav opaca
window.addEventListener('scroll', () => {
  nav?.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

// Hamburger
hamburger?.addEventListener('click', () => {
  mobileNav?.classList.add('open');
  document.body.style.overflow = 'hidden';
});

document.getElementById('mobile-close')?.addEventListener('click', closeMobile);
mobileLinks.forEach(link => link.addEventListener('click', closeMobile));

function closeMobile() {
  mobileNav?.classList.remove('open');
  document.body.style.overflow = '';
}

// Fecha mobile nav ao clicar fora
mobileNav?.addEventListener('click', (e) => {
  if (e.target === mobileNav) closeMobile();
});

// ─── Scroll suave para o agendamento ─────────────────────────
document.querySelectorAll('[data-scroll-to]').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById(el.dataset.scrollTo);
    if (target) {
      const offset = 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

// ─── Animações de scroll (IntersectionObserver) ───────────────
const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      fadeObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.fade-up').forEach(el => fadeObserver.observe(el));

// ─── Contador animado (hero stats) ───────────────────────────
function animateCount(el, target, duration = 1800) {
  const start = performance.now();
  const isDecimal = target % 1 !== 0;
  const update = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = eased * target;
    el.textContent = isDecimal
      ? current.toFixed(1)
      : Math.floor(current) + (progress < 1 ? '' : '+');
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = target + (el.dataset.suffix || '');
  };
  requestAnimationFrame(update);
}

const countObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      animateCount(el, parseFloat(el.dataset.count), 1600);
      countObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('[data-count]').forEach(el => countObserver.observe(el));

// ─── FAQ Accordion ────────────────────────────────────────────
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});

// ─── Carrossel de depoimentos ─────────────────────────────────
const track = document.querySelector('.depoimentos-track');
const dots   = document.querySelectorAll('.depo-dot');

let currentDot = 0;

dots.forEach((dot, i) => {
  dot.addEventListener('click', () => {
    currentDot = i;
    updateDots();
    const cards = document.querySelectorAll('.depo-card');
    if (cards[i]) {
      track.scrollTo({ left: cards[i].offsetLeft, behavior: 'smooth' });
    }
  });
});

track?.addEventListener('scroll', () => {
  const cards = document.querySelectorAll('.depo-card');
  const scrollLeft = track.scrollLeft;
  cards.forEach((card, i) => {
    if (Math.abs(card.offsetLeft - scrollLeft) < 50) {
      currentDot = i;
      updateDots();
    }
  });
}, { passive: true });

function updateDots() {
  dots.forEach((dot, i) => dot.classList.toggle('active', i === currentDot));
}

// Auto-scroll depoimentos
let autoScroll = setInterval(() => {
  const cards = document.querySelectorAll('.depo-card');
  if (!cards.length) return;
  currentDot = (currentDot + 1) % cards.length;
  updateDots();
  track?.scrollTo({ left: cards[currentDot].offsetLeft, behavior: 'smooth' });
}, 5000);

track?.addEventListener('mouseenter', () => clearInterval(autoScroll));
track?.addEventListener('mouseleave', () => {
  autoScroll = setInterval(() => {
    const cards = document.querySelectorAll('.depo-card');
    if (!cards.length) return;
    currentDot = (currentDot + 1) % cards.length;
    updateDots();
    track?.scrollTo({ left: cards[currentDot].offsetLeft, behavior: 'smooth' });
  }, 5000);
});

// ─── Carrega informações da clínica ───────────────────────────
async function loadClinicInfo() {
  try {
    const res  = await fetch(`${window.API_BASE}/api/public/clinic-info`);
    const json = await res.json();
    const info = json.data;

    // WhatsApp
    const waPhone = info.clinic_whatsapp || info.clinic_phone || '';
    document.querySelectorAll('[data-clinic-whatsapp]').forEach(el => {
      const number = waPhone.replace(/\D/g, '');
      el.href = `https://wa.me/55${number}`;
      el.dataset.phone = number;
    });

    // Preenche contatos no footer
    if (info.clinic_phone) {
      const tel = document.getElementById('footer-phone');
      if (tel) tel.textContent = info.clinic_phone;
    }
    if (info.clinic_email) {
      const email = document.getElementById('footer-email');
      if (email) email.textContent = info.clinic_email;
    }
    if (info.clinic_address) {
      const addr = document.getElementById('footer-address');
      if (addr) addr.textContent = info.clinic_address;
    }
    if (info.instagram) {
      const ig = document.getElementById('footer-ig');
      if (ig) {
        ig.href = `https://instagram.com/${info.instagram.replace('@','')}`;
        ig.textContent = info.instagram;
      }
    }
  } catch { /* ignora erro silencioso */ }
}

loadClinicInfo();

// ─── CTA agendamento nos cards de serviço ─────────────────────
document.querySelectorAll('[data-service-scroll]').forEach(el => {
  el.addEventListener('click', () => {
    document.getElementById('agendamento')?.scrollIntoView({ behavior: 'smooth' });
  });
});
