const path = require('path');
const os = require('os');
const fs = require('fs');

const DATA_DIR = path.join(os.homedir(), 'Documents', 'StockMoto');
const DATA_FILE = path.join(DATA_DIR, 'stockmoto_data.json');
const EXCEL_FILE = path.join(DATA_DIR, 'stockmoto_data.xlsx');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const ENV_FILE = path.join(DATA_DIR, 'env.json');
const IMAGES_DIR = path.join(DATA_DIR, 'images');

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

module.exports = {
  DATA_DIR, DATA_FILE, EXCEL_FILE, BACKUP_DIR, ENV_FILE, IMAGES_DIR,
  ensureDirs
};
