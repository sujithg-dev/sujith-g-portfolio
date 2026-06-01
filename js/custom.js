
$(window).on("load", e => {

    if ($("body").hasClass("index-page")) {
        initNavbar();
        initSkill();
        initWorks();
        radiumAnimation(["Developer", "Freelancer"], ".random", 10000);
        // glitchAnimation(["Design", "Develop", "Code"], ".glitch", 4000);
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

const formatTime = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;

    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < minute) {
        return "Just now";
    }

    if (diff < hour) {
        const mins = Math.floor(diff / minute);
        return mins === 1 ? "1 min ago" : `${mins} mins ago`;
    }

    if (diff < day) {
        const hrs = Math.floor(diff / hour);
        return hrs === 1 ? "1 hr ago" : `${hrs} hrs ago`;
    }

    if (diff < day * 2) {
        return "Yesterday";
    }

    return new Date(timestamp).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}


const isLocalhost = () => {
    const host = window.location.hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1"
}


const initNavbar = () => {
    if ($("body").hasClass("page-to-ignore"))
        return;

    $(".navbar").toggleClass("sticky", window.scrollY >= 10);

    let current = "";

    $("section").each(function () {
        const top = this.offsetTop - 60;
        const bottom = top + this.clientHeight;

        if (scrollY >= top && scrollY < bottom)
            current = this.id;
    });

    $(".nav-link").removeClass("active");

    $(".nav-link").each(function () {
        if ($(this).attr("href") === "#" + current)
            $(this).addClass("active");
    });

    if (current === "skills" || current === "journey")
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


const initWorks = () => {
    const tabs = document.querySelectorAll(".works-tab");
    const items = document.querySelectorAll(".works-item");

    tabs.forEach(tab => tab.onclick = () => {

        tabs.forEach(tab => tab.classList.remove("active"));
        tab.classList.add("active");

        items.forEach(item =>
            item.classList.toggle("filtered", !(tab.dataset.filter === "all" || item.dataset.category === tab.dataset.filter))
        );
    });
};


const radiumAnimation = (words, selector, delay) => {
    let i = 0;
    const element = document.querySelector(selector);

    const render = (text, opacity = 1) => {

        const wordArray = text.split(" ");

        element.innerHTML = wordArray.map(word => {
            const letters = [...word]
                .map(l => {
                    return `<span class="letter" style="opacity:${opacity}" data-text="${l}">${l}</span>`;
                })
                .join("");

            return `<div class="word">${letters}</div>`;
        }).join("");
    };

    const animate = (spans, show = true) => {
        const order = spans.map((_, i) => i).sort(() => Math.random() - 0.5);

        order.forEach((idx, i) => {
            setTimeout(() => {
                spans[idx].style.opacity = show ? 1 : 0;
            }, i * 120);
        });
    };

    const cycle = () => {
        const word = words[i];
        render(word, 1);

        setTimeout(() => {
            const spans = [...element.querySelectorAll("span")];
            animate(spans, false);

            setTimeout(() => {
                i = (i + 1) % words.length;
                render(words[i], 0);
                animate([...element.querySelectorAll("span")], true);
            }, spans.length * 120 + 200);

        }, 2000);
    };

    cycle();
    setInterval(cycle, delay);
};


const glitchAnimation = (words, selector, delay) => {
    const el = document.querySelector(selector);
    if (!el) return;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let index = 0;

    const scramble = (finalWord) => {
        let iteration = 0;
        const interval = setInterval(() => {
            const text = finalWord.split("").map((l, i) =>
                i < iteration ? l : chars[Math.floor(Math.random() * chars.length)]
            ).join("");
            el.innerHTML = '<span class="glitch-text" data-text=' + text + '>' + text + '</span>';
            iteration += 1 / 3;
            if (iteration >= finalWord.length) {
                clearInterval(interval);
                el.innerHTML = '<span class="glitch-text" data-text=' + finalWord + '>' + finalWord + '</span>';
                el.classList.remove("glitch-active");
            }
        }, 75);
    };

    const cycle = () => {
        el.classList.add("glitch-active");
        scramble(words[index]);
        index = (index + 1) % words.length;
    };

    cycle();
    setInterval(cycle, delay);
};


const toggleJourney = (content, btn) => {
    $(".journey-content, .journey-btn").removeClass("active");

    $(`.${content}, .${btn}`).addClass("active");
};


const toggleTable = (table, btn) => {
    $(".table-content, .nav-btn, .table-btns").removeClass("active");
    $("." + table + ", ." + btn).addClass("active");
};


const toggleDialog = (selector) => {
    const dialog = $(`.${selector}`).first()[0];
    dialog.open ? dialog.close() : dialog.showModal();
};


const toggleNotification = (element) => {
    $(element).toggleClass("active");
};