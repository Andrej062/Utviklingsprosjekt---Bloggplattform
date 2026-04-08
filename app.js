const express = require("express");
const db = require("./db");

const app = express();

app.use(express.json());
app.use(express.static("public"));

app.post("/api/users", (req, res) => {
    const { username, email, password, bio } = req.body;

    try {
        const stmt = db.prepare(`
            INSERT INTO users (username, email, password, bio)
            VALUES (?, ?, ?, ?)
        `);

        const result = stmt.run(username, email, password, bio);

        res.json({ message: "User created", id: result.lastInsertRowid });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

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

app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});