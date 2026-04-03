# CLAUDE.md — Ivan Budget Android App

> **This file is the source of truth for Claude Code when working on this project.**
> Read this file completely before making any changes to the codebase.

---

## 🎯 PROJECT IDENTITY

| Field | Value |
|---|---|
| **App Name** | Ivan Budget (Osobni proračun) |
| **Platform** | Android (React Native / Expo) |
| **Language** | TypeScript (strict) |
| **UI Language** | Croatian (HR) primary, English (EN) secondary |
| **Owner** | Ivan |
| **Year** | 2026 |
| **Version** | 1.0.0 |

---

## 🧠 ROLE & BEHAVIOR

You are a **senior React Native / Expo developer** and **project manager** working on this codebase. You:

- Write production-quality TypeScript — no `any`, no `// @ts-ignore`
- Follow the folder structure defined in this file — never deviate without asking
- Implement features completely — no placeholders, no TODOs unless explicitly told
- Think before coding: explain your approach in 2-3 sentences, then implement
- After every screen or major feature, summarize what was built and what's next
- Never break existing functionality when adding new features
- Always run mental type-checks before submitting code
- Prefer **composition over inheritance**, **hooks over class components**
- Use **React Native Paper** components — never build custom UI that duplicates Paper components

---

## 📱 TECH STACK (LOCKED — DO NOT CHANGE WITHOUT EXPLICIT APPROVAL)

```
Framework:       React Native + Expo SDK 51+
Language:        TypeScript 5.x (strict mode)
Router:          expo-router (file-based)
Database:        expo-sqlite (local SQLite, offline-first)
State:           Zustand 4.x
UI Library:      React Native Paper 5.x (Material Design 3)
Charts:          react-native-chart-kit
Forms:           React Hook Form + Zod
Icons:           @expo/vector-icons → MaterialCommunityIcons
Date utils:      date-fns
Storage:         AsyncStorage (settings only)
Build:           EAS Build (expo build for APK)
```

**Why this stack?** Expo allows quick APK generation without Android Studio setup. React Native Paper gives professional Material Design UI. SQLite ensures true offline-first operation. This matches Ivan's need for a simple personal app without backend infrastructure.

---

## 📁 FOLDER STRUCTURE (STRICT)

```
ivan-budget/
├── app/                          # expo-router pages
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Tab bar config
│   │   ├── index.tsx             # Home/Dashboard
│   │   ├── months.tsx            # Month grid list
│   │   ├── categories.tsx        # Category management
│   │   ├── statistics.tsx        # Charts & analytics
│   │   └── settings.tsx          # App settings
│   ├── months/
│   │   └── [year]/
│   │       └── [month]/
│   │           ├── index.tsx     # Month detail (tabs: income/expense/savings)
│   │           ├── daily.tsx     # Daily life tracker (Život)
│   │           └── fuel.tsx      # Fuel tracker (Gorivo)
│   ├── _layout.tsx               # Root layout + DB init
│   └── +not-found.tsx
│
├── components/                   # Reusable UI components
│   ├── common/
│   │   ├── BudgetCard.tsx        # Summary card component
│   │   ├── EntryListItem.tsx     # Income/expense row item
│   │   ├── AmountInput.tsx       # Currency input field
│   │   ├── CategoryPicker.tsx    # Bottom sheet category selector
│   │   ├── ConfirmDialog.tsx     # Delete/reset confirmation
│   │   └── EmptyState.tsx        # Empty list placeholder
│   ├── home/
│   │   ├── MonthSummaryCard.tsx
│   │   ├── DailyStatusCard.tsx
│   │   └── UpcomingBillsCard.tsx
│   ├── month/
│   │   ├── EntrySection.tsx      # Income/expense/savings section
│   │   ├── AddEntrySheet.tsx     # Bottom sheet for adding entries
│   │   └── MonthHeader.tsx
│   ├── daily/
│   │   └── DayCell.tsx           # Single day in grid
│   ├── fuel/
│   │   └── FuelEntryItem.tsx
│   └── charts/
│       ├── MonthlyBarChart.tsx
│       ├── ExpensePieChart.tsx
│       └── SavingsLineChart.tsx
│
├── database/                     # All SQLite logic
│   ├── index.ts                  # DB initialization + singleton
│   ├── schema.ts                 # CREATE TABLE statements
│   ├── seed.ts                   # Default categories seed data
│   ├── migrations.ts             # Version-based migrations
│   └── queries/
│       ├── categories.ts         # CRUD for categories
│       ├── entries.ts            # CRUD for budget entries
│       ├── daily.ts              # CRUD for daily tracking
│       ├── fuel.ts               # CRUD for fuel entries
│       └── summary.ts            # Aggregate queries
│
├── stores/                       # Zustand state stores
│   ├── useMonthStore.ts          # Current month data
│   ├── useCategoryStore.ts       # Categories list
│   └── useSettingsStore.ts       # App settings (AsyncStorage)
│
├── hooks/                        # Custom React hooks
│   ├── useDatabase.ts            # DB ready state
│   ├── useMonthData.ts           # Fetch month entries
│   ├── useSummary.ts             # Calculate totals
│   └── useDailyData.ts           # Daily tracker data
│
├── utils/
│   ├── currency.ts               # Format HRK/EUR amounts
│   ├── dateHelpers.ts            # Croatian date formatting
│   ├── calculations.ts           # Budget math (income-expenses-savings)
│   └── exportImport.ts           # JSON backup/restore
│
├── constants/
│   ├── colors.ts                 # App color palette
│   ├── theme.ts                  # React Native Paper theme
│   ├── months.ts                 # Croatian month names array
│   └── defaultCategories.ts      # Ivan's pre-seeded categories
│
└── types/
    └── index.ts                  # All shared TypeScript interfaces
```

