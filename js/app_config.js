// ---------------- Firebase Init ----------------
firebase.initializeApp(
    {
        apiKey: "AIzaSyAsm8okuXmkyyOE2gyjlk-ZFS_W7beGnag",
        authDomain: "sujith-g.firebaseapp.com",
        databaseURL: "https://sujith-g-default-rtdb.firebaseio.com",
        portfolioId: "sujith-g",
        storageBucket: "sujith-g.appspot.com",
        messagingSenderId: "702373791246",
        appId: "1:702373791246:web:5a35c56e509c304a9b9e5f",
        measurementId: "G-35PFV9DBR0"
    }
);


// ---------------- Firebase Variable ----------------
const db = {
    users: firebase.database().ref("Users"),
    settings: firebase.database().ref("Settings"),
    messages: firebase.database().ref("Messages"),
    files: firebase.database().ref("Files"),
    stFiles: firebase.storage().ref("Files")
};


// ---------------- Common Helpers ----------------
const toggle = (selector, condition, active = "active", hide = "hide") =>
    $(selector).toggleClass(active, condition).toggleClass(hide, !condition);

const app = (selector, condition, active = "active", hide = "hide") =>
    $(selector).toggleClass(active, condition).toggleClass(hide, !condition);

const text = (selector, value) =>
    $(selector).text(value);

const delay = (fn, ms) =>
    setTimeout(fn, ms);

const inputError = (field, input) => {
    if (field == "input") {
        input.addClass("error").focus();
    }

    input.addClass("error");
    delay(() => input.removeClass("error"), 500);
};

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

const isLocalhost = () => {
    const host = window.location.hostname;

    return (
        host === "localhost" || host === "127.0.0.1" || host === "::1"
    );
}


// ---------------- Load ----------------
$(window).on("load", e => {
    getTheme();
    getSettings();

    if ($("body").hasClass("index-page")) {
        navbar();
        randomText(["Developer", "Freelancer"], ".random", 10000);
        // glitchText(["Design", "Develop", "Code"], ".glitch", 4000);
        initSkill();
        initWorks();
        if (!isLocalhost())
            getUserData();
    }
});


// ---------------- Scroll ----------------
$(window).on("scroll click", e => {
    if ($("body").hasClass("index-page"))
        navbar();

    if (!$(e.target).closest(".select").length)
        $(".select").removeClass("open");
});


