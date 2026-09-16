document.addEventListener("DOMContentLoaded", () => {

  /* ================= YEAR ================= */

  const year = document.getElementById("year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }


  /* ================= MOBILE MENU ================= */

  const menuButton = document.getElementById("menuButton");
  const mobileMenu = document.getElementById("mobileMenu");

  if (menuButton && mobileMenu) {

    menuButton.addEventListener("click", () => {
      mobileMenu.classList.toggle("open");
    });

    mobileMenu.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        mobileMenu.classList.remove("open");
      });
    });
  }


  /* ================= SERVICE CARDS ================= */

  const serviceCards = document.querySelectorAll(".service-card");

  serviceCards.forEach(card => {

    const serviceName = card.dataset.service;

    card.addEventListener("click", event => {

      /*
       * منع التفعيل مرتين لو المستخدم ضغط الزر نفسه
       */
      if (
        event.target.closest(".service-link") ||
        !event.target.closest("button")
      ) {

        if (!serviceName) {
          window.location.href = "mail.html";
          return;
        }

        const url =
          "mail.html?compose=1&service=" +
          encodeURIComponent(serviceName);

        window.location.href = url;
      }

    });

    const button = card.querySelector(".service-link");

    if (button) {

      button.addEventListener("click", event => {

        event.stopPropagation();

        const url =
          "mail.html?compose=1&service=" +
          encodeURIComponent(serviceName || "خدمة أخرى / استفسار");

        window.location.href = url;

      });

    }

  });


  /* ================= COPY BUTTON ================= */

  const copyButtons = document.querySelectorAll(".copy-button");

  copyButtons.forEach(button => {

    button.addEventListener("click", async event => {

      event.preventDefault();
      event.stopPropagation();

      const value = button.dataset.copy;

      if (!value) {
        return;
      }

      try {

        await navigator.clipboard.writeText(value);

        showToast("تم نسخ الرقم ✓");

      } catch {

        const temp = document.createElement("textarea");

        temp.value = value;

        document.body.appendChild(temp);

        temp.select();

        document.execCommand("copy");

        temp.remove();

        showToast("تم نسخ الرقم ✓");
      }

    });

  });


  /* ================= SCROLL REVEAL ================= */

  const revealElements = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {

    const observer = new IntersectionObserver(
      entries => {

        entries.forEach(entry => {

          if (entry.isIntersecting) {

            entry.target.classList.add("visible");

            observer.unobserve(entry.target);

          }

        });

      },
      {
        threshold: 0.12
      }
    );

    revealElements.forEach(element => {
      observer.observe(element);
    });

  } else {

    revealElements.forEach(element => {
      element.classList.add("visible");
    });

  }


  /* ================= NAVBAR SCROLL ================= */

  const navbar = document.querySelector(".navbar");

  window.addEventListener(
    "scroll",
    () => {

      if (!navbar) {
        return;
      }

      if (window.scrollY > 20) {

        navbar.style.background = "rgba(5, 8, 6, 0.94)";

      } else {

        navbar.style.background = "rgba(5, 8, 6, 0.76)";

      }

    },
    {
      passive: true
    }
  );


  /* ================= SMOOTH INTERNAL LINKS ================= */

  document.querySelectorAll('a[href^="#"]').forEach(link => {

    link.addEventListener("click", event => {

      const targetId = link.getAttribute("href");

      if (!targetId || targetId === "#") {
        return;
      }

      const target = document.querySelector(targetId);

      if (!target) {
        return;
      }

      event.preventDefault();

      target.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

    });

  });


  /* ================= TOAST ================= */

  function showToast(message) {

    const toast = document.getElementById("toast");

    if (!toast) {
      return;
    }

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(window.nilexToastTimer);

    window.nilexToastTimer = setTimeout(() => {

      toast.classList.remove("show");

    }, 2200);

  }

});
