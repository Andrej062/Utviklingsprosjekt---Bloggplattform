const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const db = require("./db");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

function sendServerError(res, error) {
    res.status(500).json({ error: error.message });
}

io.on("connection", (socket) => {
    socket.on("joinConversation", (conversationId) => {
        if (!conversationId) {
            return;
        }

        socket.join(String(conversationId));
    });
});

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

app.get("/api/conversations", (req, res) => {
    try {
        const conversations = db.prepare(`
            SELECT
                conversations.id,
                conversations.user1_id,
                conversations.user2_id,
                conversations.created_at,
                u1.username AS user1_name,
                u2.username AS user2_name,
                u1.username || ' + ' || u2.username AS name
            FROM conversations
            JOIN users u1 ON conversations.user1_id = u1.id
            JOIN users u2 ON conversations.user2_id = u2.id
            ORDER BY conversations.id ASC
        `).all();

        res.json(conversations);
    } catch (error) {
        sendServerError(res, error);
    }
});

app.get("/api/messages/:conversationId", (req, res) => {
    const conversationId = req.params.conversationId;

    try {
        const messages = db.prepare(`
            SELECT
                messages.id,
                messages.conversation_id,
                messages.sender_id,
                messages.content,
                messages.created_at,
                users.username
            FROM messages
            JOIN users ON messages.sender_id = users.id
            WHERE messages.conversation_id = ?
            ORDER BY messages.created_at ASC
        `).all(conversationId);

        res.json(messages);
    } catch (error) {
        sendServerError(res, error);
    }
});

app.post("/api/messages/:conversationId", (req, res) => {
    const conversationId = req.params.conversationId;
    const { user_id, content } = req.body;

    try {
        const result = db.prepare(`
            INSERT INTO messages (conversation_id, sender_id, content)
            VALUES (?, ?, ?)
        `).run(conversationId, user_id, content);

        const message = db.prepare(`
            SELECT
                messages.id,
                messages.conversation_id,
                messages.sender_id,
                messages.content,
                messages.created_at,
                users.username
            FROM messages
            JOIN users ON messages.sender_id = users.id
            WHERE messages.id = ?
        `).get(result.lastInsertRowid);

        io.to(String(conversationId)).emit("chatMessage", message);
        res.status(201).json(message);
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

server.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});
