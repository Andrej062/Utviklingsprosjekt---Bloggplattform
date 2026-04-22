const express = require("express");
const db = require("./db");

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

function sendServerError(res, error) {
    res.status(500).json({ error: error.message });
}

app.get("/api/users", (req, res) => {
    try {
        const users = db.prepare(`
            SELECT id, username, email, bio, created_at
            FROM users
            ORDER BY created_at DESC
        `).all();

        res.json(users);
    } catch (error) {
        sendServerError(res, error);
    }
});

app.post("/api/users", (req, res) => {
    const { username, email, password, bio } = req.body;

    try {
        const result = db.prepare(`
            INSERT INTO users (username, email, password, bio)
            VALUES (?, ?, ?, ?)
        `).run(username, email, password, bio || "");

        res.json({ message: "User created", id: result.lastInsertRowid });
    } catch (error) {
        sendServerError(res, error);
    }
});

app.get("/api/posts", (req, res) => {
    try {
        const posts = db.prepare(`
            SELECT posts.*, users.username
            FROM posts
            JOIN users ON posts.user_id = users.id
            ORDER BY posts.created_at DESC
        `).all();

        res.json(posts);
    } catch (error) {
        sendServerError(res, error);
    }
});

app.post("/api/posts", (req, res) => {
    const { user_id, content, image } = req.body;

    try {
        const result = db.prepare(`
            INSERT INTO posts (user_id, content, image)
            VALUES (?, ?, ?)
        `).run(user_id, content, image || null);

        res.json({ message: "Post created", id: result.lastInsertRowid });
    } catch (error) {
        sendServerError(res, error);
    }
});

app.post("/api/posts/:postId/like", (req, res) => {
    const postId = req.params.postId;

    try {
        const result = db.prepare(`
            UPDATE posts
            SET likes = likes + 1
            WHERE id = ?
        `).run(postId);

        if (result.changes === 0) {
            return res.status(404).json({ error: "Post not found" });
        }

        const post = db.prepare("SELECT likes FROM posts WHERE id = ?").get(postId);
        res.json({ message: "Post liked", likes: post.likes });
    } catch (error) {
        sendServerError(res, error);
    }
});

app.get("/api/comments/:postId", (req, res) => {
    const postId = req.params.postId;

    try {
        const comments = db.prepare(`
            SELECT comments.*, users.username
            FROM comments
            JOIN users ON comments.user_id = users.id
            WHERE comments.post_id = ?
            ORDER BY comments.created_at ASC
        `).all(postId);

        res.json(comments);
    } catch (error) {
        sendServerError(res, error);
    }
});

app.post("/api/comments", (req, res) => {
    const { post_id, user_id, content } = req.body;

    try {
        const result = db.prepare(`
            INSERT INTO comments (post_id, user_id, content)
            VALUES (?, ?, ?)
        `).run(post_id, user_id, content);

        res.json({ message: "Comment created", id: result.lastInsertRowid });
    } catch (error) {
        sendServerError(res, error);
    }
});

app.post("/api/comments/:commentId/like", (req, res) => {
    const commentId = req.params.commentId;

    try {
        const result = db.prepare(`
            UPDATE comments
            SET likes = likes + 1
            WHERE id = ?
        `).run(commentId);

        if (result.changes === 0) {
            return res.status(404).json({ error: "Comment not found" });
        }

        const comment = db.prepare("SELECT likes FROM comments WHERE id = ?").get(commentId);
        res.json({ message: "Comment liked", likes: comment.likes });
    } catch (error) {
        sendServerError(res, error);
    }
});

app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});
