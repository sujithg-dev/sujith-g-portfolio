firebase.initializeApp({
    apiKey: "AIzaSyAsm8okuXmkyyOE2gyjlk-ZFS_W7beGnag",
    authDomain: "sujith-g.firebaseapp.com",
    databaseURL: "https://sujith-g-default-rtdb.firebaseio.com",
    portfolioId: "sujith-g",
    storageBucket: "sujith-g.appspot.com",
    messagingSenderId: "702373791246",
    appId: "1:702373791246:web:5a35c56e509c304a9b9e5f",
    measurementId: "G-35PFV9DBR0"
});

const db = {
    settings: firebase.database().ref("Settings"),
    notifications: firebase.database().ref("Notifications"),
    messages: firebase.database().ref("Messages"),
    visitors: firebase.database().ref("Visitors"),
    files: firebase.database().ref("Files"),
    stFiles: firebase.storage().ref("Files")
};

window.addEventListener("load", () => {
    initSettings();
    initTheme();
    initTable();
    initNotification();

    const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

    if (!isLocalhost && $("body").hasClass("index-page"))
        initVisitor();
});

const initSettings = async key => {

    const settingsMap = {

        appLive: value => {

            if (value && $("body").hasClass("blank-page") && !location.pathname.includes("index.html"))
                location.replace("index.html");

            if (!value && $("body").hasClass("index-page") && !location.pathname.includes("blank.html"))
                location.replace("blank.html");

            $(".appLiveText").text(value ? "Active" : "Blocked");

            setTimeout(() => {
                $(".pre-loader").addClass("hide")
            }, 1000);
        },

        dashboardLock: value => {
            $(".dashboardLockText").text(value ? "On" : "Off");
            $(".dashboard").toggleClass("hide", !value);
        },

        appMode: value => $(".appModeText").text(value),

        hueCode: value => $(".color-picker1 input").val(value),

        hueEffect: value => {
            $(".hueEffectText").text(value ? "On" : "Off")
        },

        bgEffect: value => {
            $(".bgEffectText").text(value ? "On" : "Off")
            $(".stars").toggleClass("active", value);
        }
    };

    try {
        if (key) {
            const snapshot = await db.settings.child(key).once("value");

            await db.settings.update({
                [key]: !snapshot.val()
            });

            return;
        }

        Object
            .entries(settingsMap)
            .forEach(([key, callback]) =>
                db.settings.child(key).on("value", snapshot =>
                    callback(snapshot.val())));
    }

    catch (error) {
        console.error("Settings fetching error: ", error);
    }
};

const initNotification = async action => {

    if (action === "toggle") {
        $(".notification-window").toggleClass("active");
        return;
    }

    try {
        if (action === "clear") {

            const snapshot = await db.notifications.once("value");

            if (!snapshot.exists())
                return

            const updates = {};

            snapshot.forEach(data => {
                updates[`${data.key}/status`] = "read";
            });

            await db.notifications.update(updates);

            return;
        }

        db.notifications.orderByKey().limitToLast(10).on("value", snapshot => {

            const notificationCount = $(".notification-count");
            const notificationContent = $(".notification-window .content");
            const notificationLink = $(".notification-window .link");

            notificationContent.empty();

            if (!snapshot.exists()) {
                notificationContent.append(
                    $("<div>")
                        .addClass("empty")
                        .text("No Notification")
                );
            }

            let unread = 0;

            const notifications = [];

            snapshot.forEach(data => {
                notifications.push(data.val());
            });

            notifications
                .sort((a, b) => b.timestamp - a.timestamp)
                .forEach(value => {
                    try {
                        const isMessage = value.type === "message";
                        const isUnread = value.status === "unread";

                        unread += isUnread ? 1 : 0;

                        notificationContent.append(
                            $("<div>")
                                .addClass(`notification-item ${isUnread ? " active" : ""}`)
                                .attr("onclick", isMessage ? `messageActions('${value.id}', 'info')` : `visitorActions('${value.visitorId}', 'info')`)
                                .append(
                                    $("<div>").append(
                                        $("<span>")
                                            .addClass("title")
                                            .text(isMessage ? "Message" : "Visitor"),
                                        $("<p>")
                                            .addClass("message")
                                            .text(isMessage ? `You received a new message from ${value.name}.` : "Someone visited the website.")
                                    ),
                                    $("<div>").append(
                                        $("<span>")
                                            .addClass("time sync-time")
                                            .attr("data-time", value.timestamp)
                                            .text(formatTime(value.timestamp))
                                    )
                                )
                        );
                    }

                    catch (error) {
                        console.error("Notification item fetching error:", value, error);
                    }
                });

            notificationCount
                .toggleClass("active", unread > 0)
                .text(unread || "");

            notificationLink.toggleClass("active", unread > 0);
        });
    }

    catch (error) {
        console.error("Notification fetching error:", error);
    }
};

