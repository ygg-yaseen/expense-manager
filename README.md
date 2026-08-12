# 💳 ExpenseFlow Lite - Personal Expense Manager

**ExpenseFlow** is a modern, lightweight, multi-user personal expense and monthly budget manager built with React, TypeScript, and Tailwind CSS. Designed with a mobile-first responsive layout, dark mode aesthetic, 4-digit PIN authentication, sub-category location tagging, and cross-platform mobile readiness.

---

## 🌟 Key Features

- **👤 Multi-User Profiles**:
  - Add and manage multiple user profiles.
  - Each profile maintains an isolated transaction ledger, currency preference (`$`, `€`, `₹`, `£`, `AED`, etc.), and monthly budget.

- **🔒 4-Digit Security PIN**:
  - Requires a 4-digit PIN every time you open the app or switch user profiles.
  - Supports both on-screen numeric keypad and physical keyboard input (`0-9`, `Backspace`).

- **📊 Personalized Dashboard & Analytics**:
  - **Monthly Budget Tracker**: Real-time spending progress bar with spending velocity alerts (*On Track 🟢*, *High Spend 🟡*, *Over Budget 🔴*).
  - **Cashflow & Daily Spend Rate**: Calculates daily average spending and projected month-end totals.
  - **Interactive Charts**: Category spending donut charts and 6-month historical Income vs. Expense trend bars powered by Recharts.

- **📍 Custom Categories & Trip Tags**:
  - Selectable Main Category & Sub-Category dropdowns.
  - Custom Sub-Category Location Tags (e.g., `Ooty-Aug`, `Goa 2026`, `Office Lunch`).
  - Add and edit custom main categories and sub-category tags anytime.

- **📅 Custom Dark-Themed Calendar Picker**:
  - Sleek, custom-built calendar popup modal matching the glassmorphic dark theme.
  - Quick month/year navigation and a "Set Today" shortcut.

- **📑 Ledger Filtering & CSV Export**:
  - Filter transactions by main category, trip tag, cashflow type, or search keywords.
  - Export full transaction history to CSV spreadsheets.
  - Export/Import complete JSON system backups.

- **📱 Android & iOS App Ready**:
  - Decoupled service layer (`StorageService`, `AuthService`, `ExpenseService`) abstracting local storage.
  - Instant mobile wrapper support via **Capacitor** (`npx cap add android` / `npx cap add ios`) or **React Native / Expo**.

---

## 🗄️ Database Architecture

1. **Web Mode (Browser)**:
   - Powered by **Client-side LocalStorage / IndexedDB**.
   - Offline-first, fast performance, and 100% private on your device.

2. **Mobile Mode (Android & iOS)**:
   - When wrapped into native mobile apps via Capacitor or React Native, the storage abstraction bridges directly to **Native SQLite Engine** or encrypted device storage.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.x or higher
- **npm**: v9.x or higher

### Installation & Local Setup

```bash
# Clone repository
git clone git@github.com:ygg-yaseen/expense-manager.git
cd expense-manager

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

The application will be available at `http://localhost:5173/`.

### Build for Production

```bash
npm run build
```

---

## 📱 Packaging for Android & iOS (Capacitor Setup)

To build a native mobile app for Android (APK/AAB) or iOS (IPA):

```bash
# Build web production assets
npm run build

# Install Capacitor CLI & Core
npm install @capacitor/core @capacitor/cli

# Initialize Capacitor
npx cap init ExpenseFlow com.expenseflow.app

# Add Native Mobile Platforms
npx cap add android
npx cap add ios

# Sync Web Assets to Native Projects
npx cap sync

# Open in Android Studio / Xcode
npx cap open android
npx cap open ios
```

---

## 🛠️ Tech Stack

- **Frontend Core**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Glassmorphism design tokens
- **Icons**: Lucide React
- **Data Visualizations**: Recharts
- **State & Storage**: Custom service abstraction layer with LocalStorage / IndexedDB

---

## 📄 License

MIT License. Free for personal and commercial use.
