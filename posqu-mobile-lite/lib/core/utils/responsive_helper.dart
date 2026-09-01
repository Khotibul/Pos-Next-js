import 'package:flutter/material.dart';

class ResponsiveHelper {
  ResponsiveHelper._();

  static const double compactWidthBreakpoint = 600;
  static const double expandedWidthBreakpoint = 840;
  static const double desktopWidthBreakpoint = 1024;
  static const double compactHeightBreakpoint = 500;
  static const double tabletShortestSideBreakpoint = 600;

  static Size screenSize(BuildContext context) => MediaQuery.sizeOf(context);

  static double shortestSide(BuildContext context) =>
      screenSize(context).shortestSide;

  /// Device class. Unlike the window-width helpers below, rotating a phone
  /// does not turn it into a tablet.
  static bool isPhoneDevice(BuildContext context) =>
      shortestSide(context) < tabletShortestSideBreakpoint;

  static bool isTabletDevice(BuildContext context) =>
      shortestSide(context) >= tabletShortestSideBreakpoint;

  /// Window classes used to decide how much horizontal space a layout has.
  static bool isCompactWidth(BuildContext context) =>
      screenWidth(context) < compactWidthBreakpoint;

  static bool isMediumWidth(BuildContext context) =>
      screenWidth(context) >= compactWidthBreakpoint &&
      screenWidth(context) < expandedWidthBreakpoint;

  static bool isExpandedWidth(BuildContext context) =>
      screenWidth(context) >= expandedWidthBreakpoint;

  static bool isLandscape(BuildContext context) {
    final size = screenSize(context);
    return size.width > size.height;
  }

  static bool isPortrait(BuildContext context) => !isLandscape(context);

  static bool isCompactHeight(BuildContext context) =>
      screenHeight(context) < compactHeightBreakpoint;

  // Compatibility helpers. These retain their previous width-based behavior.
  static bool isMobile(BuildContext context) => isCompactWidth(context);

  static bool isTablet(BuildContext context) =>
      screenWidth(context) >= compactWidthBreakpoint &&
      screenWidth(context) < desktopWidthBreakpoint;

  static bool isDesktop(BuildContext context) =>
      screenWidth(context) >= desktopWidthBreakpoint;

  static double screenWidth(BuildContext context) => screenSize(context).width;

  static double screenHeight(BuildContext context) => screenSize(context).height;

  static EdgeInsets padding(BuildContext context) {
    final width = screenWidth(context);
    if (width >= 1024) {
      return const EdgeInsets.symmetric(horizontal: 64, vertical: 24);
    } else if (width >= 600) {
      return const EdgeInsets.symmetric(horizontal: 32, vertical: 16);
    }
    return const EdgeInsets.symmetric(horizontal: 16, vertical: 12);
  }

  static double contentMaxWidth(BuildContext context) {
    final width = screenWidth(context);
    if (width >= 1200) return 1200;
    return width;
  }
}