**Rule:** If a file doesn't fit this structure, ask before creating it in a new location.

---

## 🗄️ DATABASE SCHEMA

### Tables

```sql
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,              -- English name (internal)
  name_hr TEXT NOT NULL,           -- Croatian display name
  type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'savings')),
  icon TEXT DEFAULT 'cash',        -- MaterialCommunityIcons name
  color TEXT DEFAULT '#1565C0',
  is_recurring INTEGER DEFAULT 0,  -- 1 = auto-populate monthly
  default_amount REAL DEFAULT 0,
  due_day INTEGER,                 -- Day of month bill is due (1-31)
  is_active INTEGER DEFAULT 1,
  is_system INTEGER DEFAULT 0,     -- 1 = cannot be deleted
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE budget_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,          -- 1-12
  planned_amount REAL DEFAULT 0,
  actual_amount REAL DEFAULT 0,
  due_date TEXT,                   -- ISO date string
  paid_date TEXT,                  -- ISO date string, null if unpaid
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE daily_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  day INTEGER NOT NULL,            -- 1-31
  allowed_amount REAL DEFAULT 30,
  spent_amount REAL DEFAULT 0,
  notes TEXT,
  UNIQUE(year, month, day)
);

CREATE TABLE fuel_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  date TEXT NOT NULL,              -- ISO date string
  vehicle TEXT DEFAULT 'Audi',
  amount REAL NOT NULL,            -- Cost in HRK/EUR
  liters REAL,
  price_per_liter REAL,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE monthly_summary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  fuel_estimated REAL DEFAULT 225,
  UNIQUE(year, month)
);
```

### Key Calculation Rules
```
Balance = Total Income - Total Expenses - Total Savings
Daily Difference = Allowed Amount - Spent Amount
Monthly Fuel Balance = Fuel Estimated - Sum(fuel_entries.amount for month)
% Spent = (Total Expenses / Total Income) * 100
```

---

## 🎨 DESIGN SYSTEM

### Colors
```typescript
// constants/colors.ts
export const Colors = {
  primary: '#1565C0',        // Deep blue (main actions)
  primaryLight: '#1976D2',
  secondary: '#2E7D32',      // Green (income)
  income: '#2E7D32',         // Green text for income
  expense: '#C62828',        // Red text for expenses
  savings: '#1565C0',        // Blue text for savings
  balance: {
    positive: '#2E7D32',     // Green balance
    negative: '#C62828',     // Red balance
  },
  surface: '#FFFFFF',
  background: '#F5F5F5',
  onSurface: '#212121',
  border: '#E0E0E0',
  warning: '#F57F17',
  dueSoon: '#FF6F00',        // Orange for bills due within 3 days
};
```

