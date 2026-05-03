window.addEventListener("load", () => {
    tableData();
});

// ---------------- Toggle Dialog ----------------
function toggleDialog(selector) {
    formOutput(".form-text", "clear");
    const dialog = $(`.${selector}`).first()[0];
    dialog.open ? dialog.close() : dialog.showModal();
}

// ---------------- Messages Actions ----------------
function messagePop(id, type) {
    const uid = $(id).closest("tr").attr("id");
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
                        <span class="timestamp">${val.key || "None"}</span>
                        <span class="message">${val.val() || "None"}</span>
                    </li>`);
            });
            $(".window-message header h6").append('Messages: <span class="meesage-count">' + count + '</span>');
            db.messages.child(uid).update({ status: "read" });
            toggleDialog("window-message");
        } else if (type === "mail") {
            window.location = `mailto:${value.email}?subject=From: Sujith Guna (sujith-g.web.app)&body=Hello,`;
        }
    });
}

// ---------------- Files Actions ----------------
function filePop(id, type) {
    const fid = $(id).closest("tr").attr("id");
    db.files.child(fid).once("value", snap => {
        const v = snap.val();
        if (type === "link") window.open(v.fileLink);
        if (type === "delete" && confirm(`Delete ${v.file}?`)) {
            db.files.child(fid).remove();
            db.stFiles.child(v.file).delete();
            $(`#${fid}`).hide();
        }
    });
}

