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
    initTheme();
    initSettings();
    initTable();
    initNotification();
    if (!isLocalhost())
        initVisitor();
});

const initVisitor = async () => {

    let visitorId = localStorage.getItem("visitorId");

    if (!visitorId) {
        visitorId = crypto.randomUUID();
        localStorage.setItem("visitorId", visitorId);
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
                time: timestamp
            };
        } catch (err) {
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
    } else {
        let count = snapshot.val().visits?.visitCount || 0;
        count++;

        await visitorRef.update({
            ["visits/visitCount"]: count,
            ["visits/LastVisit"]: timestamp,
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
                    .addClass("empty-notification")
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
                    .addClass("notification-item")
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

        const count = notifications.length;

        $(".notification-count")
            .toggleClass("active", count > 0)
            .text(count > 0 ? count : "");
    });
};


const initSettings = () => {
    const settingsMap = {
        appLive: value => {
            if (value) {
                if (value && $("body").hasClass("blank-page") && !window.location.pathname.includes("index.html"))
                    window.location.replace("index.html");
                $(".appLiveText").text("LIVE");
            }
            else {
                if (!value && $("body").hasClass("index-page") && !window.location.pathname.includes("blank.html"))
                    window.location.replace("blank.html");
                $(".appLiveText").text("BLOCK");
            }

            setTimeout($(".pre-loader").addClass("hide"), 100);
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
            if (value)
                $(".hueThemeText").text("ON");

            else
                $(".hueThemeText").text("OFF");

            setTheme();
        },

        appMode: value => {
            $(".appModeText").text(value);
        }
    };

    Object.entries(settingsMap).forEach(([item, setting]) =>
        db.settings.child(item).on("value", data =>
            setting(data.val())
        )
    );
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
                                    <span class="material-symbols-outlined icon"onclick="fileActions('${value.fileId}', 'link')">link</span>
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


const messageActions = (uid, type) => {

    db.messages.child(uid).once("value", snap => {

        const value = snap.val();

        if (type === "info") {
            $(".window-message header h6").empty();
            $(".txtMessage").empty();
            $(".txtName").text(value.name);
            $(".txtEmail").text(value.email);

            let count = 0;

            db.messages.child(uid).child("message").on("child_added", val => {
                count++;
                $(".txtMessage").append(
                    `<li>
                        <span class="timestamp">${formatTime(val.key) || "None"}</span>
                        <span class="message">${val.val() || "None"}</span>
                    </li>`);
            });

            db.messages.child(uid).update({ status: "read" });
            toggleDialog("window-message");
        }

        else if (type === "mail")
            window.location = `mailto:${value.email}?subject=From: Sujith Guna (sujith-g.web.app)&body=Hello,`;
    });
};


const visitorActions = (visitorId) => {

    db.visitors.child(visitorId).once("value").then((snapshot) => {

        const data = snapshot.val();

        if (!data) return;

        $(".txtDeviceType").text(data.browserInfo?.deviceType || "--");
        $(".txtTotalVisit").text(data.visits?.visitCount || 0);
        $(".txtFirstVisit").text(data.visits?.firstVisit ? formatTime(data.visits.firstVisit) : "--");
        $(".txtLastVisit").text(data.visits?.lastVisit ? formatTime(data.visits.lastVisit) : "--");
        $(".visit-list").empty();

        const visits = data.visits || {};

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
                                <span>${visit.address || "--"}</span>
                            </div>
                            <div class="item">
                                <label>Coordinates:</label>
                                <span>:</span>
                                <span>${visit.coordinates || "--"}</span>
                            </div>
                            <div class="item">
                                <label>IP Address:</label>
                                <span>:</span>
                                <span> ${visit.ip || "--"}</span>
                            </div>
                            <div class="item">
                                <label>Time:</label>
                                <span>:</span>
                                <span>${formatTime(visit.time) || "--"}</span>
                            </div>
                        </div>`;
                $(".visit-list").append(html);
            });

        toggleDialog("window-visitor");
    }).catch(error => { });
};


const fileActions = (fileId, type) => {

    db.files.child(fileId).once("value", snap => {

        if (type === "link")
            window.open(snap.val().fileLink);

        if (type === "delete" && confirm(`Delete ${snap.val().file}?`)) {
            db.stFiles.child(snap.val().fileName).delete();
            db.files.child(fileId).remove();
            $(`#${fileId}`).hide();
        }
    });
};


const updateSettings = (selector) => {

    db.settings.child(selector).once("value").then(snapshot =>
        db.settings.update({
            [selector]: !snapshot.val()
        })
    );
};