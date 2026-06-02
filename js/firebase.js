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
    notifications: firebase.database().ref("Notifications"),
    visitors: firebase.database().ref("Visitors"),
    settings: firebase.database().ref("Settings"),
    messages: firebase.database().ref("Messages"),
    files: firebase.database().ref("Files"),
    stFiles: firebase.storage().ref("Files")
};


window.addEventListener("load", () => {

    initSettings();
    initTheme();
    initTable();
    initNotification();

    if (!isLocalhost()) {
        initVisitor();
    }
});


const initVisitor = async () => {

    let visitorId = localStorage.getItem("visitorId");

    if (!visitorId) {

        visitorId = crypto.randomUUID();
        localStorage.setItem("visitorId", visitorId);
    }

    function getDeviceType() {

        const userAgent = navigator.userAgent.toLowerCase();

        if (/mobile/i.test(userAgent)) {
            return "Mobile";
        }

        if (/tablet|ipad/i.test(userAgent)) {
            return "Tablet";
        }

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

    const location = await getLocationFromIP();

    const visitorRef = firebase.database().ref("Visitors/" + visitorId);
    const snapshot = await visitorRef.once("value");

    if (!snapshot.exists()) {

        await visitorRef.set({
            visitorId: visitorId,
            browserInfo: browserData,

            visits: {
                visitCount: 1,
                firstVisit: timestamp,
                visit_1: location
            }
        });
    }
    else {
        let count = snapshot.val().visits?.visitCount || 0;
        count++;

        await visitorRef.update({
            ["visits/visitCount"]: count,
            ["visits/lastVisit"]: timestamp,
            ["visits//visit_" + count]: location
        });
    }

    await db.notifications.child(timestamp).set({
        id: timestamp,
        visitorId: visitorId,
        type: "visitor",
        received: formattedTime,
        status: "unread"
    });
};


const initNotification = () => {

    db.notifications.orderByKey().limitToLast(10).once("value", snapshot => {

        const container = $(".notification");
        const notifications = [];

        container.empty();

        if (!snapshot.exists()) {

            container.html(
                $("<p>")
                    .addClass("empty")
                    .text("No notifications")
            );

            $(".notification-count")
                .removeClass("active")
                .text("");

            return;
        }

        snapshot.forEach(data => {
            notifications.unshift({
                timestamp: Number(data.key),
                ...data.val()
            });
        });

        notifications.forEach(value => {

            const newMessage = `You received a new message from <span>${value.name}</span>.`;
            const newVisitor = "Someone visited the website.";

            const title = value.type === "message" ? "New Message" : "New Visitor";
            const message = value.type === "message" ? newMessage : newVisitor

            container.append(
                $("<div>")
                    .attr("onclick", value.type === "message"
                        ? `messageActions('${value.id}', 'info')`
                        : `visitorActions('${value.visitorId}', 'info')`)

                    .addClass(`notification-item ${value.status === "unread"
                        ? "active"
                        : ""}`)

                    .append(
                        $("<div>").append(
                            $("<span>")
                                .addClass("title")
                                .text(title),

                            $("<span>")
                                .addClass("time")
                                .text(formatTime(value.timestamp))
                        ),

                        $("<p>")
                            .addClass("message")
                            .html(message)
                    )
            );
        });

        const unreadCount = notifications.filter(
            notification => notification.status === "unread"
        ).length;

        $(".notification-count")
            .toggleClass("active", unreadCount > 0)
            .text(unreadCount > 0 ? unreadCount : "");

        $(".notification-link").toggleClass("active", unreadCount > 0)
    });
};


const deleteNotification = () => {

    db.notifications.once("value", snapshot => {

        const updates = {};

        snapshot.forEach(data => {
            updates[`${data.key}/status`] = "read";
        });

        db.notifications.update(updates)
            .then(() => initNotification())
            .catch(error => console.error(error));
    });
};


const initSettings = () => {

    const settingsMap = {

        appLive: value => {
            if (value) {
                if (value && $("body").hasClass("blank-page") && !window.location.pathname.includes("index.html")) {
                    window.location.replace("index.html");
                }

                $(".appLiveText").text("LIVE");
            }

            else {
                if (!value && $("body").hasClass("index-page") && !window.location.pathname.includes("blank.html")) {
                    window.location.replace("blank.html");
                }

                $(".appLiveText").text("BLOCK");
            }

            setTimeout(() => {
                $(".pre-loader").addClass("hide");
            }, 500);

        },

        dashboardLock: value => {
            if (value) {
                $(".dashboard").removeClass("hide");
                $(".dashboardLockText").text("ON");
            }

            else {
                $(".dashboard").addClass("hide");
                $(".dashboardLockText").text("OFF");
            }
        },

        hueTheme: value => {
            if (value) {
                $(".hueThemeText").text("ON");
            }

            else {
                $(".hueThemeText").text("OFF");
            }

            setTheme();
        },

        appMode: value => {
            $(".appModeText").text(value);
        }
    };

    Object.entries(settingsMap).forEach(([item, setting]) => {

        db.settings.child(item).on("value", data =>
            setting(data.val())
        )
    });
};


const initTable = () => {

    let fileCount = 1,
        visitorCount = 1,
        messageCount = 1;

    db.files.on("child_added", data => {

        const value = data.val();

        $(".files-data").append(
            $("<tr>").attr("id", value.fileId).append(
                $("<td>").text(fileCount++),
                $("<td>").text(value.fileName),
                $("<td>").addClass("file-format1 text-center").text(value.fileFormat.toUpperCase()),
                $("<td>").html(`<div class="action">
                                    <span class="material-symbols-outlined icon" onclick="fileActions('${value.fileId}', 'link')">link</span>
                                    <span class="material-symbols-outlined icon" onclick="fileActions('${value.fileId}', 'delete')">delete</span>
                                </div>`)
            )
        );
    });

    db.visitors.on("child_added", data => {

        const value = data.val();

        $(".visitors-data").append(
            $("<tr>").attr("id", data.key).append(
                $("<td>").text(visitorCount++),
                $("<td>").text(value.visitorId),
                $("<td>").addClass("text-center").text(value.browserInfo?.deviceType || "-"),
                $("<td>").addClass("text-center date").text(formatTime(value.visits?.firstVisit)),
                $("<td>").addClass("text-center").text(value.visits?.visitCount || 0),
                $("<td>").html(`<div class="action">
                                    <span class="material-symbols-outlined icon" onclick="visitorActions('${value.visitorId}', 'info')">info</span>
                                </div>`)
            )
        );
    });

    db.messages.on("child_added", data => {

        const value = data.val();

        $(".messages-data").append(
            $("<tr>").attr("id", value.id).append(
                $("<td>").text(messageCount++),
                $("<td>").text(value.name),
                $("<td>").text(value.email.toLowerCase()),
                $("<td>").text(formatTime(data.key)),
                $("<td>").html(`<div class="action">
                                    <span class="material-symbols-outlined icon" onclick="messageActions('${value.id}','info')">info</span>
                                    <span class="material-symbols-outlined icon" onclick="messageActions('${value.id}','mail')">mail</span>
                                </div>`)
            )
        );
    });
};


const messageActions = async (uid, type) => {

    try {
        const snap = await db.messages.child(uid).once("value");

        if (!snap.exists()) {
            return;
        }

        const value = snap.val();

        if (type === "info") {

            $(".txtName").text(value.name || "None");
            $(".txtEmail").text(value.email || "None");
            $(".txtMessage").empty();

            db.messages.child(uid).child("message").off("child_added");

            db.messages.child(uid).child("message").on("child_added", val => {

                $(".txtMessage").append(`
                    <li>
                        <span class="timestamp">${formatTime(val.key) || "None"}</span>
                        <span class="message">${val.val() || "None"}</span>
                    </li>
                `);
            });

            await db.messages.child(uid).update({ status: "read" });

            toggleDialog("window-message");
        }

        else if (type === "mail") {
            window.location.href = `mailto:${value.email}?subject=From: Sujith Guna (sujith-g.web.app)&body=Hello,`;
        }
    }

    catch (error) {
        console.error("Message Action Error:", error);
    }
};


const visitorActions = async (visitorId) => {

    try {
        const snap = await db.visitors.child(visitorId).once("value");

        if (!snap.exists()) {
            return;
        }

        const value = snap.val();

        $(".txtDeviceType").text(value.browserInfo?.deviceType || "--");
        $(".txtTotalVisit").text(value.visits?.visitCount || 0);
        $(".txtFirstVisit").text(value.visits?.firstVisit ? formatTime(value.visits.firstVisit) : "--");
        $(".txtLastVisit").text(value.visits?.lastVisit ? formatTime(value.visits.lastVisit) : "--");
        $(".visit-list").empty();

        const visits = value.visits || {};

        Object.keys(visits)
            .filter(key => key.startsWith("visit_"))
            .sort((a, b) => { return parseInt(a.split("_")[1]) - parseInt(b.split("_")[1]); })
            .forEach(key => {
                const visit = visits[key];
                const html = `
                        <div class="visit-card">
                            <h5>${key.replace("_", " ").toUpperCase()}</h5>
                            <div class="item">
                                <label>Location</label>
                                <span>:</span>
                                <span>${visit.city + ", " + visit.country || "--"}</span>
                            </div>
                            <div class="item">
                                <label>Coordinates:</label>
                                <span>:</span>
                                <span>${visit.latitude + ", " + visit.latitude || "--"}</span>
                            </div>
                            <div class="item">
                                <label>IP Address:</label>
                                <span>:</span>
                                <span> ${visit.ip || "--"}</span>
                            </div>
                            <div class="item">
                                <label>Time:</label>
                                <span>:</span>
                                <span>${formatTime(visit.timestamp) || "--"}</span>
                            </div>
                        </div>`;
                $(".visit-list").append(html);
            });

        toggleDialog("window-visitor");
    }

    catch (error) {
        console.error("Visitor Action Error:", error);
    }
};


const fileActions = async (fileId, type) => {

    try {
        const snap = await db.files.child(fileId).once("value");

        if (!snap.exists()) {
            return;
        }

        const file = snap.val();

        if (type === "link") {
            return window.open(file.fileLink, "_blank");
        }

        if (type === "delete" && confirm(`Delete ${file.fileName}?`)) {

            await db.stFiles.child(file.fileName).delete();
            await db.files.child(fileId).remove();

            $(`#${fileId}`).hide();
        }
    }

    catch (error) {
        console.error("File Action Error:", error);
    }
};


const updateSettings = async selector => {

    try {
        const snap = await db.settings.child(selector).once("value");

        await db.settings.update({
            [selector]: !snap.val()
        });
    }

    catch (error) {
        console.error("Update Settings Error:", error);
    }
};