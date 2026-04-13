const postForm = document.getElementById("postForm");
const postsContainer = document.getElementById("postsContainer");

async function loadPosts() {
    try {
        const response = await fetch("/api/posts");
        const posts = await response.json();

        postsContainer.innerHTML = "";

        if (posts.length === 0) {
            postsContainer.innerHTML = "<p>Ingen innlegg ennå.</p>";
            return;
        }

        posts.forEach(post => {
            const postElement = document.createElement("div");
            postElement.classList.add("post");

            postElement.innerHTML = `
                <h3>${post.username}</h3>
                <p>${post.content}</p>
                <small>${post.created_at || "Ingen dato"}</small>
            `;

            postsContainer.appendChild(postElement);
        });
    } catch (error) {
        postsContainer.innerHTML = "<p>Kunne ikke laste innlegg.</p>";
        console.error(error);
    }
}

postForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const userId = document.getElementById("userId").value;
    const content = document.getElementById("content").value;

    try {
        const response = await fetch("/api/posts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                user_id: userId,
                content: content
            })
        });

        const data = await response.json();
        console.log(data);

        postForm.reset();
        loadPosts();
    } catch (error) {
        console.error("Feil ved publisering av innlegg:", error);
    }
});

loadPosts();