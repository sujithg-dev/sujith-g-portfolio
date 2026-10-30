/* =============================================================
   main.js  -  Sujith.g portfolio
   -------------------------------------------------------------
   1. Helpers
   2. Time utilities (also used by the contact form / dashboard)
   3. Scroll effects (navbar, scroll-spy)
   4. Tabs (Journey + Works filters)
   5. Image carousels (Works cards)
   6. Skills carousel + progress rings
   7. Hero text effects (neon + glitch)
   8. Misc (dialog, footer year)
   9. Bootstrap
   ============================================================= */


/* ---------- 1. Helpers ---------- */

const $one = (sel, root = document) => root.querySelector(sel);
const $all = (sel, root = document) => [...root.querySelectorAll(sel)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const ready = fn =>
    document.readyState === "loading"
        ? document.addEventListener("DOMContentLoaded", fn)
        : fn();

// localStorage can throw (private mode, blocked storage), so wrap it once
const storage = {
    get: key => { try { return localStorage.getItem(key); } catch { return null; } },
    set: (key, value) => { try { localStorage.setItem(key, value); } catch { /* ignore */ } }
};

// runs fn at most once per animation frame
const rafThrottle = fn => {
    let waiting = false;
    return (...args) => {
        if (waiting) return;
        waiting = true;
        requestAnimationFrame(() => {
            waiting = false;
            fn(...args);
        });
    };
};


// Runs an async `step` repeatedly, only while the element is on screen and the tab is visible
const playWhileVisible = (element, task) => {
    let visible = false;
    let running = false;

    const loop = async () => {
        if (running) return;
        running = true;
        while (visible) await task();
        running = false;
    };

    new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) loop();
    }).observe(element);
};


/* ---------- 2. Time utilities ---------- */

const getTime = () => {
    const now = new Date();

    const day = String(now.getDate()).padStart(2, "0");
    const month = now.toLocaleString("en-US", { month: "short" });
    const year = now.getFullYear();

    const hour = now.getHours();
    const minute = String(now.getMinutes()).padStart(2, "0");
    const second = String(now.getSeconds()).padStart(2, "0");

    return {
        timestamp: Date.now(),
        day,
        month,
        year,
        hour,
        minute,
        second,
        formattedTime: `${day}, ${month}, ${year} - ${hour % 12 || 12}:${minute}:${second} ${hour >= 12 ? "PM" : "AM"}`
    };
};

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const plural = (count, unit) => `${count} ${unit}${count === 1 ? "" : "s"}`;

const formatTime = timestamp => {
    const now = new Date();
    const date = new Date(timestamp);
    const diff = now - date;

    if (diff < MINUTE) return "Just now";
    if (diff < HOUR) return plural(Math.floor(diff / MINUTE), "min");
    if (diff < DAY) return plural(Math.floor(diff / HOUR), "hr");
    if (diff < DAY * 2) return "Yesterday";

    // earlier this week (week starts on Monday) -> weekday name
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    if (date >= startOfWeek) {
        return date.toLocaleDateString("en-GB", { weekday: "long" });
    }

    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

// keeps "5 mins" style labels fresh
const initSyncTime = () => {
    const refresh = () => {
        $all(".sync-time").forEach(el => {
            el.textContent = formatTime(Number(el.dataset.time));
        });
    };

    setInterval(() => { if (!document.hidden) refresh(); }, MINUTE);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
};


/* ---------- 3. Scroll effects ---------- */

const initScrollEffects = () => {
    const body = document.body;
    const isIndex = body.classList.contains("index-page");
    const ignoreNav = body.classList.contains("page-to-ignore");

    const navbar = $one(".navbar");
    const dashboardNav = $one(".navbar-dashboard");
    const colorPicker = $one(".color-picker");
    const sections = isIndex ? $all("section") : [];
    const links = $all(".nav-link");
    const resumeLink = $one(".nav-link3");

    let lastSection = null;

    const update = () => {
        const y = window.scrollY;

        dashboardNav?.classList.toggle("sticky", y >= 10);
        colorPicker?.classList.remove("show");

        if (!isIndex || ignoreNav) return;

        navbar?.classList.toggle("sticky", y >= 10);

        const current = sections.find(section => {
            const top = section.offsetTop - 60;
            return y >= top && y < top + section.clientHeight;
        })?.id || "";

        // only touch the DOM when the active section actually changes
        if (current === lastSection) return;
        lastSection = current;

        links.forEach(link =>
            link.classList.toggle("active", link.getAttribute("href") === `#${current}`)
        );

        // "Resume" covers both the skills and journey sections
        if (current === "skills" || current === "journey") resumeLink?.classList.add("active");
    };

    window.addEventListener("scroll", rafThrottle(update), { passive: true });
    update();
};


/* ---------- 4. Tabs (shared by Journey + Works) ---------- */

const createTabs = ({ wrap: wrapSelector, tab: tabSelector, key, fallback, onChange }) => {
    const wrap = $one(wrapSelector);
    if (!wrap) return;

    const tabs = $all(tabSelector, wrap);
    const filters = tabs.map(tab => tab.dataset.filter);

    const apply = filter => {
        tabs.forEach(tab => {
            const active = tab.dataset.filter === filter;
            tab.classList.toggle("active", active);
            tab.setAttribute("aria-selected", active);
            tab.tabIndex = active ? 0 : -1;
        });

        onChange(filter);
        storage.set(key, filter);
    };

    // click (delegated)
    wrap.addEventListener("click", e => {
        const tab = e.target.closest(tabSelector);
        if (tab) apply(tab.dataset.filter);
    });

    // arrow-key navigation
    wrap.addEventListener("keydown", e => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;

        const current = tabs.findIndex(tab => tab.classList.contains("active"));
        const step = e.key === "ArrowRight" ? 1 : -1;
        const next = tabs[(current + step + tabs.length) % tabs.length];

        apply(next.dataset.filter);
        next.focus();
    });

    // restore the saved tab (validated), otherwise the fallback
    const saved = storage.get(key);
    apply(filters.includes(saved) ? saved : (fallback ?? filters[0]));
};

