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

function showVideoFallback(media) {
  const placeholder = media.querySelector(".video-placeholder");

  media.classList.remove("has-video", "video-landscape", "video-portrait", "video-square");

  if (placeholder) {
    placeholder.textContent = "Vidéo bientôt disponible";
  }
}

function revealVideoPlayer(media) {
  const placeholder = media.querySelector(".video-placeholder");

  if (!placeholder) return;

  if (placeholder.textContent.trim() === "Chargement de la vidéo") {
    media.classList.add("has-video");
  }
}

document.querySelectorAll(".media-shell, .project-media, .case-hero-media, .case-video-media, .lab-media").forEach((media) => {
  const video = media.querySelector("video");
  const source = video?.querySelector("source");

  if (!video) return;

  if (source?.getAttribute("src")) {
    revealVideoPlayer(media);
  }

  const fallbackTimer = window.setTimeout(() => {
    const placeholder = media.querySelector(".video-placeholder");

    if (placeholder && placeholder.textContent.trim() === "Chargement de la vidéo" && !media.classList.contains("has-video")) {
      showVideoFallback(media);
    }
  }, 2000);

  video.addEventListener("loadedmetadata", () => {
    window.clearTimeout(fallbackTimer);
    applyVideoRatioClass(media, video);
  });

  video.addEventListener("canplay", () => {
    window.clearTimeout(fallbackTimer);
    media.classList.add("has-video");
  });

  video.addEventListener("error", () => {
    window.clearTimeout(fallbackTimer);
    showVideoFallback(media);
  });

  if (video.readyState >= 1) {
    window.clearTimeout(fallbackTimer);
    applyVideoRatioClass(media, video);
  }
});

document.querySelectorAll("[data-filter-group]").forEach((group) => {
  const buttons = group.querySelectorAll("[data-filter]");
  const items = document.querySelectorAll("[data-filter-items] [data-category], [data-filter-items] [data-categories]");

  function getItemCategories(item) {
    return (item.dataset.category || item.dataset.categories || "")
      .split(/\s+/)
      .filter(Boolean);
  }

  function applyFilter(filter) {
    items.forEach((item) => {
      const categories = getItemCategories(item);
      const shouldShow = filter === "all" || categories.includes(filter);

      item.classList.toggle("is-hidden", !shouldShow);
      item.hidden = !shouldShow;

      if (shouldShow) {
        item.style.removeProperty("display");
      } else {
        item.style.display = "none";
      }
    });
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;

      buttons.forEach((item) => item.classList.toggle("is-active", item === button));
      applyFilter(filter);
    });
  });

  const activeFilter = group.querySelector(".is-active")?.dataset.filter || "all";
  applyFilter(activeFilter);
});

setHeaderState();
window.addEventListener("scroll", setHeaderState, { passive: true });


// Contenus protégés — © Joël Makosso. Reproduction interdite.
const protectedMessage = "Contenu protégé — © Joël Makosso";
let protectionToastTimer;

function showProtectionMessage() {
  let toast = document.querySelector("[data-protection-toast]");

  if (!toast) {
    toast = document.createElement("div");
    toast.className = "protection-toast";
    toast.dataset.protectionToast = "";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }

  toast.textContent = protectedMessage;
  toast.classList.add("is-visible");
  clearTimeout(protectionToastTimer);
  protectionToastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 1800);
}

function blockProtectedAction(event) {
  event.preventDefault();
  showProtectionMessage();
}

try {
  if (window.top !== window.self) {
    window.top.location = window.self.location.href;
  }
} catch (error) {
  document.documentElement.classList.add("is-framed");
}

document.addEventListener("contextmenu", blockProtectedAction);

document.addEventListener("dragstart", (event) => {
  if (event.target.closest("img, video, .thumbnail-card, .project-card, .case-video-card, .lab-card, .doc-card")) {
    blockProtectedAction(event);
  }
});

document.addEventListener("selectstart", (event) => {
  if (event.target.closest(".projects, .case-section, .thumbnails-section, .writing-preparation-section, .writing-preview, .thumbnail-card, .doc-card, .case-video-card, .lab-card, .project-card, .process-details")) {
    blockProtectedAction(event);
  }
});

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const blocked =
    event.key === "F12" ||
    ((event.ctrlKey || event.metaKey) && ["s", "u", "c", "a", "p"].includes(key)) ||
    ((event.ctrlKey || event.metaKey) && event.shiftKey && key === "i");

  if (blocked) {
    blockProtectedAction(event);
  }
});

document.querySelectorAll("img, video").forEach((media) => {
  media.setAttribute("draggable", "false");
});
