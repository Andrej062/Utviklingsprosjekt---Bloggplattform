const postForm = document.getElementById("postForm");
const postsContainer = document.getElementById("postsContainer");

// Hent og vis alle innlegg
async function loadPosts() {
    const response = await fetch("/api/posts");
    const posts = await response.json();

    postsContainer.innerHTML = "";

    if (posts.length === 0) {
        postsContainer.innerHTML = "<p>Ingen innlegg ennå.</p>";
        return;
    }

    posts.forEach(post => {
        const postDiv = document.createElement("div");
        postDiv.className = "post";

        postDiv.innerHTML = `
            <h3>${post.username}</h3>
            <p>${post.content}</p>
            <small>${post.created_at}</small>

            <button onclick="showComments(${post.id})">Vis kommentarer</button>

            <div id="comments-${post.id}" class="comments-box"></div>

            <form onsubmit="addComment(event, ${post.id})" class="commentForm">
                <input type="number" name="user_id" placeholder="Bruker-ID" required>
                <input type="text" name="content" placeholder="Skriv en kommentar..." required>
                <button type="submit">Kommenter</button>
            </form>
        `;

        postsContainer.appendChild(postDiv);
    });
}

// Lag nytt innlegg
postForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const userId = document.getElementById("userId").value;
    const content = document.getElementById("content").value;

    await fetch("/api/posts", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            user_id: userId,
            content: content
        })
    });

    postForm.reset();
    loadPosts();
});

// Vis kommentarer til ett innlegg
async function showComments(postId) {
    const response = await fetch(`/api/comments/${postId}`);
    const comments = await response.json();

    const commentsBox = document.getElementById(`comments-${postId}`);
    commentsBox.innerHTML = "";

    if (comments.length === 0) {
        commentsBox.innerHTML = "<p>Ingen kommentarer ennå.</p>";
        return;
    }

    comments.forEach(comment => {
        const commentDiv = document.createElement("div");
        commentDiv.className = "comment";
        commentDiv.innerHTML = `
            <strong>${comment.username}</strong>
            <p>${comment.content}</p>
            <small>${comment.created_at}</small>
        `;
        commentsBox.appendChild(commentDiv);
    });
}

// Lag ny kommentar
async function addComment(event, postId) {
    event.preventDefault();

    const form = event.target;
    const userId = form.user_id.value;
    const content = form.content.value;

    await fetch("/api/comments", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            post_id: postId,
            user_id: userId,
            content: content
        })
    });

    form.reset();
    showComments(postId);
}

loadPosts();