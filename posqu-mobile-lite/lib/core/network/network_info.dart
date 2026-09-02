import 'dart:io';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final networkInfoProvider = Provider<NetworkInfo>((ref) {
  return NetworkInfoImpl(Connectivity());
});

abstract class NetworkInfo {
  Future<bool> get isConnected;
  Future<bool> get hasInternetAccess;
  Stream<bool> get onConnectivityChanged;
}

class NetworkInfoImpl implements NetworkInfo {
  final Connectivity _connectivity;

  NetworkInfoImpl(this._connectivity);

  @override
  Future<bool> get isConnected async {
    final result = await _connectivity.checkConnectivity();
    return _hasConnection(result);
  }

  @override
  /// Cek internet nyata (DNS lookup) untuk login — mencegah false-online WiFi tanpa internet
  /// Timeout 3 detik, dipakai khusus login agar tidak hang 45s
  Future<bool> get hasInternetAccess async {
    if (!await isConnected) return false;
    try {
      final lookup = await InternetAddress.lookup('posqupro.co-id.id').timeout(const Duration(seconds: 3));
      if (lookup.isEmpty || lookup.first.rawAddress.isEmpty) return false;
      return true;
    } catch (_) {
      return false;
    }
  }

  @override
  Stream<bool> get onConnectivityChanged {
    return _connectivity.onConnectivityChanged.map(_hasConnection);
  }

  bool _hasConnection(List<ConnectivityResult> results) {
    if (results.isEmpty) return false;
    // connectivity_plus mengembalikan list; false hanya jika semua none
    // True-online tetap perlu validasi server (Dio akan handle timeout/401),
    // tapi ACCESS_NETWORK_STATE (sudah ditambahkan Manifest) meningkatkan akurasi di Android 14+.
    return results.any((result) => result != ConnectivityResult.none);
  }
}
