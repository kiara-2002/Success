document.addEventListener("DOMContentLoaded", function () {
  // Reveal sections as they enter the viewport.
  var revealItems = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    var revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    revealItems.forEach(function (item) {
      revealObserver.observe(item);
    });
  } else {
    revealItems.forEach(function (item) {
      item.classList.add("visible");
    });
  }

  // Header shadow after scrolling.
  var header = document.querySelector(".site-header");

  function updateHeader() {
    if (!header) return;
    header.style.boxShadow = window.scrollY > 40
      ? "0 8px 30px rgba(11,24,48,.06)"
      : "none";
  }

  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();

  // Gentle scroll movement on the phone.
  var heroVisual = document.querySelector(".hero-visual");
  var phone = document.querySelector(".phone");

  function updatePhone() {
    if (!heroVisual || !phone || window.innerWidth < 700) return;

    var rect = heroVisual.getBoundingClientRect();
    var progress = (window.innerHeight / 2 - rect.top) / window.innerHeight;

    progress = Math.max(-1, Math.min(1, progress));

    var rotation = 4 + progress * 3;
    var y = progress * -22;

    phone.style.transform =
      "translateY(" + y + "px) rotate(" + rotation + "deg)";
  }

  window.addEventListener("scroll", updatePhone, { passive: true });
  window.addEventListener("resize", updatePhone);
  updatePhone();

  // Animate the score bars when the score panel appears.
  var scorePanel = document.querySelector(".score-panel");
  var bars = document.querySelectorAll(".score-row i");

  if (scorePanel && bars.length && "IntersectionObserver" in window) {
    var barObserver = new IntersectionObserver(function (entries, observer) {
      if (!entries[0].isIntersecting) return;

      bars.forEach(function (bar) {
        var finalWidth = bar.style.width;
        bar.style.width = "0";

        requestAnimationFrame(function () {
          bar.style.transition = "width 1.2s cubic-bezier(.2,.7,.2,1)";
          bar.style.width = finalWidth;
        });
      });

      observer.disconnect();
    }, { threshold: 0.25 });

    barObserver.observe(scorePanel);
  }
});
