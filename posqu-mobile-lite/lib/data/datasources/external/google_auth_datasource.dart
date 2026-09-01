import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

import '../../../../core/constants/api_constants.dart';
import '../../../../core/constants/env_config.dart';
import '../../../../core/network/dio_client.dart';
import '../../../../domain/entities/user.dart';
import '../../models/user_model.dart';

final googleAuthDataSourceProvider = Provider<GoogleAuthDataSource>((ref) {
  return GoogleAuthDataSource(ref);
});

class GoogleAuthDataSource {
  final Ref _ref;

  GoogleAuthDataSource(this._ref);

  GoogleSignIn? _googleSignIn;

  GoogleSignIn get _googleSignInInstance {
    if (_googleSignIn != null) return _googleSignIn!;
    final serverClientId = EnvConfig.googleServerClientId;
    if (serverClientId.isEmpty && kDebugMode) {
      debugPrint('[GoogleAuth] WARN: serverClientId kosong. Set NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID / GOOGLE_CLIENT_ID di .env');
    }
    _googleSignIn = GoogleSignIn(
      scopes: const ['email', 'profile'],
      // Android: idToken audience harus salah satu dari allowedAudiences backend
      // (GOOGLE_CLIENT_ID / NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID / NEXT_PUBLIC_GOOGLE_ANDROID_CLIENT_ID)
      // Paket google_sign_in Android memakai serverClientId sebagai audience idToken.
      serverClientId: serverClientId.isEmpty ? null : serverClientId,
    );
    return _googleSignIn!;
  }

  Future<User?> signInWithGoogle() async {
    try {
      // Pastikan Google Play Services tersedia (Android)
      final GoogleSignInAccount? googleUser = await _googleSignInInstance.signIn();
      if (googleUser == null) {
        return null; // user batal
      }

      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;

      final idToken = googleAuth.idToken;
      if (idToken == null || idToken.isEmpty) {
        throw Exception(
            'No ID token received. Pastikan NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID di .env benar & SHA-1 keystore terdaftar di Google Cloud Console (OAuth Android). SHA-1 upload-keystore: A9:5F:59:A5:C7:C3:1A:E4:FA:11:D9:BA:62:31:9F:11:6E:DE:BC:CB');
      }

      final dio = _ref.read(dioClientProvider).dio;
      final response = await dio.post(
        ApiConstants.mobileGoogleLogin,
        data: {'idToken': idToken},
      );

      if (response.data['ok'] != true) {
        final code = response.data['code'] ?? '';
        final msg = response.data['message'] ?? 'Google Sign-In failed';
        // Backend akan validasi aud terhadap NEXT_PUBLIC_GOOGLE_WEB/ANDROID_CLIENT_ID
        if (code == 'GOOGLE_TOKEN_INVALID') {
          throw Exception('$msg (cek NEXT_PUBLIC_GOOGLE_* di .env & SHA-1 di console)');
        }
        throw Exception(msg);
      }

      final userModel = UserModel.fromJson(response.data['user']);
      return userModel.toEntity();
    } catch (e) {
      final msg = e.toString();
      // Deteksi DEVELOPER_ERROR / ApiException:10 = SHA-1 / package belum terdaftar
      if (msg.contains('ApiException: 10') || msg.contains('DEVELOPER_ERROR')) {
        throw Exception(
            'Google Sign-In gagal (ApiException 10): SHA-1 upload-keystore.jks A9:5F:59:A5:C7:C3:1A:E4:FA:11:D9:BA:62:31:9F:11:6E:DE:BC:CB belum terdaftar untuk package com.posqu.mobile.lite & client 190762274336-j4mak... di https://console.cloud.google.com/apis/credentials. Tambahkan SHA-1 tersebut ke Android OAuth client.');
      }
      if (msg.contains('No ID token')) rethrow;
      throw Exception('Google Sign-In failed: $e');
    }
  }

  Future<void> signOutFromGoogle() async {
    if (_googleSignIn != null) {
      await _googleSignIn!.signOut();
    } else {
      // Belum pernah init -> buat instance lalu signOut untuk bersihkan state
      await _googleSignInInstance.signOut();
    }
  }

  Future<bool> isSignedInWithGoogle() async {
    if (_googleSignIn != null) return await _googleSignIn!.isSignedIn();
    return await _googleSignInInstance.isSignedIn();
  }
}

// Apple Sign In Data Source
final appleAuthDataSourceProvider = Provider<AppleAuthDataSource>((ref) {
  return AppleAuthDataSource();
});

class AppleAuthDataSource {
  AppleAuthDataSource();

  Future<User?> signInWithApple() async {
    try {
      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
      );

      // For now, we'll return a basic user object based on Apple profile
      // In a production app, this should send the credential to backend for verification
      final userId = credential.userIdentifier ?? '';
      final userEmail = credential.email ?? '';
      final userName =
          '${credential.givenName ?? ''} ${credential.familyName ?? ''}'.trim();
      return User(
        id: userId,
        email: userEmail,
        name: userName.isEmpty ? userEmail : userName,
        isActive: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );
    } catch (e) {
      throw Exception('Apple Sign-In failed: $e');
    }
  }
}