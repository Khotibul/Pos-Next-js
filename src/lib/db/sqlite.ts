import Database from "better-sqlite3";
import { backupSqliteFiles, ensureParentDir } from "./connection.js";

export type QueryResultRow = Record<string, unknown>;

export type DesktopDb = {
  query: <T extends QueryResultRow = QueryResultRow>(sql: string, params?: unknown[]) => Promise<T[]>;
  execute: (sql: string, params?: unknown[]) => Promise<void>;
};

type SqliteDbOptions = {
  dbPath: string;
};

/**
 * SQLite facade for the Desktop app (offline-first).
 * - Uses better-sqlite3 (sync) but exposes async methods for compatibility.
 * - WAL mode for better concurrency and reliability.
 */
export class SqliteDb implements DesktopDb {
  private dbPath: string;
  private db: Database.Database | null = null;

  constructor(opts: SqliteDbOptions) {
    this.dbPath = opts.dbPath;
  }

  static async openOrCreate(opts: SqliteDbOptions) {
    ensureParentDir(opts.dbPath);
    const db = new SqliteDb(opts);
    try {
      await db.connect();
      await db.ensureSchema();
      await db.ensureHealthy();
    } catch {
      await db.close().catch(() => undefined);
      backupSqliteFiles(opts.dbPath, "open-failed");
      const repaired = new SqliteDb(opts);
      await repaired.connect();
      await repaired.ensureSchema();
      await repaired.ensureHealthy();
      return repaired;
    }
    return db;
  }

  async connect() {
    if (this.db) return;

    // Ensure parent exists even if called directly.
    ensureParentDir(this.dbPath);
    const db = new Database(this.dbPath, {
      fileMustExist: false,
      timeout: 5_000,
    });

    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
    db.pragma("foreign_keys = ON");

    this.db = db;
  }

  async close() {
    if (!this.db) return;
    this.db.close();
    this.db = null;
  }

