import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'network_info.dart';

enum AppConnection { online, offline }

class ConnectionStatusNotifier extends StateNotifier<AppConnection> {
  final NetworkInfo _networkInfo;
  StreamSubscription<bool>? _subscription;

  ConnectionStatusNotifier(this._networkInfo) : super(AppConnection.offline) {
    _init();
  }

  Future<void> _init() async {
    final connected = await _networkInfo.isConnected;
    if (!mounted) return;
    state = connected ? AppConnection.online : AppConnection.offline;

    _subscription?.cancel();
    _subscription = _networkInfo.onConnectivityChanged.listen((connected) {
      if (!mounted) return;
      state = connected ? AppConnection.online : AppConnection.offline;
    });
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}

final connectionStatusProvider =
    StateNotifierProvider<ConnectionStatusNotifier, AppConnection>((ref) {
  return ConnectionStatusNotifier(ref.read(networkInfoProvider));
});

final isOnlineProvider = Provider<bool>((ref) {
  return ref.watch(connectionStatusProvider) == AppConnection.online;
});