### Typography Rules
- Income amounts: `color: Colors.income, fontWeight: 'bold'`
- Expense amounts: `color: Colors.expense, fontWeight: 'bold'`
- Savings amounts: `color: Colors.savings, fontWeight: 'bold'`
- Positive balance: large, green, bold
- Negative balance: large, red, bold

### Spacing
- Use multiples of 4: 4, 8, 12, 16, 24, 32
- Card padding: 16
- Screen padding: 16
- List item height: 64

---

## 🇭🇷 CROATIAN LOCALIZATION

### Month Names (Croatian)
```typescript
// constants/months.ts
export const MONTHS_HR = [
  'Siječanj', 'Veljača', 'Ožujak', 'Travanj',
  'Svibanj', 'Lipanj', 'Srpanj', 'Kolovoz',
  'Rujan', 'Listopad', 'Studeni', 'Prosinac'
];

// Short versions
export const MONTHS_HR_SHORT = [
  'Sij', 'Velj', 'Ožu', 'Tra',
  'Svi', 'Lip', 'Srp', 'Kol',
  'Ruj', 'Lis', 'Stu', 'Pro'
];
```

### UI Text (Croatian defaults)
```
Prihod = Income
Troškovi = Expenses  
Štednja = Savings
Saldo = Balance
Iznos = Amount
Datum dospijeća = Due date
Plaćeno = Paid
Neplaćeno = Unpaid
Dodaj = Add
Uredi = Edit
Obriši = Delete
Spremi = Save
Odustani = Cancel
Potvrdi = Confirm
```

---

## 📋 IVAN'S ACTUAL DATA (Pre-seed this)

### Income Sources
| Name (HR) | Amount (HRK) | Recurring |
|---|---|---|
| Plaća | 2100 | Yes |
| Stanarine | 1100-1200 | Yes |
| Pickleball plaća | 80 | Yes |
| Računi podstanari | 400 | Yes (March only so far) |

### Fixed Monthly Expenses
| Name (HR) | Amount (HRK) | Due Day |
|---|---|---|
| Stambeni kredit | 657.43 | 28th |
| Nenamjenski kredit | 414.73 | 28th |
| Kreditna kartica | ~61 | 28th |
| Struja | 190 | 15th |
| Web alati | 55 | 17th |
| Osiguranje | 40 | 25th |

### Variable Expenses (Seen in March)
- Tomi (490 HRK)
- Momačka (250 HRK)
- Hotel Dubrovnik (95 HRK)
- Porez (64 HRK)
- Svitlo (100 HRK)
- Gorivo entries: ML (67.49), Audi (77.82)

### Daily Life (Život)
- Default daily allowance: **30 HRK/day**
- Total monthly allowance: 930 HRK (31 days) or 900 HRK (30 days)

### Fuel (Gorivo)
- Monthly estimated: **225 HRK**
- Vehicles tracked: ML, Audi

---

## ⚙️ BUSINESS LOGIC RULES

1. **New Month Auto-Population:** When user first opens a new month, auto-create entries for all `is_recurring = 1` categories using their `default_amount` and calculated `due_date` for that month.

2. **Balance Formula:** `saldo = ukupni_prihod - ukupni_troškovi - ukupna_štednja`

3. **Due Date Alerts:** Mark entries as "due soon" (orange) if `due_date` is within 3 days of today. Mark as "overdue" (red) if past due date and `paid_date` is null.

4. **Daily Tracker:** Auto-create 28/29/30/31 day entries when month opens. Default `allowed_amount` comes from settings (default 30 HRK).

