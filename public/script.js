// Henter viktige HTML-elementer fra siden
const postForm = document.getElementById("postForm");
const postsContainer = document.getElementById("postsContainer");
const usersContainer = document.getElementById("usersContainer");
const registerForm = document.getElementById("registerForm");
const registerMessage = document.getElementById("registerMessage");
const postUserSelect = document.getElementById("userId");
const postImageInput = document.getElementById("postImage");
const imagePreview = document.getElementById("imagePreview");

// Henter HTML-elementer som brukes i chatten
const chatConversationSelect = document.getElementById("chatConversation");
const chatUserSelect = document.getElementById("chatUser");
const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const chatContentInput = document.getElementById("chatContent");

// Henter modaler og knapper for å åpne/lukke dem
const registerModal = document.getElementById("registerModal");
const usersModal = document.getElementById("usersModal");
const openRegisterModalButton = document.getElementById("openRegisterModal");
const openUsersModalButton = document.getElementById("openUsersModal");
const closeButtons = document.querySelectorAll(".close-modal");

// Lager forbindelse til socket.io for sanntidschat
const socket = io();

// Lagrer brukere og samtaler i minnet på frontend
let savedUsers = [];
let savedConversations = [];

// Husker hvilke kommentarfelt som er åpne
const openComments = new Set();


// Hjelpefunksjon for å hente JSON-data fra serveren med GET
async function getJson(url) {
    const response = await fetch(url);
    return response.json();
}

// Hjelpefunksjon for å sende JSON-data til serveren med POST
async function postJson(url, body) {
    return fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });
}

// Hjelpefunksjon for POST-forespørsel uten innhold i body
async function postWithoutBody(url) {
    return fetch(url, {
        method: "POST"
    });
}


// Åpner en modal ved å fjerne klassen "hidden"
function openModal(modal) {
    modal.classList.remove("hidden");
}

// Lukker en modal ved å legge til klassen "hidden"
function closeModal(modal) {
    modal.classList.add("hidden");
}


// Fyller en select-liste med brukere
function fillSelectWithUsers(selectElement, selectedValue = "") {
    selectElement.innerHTML = `<option value="">Velg bruker</option>`;

    savedUsers.forEach((user) => {
        const option = document.createElement("option");
        option.value = user.id;
        option.textContent = `${user.username} (ID: ${user.id})`;

        // Hvis denne brukeren skal være valgt, markerer vi den
        if (String(selectedValue) === String(user.id)) {
            option.selected = true;
        }

        selectElement.appendChild(option);
    });

    // Hvis ingen bruker er valgt, velg den første i lista
    if (!selectElement.value && savedUsers.length > 0) {
        selectElement.value = String(savedUsers[0].id);
    }
}


// Fyller select-listen med tilgjengelige samtaler i chatten
function fillConversationSelect(selectedValue = "") {
    chatConversationSelect.innerHTML = "";

    savedConversations.forEach((conversation) => {
        const option = document.createElement("option");
        option.value = conversation.id;
        option.textContent = conversation.name;

        // Marker valgt samtale hvis den finnes
        if (String(selectedValue) === String(conversation.id)) {
            option.selected = true;
        }

        chatConversationSelect.appendChild(option);
    });

    // Hvis ingen samtale er valgt, velg den første
    if (!chatConversationSelect.value && savedConversations.length > 0) {
        chatConversationSelect.value = String(savedConversations[0].id);
    }
}


// Legger én melding inn i chatvinduet
function addChatMessage(message) {
    const messageDiv = document.createElement("div");
    messageDiv.className = "chat-message";
    messageDiv.innerHTML = `
        <strong>${message.username}</strong>
        <p>${message.content}</p>
        <small>${message.created_at}</small>
    `;
    chatMessages.appendChild(messageDiv);

    // Scroller automatisk ned til siste melding
    chatMessages.scrollTop = chatMessages.scrollHeight;
}


