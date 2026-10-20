let appMode,
    hueCode;

const getThemeMode = mode => {

    const hour = new Date().getHours();

    switch (mode) {
        case "system":
            return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

        case "auto":
            return (hour < 5 || hour > 19) ? "dark" : "light";

        default:
            return mode;
    }
};

const initTheme = () => {

    const loadSetting = (key, setter) => {

        const value = localStorage.getItem(key);

        if (value !== null)
            setter(value);
        else
            db.settings.child(key).on("value", snapshot =>
                setter(snapshot.val()));
    };

    loadSetting("appMode", value => {
        appMode = getThemeMode(value);
        setTheme();
    });

    loadSetting("hueCode", value => {
        hueCode = value;
        setTheme();
    });
};

let hueInterval;
let hueListenerInitialized = false;

const setTheme = () => {

    const isLight = appMode === "light";

    $("body").toggleClass("light-mode", isLight);
    $(".mode-icon").text(isLight ? "dark_mode" : "light_mode");
    $(":root").css("--hueColor", hueCode);
    $(".color-picker input").val(hueCode);

    if (!hueListenerInitialized) {

        hueListenerInitialized = true;

        db.settings.child("hueEffect").on("value", value => {

            if (hueInterval)
                clearInterval(hueInterval);

            if (!value.val()) {
                $(":root").css("--hueColor", hueCode);
                $(".color-picker input").val(hueCode);
                return;
            }

            let count = hueCode ?? 0;

            hueInterval = setInterval(() =>
            {
                $(":root").css("--hueColor", count++);
                $(".color-picker input").val(count);
                if (count > 360) count = 0;
            }, 1000);
        });
    }
};

const toggleMode = () => {

    appMode = appMode === "light" ? "dark" : "light";

    localStorage.setItem("appMode", appMode);

    setTheme();
};

const colorPicker = (action, hue) => {

    hueCode = hue;

    if (action === "toggle") {
        $(".color-picker").toggleClass("show");
        return;
    }

    if (action === "change") {
        localStorage.setItem("hueCode", hueCode);

        $(":root").css("--hueColor", hueCode);

        $(".color-picker input").val(hueCode);
    }
};

const updateMode = () => {

    const cycle = {
        system: "auto",
        auto: "light",
        light: "dark",
        dark: "system"
    };

    const value = cycle[$(".appModeText").text()] || "--";

    appMode = getThemeMode(value);

    try {
        db.settings.update({ appMode: value });
    }

    catch (error) {
        console.log("Update themm mode error: ", error)
    }

    setTheme();
};

const updateColor = (hueCode) => {

    try {
        db.settings.update({ hueCode: hueCode });
    }

    catch (error) {
        console.log("Update hue color error: ", error)
    }

    $(":root").css("--hueColor", hueCode);

    $(".color-picker1 input").val(hueCode);
}