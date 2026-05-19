import * as SQLite from 'expo-sqlite';

export type LocalMaterial = {
  id: string;
  title: string;
  kind: string;
  sourceType: string;
  fileName?: string;
  mimeType?: string;
  localUri?: string;
  extractedText?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type LocalReviewer = {
  id: string;
  title: string;
  subject: string;
  category: string;
  difficulty: string;
  questionCounts: string;
  questions: string;
  tags: string;
  sourceMaterialIds: string;
  exportSettings: string;
  status: string;
  estimatedItems: number;
  masteryScore: number;
  isOfflineAvailable: number;
  createdAt?: string;
  updatedAt?: string;
  syncedAt?: string;
};

export type LocalExamResult = {
  id: string;
  title: string;
  subject: string;
  rawText: string;
  score?: number;
  total?: number;
  sections?: string;
  createdAt?: string;
};

export type LocalSyncQueueItem = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  payload: string;
  status: string;
  createdAt: string;
};

let db: SQLite.SQLiteDatabase | null = null;
let dbReady: Promise<void> | null = null;

function getDb() {
  if (!db) {
    db = SQLite.openDatabaseSync('talinoq.db');
  }

  return db;
}

export function initLocalDb() {
  if (dbReady) {
    return dbReady;
  }

  dbReady = getDb().execAsync(`
    CREATE TABLE IF NOT EXISTS materials (id TEXT PRIMARY KEY NOT NULL, title TEXT, kind TEXT, sourceType TEXT, fileName TEXT, mimeType TEXT, localUri TEXT, extractedText TEXT, status TEXT, createdAt TEXT, updatedAt TEXT);
    CREATE TABLE IF NOT EXISTS reviewers (id TEXT PRIMARY KEY NOT NULL, title TEXT, subject TEXT, category TEXT, difficulty TEXT, questionCounts TEXT, questions TEXT, tags TEXT, sourceMaterialIds TEXT, exportSettings TEXT, status TEXT, estimatedItems INTEGER, masteryScore INTEGER, isOfflineAvailable INTEGER, createdAt TEXT, updatedAt TEXT, syncedAt TEXT);
    CREATE TABLE IF NOT EXISTS sync_queue (id TEXT PRIMARY KEY NOT NULL, entityType TEXT, entityId TEXT, action TEXT, payload TEXT, status TEXT, createdAt TEXT);
    CREATE TABLE IF NOT EXISTS exam_results (id TEXT PRIMARY KEY NOT NULL, title TEXT, subject TEXT, rawText TEXT, score INTEGER, total INTEGER, sections TEXT, createdAt TEXT);
  `);

  return dbReady;
}

function runSql(query: string, params: unknown[] = []) {
  return getDb().runAsync(query, params as SQLite.SQLiteBindParams);
}

function getAllRows<T>(query: string, params: unknown[] = []) {
  return getDb().getAllAsync<T>(query, params as SQLite.SQLiteBindParams);
}

export async function saveLocalMaterial(material: LocalMaterial) {
  await initLocalDb();

  await runSql(
    'INSERT OR REPLACE INTO materials (id, title, kind, sourceType, fileName, mimeType, localUri, extractedText, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      material.id,
      material.title,
      material.kind,
      material.sourceType,
      material.fileName ?? null,
      material.mimeType ?? null,
      material.localUri ?? null,
      material.extractedText ?? null,
      material.status ?? null,
      material.createdAt ?? null,
      material.updatedAt ?? null,
    ]
  );
}

export async function listLocalMaterials() {
  await initLocalDb();
  return getAllRows<LocalMaterial>('SELECT * FROM materials ORDER BY createdAt DESC');
}

export async function saveLocalReviewer(reviewer: LocalReviewer) {
  await initLocalDb();

  await runSql(
    'INSERT OR REPLACE INTO reviewers (id, title, subject, category, difficulty, questionCounts, questions, tags, sourceMaterialIds, exportSettings, status, estimatedItems, masteryScore, isOfflineAvailable, createdAt, updatedAt, syncedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      reviewer.id,
      reviewer.title,
      reviewer.subject,
      reviewer.category,
      reviewer.difficulty,
      reviewer.questionCounts,
      reviewer.questions,
      reviewer.tags,
      reviewer.sourceMaterialIds,
      reviewer.exportSettings,
      reviewer.status,
      reviewer.estimatedItems,
      reviewer.masteryScore,
      reviewer.isOfflineAvailable,
      reviewer.createdAt ?? null,
      reviewer.updatedAt ?? null,
      reviewer.syncedAt ?? null,
    ]
  );
}

export async function listLocalReviewers() {
  await initLocalDb();
  return getAllRows<LocalReviewer>('SELECT * FROM reviewers ORDER BY createdAt DESC');
}

export async function saveLocalExamResult(exam: LocalExamResult) {
  await initLocalDb();

  await runSql(
    'INSERT OR REPLACE INTO exam_results (id, title, subject, rawText, score, total, sections, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      exam.id,
      exam.title,
      exam.subject,
      exam.rawText,
      exam.score ?? null,
      exam.total ?? null,
      exam.sections ?? null,
      exam.createdAt ?? null,
    ]
  );
}

export async function enqueueSync(item: LocalSyncQueueItem) {
  await initLocalDb();

  await runSql(
    'INSERT OR REPLACE INTO sync_queue (id, entityType, entityId, action, payload, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      item.id,
      item.entityType,
      item.entityId,
      item.action,
      item.payload,
      item.status,
      item.createdAt,
    ]
  );
}

export async function listPendingSync() {
  await initLocalDb();
  return getAllRows<LocalSyncQueueItem>(
    "SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY createdAt ASC"
  );
}

export async function markSyncComplete(id: string) {
  await initLocalDb();
  await runSql("UPDATE sync_queue SET status = 'synced' WHERE id = ?", [id]);
}