// Henter alle brukere fra serveren og viser dem
async function loadUsers() {
    try {
        savedUsers = await getJson("/api/users");
        usersContainer.innerHTML = "";

        // Oppdaterer select-lister med brukere
        fillSelectWithUsers(postUserSelect, postUserSelect.value);
        fillSelectWithUsers(chatUserSelect, chatUserSelect.value || postUserSelect.value);

        // Hvis det ikke finnes brukere, vis melding
        if (savedUsers.length === 0) {
            usersContainer.innerHTML = "<p>Ingen brukere ennå.</p>";
            return;
        }

        // Viser alle brukere i brukerlisten
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


// Henter alle samtaler for chatten
async function loadConversations() {
    try {
        savedConversations = await getJson("/api/conversations");
        fillConversationSelect(chatConversationSelect.value);

        // Hvis en samtale er valgt, bli med i socket-rommet for den samtalen
        if (chatConversationSelect.value) {
            socket.emit("joinConversation", chatConversationSelect.value);
        }
    } catch (error) {
        chatMessages.innerHTML = "<p>Kunne ikke laste samtaler.</p>";
    }
}


// Henter meldinger for valgt samtale
async function loadChatMessages() {
    const conversationId = chatConversationSelect.value;

    // Hvis ingen samtale er valgt, vis melding
    if (!conversationId) {
        chatMessages.innerHTML = "<p>Velg en samtale for å se meldinger.</p>";
        return;
    }

    try {
        const messages = await getJson(`/api/messages/${conversationId}`);
        chatMessages.innerHTML = "";

        // Hvis ingen meldinger finnes, vis melding
        if (messages.length === 0) {
            chatMessages.innerHTML = "<p>Ingen meldinger ennå.</p>";
            return;
        }

        // Vis alle meldinger i chatten
        messages.forEach(addChatMessage);
    } catch (error) {
        chatMessages.innerHTML = "<p>Kunne ikke laste meldinger.</p>";
    }
}


// Lager en select-liste for å velge bruker når man kommenterer
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


// Bestemmer teksten på kommentarknappen
function getCommentsButtonText(postId) {
    return openComments.has(postId) ? "Skjul kommentarer" : "Vis kommentarer";
}


// Leser et bilde og gjør det om til Data URL
function readImageAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        // Når bildet er lest ferdig, send tilbake resultatet
        reader.onload = () => resolve(reader.result);

        // Hvis noe går galt, send feil
        reader.onerror = () => reject(new Error("Could not read image"));

        reader.readAsDataURL(file);
    });
}


// Nullstiller forhåndsvisning av bilde i skjemaet
function resetImagePreview() {
    imagePreview.src = "";
    imagePreview.classList.add("hidden");
    postImageInput.value = "";
}


// Henter alle innlegg og viser dem på siden
async function loadPosts() {
    try {
        const posts = await getJson("/api/posts");
        postsContainer.innerHTML = "";

        // Hvis ingen innlegg finnes, vis melding
        if (posts.length === 0) {
            postsContainer.innerHTML = "<p>Ingen innlegg ennå.</p>";
            return;
        }

        // Lager HTML for hvert innlegg
        posts.forEach((post) => {
            const postDiv = document.createElement("div");
            postDiv.className = "post";

            // Hvis innlegget har bilde, vis det
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

        // Åpner kommentarer på nytt for innlegg som allerede var åpne
        for (const postId of openComments) {
            showComments(postId);
        }
    } catch (error) {
        postsContainer.innerHTML = "<p>Kunne ikke laste innlegg.</p>";
    }
}


// Når brukeren velger et bilde, vis forhåndsvisning
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


// Når brukeren bytter samtale i chatten
chatConversationSelect.addEventListener("change", function () {
    if (chatConversationSelect.value) {
        socket.emit("joinConversation", chatConversationSelect.value);
    }

    loadChatMessages();
});


// Når brukeren sender en ny chatmelding
chatForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const conversationId = chatConversationSelect.value;
    const userId = chatUserSelect.value;
    const content = chatContentInput.value.trim();

    // Hvis noe mangler, stopp
    if (!conversationId || !userId || !content) {
        return;
    }

    // Sender meldingen til serveren
    await postJson(`/api/messages/${conversationId}`, {
        user_id: userId,
        content: content
    });

    // Tøm tekstfeltet og last meldinger på nytt
    chatContentInput.value = "";
    loadChatMessages();
});


// Når brukeren sender et nytt innlegg
postForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const userId = postUserSelect.value;
    const content = document.getElementById("content").value;
    const imageFile = postImageInput.files[0];
    let image = null;

    // Hvis bruker eller tekst mangler, stopp
    if (!userId || !content.trim()) {
        return;
    }

    // Hvis et bilde er valgt, gjør det om til Data URL
    if (imageFile) {
        image = await readImageAsDataUrl(imageFile);
    }

    // Sender nytt innlegg til serveren
    await postJson("/api/posts", {
        user_id: userId,
        content: content,
        image: image
    });

    // Nullstiller skjema og laster innlegg på nytt
    postForm.reset();
    fillSelectWithUsers(postUserSelect, postUserSelect.value);
    resetImagePreview();
    loadPosts();
});


