import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants/app_constants.dart';
import '../../data/repositories/auth_repository_impl.dart';
import '../../presentation/providers/auth/auth_provider.dart';

/// Penjaga sesi sliding 1 jam.
/// - Saat app resume dari minimize: perpanjang sesi (TIDAK logout),
///   kecuali sudah > 1 jam tidak aktif → paksa login ulang.
/// - Timer periodik selama app hidup: perpanjang sesi agar pemakaian
///   aktif nonstop (shift kasir) tidak terputus di tengah jalan.
class SessionWatcher extends ConsumerStatefulWidget {
  final Widget child;

  const SessionWatcher({super.key, required this.child});

  @override
  ConsumerState<SessionWatcher> createState() => _SessionWatcherState();
}

class _SessionWatcherState extends ConsumerState<SessionWatcher>
    with WidgetsBindingObserver {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _timer = Timer.periodic(AppConstants.sessionTouchInterval, (_) => _check());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _timer?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _check();
    }
  }

  Future<void> _check() async {
    final isAuthenticated = ref.read(authStateProvider).maybeWhen(
          authenticated: (_) => true,
          orElse: () => false,
        );
    if (!isAuthenticated) return;

    final repository = ref.read(authRepositoryProvider);
    final stillValid = (await repository.isLoggedIn()).getOrElse(() => false);
    if (!mounted) return;

    if (!stillValid) {
      await ref.read(authStateProvider.notifier).sessionExpired();
    } else {
      await repository.touchSession();
    }
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