const initTable = () => {

    const tabs = $(".nav-btn");
    const items = $(".table-content");

    const applyFilter = filter => {

        tabs.each(function () {
            $(this).toggleClass("active", this.dataset.filter === filter);
        });

        items.each(function () {
            $(this).toggleClass("active", this.dataset.category === filter);
        });
    };

    const filter = localStorage.getItem("tableFilter") || "table-messages";

    applyFilter(filter);

    tabs.each(function () {

        $(this).on("click", function () {

            const filter = this.dataset.filter;

            localStorage.setItem("tableFilter", filter);

            applyFilter(filter);
        });
    });

    const appendRow = (container, row) =>
        $(container).append(row);

    const listen = (ref, render, errorMessage) => {

        ref.on("value", snapshot => {

            try {
                render(snapshot);
            }

            catch (error) {
                console.error(errorMessage, error);
            }
        });
    };

    const messages = [];

    listen(
        db.messages,
        snapshot => {

            const container = $(".messages-data");
            container.empty();

            const messages = [];

            snapshot.forEach(data => {
                messages.push(data.val());
            });

            messages.sort((a, b) => b.timestamp - a.timestamp);
            messages.forEach((value, index) => {
                appendRow(
                    container,
                    $("<tr>")
                        .attr("id", value.id)
                        .append(
                            $("<td>")
                                .addClass("row-count")
                                .text(index + 1),
                            $("<td>")
                                .addClass("row-messagerName")
                                .text(value.name),
                            $("<td>")
                                .addClass("row-messagerEmail")
                                .text(value.email?.toLowerCase()),
                            $("<td>")
                                .addClass("row-receivedTime sync-time")
                                .attr("data-time", value.timestamp).text(formatTime(value.timestamp)),
                            $("<td>")
                                .addClass("row-totalMessage")
                                .text(value.totalMessages),
                            $("<td>")
                                .addClass("row-action")
                                .append(
                                    $("<span>")
                                        .addClass("material-symbols-outlined icon")
                                        .attr("onclick", `messageActions('${value.id}', 'info')`)
                                        .text("info")
                                )
                        )
                );
            });
        },
        "Messages data fetching error: "
    );

    listen(
        db.visitors,
        snapshot => {

            const container = $(".visitors-data");
            container.empty();

            const visitors = [];

            snapshot.forEach(data => {
                visitors.push(data.val());
            });

            visitors.sort((a, b) => b.timestamp - a.timestamp);
            visitors.forEach((value, index) => {
                appendRow(
                    container,
                    $("<tr>")
                        .attr("id", value.key)
                        .append(
                            $("<td>")
                                .addClass("row-count")
                                .text(index + 1),
                            $("<td>")
                                .addClass("row-visitorId")
                                .text(value.id),
                            $("<td>")
                                .addClass("row-deviceType")
                                .text(value.browserInfo?.deviceType || "--"),
                            $("<td>")
                                .addClass("row-firstVisit")
                                .attr("data-time", value.visits?.firstVisit)
                                .text(formatTime(value.visits?.firstVisit)),
                            $("<td>")
                                .addClass("row-visitCount")
                                .text(value.visits?.visitCount),
                            $("<td>")
                                .addClass("row-action")
                                .append(
                                    $("<span>")
                                        .addClass("material-symbols-outlined icon")
                                        .attr("onclick", `visitorActions('${value.id}', 'info')`)
                                        .text("info")
                                )
                        )
                );
            });
        },
        "Visitors data fetching error: "
    );

    listen(
        db.files,
        snapshot => {

            const container = $(".files-data");
            container.empty();

            let count = 1;

            snapshot.forEach(data => {
                appendRow(
                    container,
                    $("<tr>")
                        .attr("id", data.val().fileId)
                        .append(
                            $("<td>")
                                .addClass("row-count")
                                .text(count++),
                            $("<td>")
                                .addClass("row-fileName")
                                .text(data.val().fileName.substring(0, data.val().fileName.lastIndexOf("."))),
                            $("<td>")
                                .addClass("row-fileFormat")
                                .text(data.val().fileFormat?.toUpperCase()),
                            $("<td>")
                                .addClass("row-action")
                                .append(
                                    $("<span>")
                                        .addClass("material-symbols-outlined icon")
                                        .attr("onclick", `fileActions('${data.val().fileId}', 'link')`)
                                        .text("open_in_new"),
                                    $("<span>")
                                        .addClass("material-symbols-outlined icon")
                                        .attr("onclick", `fileActions('${data.val().fileId}', 'delete')`)
                                        .text("delete")
                                )
                        )
                );
            });
        },
        "Files data fetching error: "
    );
};