// ---------------- Get Data (Messages and Files) ----------------
function tableData() {
    let fileCount = 1,
        userCount = 1,
        messageCount = 1;

    db.files.on("child_added", data => {
        const value = data.val();
        $(".files-data").append(
            $("<tr>").attr("id", value.fileId).append(
                $("<td>").text(fileCount++),
                $("<td>").text(value.fileName),
                $("<td>").addClass("file-type1 text-center").text(value.fileType),
                $("<td>").addClass("file-format1 text-center").text(value.fileFormat.toUpperCase()),
                $("<td>").html(`<div class="d-flex align-items-center justify-content-center gap-2">
                                                        <span class="material-symbols-outlined" onclick="filePop(this,'link')">link</span>
                                                        <span class="material-symbols-outlined" onclick="filePop(this,'delete')">delete</span>
                                                    </div>`)
            )
        );
    });

    db.users.on("child_added", data => {
        const value = data.val();
        $(".users-data").append(
            $("<tr>").attr("id", data.key).append(
                $("<td>").text(userCount++),
                $("<td>").text(value.userId),
                $("<td>").text(value.browserInfo?.deviceType || "-"),
                $("<td>").text(value.visits?.firstVisit || "-"),
                $("<td>").text(value.visits?.LastVisit || "-"),
                $("<td>").text(value.visits?.visitCount || 0),
                $("<td>").html(`<div class="d-flex align-items-center justify-content-center gap-2">
                                    <span class="material-symbols-outlined col-text-light" onclick="userPop(this,'info')">info</span>
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
                $("<td>").html(`<div class="d-flex align-items-center justify-content-center gap-2">
                                    <span class="material-symbols-outlined col-text-light" onclick="messagePop(this,'info')">info</span>
                                    <span class="material-symbols-outlined col-text-light" onclick="messagePop(this,'mail')">mail</span>
                                </div>`)
            )
        );
    });
}

// ---------------- Update Settings ----------------
function updateSettings(selector) {
    db.settings.child(selector).once("value").then(snapshot =>
        db.settings.update({ [selector]: !snapshot.val() })
    );
}

function checkFormInput() {
    if ($(".file-type").val() == "certificate") {
        $(".in-certInstitute").removeClass("d-none");
    } else {
        $(".in-certInstitute").addClass("d-none");
    }
}

// ---------------- Toggle Table ----------------
function toggleTable(table, btn) {
    $(".table-content, .nav-btn, .table-btns").removeClass("active");
    $("." + table + ", ." + btn).addClass("active");

    if (table == "table-files") {
        $(".table-btns").addClass("active");
    }
}

// ---------------- Form Dashboard Login ----------------
$(".submit-dashboardLogin").on("click", () => {
    let pin = $(".loginPin");
    if (!pin.val()) return inputError("input", pin);

    db.settings.child("dashboardPin").once("value").then(snap => {
        if (pin.val() !== snap.val()) {
            formOutput(".login", "error", "Wrong Password", ".loginPin");
        } else {
            formOutput(".login", "clear");
            pin.val("");
            $(".dashboard").addClass("hide");
        }
    });
});

// ---------------- Form Password Change ----------------
$(".submit-passwordChange").on("click", () => {
    let cur = $(".currentPin"),
        n = $(".newPin"),
        confirm = $(".confirmPin");

    if (!cur.val()) return inputError("input", cur);
    if (!n.val()) return inputError("input", n);
    if (!confirm.val()) return inputError("input", confirm);

    db.settings.child("dashboardPin").once("value").then(snap => {
        if (cur.val() !== snap.val())
            return formOutput(".pin-text", "error", "Incorrect current password", ".currentPin");
        if (n.val() !== confirm.val())
            return formOutput(".pin-text", "error", "Confirm pin not match with current password", ".confirmPin");

        db.settings.update({ dashboardPin: confirm.val() }, err => {
            formOutput(".pin-text", err ? "error" : "success", err || "Password changed successfully");
        });
        $(".currentPin, .newPin, .confirmPin").val("");
    });
});
$(".reset-passwordChange").on("click", () => {
    formOutput(".pin-text", "clear");
    $(".currentPin, .newPin, .confirmPin").val("");
});

// ---------------- Form File Upload ----------------
const fileUploadHandler = () => {
    let files = 0;

    const selectors = {
        fileText: ".file-text",
        fileName: ".file-name",
        fileFormat: ".file-format",
        fileType: ".file-type",
        fileView: ".file-view",
        formImg: ".form-img",
        uploadBtn: ".upload-file",
        attachBtn: ".attach-file",
        resetBtn: ".reset-file",
        certInstitute: ".in-certInstitute",
    };

    const reset = () => {
        formOutput(selectors.fileText, "clear");
        $(`${selectors.fileName}, ${selectors.certInstitute}`).val("");
        $(selectors.formImg).removeClass("show");
        $(selectors.fileFormat).remove();
        $(selectors.uploadBtn).removeClass("act");
        setTimeout(() => $(selectors.fileView).attr("src", ""), 500);
        files = 0;
    };

    $(selectors.uploadBtn).on("click", () => {
        if (!files) return formOutput(selectors.fileText, "error", "Select file*");
        if (!$(selectors.fileName).val()) return inputError("input", $(selectors.fileName));

        const { timestamp, date, time } = now();
        const filename = `${$(selectors.fileName).val()}.${$(selectors.fileFormat).val()}`;
        const uploadTask = db.stFiles.child(filename).put(files);

        uploadTask.on("state_changed",
            snap => {
                const progress = (snap.bytesTransferred / snap.totalBytes) * 100;
                $(selectors.fileText)
                    .text(`Uploading... ${progress.toFixed(0)}%`)
                    .css("color", "var(--color_text)")
                    .addClass("show");
            },
            err => formOutput(selectors.fileText, "error", err),
            () => {
                uploadTask.snapshot.ref.getDownloadURL().then(url => {
                    db.files.child(timestamp).set({
                        fileId: timestamp,
                        file: filename.toLowerCase(),
                        fileName: $(selectors.fileName).val(),
                        fileType: $(selectors.fileType).val(),
                        certInstitute: $(selectors.certInstitute).val(),
                        fileFormat: $(selectors.fileFormat).text(),
                        fileLink: url,
                        uploaded: `${date} ${time}`
                    });
                    reset();
                    formOutput(selectors.fileText, "success", "File uploaded successfully");
                });
            }
        );
    });

    $(selectors.attachBtn).on("click", () => {
        formOutput(selectors.fileText, "clear");

        const input = $("<input>").attr({ type: "file", accept: "image/*,.pdf" })[0];
        input.onchange = e => {
            files = e.target.files[0];
            if (!files) return;

            const fullName = files.name;
            const lastDot = fullName.lastIndexOf(".");
            const name = lastDot !== -1 ? fullName.slice(0, lastDot) : fullName;
            const type = lastDot !== -1 ? fullName.slice(lastDot + 1).toLowerCase() : "";

            if (!(type === "pdf" || files.type.startsWith("image/")))
                return formOutput(selectors.fileText, "error", "Only Images and PDF files are allowed!");

            const reader = new FileReader();
            reader.onload = () => {
                const preview = type === "pdf"
                    ? `<span class="file-format"></span><iframe src="${reader.result}#toolbar=0" width="100%" height="500px"></iframe>`
                    : `<span class="file-format"></span><img src="${reader.result}" class="file-view" />`;

                $(selectors.formImg).html(preview).addClass("show");
                $(selectors.fileName).val(name);
                $(selectors.fileFormat).text(type);
                $(selectors.uploadBtn).addClass("act");
            };
            reader.readAsDataURL(files);
        };
        input.click();
    });

    $(selectors.resetBtn).on("click", reset);
}

// Init
fileUploadHandler();