// Når brukeren sender registreringsskjemaet
registerForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const username = document.getElementById("registerUsername").value;
    const email = document.getElementById("registerEmail").value;
    const password = document.getElementById("registerPassword").value;
    const bio = document.getElementById("registerBio").value;

    // Sender ny bruker til serveren
    const response = await postJson("/api/users", {
        username: username,
        email: email,
        password: password,
        bio: bio
    });

    const result = await response.json();

    // Hvis registrering gikk bra, oppdater brukerlisten
    if (response.ok) {
        registerMessage.textContent = `Bruker lagret med ID ${result.id}`;
        registerForm.reset();
        await loadUsers();
        postUserSelect.value = String(result.id);
        chatUserSelect.value = String(result.id);
        return;
    }

    // Hvis noe gikk galt, vis feilmelding
    registerMessage.textContent = result.error || "Kunne ikke lagre bruker.";
});


// Åpner registreringsmodal
openRegisterModalButton.addEventListener("click", function () {
    registerMessage.textContent = "";
    openModal(registerModal);
});


// Åpner modal med brukerliste
openUsersModalButton.addEventListener("click", async function () {
    await loadUsers();
    openModal(usersModal);
});


// Lukker modaler når brukeren trykker på lukkeknapp
closeButtons.forEach((button) => {
    button.addEventListener("click", function () {
        const modalId = button.dataset.close;
        const modal = document.getElementById(modalId);
        closeModal(modal);
    });
});


// Lytter etter nye chatmeldinger fra socket.io
socket.on("chatMessage", (message) => {
    // Hvis meldingen ikke hører til valgt samtale, ignorer den
    if (String(message.conversation_id) !== String(chatConversationSelect.value)) {
        return;
    }

    // Hvis chatten bare viser en tom tekst, fjern den
    const emptyMessage = chatMessages.querySelector("p");
    if (emptyMessage && chatMessages.children.length === 1) {
        chatMessages.innerHTML = "";
    }

    // Legg til ny melding i chatten
    addChatMessage(message);
});


// Sender like på et innlegg
async function likePost(postId) {
    await postWithoutBody(`/api/posts/${postId}/like`);
    loadPosts();
}


// Viser eller skjuler kommentarer for et innlegg
async function toggleComments(postId, button) {
    const commentsBox = document.getElementById(`comments-${postId}`);

    // Hvis kommentarene allerede er åpne, skjul dem
    if (openComments.has(postId)) {
        openComments.delete(postId);
        commentsBox.innerHTML = "";
        button.textContent = "Vis kommentarer";
        return;
    }

    // Hvis kommentarene er lukket, åpne dem
    openComments.add(postId);
    button.textContent = "Skjul kommentarer";
    await showComments(postId);
}


// Henter og viser kommentarer for ett innlegg
async function showComments(postId) {
    const comments = await getJson(`/api/comments/${postId}`);
    const commentsBox = document.getElementById(`comments-${postId}`);
    commentsBox.innerHTML = "";

    // Hvis ingen kommentarer finnes, vis melding
    if (comments.length === 0) {
        commentsBox.innerHTML = "<p>Ingen kommentarer ennå.</p>";
        return;
    }

    // Vis alle kommentarer
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


// Sender ny kommentar til serveren
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

    // Tøm skjemaet og vis kommentarene på nytt hvis feltet er åpent
    form.reset();
    if (openComments.has(postId)) {
        showComments(postId);
    }
}


// Starter siden når alt lastes inn
async function startPage() {
    await loadUsers();
    await loadConversations();
    await loadPosts();

    // Hvis en samtale er valgt, koble til og hent meldinger
    if (chatConversationSelect.value) {
        socket.emit("joinConversation", chatConversationSelect.value);
        await loadChatMessages();
    } else {
        chatMessages.innerHTML = "<p>Velg en samtale for å se meldinger.</p>";
    }
}


// Sender like på en kommentar
async function likeComment(commentId, postId) {
    await postWithoutBody(`/api/comments/${commentId}/like`);

    // Oppdater kommentarene hvis de er åpne
    if (openComments.has(postId)) {
        showComments(postId);
    }
}


// Kjør startfunksjonen når scriptet lastes
startPage();