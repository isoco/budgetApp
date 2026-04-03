export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  name_hr TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'savings')),
  icon TEXT DEFAULT 'cash',
  color TEXT DEFAULT '#1565C0',
  is_recurring INTEGER DEFAULT 0,
  default_amount REAL DEFAULT 0,
  due_day INTEGER,
  is_active INTEGER DEFAULT 1,
  is_system INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS budget_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  planned_amount REAL DEFAULT 0,
  actual_amount REAL DEFAULT 0,
  due_date TEXT,
  paid_date TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  day INTEGER NOT NULL,
  allowed_amount REAL DEFAULT 30,
  spent_amount REAL DEFAULT 0,
  notes TEXT,
  UNIQUE(year, month, day)
);

CREATE TABLE IF NOT EXISTS fuel_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  date TEXT NOT NULL,
  vehicle TEXT DEFAULT 'Audi',
  amount REAL NOT NULL,
  liters REAL,
  price_per_liter REAL,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS monthly_summary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  fuel_estimated REAL DEFAULT 225,
  UNIQUE(year, month)
);

CREATE TABLE IF NOT EXISTS db_version (
  version INTEGER PRIMARY KEY
);
`;

export const DB_CURRENT_VERSION = 1;
