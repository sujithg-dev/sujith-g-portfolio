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

        if (value !== null) {
            setter(value);
        }
        else {
            db.settings.child(key).on("value", snapshot => setter(snapshot.val()));
        }
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


const setTheme = () => {

    const isLight = appMode === "light";

    document.body.classList.toggle("light-mode", isLight);

    $(".mode-icon").text(isLight ? "dark_mode" : "light_mode");

    $(":root").css("--hueColor", hueCode);

    $(".color-picker input").val(hueCode);
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
        console.log("Update Mode Error: ", error)
    }

    setTheme();
};


const updateColor = (hueCode) => {

    try {
        db.settings.update({ hueCode: hueCode });
    }

    catch (error) {
        console.log("Update Color Error: ", error)
    }

    $(":root").css("--hueColor", hueCode);

    $(".color-picker1 input").val(hueCode);
}