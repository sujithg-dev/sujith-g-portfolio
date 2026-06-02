
const inputError = input => {

    input
        .addClass("error")
        .focus();

    setTimeout(() => {
        input.removeClass("error")
    }, 1000);
};


const formOutput = (form, type, message) => {

    const output = $(form);

    const color = {
        error: "rgb(255, 50, 50)",
        success: "rgb(0, 180, 0)"
    };

    const background = {
        error: "rgba(255, 50, 50, 0.25)",
        success: "rgba(0, 180, 0, 0.25)"
    };

    output
        .text(message)
        .css("color", color[type])
        .css("background", background[type])
        .addClass("show");

    setTimeout(() => {
        output.text("").removeClass("show");
    }, 2500);
};


const handleContactForm = ({ form, fields, output }) => {

    $(form).on("click", async () => {

        const { timestamp, formattedTime } = getTime();

        const name = fields.name.val()?.trim();
        const email = fields.email.val()?.trim();
        const message = fields.message.val()?.trim();

        try {
            const snap = await db.messages.orderByChild("email").equalTo(email).once("value");

            if (!name || name.length < 3) {
                return inputError(fields.name);
            }

            if (!/^\S+@\S+\.\S+$/.test(email)) {
                return inputError(fields.email);
            }

            if (!message) {
                return inputError(fields.message);
            }

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

                if (field?.val) {
                    field.val("");
                }
            });

        }

        catch (error) {
            formOutput(output, "error", error?.message || "Something went wrong. Please try again later.");
        }
    });
};


const handleLoginForm = ({ form, fields, output }) => {

    $(form).on("click", async e => {

        try {
            const snap = await db.settings.child("password").once("value");

            if (!fields.password.val()) {
                return inputError(fields.password);
            }

            if (fields.password.val() !== snap.val()) {
                formOutput(output, "error", "Wrong Password!");
            }

            else {
                $(".dashboard").addClass("hide");
            }

            fields.password.val("");
        }

        catch (error) {
            formOutput(output, "error", "Unable to verify password! Please try later.");
        }
    });
};


const handlePasswordForm = ({ form, fields, output }) => {

    $(form).on("click", async e => {

        try {
            const snap = await db.settings.child("password").once("value");

            if (!fields.currentPassword.val()) {
                return inputError(fields.currentPassword);
            }

            if (!fields.newPassword.val()) {
                return inputError(fields.newPassword);
            }

            if (!fields.confirmPassword.val()) {
                return inputError(fields.confirmPassword);
            }

            if (fields.currentPassword.val() !== snap.val()) {
                return formOutput(output, "error", "Incorrect current password!");
            }

            if (fields.newPassword.val() !== fields.confirmPassword.val()) {
                return formOutput(output, "error", "Password do not match!");
            }

            if (fields.confirmPassword.val() === snap.val()) {
                return formOutput(output, "error", "New password must not be the current password!");
            }

            await db.settings.update({
                password: fields.confirmPassword.val()
            });

            formOutput(output, "success", "Password changed successfully");

            fields.currentPassword.val("");
            fields.newPassword.val("");
            fields.confirmPassword.val("");
        }

        catch (error) {
            formOutput(output, "error", "Something went wrong! Please try later.");
        }
    });
};


const handleFileUploadForm = ({ form, fields, output }) => {

    let attachedFile = null;

    const selectors = {
        file: ".file",
        filePreview: ".file-preview",
        fileName: ".infileName",
        fileFormat: ".file-format",
    };

    const reset = () => {

        $(selectors.filePreview)
            .removeClass("show uploading")
            .attr("data-text", "");

        $(selectors.fileName).val("");
        $(selectors.fileFormat).remove();

        setTimeout(() => {
            $(selectors.file).attr("src", "");
        }, 1000);

        attachedFile = null;
    };

    $(form.reset).on("click", reset);

    $(form.attach).on("click", () => {

        const input = $("<input>").attr({
            type: "file",
            accept: "image/*,.pdf"
        })[0];

        input.onchange = e => {

            attachedFile = e.target.files[0];

            if (!attachedFile) {
                return;
            }

            const name = attachedFile.name.includes(".")
                ? attachedFile.name.substring(0, attachedFile.name.lastIndexOf("."))
                : attachedFile.name;

            const type = attachedFile.name.includes(".")
                ? attachedFile.name.substring(attachedFile.name.lastIndexOf(".") + 1).toLowerCase()
                : "";

            if (!(type === "pdf" || attachedFile.type.startsWith("image/"))) {
                return formOutput(output, "error", "Only Images and PDF files are allowed!");
            }

            const reader = new FileReader();

            reader.onload = () => {

                const preview = type === "pdf"
                    ? `<span class="file-format"></span><iframe src="${reader.result}#toolbar=0" width="100%" height="500"></iframe>`
                    : `<span class="file-format"></span><img src="${reader.result}" class="file">`;

                $(selectors.filePreview)
                    .html(preview)
                    .addClass("show");

                fields.fileName.val(name);
                $(selectors.fileFormat).text(type);
            };

            reader.readAsDataURL(attachedFile);
        };

        input.click();
    });

    $(form.upload).on("click", async () => {

        if (!attachedFile) {
            return formOutput(output, "error", "Select file");
        }

        if (!fields.fileName.val()) {
            return inputError(fields.fileName);
        }

        const { timestamp } = getTime();

        const filename = `${fields.fileName.val()}.${$(selectors.fileFormat).text()}`;

        try {
            const uploadTask = db.stFiles.child(filename).put(attachedFile);

            uploadTask.on("state_changed", snap => {

                const progress = (snap.bytesTransferred / snap.totalBytes) * 100;

                $(selectors.filePreview)
                    .attr("data-text", `${progress.toFixed(0)}%`)
                    .addClass("uploading");
            });

            await uploadTask;

            const url = await uploadTask.snapshot.ref.getDownloadURL();

            await db.files.child(timestamp).set({
                fileId: timestamp,
                fileName: filename,
                fileFormat: $(selectors.fileFormat).text(),
                fileLink: url,
                uploadedAt: timestamp
            });

            reset();

            formOutput(output, "success", "File uploaded successfully");
        }

        catch (error) {
            formOutput(output, "error", error?.message || "Upload failed.");
        }
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
});


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
});