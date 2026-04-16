const express = require("express");
const db = require("./db");

const app = express();

app.use(express.json());
app.use(express.static("public"));

// Hent alle brukere
app.get("/api/users", (req, res) => {
    try {
        const stmt = db.prepare(`
            SELECT id, username, email, bio, created_at
            FROM users
            ORDER BY created_at DESC
        `);

        const users = stmt.all();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Lag ny bruker
// app.post("/api/users", (req, res) => {
//     const { username, email, password, bio } = req.body;

//     try {
//         const stmt = db.prepare(`
//             INSERT INTO users (username, email, password, bio)
//             VALUES (?, ?, ?, ?)
//         `);

//         const result = stmt.run(username, email, password, bio);
//         res.json({ message: "User created", id: result.lastInsertRowid });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });

// Hent alle innlegg
app.get("/api/posts", (req, res) => {
    try {
        const stmt = db.prepare(`
            SELECT posts.*, users.username
            FROM posts
            JOIN users ON posts.user_id = users.id
            ORDER BY posts.created_at DESC
        `);

        const posts = stmt.all();
        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Lag nytt innlegg
app.post("/api/posts", (req, res) => {
    const { user_id, content } = req.body;

    try {
        const stmt = db.prepare(`
            INSERT INTO posts (user_id, content)
            VALUES (?, ?)
        `);

        const result = stmt.run(user_id, content);
        res.json({ message: "Post created", id: result.lastInsertRowid });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Hent kommentarer for ett innlegg
app.get("/api/comments/:postId", (req, res) => {
    const postId = req.params.postId;

    try {
        const stmt = db.prepare(`
            SELECT comments.*, users.username
            FROM comments
            JOIN users ON comments.user_id = users.id
            WHERE comments.post_id = ?
            ORDER BY comments.created_at ASC
        `);

        const comments = stmt.all(postId);
        res.json(comments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Lag ny kommentar
app.post("/api/comments", (req, res) => {
    const { post_id, user_id, content } = req.body;

    try {
        const stmt = db.prepare(`
            INSERT INTO comments (post_id, user_id, content)
            VALUES (?, ?, ?)
        `);

        const result = stmt.run(post_id, user_id, content);
        res.json({ message: "Comment created", id: result.lastInsertRowid });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});