const initJourney = () => {
    const panels = $all(".journey-content");

    createTabs({
        wrap: ".journey-tabs",
        tab: ".journey-tab",
        key: "journeyFilter",
        onChange: filter =>
            panels.forEach(panel =>
                panel.classList.toggle("active", panel.dataset.category === filter)
            )
    });
};

const initWorks = () => {
    const items = $all(".works-item");

    createTabs({
        wrap: ".works-tabs",
        tab: ".works-tab",
        key: "worksFilter",
        fallback: "all",
        onChange: filter =>
            items.forEach(item => {
                item.hidden = !(filter === "all" || item.dataset.category === filter);
            })
    });
};


/* ---------- 5. Image carousels (Works cards) ---------- */

const AUTOPLAY_DELAY = 2000;
const TOUCH_RESUME = 2000;

const initCarousels = () => {
    $all(".carousel").forEach(carousel => {
        const track = $one(".carousel-track", carousel);
        const prevBtn = $one(".prev", carousel);
        const nextBtn = $one(".next", carousel);
        const dotsWrap = $one(".carousel-dots", carousel);
        if (!track || !prevBtn || !nextBtn || !dotsWrap) return;

        const slides = [...track.children];

        // not a carousel if there is only one image
        if (slides.length < 2) {
            prevBtn.hidden = nextBtn.hidden = dotsWrap.hidden = true;
            return;
        }

        const getIndex = () => {
            const width = track.clientWidth;
            return width ? Math.round(track.scrollLeft / width) : 0;
        };

        const goTo = index => {
            const target = (index + slides.length) % slides.length;   // wraps around
            track.scrollTo({ left: target * track.clientWidth });
        };

        // dots
        const dotsFragment = document.createDocumentFragment();
        const dots = slides.map((_, i) => {
            const dot = document.createElement("button");
            dot.className = "carousel-dot";
            dot.setAttribute("aria-label", `Go to image ${i + 1}`);
            dot.addEventListener("click", () => goTo(i));
            dotsFragment.append(dot);
            return dot;
        });
        dotsWrap.append(dotsFragment);

        let shown = -1;
        const update = () => {
            const current = getIndex();
            if (current === shown) return;
            shown = current;
            dots.forEach((dot, i) => dot.classList.toggle("active", i === current));
        };

        track.addEventListener("scroll", rafThrottle(update), { passive: true });
        prevBtn.addEventListener("click", () => goTo(getIndex() - 1));
        nextBtn.addEventListener("click", () => goTo(getIndex() + 1));

        track.addEventListener("keydown", e => {
            if (e.key === "ArrowRight") { e.preventDefault(); goTo(getIndex() + 1); }
            if (e.key === "ArrowLeft") { e.preventDefault(); goTo(getIndex() - 1); }
        });

        update();
        if (!reduceMotion) setupAutoplay(carousel, () => goTo(getIndex() + 1));
    });
};

