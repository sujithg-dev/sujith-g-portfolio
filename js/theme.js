let appMode, hueCode;

const initTheme = () => {
    const hour = new Date().getHours();

    const localMode = localStorage.getItem("appMode");
    const localColor = localStorage.getItem("hueCode");

    const applyMode = val => {

        if (val === "system")
            appMode = window.matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light";
            
        else if (val === "auto")
            appMode = (hour < 5 || hour > 19) ? "dark" : "light";
            
        else
            appMode = val;

        setTheme();
    };

    hueCode = localColor ?? null;

    hueCode
        ? setTheme()
        : db.settings.child("hueCode").once("value").then(s => { hueCode = s.val(); setTheme(); });
    
    if (localMode)
        applyMode(localMode);

    else
        db.settings.child("appMode").on("value", s => applyMode(s.val()));
};

let hueInterval;
let hueListenerInitialized = false;

const setTheme = () => {

    document.body.classList.toggle("light-mode", appMode === "light");

    $(".mode-icon").text(appMode === "light" ? "dark_mode" : "light_mode");

    if (!hueListenerInitialized) {

        hueListenerInitialized = true;

        db.settings.child("hueTheme").on("value", s => {

            if (hueInterval)
                clearInterval(hueInterval);

            if (!s.val()) {
                $(":root").css("--hueColor", hueCode);
                $(".color-picker").children().val(hueCode);
                return;
            }

            let count = hueCode ?? 0;
            
            hueInterval = setInterval(() => {
                $(":root").css("--hueColor", count++);
                $(".color-picker").children().val(count);
                if (count > 360) count = 0;
            }, 200);
        });
    }
};

const toggleMode = () => {
    appMode = appMode === "light" ? "dark" : "light";
    localStorage.setItem("appMode", appMode);
    setTheme();
};

const togglePicker = () => $(".color-picker").toggleClass("show");

const updateMode = () => {
    const hour = new Date().getHours();
    const cycle = { system: "auto", auto: "light", light: "dark", dark: "system" };
    const current = $(".appModeText").text();
    const value = cycle[current] || "system";

    if (value === "system")
        appMode = window.matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light";
    else if (value === "auto")
        appMode = (hour < 5 || hour > 19) ? "dark" : "light";
    else
        appMode = value;

    db.settings.update({ appMode: value });
    setTheme();
};

const updateColor = (sync, hue) => {
    hueCode = hue;
    localStorage.setItem("hueCode", hue);
    if (sync) db.settings.update({ hueCode: hue });
    $(":root").css("--hueColor", hueCode);
    $(".color-picker").removeClass("show");
};