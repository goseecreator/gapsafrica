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
    <p>GAPSAFRICA is a network of young leaders, volunteers, and changemakers united by a common vision:

👉 Building a more peaceful, more united, and more self-reliant Africa.</p>

<p>Our commitment is simple yet powerful:

to serve, protect, and empower children and women across Africa.
</p>
    `,
  },
  what: {
    title: "Our Actions on the Ground",
    image: "/assets/p73.jpg",
    html: `
      <p>Inspired by our motto, "Serving children and women across Africa", our activities focus on direct and lasting impact:</p>
      <ul>
        <li><strong>Education & Child Protection</strong> – Access to education & distribution of school supplies</li>
        <li><strong>Training and Awareness Programs</strong> – Because every child deserves a safe and promising future</li>
        <li><strong>Women Empowerment</strong> – Vocational Training & Leadership Programs</li>
      </ul>
    `,
  },
  how: {
    title: "Through Peace & Social Cohesion",
    image: "/assets/p105.jpg",
    html: `
      <ul>
        <li><strong>Conflict Resolution</strong> – Training Peacemakers</li>
        <li><strong>Engagement</strong> – Community-driven decisions with children at the center</li>
        <li><strong>Collaboration</strong> – Raising awareness of living together</li>
      </ul>
    `,
  },
  impact: {
    title: "Impact",
    image: "/assets/p55.jpg",
    html: `
      <p>Through our completed programs:</p>
      <ul>
        <li>Children have gained <strong>hope</strong> through education</li>
        <li>Women have gained <strong>autonomy & dignity</strong></li>
        <li>Communities have been <strong>strengthened through solidarity</strong></li>
      </ul>
    `,
  },  
    vision: {
    title: "Vision",
    image: "/assets/p105.jpg",
    html: `
      <p>An Africa where:</p>
      <ul>
        <li>Every child is protected and educated</li>
        <li>Every woman is strong and independent</li>
        <li>Every community lives in peace and dignity</li>
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

  function applyTab(activeBtn) {
  const key = activeBtn.dataset.tab;
  const content = aboutTabsData[key];
  const panel = document.getElementById("about-panel");

  if (!content) return;

  buttons.forEach((btn) => {
    const isActive = btn === activeBtn;

    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
    btn.setAttribute("tabindex", isActive ? "0" : "-1");
  });

if (panel) {
  panel.setAttribute("aria-labelledby", activeBtn.id);
}
  title.textContent = content.title;
  text.innerHTML = content.html;
  image.src = content.image;
  image.alt = content.title;
}

  buttons.forEach((btn, index) => {
    btn.addEventListener("click", () => {
      applyTab(btn);
    });

    btn.addEventListener("keydown", (e) => {
      let nextIndex;

      if (e.key === "ArrowRight") {
        nextIndex = (index + 1) % buttons.length;
      }

      if (e.key === "ArrowLeft") {
        nextIndex = (index - 1 + buttons.length) % buttons.length;
      }

      if (nextIndex !== undefined) {
        e.preventDefault();
        buttons[nextIndex].focus();
        applyTab(buttons[nextIndex]);
      }
    });
  });

  const active = document.querySelector(".about-btn.active") || buttons[0];
  applyTab(active);
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