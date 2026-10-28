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

  static const _hosts = [
    'pos-next-js-kohl.vercel.app',
    '8.8.8.8',
    '1.1.1.1',
  ];

  @override
  Future<bool> get isConnected async {
    try {
      final result = await _connectivity.checkConnectivity();
      return _hasConnection(result);
    } catch (_) {
      return false;
    }
  }

  @override
  /// Cek internet nyata (DNS lookup) untuk login — mencegah false-online WiFi tanpa internet
  Future<bool> get hasInternetAccess async {
    if (!await isConnected) return false;
    for (final host in _hosts) {
      try {
        final lookup = await InternetAddress.lookup(host).timeout(const Duration(seconds: 4));
        if (lookup.isNotEmpty && lookup.first.rawAddress.isNotEmpty) {
          return true;
        }
      } catch (_) {
        continue;
      }
    }
    try {
      final socket = await Socket.connect('8.8.8.8', 53, timeout: const Duration(seconds: 3));
      await socket.close();
      return true;
    } catch (_) {
      return false;
    }
  }

  @override
  Stream<bool> get onConnectivityChanged {
    return _connectivity.onConnectivityChanged
        .map(_hasConnection)
        .distinct();
  }

  bool _hasConnection(List<ConnectivityResult> results) {
    if (results.isEmpty) return false;
    return results.any((result) => result != ConnectivityResult.none);
  }
}
