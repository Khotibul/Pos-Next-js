import 'package:flutter/material.dart';

/// Premium SaaS palette — clean, minimal, modern
/// primary #2563EB, background #F7F9FC, sidebar #082A67, text #172033
class AppColors {
  AppColors._();

  // Primary — biru terang premium
  static const Color primary = Color(0xFF2563EB);
  static const Color primaryDark = Color(0xFF0F2C68);
  static const Color onPrimary = Color(0xFFFFFFFF);
  static const Color primaryContainer = Color(0xFFDBEAFE);
  static const Color onPrimaryContainer = Color(0xFF0F2C68);
  static const Color primaryLight = Color(0xFF3B82F6);

  // Sidebar — dark navy deep blue
  static const Color sidebar = Color(0xFF082A67);
  static const Color sidebarHover = Color(0xFF0F3A8A);
  static const Color onSidebar = Color(0xFFFFFFFF);
  static const Color onSidebarMuted = Color(0xFF94A3C8);

  // Background — abu sangat muda kebiruan
  static const Color background = Color(0xFFF7F9FC);
  static const Color onBackground = Color(0xFF172033);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color onSurface = Color(0xFF172033);
  static const Color surfaceVariant = Color(0xFFF1F5F9);
  static const Color onSurfaceVariant = Color(0xFF667085);
  static const Color surfaceContainerLow = Color(0xFFF8FAFC);

  // Text
  static const Color textPrimary = Color(0xFF172033);
  static const Color textSecondary = Color(0xFF667085);
  static const Color textMuted = Color(0xFF94A3B8);

  // Border — sangat lembut
  static const Color border = Color(0xFFE6EAF0);
  static const Color borderLight = Color(0xFFF1F5F9);
  static const Color outline = Color(0xFFE6EAF0);
  static const Color outlineVariant = Color(0xFFF1F5F9);

  // Tertiary / Accent — gradient blue-purple secukupnya (dipakai sparingly)
  static const Color tertiary = Color(0xFF7C3AED);
  static const Color onTertiary = Color(0xFFFFFFFF);
  static const Color tertiaryContainer = Color(0xFFEDE9FE);

  // Status — clean
  static const Color success = Color(0xFF22C55E);
  static const Color onSuccess = Color(0xFFFFFFFF);
  static const Color successContainer = Color(0xFFDCFCE7);
  static const Color warning = Color(0xFFF59E0B);
  static const Color onWarning = Color(0xFFFFFFFF);
  static const Color warningContainer = Color(0xFFFEF3C7);
  static const Color danger = Color(0xFFEF4444);
  static const Color error = Color(0xFFEF4444);
  static const Color onError = Color(0xFFFFFFFF);
  static const Color errorContainer = Color(0xFFFEE2E2);
  static const Color info = Color(0xFF2563EB);

  // Legacy aliases (agar kode lama tidak pecah)
  static const Color secondary = success;
  static const Color onSecondary = onSuccess;
  static const Color secondaryContainer = successContainer;
  static const Color onSecondaryContainer = Color(0xFF14532D);
  static const Color tertiaryContainerLegacy = tertiaryContainer;
  static const Color pending = warning;
  static const Color completed = success;
  static const Color cancelled = danger;

  // Dark theme — navy tetap, surface gelap kebiruan
  static const Color darkBackground = Color(0xFF0F172A);
  static const Color darkSurface = Color(0xFF1E293B);
  static const Color darkSurfaceVariant = Color(0xFF334155);
  static const Color darkOnBackground = Color(0xFFF1F5F9);
  static const Color darkOnSurface = Color(0xFFF1F5F9);
  static const Color darkOutline = Color(0xFF334155);
  static const Color darkBorder = Color(0xFF334155);
}