// ---------------- Navbar ----------------
const navbar = () => {
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


// ---------------- Get Settings ----------------
function getSettings() {
    const settingsMap = {
        appLive: value => {
            if ($("body").hasClass("index-page") && !value && !window.location.pathname.includes("blank.html"))
                window.location.replace("blank.html");

            if ($("body").hasClass("blank-page") && value && !window.location.pathname.includes("index.html"))
                window.location.replace("index.html");

            text(".appLiveText", value ? "live" : "block");
            delay(() => $(".pre-loader").addClass("hide"), 100);
        },
        dashboardLock: value => {
            toggle(".dashboard", value, "", "hide");
            text(".dashboardLockText", value ? "on" : "off");
            delay(() => $(".pre-loader").addClass("hide"), 100);
        },
        hueTheme: value => {
            text(".hueThemeText", value ? "on" : "off");
            setTheme();
        },
        appMode: value => {
            $(".appMode-btn").addClass("active");
            text(".appModeText", value);
        }
    };
    Object.entries(settingsMap).forEach(([k, fn]) =>
        db.settings.child(k).on("value", s => fn(s.val()))
    );
}


// ---------------- Random Text ----------------
const randomText = (words, selector, delay) => {
    let i = 0;
    const el = document.querySelector(selector);
    if (!el) return;

    const render = (text, opacity = 1) => {
        const wordArray = text.split(" ");

        el.innerHTML = wordArray.map(word => {
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
            const spans = [...el.querySelectorAll("span")];
            animate(spans, false);

            setTimeout(() => {
                i = (i + 1) % words.length;
                render(words[i], 0);
                animate([...el.querySelectorAll("span")], true);
            }, spans.length * 120 + 200);

        }, 2000);
    };

    cycle();
    setInterval(cycle, delay);
};


// ---------------- glitch Text ----------------
const glitchText = (words, selector, delay) => {
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


// ---------------- Skill ----------------
const initSkill = () => {
    $(".skill-item").each(function () {
        const card = $(this);
        const bar = card.find(".progress-bar")[0];
        const txt = card.find(".progress-text");
        const img = card.find(".progress-icon");

        const r = 70, c = 2 * Math.PI * r;
        bar.style.strokeDasharray = c;

        let raf;

        card.find(".skill").hover(function () {
            const skill = $(this).data("skill");
            const percent = +$(this).data("percent");

            const src = card.find(`.icon-box[data-skill="${skill}"] img`).attr("src");
            img.attr("src", src);

            card.addClass("active")
                .find(".icon-box").removeClass("active")
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
                card.removeClass("active").find(".icon-box").removeClass("active");
                bar.style.strokeDashoffset = c;
                txt.text("0%");
            }
        );
    });
};


// ---------------- Works ----------------
const initWorks = () => {

    const tabs = document.querySelectorAll(".works-tab");
    const items = document.querySelectorAll(".works-item");

    if (!tabs.length)
        return;

    const obs = new IntersectionObserver(e =>
        e.forEach(i => i.target.classList.toggle("active", i.isIntersecting)),
        { rootMargin: "-50% 0px" }
    );

    items.forEach(i => obs.observe(i));

    tabs.forEach(t => t.onclick = () => {
        tabs.forEach(x => x.classList.remove("active"));
        t.classList.add("active");

        const f = t.dataset.filter;
        items.forEach(i =>
            i.classList.toggle("filtered", !(f === "all" || i.dataset.category === f))
        );
    });
};
$(".works-tabs").on("click", function () {
    
});

// ---------------- Get User Data ----------------
const getUserData = async () => {
    let userId = localStorage.getItem("userId");
    if (!userId) {
        userId = crypto.randomUUID();
        localStorage.setItem("userId", userId);
    }

    function getDeviceType() {
        const ua = navigator.userAgent.toLowerCase();
        if (/mobile/i.test(ua)) return "Mobile";
        if (/tablet|ipad/i.test(ua)) return "Tablet";
        return "Desktop";
    }

    const browserData = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screen: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        deviceType: getDeviceType()
    };

    const { timestamp, formattedTime } = getTime();

    async function getLocationFromIP() {
        try {
            const res = await fetch("https://ipapi.co/json/");
            const data = await res.json();

            return {
                coordinates: "Lat: " + data.latitude + ", Lon: " + data.longitude,
                address: data.city + ", " + data.country_name,
                ip: data.ip,
                source: "ip",
                time: formattedTime
            };
        } catch (err) {
            console.error("IP location error:", err);
            return null;
        }
    }

    const location = await getLocationFromIP();

    const userRef = firebase.database().ref("Users/" + userId);
    const snapshot = await userRef.once("value");

    if (!snapshot.exists()) {
        await userRef.set({
            userId: userId,
            browserInfo: browserData,

            visits: {
                visitCount: 1,
                firstVisit: formattedTime,
                visit_1: location
            }
        });
    } else {
        let count = snapshot.val().visits?.visitCount || 0;
        count++;

        await userRef.update({
            ["visits/visitCount"]: count,
            ["visits/LastVisit"]: formattedTime,
            ["visits//visit_" + count]: location
        });
    }
};


// ---------------- Select Input ----------------
const handleSelect = (el, isItem = false) => {
    const $el = $(el);
    const dropdown = $el.closest(".select");

    // Close other dropdowns
    $(".select").not(dropdown).removeClass("open");

    if (isItem) {
        // Select item logic
        dropdown.find(".select-input")
            .text($el.text())
            .addClass("selected");

        dropdown.removeClass("open");
    } else {
        // Toggle dropdown
        dropdown.toggleClass("open");
    }
};


// ---------------- Form Messages ----------------
const formOutput = (form, type, txt, input) => {
    const f = $(form);
    const colors = { error: "rgb(240, 75, 75)", success: "rgb(0, 155, 10)" };
    f.removeClass("show");

    if (type === "clear") return delay(() => f.text(""), 200);

    f.text(txt).css("color", colors[type]).addClass("show");
    if (input) {
        $(input).addClass("error").focus();
        delay(() => $(input).removeClass("error"), 500);
    }
    if (type === "success") delay(() => formMessage(form, "clear"), 3000);
};


// ---------------- Forms Handler ----------------
const handleForm = (formData) => {
    const { form, fields, buildMsg, output } = formData;

    $(form).on("click", () => {
        const name = fields.name?.val()?.trim();
        const email = fields.email?.val()?.toLowerCase().trim();
        const { timestamp, formattedTime } = getTime();

        if (!name || name.length < 3) {
            return inputError("input", fields.name);
        }

        if (!/^\S+@\S+\.\S+$/.test(email)) {
            return inputError("input", fields.email);
        }

        if (fields.message && !fields.message.val().trim()) {
            return inputError("input", fields.message);
        }

        if (fields.dev && fields.dev.text() === "developer") {
            return inputError("select", fields.dev);
        }

        if (fields.proj && fields.proj.text() === "project") {
            return inputError("select", fields.proj);
        }

        const msg = buildMsg(name, fields);

        db.messages.orderByChild("email").equalTo(email).once("value", snap => {

            const save = id => db.messages.child(id).child("message").update({ [formattedTime]: msg });

            const create = () => db.messages.child(timestamp).set({
                id: timestamp,
                name,
                email,
                message: { [formattedTime]: msg },
                received: formattedTime,
                status: "unread"
            });

            const done = err => {
                formOutput(output, err ? "error" : "success", err || "Message send successfully.");

                if (!err) {
                    Object.values(fields).forEach(f => {
                        if (f.val) f.val("");        // inputs
                        else f.text(f.hasClass("inDeveloper") ? "developer" : "project"); // reset selects
                    });
                }
            };

            snap.exists()
                ? save(Object.keys(snap.val())[0]).then(() => done()).catch(done)
                : create().then(() => done()).catch(done);
        });
    });
};


// ---------------- Service Form ----------------
handleForm({
    form: ".submit-service-form",
    fields: {
        name: $(".inName1"),
        email: $(".inEmail1"),
        dev: $(".inDeveloper"),
        proj: $(".inProject")
    },
    output: ".serviceFormError",
    buildMsg: (n, f) => `I am ${n} looking for ${f.dev.text()} to build a ${f.proj.text()}. You can reach me at ${f.email.val()}`
});

// ---------------- Contact Form ----------------
handleForm({
    form: ".submit-contact-form",
    fields: {
        name: $(".inName"),
        email: $(".inEmail"),
        message: $(".inMessage")
    },
    output: ".contactFormError",
    buildMsg: (n, f) => f.message.val()
});



// ---------------- Toggle Form ----------------
function toggleDialog(selector) {
    const dialog = $(`.${selector}`).first()[0];
    dialog.open ? dialog.close() : dialog.showModal();
}
// ---------------- Toggle Journey ----------------
function toggleJourney(content, btn) {
    $(".journey-content, .journey-btn").removeClass("active");
    $("." + content + ", ." + btn).addClass("active");
}