// Autoplay that pauses on hover, focus, touch, when off-screen/hidden and when the tab is in the background
const setupAutoplay = (carousel, advance) => {
    const state = { visible: false, hover: false, focus: false, touch: false };
    let timer = null;
    let touchTimeout;

    const sync = () => {
        const shouldPlay =
            state.visible && !state.hover && !state.focus && !state.touch && !document.hidden;

        clearInterval(timer);
        timer = shouldPlay ? setInterval(advance, AUTOPLAY_DELAY) : null;
    };

    // cards hidden by a Works filter report as not intersecting
    new IntersectionObserver(([entry]) => {
        state.visible = entry.isIntersecting;
        sync();
    }, { threshold: 0.4 }).observe(carousel);

    carousel.addEventListener("mouseenter", () => { state.hover = true; sync(); });
    carousel.addEventListener("mouseleave", () => { state.hover = false; sync(); });
    carousel.addEventListener("focusin", () => { state.focus = true; sync(); });
    carousel.addEventListener("focusout", () => { state.focus = false; sync(); });

    carousel.addEventListener("touchstart", () => {
        clearTimeout(touchTimeout);
        state.touch = true;
        sync();
    }, { passive: true });

    carousel.addEventListener("touchend", () => {
        touchTimeout = setTimeout(() => { state.touch = false; sync(); }, TOUCH_RESUME);
    }, { passive: true });

    document.addEventListener("visibilitychange", sync);
};


/* ---------- 6. Skills carousel + progress rings ---------- */

const initSkills = () => {
    const carousel = $one(".skills-carousel");
    const track = $one(".skills-carousel-track");
    const cards = $all(".skill-card");
    const prevBtn = $one("#prev");
    const nextBtn = $one("#next");

    if (!carousel || !track || !cards.length) return;

    // arrows + native touch scroll
    if (prevBtn && nextBtn) {
        const getStep = () => {
            const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
            return cards[0].getBoundingClientRect().width + gap;
        };

        const updateButtons = () => {
            const maxScroll = carousel.scrollWidth - carousel.clientWidth;
            prevBtn.disabled = carousel.scrollLeft <= 1;
            nextBtn.disabled = carousel.scrollLeft >= maxScroll - 1;
        };

        nextBtn.addEventListener("click", () => carousel.scrollBy({ left: getStep(), behavior: "smooth" }));
        prevBtn.addEventListener("click", () => carousel.scrollBy({ left: -getStep(), behavior: "smooth" }));

        carousel.addEventListener("scroll", rafThrottle(updateButtons), { passive: true });
        window.addEventListener("resize", rafThrottle(updateButtons));
        updateButtons();
    }

    // progress rings (the circumference is read from the SVG, so no hard-coded radius)
    cards.forEach(card => {
        const bar = $one(".skill-progress-bar", card);
        const label = $one(".skill-progress-text", card);
        if (!bar) return;

        const percent = Number(card.dataset.percent) || 0;
        const circumference = 2 * Math.PI * bar.r.baseVal.value;
        const filled = circumference - (circumference * percent) / 100;

        if (label) label.textContent = `${percent}%`;

        bar.style.strokeDasharray = circumference;
        bar.style.strokeDashoffset = circumference;

        // pointer events also fire on touch, so rings animate on phones too
        card.addEventListener("pointerenter", () => { bar.style.strokeDashoffset = filled; });
        card.addEventListener("pointerleave", () => { bar.style.strokeDashoffset = circumference; });
    });
};


/* ---------- 7. Hero text effects ---------- */

const neonText = (words, selector, delay = 6000) => {
    let index = 0;
    const element = document.querySelector(selector);

    const render = text => {
        element.innerHTML = text
            .split(" ")
            .map(word =>
                `<span class="word">${[...word]
                    .map(letter => `<span class="letter" data-text="${letter}">${letter}</span>`)
                    .join("")
                }</span>`
            )
            .join(" ");
    };

    const shuffle = arr =>
        [...arr].sort(() => Math.random() - 0.5);

    const animate = show => {
        const letters = [...element.querySelectorAll(".letter")];

        shuffle(letters).forEach((letter, i) => {
            setTimeout(() => {
                letter.classList.toggle("hidden", !show);
            }, i * 100);
        });

        return letters.length * 100;
    };

    const cycle = () => {

        animate(false);

        const duration = element.querySelectorAll(".letter").length * 100;

        setTimeout(() => {

            index = (index + 1) % words.length;
            render(words[index]);

            requestAnimationFrame(() => {
                element
                    .querySelectorAll(".letter")
                    .forEach(letter => letter.classList.add("hidden"));

                animate(true);
            });

        }, duration + 1000);
    };

    render(words[0]);

    setInterval(cycle, delay);
};

