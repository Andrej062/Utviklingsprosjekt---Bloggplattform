const Database = require("better-sqlite3");
const db = new Database("bloggplattform.db");

db.pragma("foreign_keys = ON");

function addColumnIfMissing(tableName, columnSql) {
    try {
        db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnSql}`);
    } catch (error) {
        if (!error.message.includes("duplicate column name")) {
            throw error;
        }
    }
}

addColumnIfMissing("posts", "likes INTEGER NOT NULL DEFAULT 0");
addColumnIfMissing("comments", "likes INTEGER NOT NULL DEFAULT 0");
addColumnIfMissing("posts", "image TEXT");

module.exports = db;
