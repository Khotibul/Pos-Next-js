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

  Future<void> login(String email, String password) async {
    state = const AuthState.loading();
    final result = await _authRepository.login(email, password);
    result.fold(
      (failure) => state = AuthState.error(failure.message),
      (user) => state = AuthState.authenticated(user),
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
}

final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(
    ref.read(authRepositoryProvider),
    ref.read(externalAuthRepositoryProvider),
  );
});