import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/widgets/app_button.dart';
import '../../core/widgets/app_text_field.dart';
import '../../data/datasources/local/hive_cache.dart';
import '../providers/auth/auth_provider.dart';
import '../providers/auth/auth_state.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _cache = HiveCache();
  bool _obscurePassword = true;
  bool _rememberPassword = false;

  @override
  void initState() {
    super.initState();
    _loadRememberedCredentials();
  }

  void _loadRememberedCredentials() {
    try {
      if (!_cache.rememberPasswordEnabled) return;
      final email = _cache.getRememberedEmail();
      final password = _cache.getRememberedPassword();
      if (email == null || password == null) return;
      _emailController.text = email;
      _passwordController.text = password;
      _rememberPassword = true;
    } catch (_) {
      // Hive belum siap — abaikan, user tetap bisa login manual.
    }
  }

  Future<void> _saveRememberedCredentials(
    String email,
    String password,
    bool remember,
  ) async {
    try {
      if (remember) {
        await _cache.saveRememberedCredentials(email, password);
      } else {
        await _cache.clearRememberedCredentials();
      }
    } catch (_) {
      // Gagal menyimpan tidak boleh menggagalkan login.
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);

    ref.listen<AuthState>(authStateProvider, (previous, next) {
      next.whenOrNull(
        error: (message) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(message)),
          );
        },
      );
    });

    return Scaffold(
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final isWide = constraints.maxWidth >= 720;
            final formCard = _buildFormCard(context, authState);

            if (isWide) {
              return Row(
                children: [
                  Expanded(
                    child: _buildBrandingPanel(),
                  ),
                  SizedBox(
                    width: 440.0.clamp(320.0, constraints.maxWidth * 0.5),
                    child: Container(
                      color: Theme.of(context).colorScheme.surface,
                      child: Center(
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.all(32),
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 380),
                            child: formCard,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              );
            }

            return Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 400),
                  child: formCard,
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildBrandingPanel() {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Theme.of(context).colorScheme.primary,
            Theme.of(context).colorScheme.tertiary,
          ],
        ),
      ),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: Image.asset(
                'assets/images/logo_launcher.png',
                width: 96,
                height: 96,
                fit: BoxFit.cover,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'POSQU Mobile Lite',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'Kasir modern untuk toko Anda',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: Colors.white.withValues(alpha: 0.9),
                  ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFormCard(BuildContext context, AuthState authState) {
    return Form(
      key: _formKey,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: Image.asset(
              'assets/images/logo_launcher.png',
              width: 80,
              height: 80,
              fit: BoxFit.cover,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'POSQU Mobile Lite',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'Masuk untuk memulai',
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
          const SizedBox(height: 32),
          authState.maybeWhen(
            error: (message) => Container(
              width: double.infinity,
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.errorContainer,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.error_outline,
                    size: 18,
                    color: Theme.of(context).colorScheme.onErrorContainer,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      message,
                      style: TextStyle(
                        fontSize: 13,
                        color: Theme.of(context).colorScheme.onErrorContainer,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            orElse: () => const SizedBox.shrink(),
          ),
          AppTextField(
            label: 'Email',
            hint: 'Masukkan email',
            prefixIcon: Icons.email_outlined,
            controller: _emailController,
            validator: (v) {
              if (v == null || v.isEmpty) return 'Email wajib diisi';
              if (!v.contains('@')) return 'Format email tidak valid';
              return null;
            },
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _passwordController,
            obscureText: _obscurePassword,
            validator: (v) {
              if (v == null || v.isEmpty) return 'Password wajib diisi';
              if (v.length < 8) return 'Password minimal 8 karakter';
              return null;
            },
            decoration: InputDecoration(
              labelText: 'Password',
              hintText: 'Masukkan password',
              prefixIcon: const Icon(Icons.lock_outline),
              suffixIcon: IconButton(
                icon: Icon(
                  _obscurePassword
                      ? Icons.visibility_off_outlined
                      : Icons.visibility_outlined,
                ),
                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
              ),
            ),
          ),
          const SizedBox(height: 8),
          CheckboxListTile(
            value: _rememberPassword,
            onChanged: (value) {
              setState(() => _rememberPassword = value ?? false);
              if (value == false) {
                // ignore: unawaited_futures
                _cache.clearRememberedCredentials();
              }
            },
            contentPadding: EdgeInsets.zero,
            controlAffinity: ListTileControlAffinity.leading,
            dense: true,
            title: const Text(
              'Ingat password',
              style: TextStyle(fontSize: 14),
            ),
            subtitle: const Text(
              'Email & password otomatis terisi saat login berikutnya',
              style: TextStyle(fontSize: 11),
            ),
          ),
          const SizedBox(height: 16),
          AppButton(
            label: 'Masuk',
            loading: authState.maybeWhen(
              loading: () => true,
              orElse: () => false,
            ),
            onPressed: _handleLogin,
          ),
          const SizedBox(height: 24),
          _buildSocialSignInButtons(),
        ],
      ),
    );
  }

  Future<void> _handleLogin() async {
    final isLoading = ref.read(authStateProvider).maybeWhen(
          loading: () => true,
          orElse: () => false,
        );
    if (isLoading) return;
    if (!_formKey.currentState!.validate()) return;

    // Ambil nilai sebelum await: widget bisa sudah di-dispose oleh redirect
    // router begitu status authenticated muncul.
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    final remember = _rememberPassword;

    final success =
        await ref.read(authStateProvider.notifier).login(email, password);

    if (success) {
      await _saveRememberedCredentials(email, password, remember);
    }
  }

  Widget _buildSocialSignInButtons() {
    return Column(
      children: [
        const Text(
          'Atau masuk dengan:',
          style: TextStyle(
            color: Colors.grey,
            fontSize: 14,
          ),
        ),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _buildSocialButton(
              icon: Icons.g_mobiledata,
              label: 'Google',
              onPressed: _handleGoogleSignIn,
              color: Colors.redAccent,
            ),
            const SizedBox(width: 16),
            _buildSocialButton(
              icon: Icons.apple,
              label: 'Apple',
              onPressed: _handleAppleSignIn,
              color: Colors.black,
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSocialButton({
    required IconData icon,
    required String label,
    required VoidCallback onPressed,
    required Color color,
  }) {
    return ElevatedButton.icon(
      icon: Icon(icon, color: Colors.white),
      label: Text(
        label,
        style: const TextStyle(color: Colors.white),
      ),
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
      onPressed: onPressed,
    );
  }

  Future<void> _handleGoogleSignIn() async {
    await ref.read(authStateProvider.notifier).signInWithGoogle();
  }

  Future<void> _handleAppleSignIn() async {
    await ref.read(authStateProvider.notifier).signInWithApple();
  }
}