const postForm = document.getElementById("postForm");
const postsContainer = document.getElementById("postsContainer");
const usersContainer = document.getElementById("usersContainer");
const registerForm = document.getElementById("registerForm");
const registerMessage = document.getElementById("registerMessage");
const postUserSelect = document.getElementById("userId");
const postImageInput = document.getElementById("postImage");
const imagePreview = document.getElementById("imagePreview");

const chatConversationSelect = document.getElementById("chatConversation");
const chatUserSelect = document.getElementById("chatUser");
const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const chatContentInput = document.getElementById("chatContent");

const registerModal = document.getElementById("registerModal");
const usersModal = document.getElementById("usersModal");
const openRegisterModalButton = document.getElementById("openRegisterModal");
const openUsersModalButton = document.getElementById("openUsersModal");
const closeButtons = document.querySelectorAll(".close-modal");

const socket = io();

let savedUsers = [];
let savedConversations = [];
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

function fillSelectWithUsers(selectElement, selectedValue = "") {
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

    if (!selectElement.value && savedUsers.length > 0) {
        selectElement.value = String(savedUsers[0].id);
    }
}

function fillConversationSelect(selectedValue = "") {
    chatConversationSelect.innerHTML = "";

    savedConversations.forEach((conversation) => {
        const option = document.createElement("option");
        option.value = conversation.id;
        option.textContent = conversation.name;

        if (String(selectedValue) === String(conversation.id)) {
            option.selected = true;
        }

        chatConversationSelect.appendChild(option);
    });

    if (!chatConversationSelect.value && savedConversations.length > 0) {
        chatConversationSelect.value = String(savedConversations[0].id);
    }
}

function addChatMessage(message) {
    const messageDiv = document.createElement("div");
    messageDiv.className = "chat-message";
    messageDiv.innerHTML = `
        <strong>${message.username}</strong>
        <p>${message.content}</p>
        <small>${message.created_at}</small>
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function loadUsers() {
    try {
        savedUsers = await getJson("/api/users");
        usersContainer.innerHTML = "";

        fillSelectWithUsers(postUserSelect, postUserSelect.value);
        fillSelectWithUsers(chatUserSelect, chatUserSelect.value || postUserSelect.value);

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
    } catch (error) {
        usersContainer.innerHTML = "<p>Kunne ikke laste brukere.</p>";
    }
}

async function loadConversations() {
    try {
        savedConversations = await getJson("/api/conversations");
        fillConversationSelect(chatConversationSelect.value);

        if (chatConversationSelect.value) {
            socket.emit("joinConversation", chatConversationSelect.value);
        }
    } catch (error) {
        chatMessages.innerHTML = "<p>Kunne ikke laste samtaler.</p>";
    }
}

async function loadChatMessages() {
    const conversationId = chatConversationSelect.value;

    if (!conversationId) {
        chatMessages.innerHTML = "<p>Velg en samtale for å se meldinger.</p>";
        return;
    }

    try {
        const messages = await getJson(`/api/messages/${conversationId}`);
        chatMessages.innerHTML = "";

        if (messages.length === 0) {
            chatMessages.innerHTML = "<p>Ingen meldinger ennå.</p>";
            return;
        }

        messages.forEach(addChatMessage);
    } catch (error) {
        chatMessages.innerHTML = "<p>Kunne ikke laste meldinger.</p>";
    }
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
    return openComments.has(postId) ? "Skjul kommentarer" : "Vis kommentarer";
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
    try {
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
    } catch (error) {
        postsContainer.innerHTML = "<p>Kunne ikke laste innlegg.</p>";
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

chatConversationSelect.addEventListener("change", function () {
    if (chatConversationSelect.value) {
        socket.emit("joinConversation", chatConversationSelect.value);
    }

    loadChatMessages();
});

chatForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const conversationId = chatConversationSelect.value;
    const userId = chatUserSelect.value;
    const content = chatContentInput.value.trim();

    if (!conversationId || !userId || !content) {
        return;
    }

    await postJson(`/api/messages/${conversationId}`, {
        user_id: userId,
        content: content
    });

    chatContentInput.value = "";
    loadChatMessages();
});

postForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const userId = postUserSelect.value;
    const content = document.getElementById("content").value;
    const imageFile = postImageInput.files[0];
    let image = null;

    if (!userId || !content.trim()) {
        return;
    }

    if (imageFile) {
        image = await readImageAsDataUrl(imageFile);
    }

    await postJson("/api/posts", {
        user_id: userId,
        content: content,
        image: image
    });

    postForm.reset();
    fillSelectWithUsers(postUserSelect, postUserSelect.value);
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
        chatUserSelect.value = String(result.id);
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

socket.on("chatMessage", (message) => {
    if (String(message.conversation_id) !== String(chatConversationSelect.value)) {
        return;
    }

    const emptyMessage = chatMessages.querySelector("p");
    if (emptyMessage && chatMessages.children.length === 1) {
        chatMessages.innerHTML = "";
    }

    addChatMessage(message);
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
    await loadConversations();
    await loadPosts();

    if (chatConversationSelect.value) {
        socket.emit("joinConversation", chatConversationSelect.value);
        await loadChatMessages();
    } else {
        chatMessages.innerHTML = "<p>Velg en samtale for å se meldinger.</p>";
    }
}

async function likeComment(commentId, postId) {
    await postWithoutBody(`/api/comments/${commentId}/like`);

    if (openComments.has(postId)) {
        showComments(postId);
    }
}

startPage();
