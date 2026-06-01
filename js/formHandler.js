
const inputError = input => {
    input.addClass("error").focus();
    setTimeout(() => input.removeClass("error"), 1000);
};

const formOutput = (form, type, message) => {

    const output = $(form);

    const color = {
        error: "rgb(255, 50, 50)",
        success: "rgb(0, 180, 0)"
    };

    const background = {
        error: "rgba(255, 50, 50, 0.2)",
        success: "rgba(0, 180, 0, 0.2)"
    };

    output
        .text(message)
        .css("color", color[type])
        .css("background", background[type])
        .addClass("show");

    setTimeout(() => { output.text("").removeClass("show"); }, 3000);
};


const handleContactForm = ({ form, fields, output }) => {

    $(form).on("click", async () => {

        const { timestamp, formattedTime } = getTime();

        const name = fields.name?.val()?.trim();
        const email = fields.email?.val()?.trim().toLowerCase();
        const message = fields.message?.val()?.trim();

        if (!name || name.length < 3)
            return inputError(fields.name);

        if (!/^\S+@\S+\.\S+$/.test(email))
            return inputError(fields.email);

        if (!message)
            return inputError(fields.message);

        try {
            const snap = await db.messages.orderByChild("email").equalTo(email).once("value");

            if (snap.exists()) {

                const id = Object.keys(snap.val())[0];
                const data = snap.val()[id];

                await db.messages.update({
                    [`${id}/received`]: formattedTime,
                    [`${id}/status`]: "unread",
                    [`${id}/totalMessages`]: (data.totalMessages || 0) + 1,
                    [`${id}/message/${timestamp}`]: message
                });
            } else {
                await db.messages.child(timestamp).set({
                    id: timestamp,
                    name,
                    email,
                    message: { [timestamp]: message },
                    received: formattedTime,
                    totalMessages: 1,
                    status: "unread"
                });
            }

            await db.notifications.child(timestamp).set({
                id: timestamp,
                name,
                email,
                type: "message",
                received: formattedTime,
                status: "unread"
            });

            formOutput(output, "success", "Message sent successfully.");

            Object.values(fields).forEach(field => {
                if (field?.val)
                    field.val("");
            });

        }

        catch (error) { formOutput(output, "error", error?.message || "Something went wrong."); }
    });
};


const handleLoginForm = ({ form, fields, output }) => {

    $(form).on("click", async e => {

        if (!fields.password.val())
            return inputError(fields.password);

        db.settings.child("dashboardPin").once("value").then(data => {

            if (fields.password.val() !== data.val())
                formOutput(".login-form-output", "error", "Wrong Password!");

            else
                $(".dashboard").addClass("hide");

            fields.password.val("");
        });
    });
};


const handlePasswordForm = ({ form, fields, output }) => {

    $(form).on("click", async e => {

        if (!fields.currentPassword.val())
            return inputError(fields.currentPassword);

        if (!fields.newPassword.val())
            return inputError(fields.newPassword);

        if (!fields.confirmPassword.val())
            return inputError(fields.confirmPassword);

        db.settings.child("dashboardPin").once("value").then(snap => {

            if (fields.currentPassword.val() !== snap.val())
                return formOutput(".password-form-output", "error", "Incorrect current password!");

            if (fields.newPassword.val() !== fields.confirmPassword.val())
                return formOutput(".password-form-output", "error", "Password doesn't match with current password!");

            if (fields.confirmPassword.val() == snap.val())
                return formOutput(".password-form-output", "error", "New Password must not be current password!");

            db.settings.update({ dashboardPin: fields.confirmPassword.val() }, error => {
                formOutput(".password-form-output", error ? "error" : "success", error || "Password changed successfully");
            });

            fields.currentPassword.val("");
            fields.newPassword.val("");
            fields.confirmPassword.val("")
        });
    });
};


const handleFileUploadForm = ({ form, fields, output }) => {

    let files = 0;

    const selectors = {
        fileText: ".fileUpload-form-output",
        filePreview: ".fileUpload-preview",
        fileView: ".file-view",
        fileName: ".infileName",
        fileFormat: ".file-format",
    };

    const reset = () => {

        $(selectors.filePreview).removeClass("show");
        $(selectors.fileName).val("");
        $(selectors.fileFormat).remove();
        $(selectors.filePreview).attr('data-text', ``).removeClass("uploading");

        setTimeout(() => $(selectors.fileView).attr("src", ""), 500);

        files = 0;
    };

    $(form.reset).on("click", e => {
        reset();
    });

    $(form.attach).on("click", e => {

        const input = $("<input>").attr({ type: "file", accept: "image/*,.pdf" })[0];

        input.onchange = e => {

            files = e.target.files[0];

            if (!files)
                return;

            const name = files.name.lastIndexOf(".") !== -1
                ? files.name.slice(0, files.name.lastIndexOf("."))
                : files.name;

            const type = files.name.lastIndexOf(".") !== -1
                ? files.name.slice(files.name.lastIndexOf(".") + 1).toLowerCase()
                : "";

            if (!(type === "pdf" || files.type.startsWith("image/")))
                return formOutput(selectors.fileText, "error", "Only Images and PDF files are allowed!");

            const reader = new FileReader();

            reader.onload = () => {

                const preview = type === "pdf"
                    ? `<span class="file-format"></span><iframe src="${reader.result}#toolbar=0" width="100%" height="500px"></iframe>`
                    : `<span class="file-format"></span><img src="${reader.result}" class="file-view" />`;

                $(selectors.filePreview).html(preview).addClass("show");
                $(fields.fileName).val(name);
                $(selectors.fileFormat).text(type);
            };

            reader.readAsDataURL(files);
        };

        input.click();
    });

    $(form.upload).on("click", e => {

        if (!files)
            return formOutput(selectors.fileText, "error", "Select file");

        if (!fields.fileName.val())
            return inputError(fields.fileName);

        const { timestamp, date, time } = getTime();

        const filename = $(selectors.fileName).val() + "." + $(selectors.fileFormat).text();
        const uploadTask = db.stFiles.child(filename).put(files);

        uploadTask.on("state_changed",
            snap => {
                const progress = (snap.bytesTransferred / snap.totalBytes) * 100;

                $(selectors.filePreview)
                    .attr('data-text', `${progress.toFixed(0)}%`)
                    .addClass("uploading");
            },

            error => formOutput(selectors.fileText, "error", error),

            () => {
                uploadTask.snapshot.ref.getDownloadURL().then(url => {
                    db.files.child(timestamp).set({
                        fileId: timestamp,
                        fileName: filename,
                        fileFormat: $(selectors.fileFormat).text(),
                        fileLink: url,
                        uploadedAt: timestamp
                    });

                    reset();

                    formOutput(selectors.fileText, "success", "File uploaded successfully");
                });
            }
        );
    });
};


handleContactForm({
    form: ".submit-contact-form",
    fields: {
        name: $(".inName"),
        email: $(".inEmail"),
        message: $(".inMessage")
    },
    output: ".contact-form-output"
});


handleLoginForm({
    form: ".dashboard-login",
    fields: {
        password: $(".inPassword")
    },
    output: ".login-form-output"
});


handlePasswordForm({
    form: ".change-password",
    fields: {
        currentPassword: $(".inCurrentPassword"),
        newPassword: $(".inNewPassword"),
        confirmPassword: $(".inConfirmPassword")
    },
    output: ".password-form-output"
})


handleFileUploadForm({
    form: {
        upload: ".upload-file",
        attach: ".attach-file",
        reset: ".reset-file"
    },
    fields: {
        fileName: $(".infileName"),
    },
    output: ".fileUpload-form-output"
})