const initVisitor = async () => {

    try {
        let uid = localStorage.getItem("visitorId");

        const { timestamp, formattedTime } = getTime();

        if (!uid) {
            uid = crypto.randomUUID?.() || Date.now().toString();
            localStorage.setItem("visitorId", uid);
        }

        function getDeviceType() {

            const userAgent = navigator.userAgent.toLowerCase();

            if (/mobile/i.test(userAgent))
                return "Mobile";

            if (/tablet|ipad/i.test(userAgent))
                return "Tablet";

            return "Desktop";
        }

        async function getLocationFromIP() {

            try {
                const response = await fetch("https://ipapi.co/json/");
                const data = await response.json();

                return {
                    source: "ip",
                    ip: data.ip,
                    city: data.city,
                    country: data.country_name,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    timestamp: timestamp
                };
            }

            catch (error) {
                return null;
            }
        }

        const browserData = {
            deviceType: getDeviceType(),
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screen: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };

        const visitorRef = firebase.database().ref("Visitors/" + uid);
        const snapshot = await visitorRef.once("value");

        const location = await getLocationFromIP();

        if (snapshot.exists()) {

            let count = snapshot.val().visits?.visitCount;
            count++;

            const updates = {
                "visits/visitCount": count,
                "visits/lastVisit": timestamp,
                [`visits/visit_${count}`]: location
            };

            await visitorRef.update(updates);
        }

        else {
            await visitorRef.set({
                id: uid,
                browserInfo: browserData,

                visits: {
                    visitCount: 1,
                    firstVisit: timestamp,
                    visit_1: location
                }
            });
        }

        await db.notifications.child(timestamp).set({
            id: timestamp,
            visitorId: uid,
            type: "visitor",
            received: formattedTime,
            timestamp: timestamp,
            status: "unread"
        });
    }

    catch (error) {
        console.error("Update visitor data error:", error);
    }
};

const messageActions = async messageId => {

    const container = $(".message-details");
    const header = $("<div>").addClass("message-header");
    const body = $("<div>").addClass("message-body");

    container.empty();

    try {
        const snap = await db.messages.child(messageId).once("value");
        const value = snap.val();

        if (!snap.exists())
            return;

        const fields = [
            ["Name", value?.name || "--"],
            ["Email", value?.email || "--"]
        ];

        fields.forEach(([label, text]) => {
            header.append(
                $("<div>")
                    .addClass("item")
                    .append(
                        $("<label>").text(label),
                        $("<span>").text(":"),
                        $("<p>").text(text)
                    )
            );
        });

        Object
            .entries(value.message || {})
            .sort(([a], [b]) => Number(b) - Number(a))
            .forEach(([timestamp, message]) => {

                const fields = [
                    [formatTime(Number(timestamp)), message]
                ];

                fields.forEach(([label, text]) => {
                    body.append(
                        $("<div>")
                            .addClass("item")
                            .append(
                                $("<label>").text(formatTime(Number(timestamp))),
                                $("<p>").text(message)
                            )
                    );
                });
            });

        container.append(header, body);

        await db.messages.child(messageId).update({
            status: "read"
        });

        toggleDialog("dialog-message");
    }

    catch (error) {
        console.error("Message action error: ", error);
    }
};

const visitorActions = async visitorId => {

    const container = $(".visitor-details");
    const header = $("<div>").addClass("visitor-header");
    const body = $("<div>").addClass("visit-body");

    container.empty();

    try {
        const snap = await db.visitors.child(visitorId).once("value");
        const value = snap.val();

        if (!snap.exists())
            return;

        const fields = [
            ["Device Type", value.browserInfo?.deviceType || "--"],
            ["Total Visits", value.visits?.visitCount || "--"],
            ["First Visit", value.visits?.firstVisit ? formatTime(value.visits.firstVisit) : "--"],
            ["Last Visit", value.visits?.lastVisit ? formatTime(value.visits.lastVisit) : "--"]
        ];

        fields.forEach(([label, text]) => {

            header.append(
                $("<div>")
                    .addClass("item")
                    .append(
                        $("<label>").text(label),
                        $("<span>").text(":"),
                        $("<p>").text(text)
                    )
            );
        });

        Object
            .entries(value.visits || {})
            .filter(([key]) => key.startsWith("visit_"))
            .sort(([a], [b]) => +a.split("_")[1] - +b.split("_")[1])
            .forEach(([key, visit]) => {

                const fields = [
                    ["Location", visit.city && visit.country ? `${visit.city}, ${visit.country}` : "--"],
                    ["Coordinates", visit.latitude && visit.longitude ? `${visit.latitude}, ${visit.longitude}` : "--"],
                    ["IP Address", visit.ip || "--"],
                    ["Visited At", visit.timestamp ? formatTime(visit.timestamp) : "--"]
                ];

                const card = $("<div>")
                    .addClass("visit-card")
                    .append(
                        $("<h5>").text(key.replace("_", " "))
                    );

                fields.forEach(([label, value]) => {

                    card.append(
                        $("<div>")
                            .addClass("item")
                            .append(
                                $("<label>").text(label),
                                $("<span>").text(":"),
                                $("<p>").text(value)
                            )
                    );
                });

                body.append(card);
            });

        container.append(header, body);

        toggleDialog("dialog-visitor");
    }

    catch (error) {
        console.error("Visitor action error: ", error);
    }
};

const fileActions = async (fileId, type) => {

    try {
        const snap = await db.files.child(fileId).once("value");
        const value = snap.val();

        if (!snap.exists())
            return;

        if (type === "link")
            return window.open(value.fileLink, "_blank");

        if (type === "delete" && confirm(`Delete ${value.fileName} ? `)) {

            await db.stFiles.child(value.fileName).delete();
            await db.files.child(fileId).remove();

            $(`#${fileId} `).hide();
        }
    }

    catch (error) {
        console.error("File action error: ", error);
    }
};