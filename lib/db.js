import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'handyman.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let _db = null;

export function getDb() {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  initSchema(_db);
  return _db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      image_path   TEXT NOT NULL,
      description  TEXT NOT NULL,
      scheduled_date TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'pending',
      published_at TEXT,
      error        TEXT,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    INSERT OR IGNORE INTO settings (key, value) VALUES
      ('post_time', '09:00'),
      ('gemini_api_key', ''),
      ('google_access_token', ''),
      ('google_refresh_token', ''),
      ('google_token_expiry', ''),
      ('gbp_account_name', ''),
      ('gbp_location_name', '');
  `);
}

export function getSetting(key) {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

export function setSetting(key, value) {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
}

export function getAllPosts(orderBy = 'scheduled_date ASC') {
  const db = getDb();
  return db.prepare(`SELECT * FROM posts ORDER BY ${orderBy}`).all();
}

export function getPostById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
}

export function getTodayPost() {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  return db.prepare("SELECT * FROM posts WHERE scheduled_date = ? AND status = 'pending' LIMIT 1").get(today);
}

export function getNextAvailableDate() {
  const db = getDb();
  const row = db.prepare(
    "SELECT MAX(scheduled_date) as last_date FROM posts WHERE status IN ('pending','published')"
  ).get();

  const base = row?.last_date
    ? new Date(row.last_date + 'T12:00:00Z')
    : new Date();

  const today = new Date().toISOString().split('T')[0];
  const baseStr = base.toISOString().split('T')[0];

  // Next date is base + 1 day, but at minimum tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const nextDate = new Date(Math.max(
    new Date(baseStr + 'T12:00:00Z').getTime() + 86400000,
    new Date(tomorrowStr + 'T12:00:00Z').getTime()
  ));
  return nextDate.toISOString().split('T')[0];
}

export function createPost({ image_path, description, scheduled_date }) {
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO posts (image_path, description, scheduled_date) VALUES (?, ?, ?)'
  ).run(image_path, description, scheduled_date);
  return getPostById(result.lastInsertRowid);
}

export function updatePost(id, fields) {
  const db = getDb();
  const allowed = ['description', 'scheduled_date', 'status', 'published_at', 'error'];
  const sets = Object.keys(fields)
    .filter(k => allowed.includes(k))
    .map(k => `${k} = ?`)
    .join(', ');
  const values = Object.keys(fields)
    .filter(k => allowed.includes(k))
    .map(k => fields[k]);
  db.prepare(`UPDATE posts SET ${sets} WHERE id = ?`).run(...values, id);
  return getPostById(id);
}

export function deletePost(id) {
  const db = getDb();
  db.prepare('DELETE FROM posts WHERE id = ?').run(id);
}