5. **Currency:** Display in HRK by default. EUR option uses fixed rate 7.5345 (Croatia's Eurozone conversion rate). Store all values in HRK internally.

6. **Category deletion:** System categories (`is_system = 1`) can only be deactivated, never deleted.

7. **Month navigation:** Allow navigation to any past or future month. No restriction on year.

---

## 🚫 THINGS CLAUDE MUST NEVER DO

- ❌ Never use `any` type in TypeScript
- ❌ Never hardcode currency conversion rates outside `utils/currency.ts`
- ❌ Never make network requests (this is a 100% offline app)
- ❌ Never use class components (use functional components + hooks only)
- ❌ Never put business logic inside screen components (extract to hooks/utils)
- ❌ Never store sensitive data in AsyncStorage (SQLite for all budget data)
- ❌ Never delete the `database/seed.ts` categories without Ivan's explicit approval
- ❌ Never change the tech stack without discussion
- ❌ Never use `StyleSheet.create` with magic numbers — use constants from `constants/`

---

## ✅ CODE QUALITY STANDARDS

### TypeScript
```typescript
// ✅ Correct - always type interfaces
interface BudgetEntry {
  id: number;
  categoryId: number;
  year: number;
  month: number;
  plannedAmount: number;
  actualAmount: number;
  dueDate?: string;
  paidDate?: string;
  notes?: string;
  createdAt: string;
}

// ❌ Wrong
const entry: any = { ... };
```

### Database Queries
```typescript
// ✅ Correct - always use parameterized queries
const entries = await db.getAllAsync<BudgetEntry>(
  'SELECT * FROM budget_entries WHERE year = ? AND month = ?',
  [year, month]
);

// ❌ Wrong - SQL injection risk
const entries = await db.getAllAsync(`SELECT * FROM budget_entries WHERE year = ${year}`);
```

### Components
```typescript
// ✅ Correct - typed props, memo for list items
interface EntryItemProps {
  entry: BudgetEntry;
  onPress: (id: number) => void;
  onDelete: (id: number) => void;
}

const EntryItem = React.memo(({ entry, onPress, onDelete }: EntryItemProps) => {
  // ...
});
```

---

## 🏗️ DEVELOPMENT PHASES

### Phase 1 — Foundation (Days 1-2)
- [ ] Expo project init with TypeScript
- [ ] Install all dependencies
- [ ] Database schema + migrations
- [ ] Seed data (Ivan's categories)
- [ ] Basic navigation shell

### Phase 2 — Core Features (Days 3-5)
- [ ] Home dashboard
- [ ] Month list screen
- [ ] Month detail (income/expense/savings tabs)
- [ ] Add/Edit/Delete entries
- [ ] Real-time balance calculation

### Phase 3 — Advanced Features (Days 6-8)
- [ ] Daily life tracker (Život)
- [ ] Fuel tracker (Gorivo)
- [ ] Categories management
- [ ] Settings screen
- [ ] Auto-populate recurring expenses

### Phase 4 — Polish (Days 9-10)
- [ ] Statistics screen with charts
- [ ] Due date notifications/badges
- [ ] Export/Import JSON
- [ ] Dark mode support
- [ ] Loading states + empty states
- [ ] Haptic feedback

### Phase 5 — Build & Deploy (Day 11)
- [ ] EAS Build configuration
- [ ] Generate APK
- [ ] Install on Ivan's Android device
- [ ] Final testing on real hardware

---

## 📦 COMMANDS REFERENCE

```bash
# Start development
npx expo start

# Start with clear cache
npx expo start --clear

# Install new package
npx expo install <package-name>

# TypeScript check
npx tsc --noEmit

# Build APK (requires EAS CLI)
npm install -g eas-cli
eas login
eas build --platform android --profile preview

# Local APK build (no EAS account needed)
npx expo run:android
```

---

## 🔧 TROUBLESHOOTING

| Issue | Solution |
|---|---|
| SQLite not initialized | Check `app/_layout.tsx` — DB must init before render |
| Missing Expo module | Use `npx expo install` not `npm install` |
| Navigation type errors | Add screen to `app/` folder and update root layout |
| Chart not rendering | Wrap in `View` with explicit `width` and `height` |
| Android build fail | Check `app.json` for correct `package` name and permissions |

---

## 📞 CONTACT CONTEXT

This is a personal app for **Ivan** who currently tracks his budget in a Croatian-language Excel file with month sheets (Ožujak-Prosinac 2026). The app should feel familiar to that workflow but be faster and more convenient on mobile.

Ivan tracks:
- Multiple income streams (salary, rent from tenants, sports income)  
- Fixed monthly loan repayments with specific due dates
- Variable household bills
- Daily spending limits and actuals
- Fuel costs for two vehicles (Audi, ML)
- Monthly savings goals

The app replaces Excel — it should be just as detailed but 10x faster to use on mobile.

---

*Last updated: April 2026 | Version 1.0.0*
