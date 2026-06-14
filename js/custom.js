$(window).on("load", e => {

    if ($("body").hasClass("index-page")) {
        syncTime();
        initNavbar();
        initSkill();
        initJourney();
        initWorks();
        radiumAnimation(["Developer", "Freelancer"], ".random");
        // glitchAnimation(["Design", "Develop", "Code"], ".glitch");
    }
});


$(window).on("scroll", e => {

    if ($("body").hasClass("index-page"))
        initNavbar();

    $(".color-picker").removeClass("show")

});


const getTime = () => {
    const now = new Date();

    const day = String(now.getDate()).padStart(2, '0');
    const month = now.toLocaleString('en-US', { month: 'short' });
    const year = now.getFullYear();

    const hour = now.getHours();
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds());

    return {
        timestamp: Date.now(),
        day: day,
        month: month,
        year: year,
        hour: hour,
        minute: minute,
        second: second,
        formattedTime: `${day}, ${month}, ${year} - ${hour % 12 || 12}:${minute}:${second} ${hour >= 12 ? 'PM' : 'AM'}`
    }
}


const formatTime = timestamp => {

    const now = new Date();
    const date = new Date(timestamp);
    const diff = now - date;

    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < minute)
        return "Just now";

    if (diff < hour) {
        const mins = Math.floor(diff / minute);
        return mins === 1 ? "1 min" : `${mins} mins`;
    }

    if (diff < day) {
        const hrs = Math.floor(diff / hour);
        return hrs === 1 ? "1 hr" : `${hrs} hrs`;
    }

    if (diff < day * 2)
        return "Yesterday";

    const startOfWeek = new Date(now);
    const dayOfWeek = (now.getDay() + 6) % 7; // Monday = 0
    startOfWeek.setDate(now.getDate() - dayOfWeek);

    if (date >= startOfWeek) {
        return date.toLocaleDateString("en-GB", {
            weekday: "long"
        });
    }

    return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
};


const syncTime = () => {
    setInterval(() => {
        $(".notification .time, .row-receivedTime").each(function () {
            $(this).text(
                formatTime($(this).data("time"))
            );
        });
    }, 60000);
};


const initNavbar = () => {

    if ($("body").hasClass("page-to-ignore"))
        return;

    $(".navbar").toggleClass("sticky", window.scrollY >= 10);

    const current = $("section")
        .toArray()
        .find(section => {

            const top = section.offsetTop - 60;
            const bottom = top + section.clientHeight;

            return scrollY >= top && scrollY < bottom;
        })?.id || "";

    $(".nav-link")
        .removeClass("active")
        .filter(`[href="#${current}"]`)
        .addClass("active");

    if (["skills", "journey"].includes(current))
        $(".nav-link3").addClass("active");
};


const initSkill = () => {
    $(".skill-item").each(function () {

        const card = $(this);
        const bar = card.find(".progress-bar")[0];
        const txt = card.find(".progress-text");
        const img = card.find(".progress-img");

        const r = 70, c = 2 * Math.PI * r;
        bar.style.strokeDasharray = c;

        let raf;

        card.find(".skill").hover(function () {

            const skill = $(this).data("skill");
            const percent = +$(this).data("percent");

            const src = card.find(`.img-box[data-skill="${skill}"] img`).attr("src");
            img.attr("src", src);

            card.addClass("active")
                .find(".img-box").removeClass("active")
                .filter(`[data-skill="${skill}"]`).addClass("active");

            let start;
            cancelAnimationFrame(raf);

            const anim = t => {
                if (!start) start = t;
                const p = Math.min((t - start) / 1000, 1) * percent;
                bar.style.strokeDashoffset = c - (p / 100) * c;
                txt.text(Math.floor(p) + "%");
                if (p < percent) raf = requestAnimationFrame(anim);
            };
            raf = requestAnimationFrame(anim);

        },
            function () {
                cancelAnimationFrame(raf);
                card.removeClass("active").find(".img-box").removeClass("active");
                bar.style.strokeDashoffset = c;
                txt.text("0%");
            }
        );
    });
};


const initJourney = () => {

    const tabs = $(".journey-btn");
    const items = $(".journey-content");

    const applyFilter = filter => {

        tabs.each(function () {
            $(this).toggleClass("active", this.dataset.filter === filter);
        });

        items.each(function () {
            $(this).toggleClass("active", this.dataset.category === filter);
        });
    };

    const savedFilter = localStorage.getItem("journeyFilter") || "profession";

    applyFilter(savedFilter);

    tabs.each(function () {

        $(this).on("click", function () {

            const filter = this.dataset.filter;

            localStorage.setItem("journeyFilter", filter);

            applyFilter(filter);
        });
    });
};


const initWorks = () => {

    const tabs = $(".works-tab");
    const items = $(".works-item");

    const applyFilter = filter => {

        tabs.each(function () {

            $(this).toggleClass("active", this.dataset.filter === filter);
        });

        items.each(function () {
            $(this).toggleClass("filtered", !(filter === "all" || this.dataset.category === filter));
        });
    };

    const savedFilter = localStorage.getItem("worksFilter") || "all";

    applyFilter(savedFilter);

    tabs.on("click", function () {

        const filter = this.dataset.filter;

        localStorage.setItem("worksFilter", filter);

        applyFilter(filter);
    });
};


const radiumAnimation = (words, selector, delay = 5000) => {

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
            }, i * 50);
        });

        return letters.length * 50;
    };

    const cycle = () => {

        animate(false);

        const duration = element.querySelectorAll(".letter").length * 50;

        setTimeout(() => {

            index = (index + 1) % words.length;
            render(words[index]);

            requestAnimationFrame(() => {
                element
                    .querySelectorAll(".letter")
                    .forEach(letter => letter.classList.add("hidden"));

                animate(true);
            });

        }, duration + 300);
    };

    render(words[0]);

    setInterval(cycle, delay);
};


const glitchAnimation = (words, selector, delay = 3000) => {

    const el = document.querySelector(selector);

    if (!el || !words?.length)
        return;

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    let index = 0;
    let interval;

    const textEl = document.createElement("span");

    textEl.className = "glitch-text";

    el.textContent = "";
    el.appendChild(textEl);

    const scramble = word => {

        let iteration = 0;

        clearInterval(interval);

        el.classList.add("glitch-active");

        interval = setInterval(() => {

            const text = word
                .split("")
                .map((char, i) =>
                    i < iteration
                        ? char
                        : chars[Math.floor(Math.random() * chars.length)]
                )
                .join("");

            textEl.textContent = text;
            textEl.dataset.text = text;

            iteration += 0.33;

            if (iteration >= word.length) {

                clearInterval(interval);

                textEl.textContent = word;
                textEl.dataset.text = word;

                el.classList.remove("glitch-active");
            }

        }, 75);
    };

    const cycle = () => {

        scramble(words[index]);

        index = (index + 1) % words.length;
    };

    cycle();

    const timer = setInterval(cycle, delay);
};


const toggleDialog = (selector) => {
    const dialog = $(`.${selector}`).first()[0];
    dialog.open ? dialog.close() : dialog.showModal();
};