const glitchText = (
    words,
    selector,
    { delay = 3000, speed = 45, reveal = 0.35, chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*@" } = {}
) => {
    const element = $one(selector);
    if (!element || !words.length) return;

    const text = document.createElement("span");
    text.className = "word";
    text.setAttribute("aria-hidden", "true");
    element.replaceChildren(text);

    // reserve the width of the longest word so nothing jumps or clips
    element.style.minWidth = `${Math.max(...words.map(w => w.length))}ch`;

    const setText = value => {
        text.textContent = value;
        text.dataset.text = value;
    };

    const randomChar = () => chars[(Math.random() * chars.length) | 0];

    const scramble = word => new Promise(resolve => {
        let progress = 0;
        let last = 0;

        element.classList.add("glitch-active");

        const tick = time => {
            if (time - last >= speed) {
                last = time;

                if (progress >= word.length) {
                    setText(word);
                    element.classList.remove("glitch-active");
                    return resolve();
                }

                setText(
                    [...word]
                        .map((char, i) => (i < progress || char === " " ? char : randomChar()))
                        .join("")
                );
                progress += reveal;
            }
            requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
    });

    let index = 0;
    element.setAttribute("aria-label", words[0]);

    if (reduceMotion || words.length === 1) {
        setText(words[0]);
        return;
    }

    playWhileVisible(element, async () => {
        const word = words[index];
        element.setAttribute("aria-label", word);
        await scramble(word);
        index = (index + 1) % words.length;
        await sleep(delay);
    });
};

const initHero = () => {
    neonText(["FullStack Developer"], ".profession");
    glitchText(["Learn", "Code", "Build"], ".hobby");
};


/* ---------- 8. Misc ---------- */

const toggleDialog = name => {
    const dialog = $one(`.${name}`);
    if (!dialog) return;
    dialog.open ? dialog.close() : dialog.showModal();
};

const initFooterYear = () => {
    const year = $one("#year");
    if (year) year.textContent = new Date().getFullYear();
};


/* ---------- 9. Bootstrap ---------- */

ready(() => {
    initScrollEffects();
    initSyncTime();
    initFooterYear();

    if (document.body.classList.contains("index-page")) {
        initHero();
        initJourney();
        initWorks();
        initCarousels();
        initSkills();
    }

    // the Firebase contact handler lives in its own file / block
    if (typeof initContact === "function") initContact();
});

const otp = document.getElementById("lock-pin");
const boxes = [...otp.querySelectorAll("input")];

// Get the combined 4-digit value
const getCode = () => boxes.map(b => b.value).join("");

boxes.forEach((box, i) => {
    // Typing: keep digits only, then jump to next box
    box.addEventListener("input", () => {
        box.value = box.value.replace(/\D/g, "").slice(0, 1);
        if (box.value && i < boxes.length - 1) boxes[i + 1].focus();
        if (getCode().length === 4) console.log("Code:", getCode());
    });

    box.addEventListener("keydown", (e) => {
        // Backspace on an empty box goes to the previous box
        if (e.key === "Backspace" && !box.value && i > 0) {
            boxes[i - 1].focus();
            boxes[i - 1].value = "";
            e.preventDefault();
        }
        if (e.key === "ArrowLeft" && i > 0) boxes[i - 1].focus();
        if (e.key === "ArrowRight" && i < boxes.length - 1) boxes[i + 1].focus();
    });

    // Select the digit on focus so typing replaces it
    box.addEventListener("focus", () => box.select());

    // Paste "1234" and it fills all boxes
    box.addEventListener("paste", (e) => {
        e.preventDefault();
        const digits = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 4);
        digits.split("").forEach((d, j) => {
            if (boxes[i + j]) boxes[i + j].value = d;
        });
        boxes[Math.min(i + digits.length, boxes.length - 1)].focus();
    });
});

function resetPin() {
    boxes.forEach(b => (b.value = ""));
    boxes[0].focus();
}