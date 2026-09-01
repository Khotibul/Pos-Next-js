import 'package:flutter_dotenv/flutter_dotenv.dart';

class EnvConfig {
  EnvConfig._();

  static String get apiBaseUrl {
    var url = dotenv.get(
      'API_BASE_URL',
      fallback: 'http://localhost:3000/api',
    ).trim();
    // Android: localhost/127.0.0.1 tidak reachable dari device/emulator.
    // Jika .env masih localhost, coba fallback ke 10.0.2.2 (emulator) atau biarkan https prod.
    if (url.contains('localhost') || url.contains('127.0.0.1')) {
      // Untuk emulator Android: ganti ke 10.0.2.2, untuk device fisik user harus set API_BASE_URL ke IP LAN (mis 192.168.1.x)
      // Di sini kita biarkan apa adanya tapi dengan catatan: pastikan .env di device sudah pakai IP yang benar.
      // Jika masih localhost di release prod, pakai fallback prod.
      if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
        // Di prod .env sudah https://posqupro.co-id.id/api, jadi tidak masuk sini
        // Dev bisa override via API_BASE_URL_DEV di .env: kita cek
        final devUrl = dotenv.get('API_BASE_URL_DEV', fallback: '').trim();
        if (devUrl.isNotEmpty) url = devUrl;
      }
    }
    return url;
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