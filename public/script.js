const postForm = document.getElementById("postForm");
const postsContainer = document.getElementById("postsContainer");
const usersContainer = document.getElementById("usersContainer");
const registerForm = document.getElementById("registerForm");
const registerMessage = document.getElementById("registerMessage");
const postUserSelect = document.getElementById("userId");
const postImageInput = document.getElementById("postImage");
const imagePreview = document.getElementById("imagePreview");

const registerModal = document.getElementById("registerModal");
const usersModal = document.getElementById("usersModal");
const openRegisterModalButton = document.getElementById("openRegisterModal");
const openUsersModalButton = document.getElementById("openUsersModal");
const closeButtons = document.querySelectorAll(".close-modal");

let savedUsers = [];
const openComments = new Set();

async function getJson(url) {
    const response = await fetch(url);
    return response.json();
}

async function postJson(url, body) {
    return fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });
}

async function postWithoutBody(url) {
    return fetch(url, {
        method: "POST"
    });
}

function openModal(modal) {
    modal.classList.remove("hidden");
}

function closeModal(modal) {
    modal.classList.add("hidden");
}

function renderUserOptions(selectElement, selectedValue = "") {
    selectElement.innerHTML = `<option value="">Velg bruker</option>`;

    savedUsers.forEach((user) => {
        const option = document.createElement("option");
        option.value = user.id;
        option.textContent = `${user.username} (ID: ${user.id})`;

        if (String(selectedValue) === String(user.id)) {
            option.selected = true;
        }

        selectElement.appendChild(option);
    });
}

async function loadUsers() {
    savedUsers = await getJson("/api/users");
    usersContainer.innerHTML = "";
    renderUserOptions(postUserSelect, postUserSelect.value);

    if (savedUsers.length === 0) {
        usersContainer.innerHTML = "<p>Ingen brukere ennå.</p>";
        return;
    }

    savedUsers.forEach((user) => {
        const userDiv = document.createElement("div");
        userDiv.className = "comment";
        userDiv.innerHTML = `
            <strong>${user.username}</strong>
            <p>${user.email}</p>
            <small>${user.bio || "Ingen bio registrert."}</small>
        `;
        usersContainer.appendChild(userDiv);
    });
}

function createCommentUserSelect(postId) {
    const selectedPostUser = postUserSelect.value;
    const options = savedUsers.map((user) => {
        const isSelected = String(user.id) === String(selectedPostUser) ? "selected" : "";
        return `<option value="${user.id}" ${isSelected}>${user.username} (ID: ${user.id})</option>`;
    }).join("");

    return `
        <label class="form-label" for="comment-user-${postId}">Kommenter som</label>
        <select id="comment-user-${postId}" name="user_id" required>
            <option value="">Velg bruker</option>
            ${options}
        </select>
    `;
}

function getCommentsButtonText(postId) {
    if (openComments.has(postId)) {
        return "Skjul kommentarer";
    }

    return "Vis kommentarer";
}

function readImageAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Could not read image"));
        reader.readAsDataURL(file);
    });
}

function resetImagePreview() {
    imagePreview.src = "";
    imagePreview.classList.add("hidden");
    postImageInput.value = "";
}

async function loadPosts() {
    const posts = await getJson("/api/posts");
    postsContainer.innerHTML = "";

    if (posts.length === 0) {
        postsContainer.innerHTML = "<p>Ingen innlegg ennå.</p>";
        return;
    }

    posts.forEach((post) => {
        const postDiv = document.createElement("div");
        postDiv.className = "post";

        const imageHtml = post.image
            ? `<img src="${post.image}" alt="Bilde i innlegg" class="post-image">`
            : "";

        postDiv.innerHTML = `
            <div class="post-top">
                <div>
                    <h3>${post.username}</h3>
                    <small>${post.created_at}</small>
                </div>
                <span class="post-badge">Innlegg</span>
            </div>
            <p>${post.content}</p>
            ${imageHtml}
            <div class="post-actions">
                <button type="button" onclick="likePost(${post.id})">Lik (${post.likes || 0})</button>
                <button type="button" onclick="toggleComments(${post.id}, this)">${getCommentsButtonText(post.id)}</button>
            </div>
            <div id="comments-${post.id}" class="comments-box"></div>
            <form onsubmit="addComment(event, ${post.id})" class="commentForm">
                ${createCommentUserSelect(post.id)}
                <input type="text" name="content" placeholder="Skriv en kommentar..." required>
                <button type="submit">Kommenter</button>
            </form>
        `;

        postsContainer.appendChild(postDiv);
    });

    for (const postId of openComments) {
        showComments(postId);
    }
}

