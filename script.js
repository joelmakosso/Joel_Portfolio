// Interactions légères : menu mobile, header fixe, animations au scroll et placeholders vidéo.
const body = document.body;
const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const navToggle = document.querySelector("[data-nav-toggle]");
const navLinks = document.querySelectorAll(".site-nav a");
const sections = document.querySelectorAll("main section[id]");
const revealElements = document.querySelectorAll(".reveal");
const statElements = document.querySelectorAll("[data-count]");

function setHeaderState() {
  if (!header) return;
  header.classList.toggle("is-scrolled", window.scrollY > 20);
}

function closeNav() {
  body.classList.remove("nav-open");
  if (!navToggle) return;
  navToggle.setAttribute("aria-expanded", "false");
}

if (navToggle) {
  navToggle.addEventListener("click", () => {
    const isOpen = body.classList.toggle("nav-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", closeNav);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeNav();
  }
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.16 }
);

revealElements.forEach((element) => revealObserver.observe(element));

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      navLinks.forEach((link) => {
        link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`);
      });
    });
  },
  { rootMargin: "-42% 0px -50% 0px" }
);

sections.forEach((section) => sectionObserver.observe(section));

function formatStatValue(value, originalText) {
  if (originalText.includes("M")) {
    return `${value.toFixed(1).replace(".", ",")}M+`;
  }

  return `+${Math.round(value).toLocaleString("fr-FR")}`;
}

const statObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      const element = entry.target;
      const target = Number(element.dataset.count);
      const originalText = element.textContent.trim();
      const duration = 1100;
      const startTime = performance.now();

      function update(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = formatStatValue(target * eased, originalText);

        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          element.textContent = originalText;
        }
      }

      requestAnimationFrame(update);
      statObserver.unobserve(element);
    });
  },
  { threshold: 0.5 }
);

statElements.forEach((element) => statObserver.observe(element));

function applyVideoRatioClass(media, video) {
  const width = video.videoWidth;
  const height = video.videoHeight;

  if (!width || !height) return;

  const ratio = width / height;
  media.classList.add("has-video");
  media.classList.remove("video-landscape", "video-portrait", "video-square");

  if (Math.abs(ratio - 1) <= 0.08) {
    media.classList.add("video-square");
  } else if (ratio > 1) {
    media.classList.add("video-landscape");
  } else {
    media.classList.add("video-portrait");
  }
}

document.querySelectorAll(".media-shell, .project-media, .case-hero-media, .case-video-media, .lab-media").forEach((media) => {
  const video = media.querySelector("video");

  if (!video) return;

  video.addEventListener("loadedmetadata", () => {
    applyVideoRatioClass(media, video);
  });

  if (video.readyState >= 1) {
    applyVideoRatioClass(media, video);
  }
});

document.querySelectorAll("[data-filter-group]").forEach((group) => {
  const buttons = group.querySelectorAll("[data-filter]");
  const items = document.querySelectorAll("[data-filter-items] [data-categories]");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;

      buttons.forEach((item) => item.classList.toggle("is-active", item === button));

      items.forEach((item) => {
        const categories = item.dataset.categories.split(" ");
        item.classList.toggle("is-hidden", filter !== "all" && !categories.includes(filter));
      });
    });
  });
});

setHeaderState();
window.addEventListener("scroll", setHeaderState, { passive: true });
