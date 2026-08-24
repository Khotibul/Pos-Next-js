import 'env_config.dart';

class ApiConstants {
  ApiConstants._();

  static const String baseUrlKey = 'API_BASE_URL';
  static String get defaultBaseUrl => EnvConfig.apiBaseUrl;
  static Duration get timeout => Duration(seconds: EnvConfig.apiTimeout);
  static Duration get connectTimeout => Duration(seconds: EnvConfig.apiConnectTimeout);

  // Endpoints
  static const String login = '/auth/login';
  static const String mobileLogin = '/mobile/auth/login';
  static const String mobileGoogleLogin = '/mobile/auth/google';
  static const String logout = '/auth/logout';
  static const String refreshToken = '/auth/refresh';
  static const String products = '/mobile/products';
  static const String categories = '/mobile/categories';
  static const String suppliers = '/mobile/suppliers';
  static const String customers = '/mobile/customers';
  static const String purchases = '/purchases';
  static const String sales = '/mobile/sales';
  static const String returns = '/returns';
  static const String cashierShifts = '/cashier-shifts';
  static const String cashTransactions = '/cash-transactions';
  static const String reports = '/reports';
  static const String dashboard = '/dashboard';
  static const String sync = '/sync';
  static const String settings = '/settings';

  // Headers
  static const String authorization = 'Authorization';
  static const String bearer = 'Bearer ';
  static const String contentType = 'Content-Type';
  static const String applicationJson = 'application/json';
}
