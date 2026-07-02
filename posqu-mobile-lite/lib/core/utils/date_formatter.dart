import 'package:intl/intl.dart';

import '../constants/app_constants.dart';

class DateFormatter {
  DateFormatter._();

  static final DateFormat _dateFormat = DateFormat(AppConstants.dateFormat, 'id');
  static final DateFormat _timeFormat = DateFormat(AppConstants.timeFormat, 'id');
  static final DateFormat _dateTimeFormat = DateFormat(AppConstants.dateTimeFormat, 'id');
  static final DateFormat _fullDateFormat = DateFormat(AppConstants.fullDateFormat, 'id');
  static final DateFormat _isoFormat = DateFormat(AppConstants.isoFormat, 'id');

  static String formatDate(DateTime date) => _dateFormat.format(date);
  static String formatTime(DateTime date) => _timeFormat.format(date);
  static String formatDateTime(DateTime date) => _dateTimeFormat.format(date);
  static String formatFullDate(DateTime date) => _fullDateFormat.format(date);
  static String toIsoString(DateTime date) => _isoFormat.format(date);

  static DateTime? parseIso(String date) {
    return DateTime.tryParse(date);
  }

  static String timeAgo(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inSeconds < 60) return 'baru saja';
    if (diff.inMinutes < 60) return '${diff.inMinutes} menit lalu';
    if (diff.inHours < 24) return '${diff.inHours} jam lalu';
    if (diff.inDays < 7) return '${diff.inDays} hari lalu';
    return formatDate(date);
  }

  static String getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  }
}
