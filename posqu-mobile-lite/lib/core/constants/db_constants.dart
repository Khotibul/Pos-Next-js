class DbConstants {
  DbConstants._();

  // Table names
  static const String tableUsers = 'users';
  static const String tableCategories = 'categories';
  static const String tableProducts = 'products';
  static const String tableSuppliers = 'suppliers';
  static const String tableCustomers = 'customers';
  static const String tablePurchases = 'purchases';
  static const String tablePurchaseItems = 'purchase_items';
  static const String tableSales = 'sales';
  static const String tableSaleItems = 'sale_items';
  static const String tableReturns = 'returns';
  static const String tableReturnItems = 'return_items';
  static const String tableCashierShifts = 'cashier_shifts';
  static const String tableCashTransactions = 'cash_transactions';
  static const String tableSyncQueue = 'sync_queue';

  // Sync queue status
  static const String syncPending = 'pending';
  static const String syncInProgress = 'in_progress';
  static const String syncCompleted = 'completed';
  static const String syncFailed = 'failed';

  // Payment methods
  static const String paymentCash = 'cash';
  static const String paymentQris = 'qris';
  static const String paymentTransfer = 'transfer';

  // Transaction types
  static const String typeSale = 'sale';
  static const String typePurchase = 'purchase';
  static const String typeReturn = 'return';
  static const String typeExpense = 'expense';
  static const String typeIncome = 'income';
}
