import { backup, DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const dataDir = path.resolve(process.env.DATA_DIR || path.resolve(process.cwd(), 'data'));
const backupDir = process.env.BACKUP_DIR;
if (!backupDir) throw new Error('Set BACKUP_DIR before creating a backup');
mkdirSync(backupDir, { recursive: true });
const database = new DatabaseSync(path.join(dataDir, 'mario_quest.db'));
const stamp = new Date().toISOString().replaceAll(':', '-');
const destination = path.join(path.resolve(backupDir), `mario_quest-${stamp}.db`);
try {
  await backup(database, destination);
  console.log(`SQLite backup completed: ${destination}`);
} finally {
  database.close();
}
