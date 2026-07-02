import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

import '../../../../core/constants/api_constants.dart';
import '../../../../core/network/dio_client.dart';
import '../../../../domain/entities/user.dart';
import '../../models/user_model.dart';

final googleAuthDataSourceProvider = Provider<GoogleAuthDataSource>((ref) {
  return GoogleAuthDataSource(ref);
});

class GoogleAuthDataSource {
  final Ref _ref;

  GoogleAuthDataSource(this._ref);

  final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: [
      'email',
      'profile',
    ],
  );

  Future<User?> signInWithGoogle() async {
    try {
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      if (googleUser == null) {
        // The user canceled the sign-in
        return null;
      }

      final GoogleSignInAuthentication googleAuth =
          await googleUser.authentication;

      final idToken = googleAuth.idToken;
      if (idToken == null) {
        throw Exception('No ID token received from Google');
      }

      // Send the ID token to the backend for verification
      final dio = _ref.read(dioClientProvider).dio;
      final response = await dio.post(
        ApiConstants.mobileGoogleLogin,
        data: {
          'idToken': idToken,
        },
      );

      if (response.data['ok'] != true) {
        throw Exception(response.data['message'] ?? 'Google Sign-In failed');
      }

      final userModel = UserModel.fromJson(response.data['user']);
      return userModel.toEntity();
    } catch (e) {
      throw Exception('Google Sign-In failed: $e');
    }
  }

  Future<void> signOutFromGoogle() async {
    await _googleSignIn.signOut();
    // Note: Backend handles sign out via API call if needed
  }

  Future<bool> isSignedInWithGoogle() async {
    return await _googleSignIn.isSignedIn();
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