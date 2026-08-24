class AppConstants {
  AppConstants._();

  static const String appName = 'POSQU Pro';
  static const String appVersion = '1.0.2';
  static const String dbName = 'posqu_mobile_lite.db';

  // Pagination
  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;

  // Currency
  static const String currencySymbol = 'Rp';
  static const String currencyCode = 'IDR';
  static const String localeId = 'id_ID';

  // Date formats
  static const String dateFormat = 'dd/MM/yyyy';
  static const String timeFormat = 'HH:mm';
  static const String dateTimeFormat = 'dd/MM/yyyy HH:mm';
  static const String fullDateFormat = 'EEEE, dd MMMM yyyy';
  static const String isoFormat = 'yyyy-MM-ddTHH:mm:ss';
}
