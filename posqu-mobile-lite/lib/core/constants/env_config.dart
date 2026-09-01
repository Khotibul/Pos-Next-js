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

  static String get googleWebClientId {
    final v = dotenv.get('NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID', fallback: '').trim();
    if (v.isNotEmpty) return v;
    return googleClientId;
  }

  static String get googleAndroidClientId {
    return dotenv.get('NEXT_PUBLIC_GOOGLE_ANDROID_CLIENT_ID', fallback: '').trim();
  }

  /// Server client ID yang dipakai GoogleSignIn Android untuk meminta idToken.
  /// Prioritas: WEB > ANDROID > GOOGLE_CLIENT_ID (semua sudah masuk allowedAudiences backend).
  static String get googleServerClientId {
    if (googleWebClientId.isNotEmpty) return googleWebClientId;
    if (googleAndroidClientId.isNotEmpty) return googleAndroidClientId;
    return googleClientId;
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