postImageInput.addEventListener("change", async function () {
    const file = postImageInput.files[0];

    if (!file) {
        resetImagePreview();
        return;
    }

    const imageData = await readImageAsDataUrl(file);
    imagePreview.src = imageData;
    imagePreview.classList.remove("hidden");
});

postForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const userId = postUserSelect.value;
    const content = document.getElementById("content").value;
    const imageFile = postImageInput.files[0];
    let image = null;

    if (imageFile) {
        image = await readImageAsDataUrl(imageFile);
    }

    await postJson("/api/posts", {
        user_id: userId,
        content: content,
        image: image
    });

    postForm.reset();
    renderUserOptions(postUserSelect);
    resetImagePreview();
    loadPosts();
});

registerForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const username = document.getElementById("registerUsername").value;
    const email = document.getElementById("registerEmail").value;
    const password = document.getElementById("registerPassword").value;
    const bio = document.getElementById("registerBio").value;

    const response = await postJson("/api/users", {
        username: username,
        email: email,
        password: password,
        bio: bio
    });

    const result = await response.json();

    if (response.ok) {
        registerMessage.textContent = `Bruker lagret med ID ${result.id}`;
        registerForm.reset();
        await loadUsers();
        postUserSelect.value = String(result.id);
        return;
    }

    registerMessage.textContent = result.error || "Kunne ikke lagre bruker.";
});

openRegisterModalButton.addEventListener("click", function () {
    registerMessage.textContent = "";
    openModal(registerModal);
});

openUsersModalButton.addEventListener("click", async function () {
    await loadUsers();
    openModal(usersModal);
});

closeButtons.forEach((button) => {
    button.addEventListener("click", function () {
        const modalId = button.dataset.close;
        const modal = document.getElementById(modalId);
        closeModal(modal);
    });
});

async function likePost(postId) {
    await postWithoutBody(`/api/posts/${postId}/like`);
    loadPosts();
}

async function toggleComments(postId, button) {
    const commentsBox = document.getElementById(`comments-${postId}`);

    if (openComments.has(postId)) {
        openComments.delete(postId);
        commentsBox.innerHTML = "";
        button.textContent = "Vis kommentarer";
        return;
    }

    openComments.add(postId);
    button.textContent = "Skjul kommentarer";
    await showComments(postId);
}

async function showComments(postId) {
    const comments = await getJson(`/api/comments/${postId}`);
    const commentsBox = document.getElementById(`comments-${postId}`);
    commentsBox.innerHTML = "";

    if (comments.length === 0) {
        commentsBox.innerHTML = "<p>Ingen kommentarer ennå.</p>";
        return;
    }

    comments.forEach((comment) => {
        const commentDiv = document.createElement("div");
        commentDiv.className = "comment";
        commentDiv.innerHTML = `
            <strong>${comment.username}</strong>
            <p>${comment.content}</p>
            <small>${comment.created_at}</small>
            <div class="comment-actions">
                <button type="button" onclick="likeComment(${comment.id}, ${postId})">Lik (${comment.likes || 0})</button>
            </div>
        `;
        commentsBox.appendChild(commentDiv);
    });
}

async function addComment(event, postId) {
    event.preventDefault();

    const form = event.target;
    const userId = form.user_id.value;
    const content = form.content.value;

    await postJson("/api/comments", {
        post_id: postId,
        user_id: userId,
        content: content
    });

    form.reset();
    if (openComments.has(postId)) {
        showComments(postId);
    }
}

async function startPage() {
    await loadUsers();
    await loadPosts();
}

async function likeComment(commentId, postId) {
    await postWithoutBody(`/api/comments/${commentId}/like`);

    if (openComments.has(postId)) {
        showComments(postId);
    }
}

startPage();
