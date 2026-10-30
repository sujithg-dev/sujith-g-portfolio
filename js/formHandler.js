const inputError = (input, message) => {

    const parent = input.closest(".input-item");

    parent
        .attr("data-error", message)
        .addClass("error");

    input
        .addClass("error")
        .focus();

    setTimeout(() => {

        input.removeClass("error");

        parent
            .removeClass("error")
            .removeAttr("data-error");

    }, 1000);
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

    setTimeout(() => {
        output
            .text("")
            .removeClass("show");
    }, 2500);
};

const handleContactForm = ({ action, fields, output }) => {

    const clearFields = () => Object.values(fields).forEach(field => field?.val?.(""));

    $(action).on("click", async () => {

        const userName = fields.userName.val();
        const userEmail = fields.userEmail.val();
        const userMessage = fields.userMessage.val();

        if (!userName)
            return inputError(fields.userName, "Required");

        if (!/^[A-Za-z]+(?:\s[A-Za-z]+)*$/.test(userName) || userName.length < 3)
            return inputError(fields.userName, "Invalid name");

        if (!userEmail)
            return inputError(fields.userEmail, "Required");

        if (!/^\S+@\S+\.\S+$/.test(userEmail))
            return inputError(fields.userEmail, "Invalid email address");

        if (!userMessage)
            return inputError(fields.userMessage, "Required");

        try {
            const snapshot = await db.messages.orderByChild("email").equalTo(userEmail).once("value");

            const { timestamp, formattedTime } = getTime();

            if (snapshot.exists()) {

                const [id] = Object.keys(snapshot.val());
                const data = snapshot.val()[id];

                await db.messages.update({
                    [`${id}/timestamp`]: timestamp,
                    [`${id}/totalMessages`]: (data.totalMessages || 0) + 1,
                    [`${id}/status`]: "unread",
                    [`${id}/message/${timestamp}`]: userMessage
                });

                await db.notifications.update({
                    [`${id}/timestamp`]: timestamp,
                    [`${id}/status`]: "unread"
                });
            }
            else {

                const payload = {
                    id: timestamp,
                    name: userName,
                    email: userEmail,
                    received: formattedTime,
                    timestamp,
                    status: "unread"
                };

                await db.messages.child(timestamp).set({
                    ...payload,
                    totalMessages: 1,
                    message: {
                        [timestamp]: userMessage
                    }
                });

                await db.notifications.child(timestamp).set({
                    ...payload,
                    type: "message"
                });
            }

            formOutput(output, "success", "Message sent successfully.");
            clearFields();
        }

        catch (error) {
            formOutput(output, "error", error.message);
        }
    });
};

const handleLoginForm = ({ action, fields, output }) => {

    const clearFields = () => Object.values(fields).forEach(field => field?.val?.(""));

    $(action).on("click", async () => {

        const password = getCode();

        if (!password) {
            return inputError(fields.password);
        }

        try {
            const snapshot = await db.settings.child("password").once("value");

            if (password === snapshot.val()) {
                resetPin();
                $(".dashboard").addClass("hide");
            }
            else {
                formOutput(output, "error", "Incorrect password!");
                resetPin();
                inputError(fields.password);
            }

            clearFields();

        }

        catch (error) {
            formOutput(output, "error", error.message);
        }
    });
};

const handlePasswordForm = ({ action, fields, output }) => {

    const clearFields = () => Object.values(fields).forEach(field => field?.val?.(""));

    $(action).on("click", async () => {

        const currentPassword = fields.currentPassword.val()?.trim();
        const newPassword = fields.newPassword.val()?.trim();
        const confirmPassword = fields.confirmPassword.val()?.trim();

        if (!currentPassword)
            return inputError(fields.currentPassword);

        if (!newPassword)
            return inputError(fields.newPassword);

        if (!confirmPassword)
            return inputError(fields.confirmPassword);

        try {
            const snapshot = await db.settings.child("password").once("value");
            const password = snapshot.val();

            if (currentPassword !== password)
                return formOutput(output, "error", "Incorrect password!");

            if (newPassword === password)
                return formOutput(output, "error", "New password must not be the current password!");

            if (newPassword !== confirmPassword)
                return formOutput(output, "error", "New Password and confirm password must be same!");

            await db.settings.update({ password: confirmPassword });

            formOutput(output, "success", "Password changed!");
            clearFields();
        }

        catch (error) {
            formOutput(output, "error", error.message);
        }
    });
};

