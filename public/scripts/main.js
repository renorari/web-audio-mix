const fileList = [];
const fileInput = document.querySelector(".file-input");
const filesContainer = document.getElementById("files");
const submitButton = document.getElementById("upload-button");

function updateFileList() {
    filesContainer.innerHTML = "";

    if (fileList.length > 0) {
        submitButton.removeAttribute("disabled");

        fileList.forEach((file, index) => {
            const fileItem = document.createElement("div");
            fileItem.className = "message is-light file-item";
            const fileHeader = document.createElement("div");
            fileHeader.className = "message-header";
            fileHeader.style.borderRadius = "var(--bulma-message-header-radius)";
            const fileName = document.createElement("p");
            fileName.textContent = file.name;
            const deleteButton = document.createElement("button");
            deleteButton.className = "delete";
            deleteButton.setAttribute("aria-label", "delete");
            deleteButton.addEventListener("click", () => {
                fileList.splice(index, 1);
                fileItem.remove();
            });
            fileHeader.appendChild(fileName);
            fileHeader.appendChild(deleteButton);
            fileItem.appendChild(fileHeader);
            filesContainer.appendChild(fileItem);
        });
    } else {
        submitButton.setAttribute("disabled", "true");

        const noFilesMessage = document.createElement("p");
        noFilesMessage.textContent = "ファイルが選択されていません。";
        filesContainer.appendChild(noFilesMessage);
    }
}

// ファイルが選択されたとき
fileInput.addEventListener("change", (event) => {
    // 選択されたファイルをfileListに追加
    const selectedFiles = Array.from(event.target.files);
    fileList.push(...selectedFiles);

    // fileListの重複を排除
    const uniqueFilesMap = new Map();
    fileList.forEach(file => {
        uniqueFilesMap.set(file.name, file);
    });
    fileList.length = 0; // 既存の配列をクリア
    uniqueFilesMap.forEach(file => fileList.push(file));

    // 表示を更新
    updateFileList();
});

// 初期表示
updateFileList();
