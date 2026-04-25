// ===============================
// ABOUT TABS DATA
// ===============================
const aboutTabsData = {
  mission: {
    title: "Mission",
    image: "/assets/p15.jpg",
    html: `
      <p><strong>We work to create stable, community-led systems that support education, well-being, and opportunity for children and women in Nakivale Refugee Camp.</strong></p>
      <p>Through local leadership and practical initiatives, we focus on building structures that last—so families are supported not just today, but over time.</p>
    `,
  },
  who: {
    title: "Who We Are",
    image: "/assets/p33.jpg",
    html: `
      <p><strong>We are a community-led organization operating from within Nakivale Refugee Camp.</strong></p>
      <p>Our work is carried out by local leaders who understand the challenges firsthand and are building practical, lasting solutions within their own community.</p>
    `,
  },
  what: {
    title: "What We Do",
    image: "/assets/p73.jpg",
    html: `
      <p>Supporting 300+ children and families through consistent, community-led programs</p>
      <ul>
        <li><strong>Education Support</strong> – Keeping children in school</li>
        <li><strong>Women’s Programs</strong> – Training for income</li>
        <li><strong>Health & Hygiene</strong> – Clean water & sanitation</li>
        <li><strong>Community Programs</strong> – Safe spaces through sports</li>
      </ul>
    `,
  },
  how: {
    title: "How We Do It",
    image: "/assets/p105.jpg",
    html: `
      <p><strong>We keep our approach simple, transparent, and community-led.</strong></p>
      <ul>
        <li><strong>Direct Support</strong> – Funds go straight to programs</li>
        <li><strong>Local Leadership</strong> – Community-driven decisions</li>
        <li><strong>Focused Initiatives</strong> – Do a few things well</li>
        <li><strong>Clear Visibility</strong> – Transparent impact</li>
      </ul>
    `,
  },
  impact: {
    title: "Impact",
    image: "/assets/p55.jpg",
    html: `
      <p><strong>Consistent support is already changing daily life.</strong></p>
      <ul>
        <li><strong>300+ children</strong> supported</li>
        <li><strong>Daily meals</strong> provided</li>
        <li><strong>Active classrooms</strong> funded</li>
        <li><strong>Women trained</strong> in income skills</li>
      </ul>
    `,
  },
};

// ===============================
// FOOTER YEAR
// ===============================
function initFooterYear() {
  const el = document.getElementById("year");
  if (el) el.textContent = new Date().getFullYear();
}

// ===============================
// ABOUT TABS
// ===============================
function initAboutTabs() {
  const buttons = document.querySelectorAll(".about-btn");
  const title = document.getElementById("about-title");
  const text = document.getElementById("about-text");
  const image = document.getElementById("about-image");

  if (!buttons.length || !title || !text || !image) return;

  function applyTab(key) {
    const content = aboutTabsData[key];
    if (!content) return;
    title.textContent = content.title;
    text.innerHTML = content.html;
    image.src = content.image;
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      applyTab(btn.dataset.tab);
    });
  });

  const active = document.querySelector(".about-btn.active");
  if (active) applyTab(active.dataset.tab);
}

// ===============================
// MOBILE NAV
// ===============================
function initMobileNav() {
  const menu = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".nav-links");

  if (!menu || !nav) return;

  menu.addEventListener("click", () => {
    nav.classList.toggle("active");

    const expanded = menu.getAttribute("aria-expanded") === "true";
    menu.setAttribute("aria-expanded", !expanded);
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("active");
      menu.setAttribute("aria-expanded", "false");
    });
  });
}

// ===============================
// GALLERY (UNIVERSAL)
// ===============================
function initGallery() {
  const main =
    document.getElementById("mainImage") ||
    document.getElementById("empMainImage");

  const caption =
    document.getElementById("caption") ||
    document.getElementById("empCaption");

  const thumbs = document.querySelectorAll(".gallery-thumbs img");

  if (!main || !caption || !thumbs.length) return;

  thumbs.forEach((img) => {
    img.addEventListener("click", () => {
      main.style.opacity = 0;

      setTimeout(() => {
        main.src = img.src;
        caption.textContent = img.dataset.caption || "";
        main.style.objectPosition = img.dataset.position || "center";
        main.style.opacity = 1;
      }, 150);
    });
  });
}

// ===============================
// INIT EVERYTHING
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  initFooterYear();
  initAboutTabs();
  initMobileNav();
  initGallery();
});