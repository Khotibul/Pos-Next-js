/// Circuit breaker: endpoint mobile yang belum tersedia (404/501) di-disable
/// sementara untuk mencegah banjir request. Auto-reset setelah TTL atau saat
/// koneksi pulih (via NetworkInfo). Sebelumnya permanent disable sampai restart.
class MobileApiGate {
  MobileApiGate._();

  static final Map<String, DateTime> _disabledUntil = {};

  static bool isDisabled(String group) {
    final until = _disabledUntil[group];
    if (until == null) return false;
    if (DateTime.now().isAfter(until)) {
      _disabledUntil.remove(group);
      return false;
    }
    return true;
  }

  /// Disable sementara [ttl] default 5 menit (404) / 15 menit (501).
  /// 404 = endpoint mungkin belum deploy, 501 = not implemented.
  static void disable(String group, {Duration ttl = const Duration(minutes: 5)}) {
    _disabledUntil[group] = DateTime.now().add(ttl);
  }

  static void disableNotImplemented(String group) =>
      disable(group, ttl: const Duration(minutes: 15));

  static void reset() => _disabledUntil.clear();

  static void resetGroup(String group) => _disabledUntil.remove(group);
}
