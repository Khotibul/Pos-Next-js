/// Circuit breaker sederhana: jika sebuah grup endpoint mobile belum tersedia
/// di server (HTTP 404), hentikan percobaan berikutnya sampai koneksi dipulihkan
/// atau aplikasi direstart. Mencegah banjir request 404 saat backend belum
/// ter-deploy.
class MobileApiGate {
  MobileApiGate._();

  static final Set<String> _disabled = <String>{};

  static bool isDisabled(String group) => _disabled.contains(group);

  static void disable(String group) => _disabled.add(group);

  static void reset() => _disabled.clear();
}
