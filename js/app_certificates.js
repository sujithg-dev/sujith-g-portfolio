db.files.on("child_added", data => {
    const value = data.val();
    
    if (value.fileType === "certificate") {

        const imgContainer = $("<div>").addClass("img-preview").text("Loading");

        const row = $("<tr>").attr("id", value.fileId).append(
            $("<td>").html(`<h3>${value.fileName}</h3><span>${value.certInstitute || ""}</span>`),
            $("<td>").append(imgContainer)
        );

        $("#certTable").append(row);

        const img = new Image();
        img.src = value.fileLink;

        img.onload = () => {
            $(img).attr("loading", "lazy").css("cursor", "pointer").on("click", () => { window.open(value.fileLink, "_blank", "width=1200,height=600");});
            imgContainer.empty().append(img);
        };

        img.onerror = () => {
            imgContainer.text("Failed to load");
        };
    }
});