const Database = require("better-sqlite3");
const db = new Database("bloggplattform.db");

db.pragma("foreign_keys = ON");

module.exports = db;