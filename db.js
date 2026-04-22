const Database = require("better-sqlite3");
const db = new Database("bloggplattform.db");

db.pragma("foreign_keys = ON");

function tableExists(tableName) {
    const table = db.prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table' AND name = ?
    `).get(tableName);

    return Boolean(table);
}

function columnExists(tableName, columnName) {
    if (!tableExists(tableName)) {
        return false;
    }

    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
    return columns.some((column) => column.name === columnName);
}

function addColumnIfMissing(tableName, columnSql) {
    const columnName = columnSql.split(" ")[0];

    if (!tableExists(tableName) || columnExists(tableName, columnName)) {
        return;
    }

    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnSql}`);
}

function createChatTables() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user1_id INTEGER NOT NULL,
            user2_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user1_id) REFERENCES users(id),
            FOREIGN KEY (user2_id) REFERENCES users(id)
        )
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            sender_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id),
            FOREIGN KEY (sender_id) REFERENCES users(id)
        )
    `);
}

addColumnIfMissing("posts", "likes INTEGER NOT NULL DEFAULT 0");
addColumnIfMissing("comments", "likes INTEGER NOT NULL DEFAULT 0");
addColumnIfMissing("posts", "image TEXT");
createChatTables();

module.exports = db;