const handleFileUploadForm = ({ action, fields, output }) => {

    let file = null;
    let fileName = "";
    let fileType = "";

    const reset = () => {

        $(".reset, .upload").prop('disabled', true);


        fields.fileName.val("");
        fields.filePreview.removeClass("show uploading");

        setTimeout(() => fields.filePreview.empty(), 500);

        file = null;
        fileName = "";
        fileType = "";
    };

    const showPreview = src => {

        fields.filePreview
            .html(
                fileType === "pdf"
                    ? `
                        <span class="file-format">${fileType}</span>
                        <iframe src="${src}#toolbar=0" width="100%" height="500"></iframe>
                    `
                    : `
                        <span class="file-format">${fileType}</span>
                        <img class="file" src="${src}">
                    `
            )
            .addClass("show");

        fields.fileName.val(fileName);
    };

    $(action.reset).on("click", reset);

    $(action.attach).on("click", () => {

        const input = $("<input>", {
            type: "file",
            accept: "image/*,.pdf"
        });

        input.on("change", e => {

            file = e.target.files[0];

            if (!file)
                return;

            const parts = file.name.split(".");
            fileType = parts.length > 1 ? parts.pop().toLowerCase() : "";
            fileName = parts.join(".") || file.name;

            if (fileType !== "pdf" && !file.type.startsWith("image/"))
                return formOutput(output, "error", "Only Images and PDF files can be uploaded!");

            const reader = new FileReader();
            reader.onload = () => showPreview(reader.result);
            reader.readAsDataURL(file);

            $(".reset, .upload").prop('disabled', false);
        });

        input.trigger("click");
    });

    $(action.upload).on("click", async () => {

        if (!file)
            return formOutput(output, "error", "Select file");

        if (!fields.fileName.val())
            return inputError(fields.fileName);

        const { timestamp } = getTime();
        const filename = `${fileName}.${fileType}`;

        try {
            const uploadTask = db.stFiles.child(filename).put(file);

            uploadTask.on("state_changed", snap => {

                const progress =
                    (snap.bytesTransferred / snap.totalBytes) * 100;

                fields.filePreview
                    .attr("data-text", `${progress.toFixed(0)}%`)
                    .addClass("uploading");
            });

            await uploadTask;

            const url = await uploadTask.snapshot.ref.getDownloadURL();

            await db.files.child(timestamp).set({
                fileId: timestamp,
                fileName: filename,
                fileFormat: fileType,
                fileLink: url,
                uploadedAt: timestamp
            });

            formOutput(output, "success", "File uploaded successfully");
            reset();
        }

        catch (error) {
            formOutput(output, "error", error.message);
        }
    });
};

handleContactForm({
    action: ".submit-contact-form",
    fields: {
        userName: $(".user-name"),
        userEmail: $(".user-email"),
        userMessage: $(".user-message")
    },
    output: ".contact-form-output"
});

handleLoginForm({
    action: ".dashboard-login",
    fields: {
        password: $(".password")
    },
    output: ".login-form-output"
});

handlePasswordForm({
    action: ".change-password",
    fields: {
        currentPassword: $(".current-password"),
        newPassword: $(".new-password"),
        confirmPassword: $(".confirm-password")
    },
    output: ".password-form-output"
});

handleFileUploadForm({
    action: {
        upload: ".upload",
        attach: ".attach",
        reset: ".reset"
    },
    fields: {
        file: $(".file"),
        filePreview: $(".file-preview"),
        fileName: $(".file-name"),
        fileFormat: $(".file-format")
    },
    output: ".file-form-output"
});