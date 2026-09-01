import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/datasources/local/hive_cache.dart';
import '../../../data/datasources/remote/unit_remote_datasource.dart';
import '../../../core/network/mobile_api_gate.dart';
import '../../../core/network/network_info.dart';

/// Satuan default bila belum ada satuan dari server (agar offline tetap jalan).
const List<String> _defaultUnits = [
  'pcs',
  'kg',
  'gram',
  'liter',
  'ml',
  'pack',
  'dus',
  'box',
  'botol',
  'sachet',
  'roll',
  'meter',
  'lusin',
];

const String _unitsCacheKey = 'units';

/// Daftar satuan produk untuk dropdown, bersumber dari database server
/// (via /mobile/units) dan di-cache lokal. Tetap menampilkan daftar bawaan
/// bila belum ada data / offline.
final unitsProvider = FutureProvider<List<String>>((ref) async {
  final remote = ref.read(unitRemoteDataSourceProvider);
  final cache = ref.read(hiveCacheProvider);
  final networkInfo = ref.read(networkInfoProvider);

  final cached = _readCachedUnits(cache);

  if (!MobileApiGate.isDisabled('units') && await networkInfo.isConnected) {
    try {
      final remoteUnits = await remote.getUnits();
      if (remoteUnits.isNotEmpty) {
        await cache.setCache(_unitsCacheKey, remoteUnits.toList());
        return _merge(_defaultUnits, remoteUnits);
      }
    } catch (_) {
      // Gangguan jaringan / endpoint tak tersedia -> pakai cache & default.
    }
  }

  return _merge(_defaultUnits, cached);
});

List<String> _readCachedUnits(HiveCache cache) {
  final raw = cache.getCache(_unitsCacheKey);
  if (raw is List) {
    return raw.whereType<String>().toList();
  }
  return [];
}

List<String> _merge(List<String> defaults, List<String> extra) {
  final seen = <String>{};
  final result = <String>[];
  for (final u in [...defaults, ...extra]) {
    final key = u.trim().toLowerCase();
    if (u.trim().isEmpty || seen.contains(key)) continue;
    seen.add(key);
    result.add(u.trim());
  }
  return result;
}
