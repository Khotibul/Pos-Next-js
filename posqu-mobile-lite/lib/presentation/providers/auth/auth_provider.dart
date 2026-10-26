import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/repositories/auth_repository_impl.dart';
import '../../../data/repositories/external_auth_repository_impl.dart';
import 'auth_state.dart';

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepositoryImpl _authRepository;
  final ExternalAuthRepositoryImpl _externalAuthRepository;

  AuthNotifier(this._authRepository, this._externalAuthRepository)
      : super(const AuthState.initial());

  Future<void> checkAuthStatus() async {
    // Jangan menimpa proses login yang sedang berjalan (mis. splash masih
    // memanggil checkAuthStatus saat user menekan tombol Masuk).
    if (state.maybeWhen(loading: () => true, orElse: () => false)) return;
    final result = await _authRepository.isLoggedIn();
    result.fold(
      (failure) => state = AuthState.unauthenticated(failure.message),
      (isLoggedIn) {
        if (isLoggedIn) {
          _loadUser();
        } else {
          state = const AuthState.unauthenticated(null);
        }
      },
    );
  }

  Future<void> _loadUser() async {
    final result = await _authRepository.getCurrentUser();
    result.fold(
      (failure) => state = AuthState.unauthenticated(failure.message),
      (user) => state = AuthState.authenticated(user),
    );
  }

  Future<bool> login(String email, String password) async {
    state = const AuthState.loading();
    final result = await _authRepository.login(email, password);
    return result.fold(
      (failure) {
        state = AuthState.error(failure.message);
        return false;
      },
      (user) {
        state = AuthState.authenticated(user);
        return true;
      },
    );
  }

  Future<void> signInWithGoogle() async {
    state = const AuthState.loading();
    final result = await _externalAuthRepository.signInWithGoogle();
    result.fold(
      (failure) => state = AuthState.error(failure.message),
      (user) => state = AuthState.authenticated(user),
    );
  }

  Future<void> signInWithApple() async {
    state = const AuthState.loading();
    final result = await _externalAuthRepository.signInWithApple();
    result.fold(
      (failure) => state = AuthState.error(failure.message),
      (user) => state = AuthState.authenticated(user),
    );
  }

  Future<void> logout() async {
    state = const AuthState.loading();
    await _authRepository.logout();
    state = const AuthState.unauthenticated(null);
  }

  /// Sesi hangingus (idle > 1 jam) — keluar ke login dengan pesan jelas.
  Future<void> sessionExpired() async {
    await _authRepository.logout();
    state = const AuthState.error(
      'Sesi berakhir (1 jam tidak aktif). Silakan login kembali.',
    );
  }
}

final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(
    ref.read(authRepositoryProvider),
    ref.read(externalAuthRepositoryProvider),
  );
});