  async query<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []) {
    if (!this.db) await this.connect();
    const stmt = this.db!.prepare(sql);
    const rows = stmt.all(params) as unknown;
    return (Array.isArray(rows) ? rows : []) as T[];
  }

  async execute(sql: string, params: unknown[] = []) {
    if (!this.db) await this.connect();
    const stmt = this.db!.prepare(sql);
    stmt.run(params);
  }

  async transaction<T>(fn: (trx: SqliteDb) => T) {
    if (!this.db) await this.connect();
    const db = this.db!;
    const wrapped = db.transaction(() => fn(this));
    return wrapped();
  }

  async ensureHealthy() {
    if (!this.db) await this.connect();
    const row = this.db!.prepare("PRAGMA quick_check").get() as Record<string, unknown> | undefined;
    const result = row ? String(Object.values(row)[0] ?? "") : "";
    if (result.toLowerCase() !== "ok") {
      throw new Error(`SQLite integrity check gagal: ${result || "unknown"}`);
    }
  }

  async ensureSchema() {
    if (!this.db) await this.connect();
    const db = this.db!;

    db.exec(`
      CREATE TABLE IF NOT EXISTS License (
        id TEXT PRIMARY KEY,
        tenantId TEXT,
        licenseKey TEXT,
        companyName TEXT,
        ownerName TEXT,
        email TEXT,
        phone TEXT,
        deviceId TEXT,
        activationDate TEXT,
        expiredDate TEXT,
        maxUsers INTEGER,
        maxBranches INTEGER,
        planType TEXT,
        isActive INTEGER,
        lastValidationAt TEXT,
        offlineGraceDays INTEGER,
        signatureHash TEXT,
        encryptedPayload TEXT,
        createdAt TEXT,
        updatedAt TEXT
      );
      CREATE INDEX IF NOT EXISTS ix_License_updatedAt ON License(updatedAt);
    `);

    // Lightweight schema migrations for existing local DBs.
    // Add missing columns as the app evolves.
    const cols = db
      .prepare("PRAGMA table_info('License')")
      .all()
      .map((r) => String((r as { name?: unknown }).name));
    if (!cols.includes("tenantId")) {
      db.exec("ALTER TABLE License ADD COLUMN tenantId TEXT;");
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS SyncQueue (
        id TEXT PRIMARY KEY,
        entity TEXT NOT NULL,
        entityId TEXT,
        action TEXT NOT NULL,
        payload TEXT,
        status TEXT NOT NULL,
        retryCount INTEGER NOT NULL DEFAULT 0,
        nextRunAt TEXT,
        errorText TEXT,
        lastSyncedAt TEXT,
        createdAt TEXT,
        updatedAt TEXT
      );
      CREATE INDEX IF NOT EXISTS ix_SyncQueue_status_createdAt ON SyncQueue(status, createdAt);
      CREATE INDEX IF NOT EXISTS ix_SyncQueue_nextRunAt ON SyncQueue(nextRunAt);

      CREATE TABLE IF NOT EXISTS Branch (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        isActive INTEGER,
        createdAt TEXT,
        updatedAt TEXT
      );

      CREATE TABLE IF NOT EXISTS User (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        roleKey TEXT,
        branchId TEXT,
        isActive INTEGER,
        createdAt TEXT,
        updatedAt TEXT,
        FOREIGN KEY (branchId) REFERENCES Branch(id)
      );
      CREATE INDEX IF NOT EXISTS ix_User_branchId ON User(branchId);

      CREATE TABLE IF NOT EXISTS ProductCategory (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        isActive INTEGER,
        createdAt TEXT,
        updatedAt TEXT
      );

      CREATE TABLE IF NOT EXISTS Product (
        id TEXT PRIMARY KEY,
        sku TEXT NOT NULL UNIQUE,
        barcode TEXT,
        qrCode TEXT,
        name TEXT NOT NULL,
        description TEXT,
        categoryId TEXT,
        unitName TEXT,
        purchasePrice REAL,
        sellingPrice REAL,
        taxRate REAL,
        minimumStock REAL,
        isActive INTEGER,
        updatedAt TEXT,
        FOREIGN KEY (categoryId) REFERENCES ProductCategory(id)
      );
      CREATE INDEX IF NOT EXISTS ix_Product_barcode ON Product(barcode);
      CREATE INDEX IF NOT EXISTS ix_Product_qrCode ON Product(qrCode);
      CREATE INDEX IF NOT EXISTS ix_Product_categoryId ON Product(categoryId);

      CREATE TABLE IF NOT EXISTS CashierShift (
        id TEXT PRIMARY KEY,
        branchId TEXT NOT NULL,
        cashierId TEXT NOT NULL,
        openedAt TEXT,
        closedAt TEXT,
        openingCash REAL,
        cashSystem REAL,
        cashCounted REAL,
        cashDifference REAL,
        totalSales REAL,
        totalCash REAL,
        totalQris REAL,
        totalTransfer REAL,
        totalEwallet REAL,
        transactionCount INTEGER,
        status TEXT,
        openNote TEXT,
        closeNote TEXT,
        approvedById TEXT,
        approvedAt TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        FOREIGN KEY (branchId) REFERENCES Branch(id),
        FOREIGN KEY (cashierId) REFERENCES User(id)
      );
      CREATE INDEX IF NOT EXISTS ix_CashierShift_branchId ON CashierShift(branchId);
      CREATE INDEX IF NOT EXISTS ix_CashierShift_cashierId ON CashierShift(cashierId);
      CREATE INDEX IF NOT EXISTS ix_CashierShift_status ON CashierShift(status);

      CREATE TABLE IF NOT EXISTS Sale (
        id TEXT PRIMARY KEY,
        invoiceNo TEXT NOT NULL UNIQUE,
        branchId TEXT NOT NULL,
        cashierId TEXT,
        shiftId TEXT,
        subtotal REAL,
        discount REAL,
        tax REAL,
        total REAL,
        status TEXT,
        synced INTEGER,
        createdAt TEXT,
        updatedAt TEXT,
        FOREIGN KEY (branchId) REFERENCES Branch(id),
        FOREIGN KEY (cashierId) REFERENCES User(id),
        FOREIGN KEY (shiftId) REFERENCES CashierShift(id)
      );
      CREATE INDEX IF NOT EXISTS ix_Sale_branchId_createdAt ON Sale(branchId, createdAt);
      CREATE INDEX IF NOT EXISTS ix_Sale_shiftId ON Sale(shiftId);

      CREATE TABLE IF NOT EXISTS SaleItem (
        id TEXT PRIMARY KEY,
        saleId TEXT NOT NULL,
        productId TEXT,
        sku TEXT,
        name TEXT NOT NULL,
        price REAL,
        qty REAL,
        lineTotal REAL,
        FOREIGN KEY (saleId) REFERENCES Sale(id),
        FOREIGN KEY (productId) REFERENCES Product(id)
      );
      CREATE INDEX IF NOT EXISTS ix_SaleItem_saleId ON SaleItem(saleId);

      CREATE TABLE IF NOT EXISTS Payment (
        id TEXT PRIMARY KEY,
        saleId TEXT NOT NULL,
        method TEXT NOT NULL,
        amount REAL,
        receivedAmount REAL,
        changeAmount REAL,
        reference TEXT,
        createdAt TEXT,
        FOREIGN KEY (saleId) REFERENCES Sale(id)
      );
      CREATE INDEX IF NOT EXISTS ix_Payment_saleId ON Payment(saleId);
      CREATE INDEX IF NOT EXISTS ix_Payment_method ON Payment(method);

      CREATE TABLE IF NOT EXISTS Setting (
        key TEXT PRIMARY KEY,
        value TEXT,
        updatedAt TEXT
      );
    `);

    const syncCols = db
      .prepare("PRAGMA table_info('SyncQueue')")
      .all()
      .map((r) => String((r as { name?: unknown }).name));
    if (!syncCols.includes("retryCount")) {
      db.exec("ALTER TABLE SyncQueue ADD COLUMN retryCount INTEGER NOT NULL DEFAULT 0;");
    }
    if (!syncCols.includes("nextRunAt")) {
      db.exec("ALTER TABLE SyncQueue ADD COLUMN nextRunAt TEXT;");
    }
    if (!syncCols.includes("lastSyncedAt")) {
      db.exec("ALTER TABLE SyncQueue ADD COLUMN lastSyncedAt TEXT;");
    }

    const paymentCols = db
      .prepare("PRAGMA table_info('Payment')")
      .all()
      .map((r) => String((r as { name?: unknown }).name));
    if (!paymentCols.includes("receivedAmount")) {
      db.exec("ALTER TABLE Payment ADD COLUMN receivedAmount REAL;");
    }
    if (!paymentCols.includes("changeAmount")) {
      db.exec("ALTER TABLE Payment ADD COLUMN changeAmount REAL;");
    }
  }
}
