import 'package:flutter_dotenv/flutter_dotenv.dart';

class EnvConfig {
  EnvConfig._();

  static String get apiBaseUrl {
    return dotenv.get(
      'API_BASE_URL',
      fallback: 'http://localhost:3000/api/v1',
    );
  }

  static String get databaseUrl {
    return dotenv.get(
      'DATABASE_URL',
      fallback: '',
    );
  }

  static String get pgUser {
    return dotenv.get('PGUSER', fallback: '');
  }

  static String get pgDatabase {
    return dotenv.get('PGDATABASE', fallback: '');
  }

  static String get pgPassword {
    return dotenv.get('PGPASSWORD', fallback: '');
  }

  static String get pgHost {
    return dotenv.get('PGHOST', fallback: '');
  }

  static String get googleClientId {
    return dotenv.get('GOOGLE_CLIENT_ID', fallback: '');
  }

  static String get googleClientSecret {
    return dotenv.get('GOOGLE_CLIENT_SECRET', fallback: '');
  }

  static int get apiTimeout {
    return int.tryParse(dotenv.get('API_TIMEOUT', fallback: '30')) ?? 30;
  }

  static int get apiConnectTimeout {
    return int.tryParse(dotenv.get('API_CONNECT_TIMEOUT', fallback: '15')) ?? 15;
  }

  static int get syncIntervalMinutes {
    return int.tryParse(dotenv.get('SYNC_INTERVAL_MINUTES', fallback: '5')) ?? 5;
  }
}