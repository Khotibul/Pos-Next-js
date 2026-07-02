import 'package:intl/intl.dart';

class CurrencyFormatter {
  CurrencyFormatter._();

  static final NumberFormat _currencyFormat = NumberFormat.currency(
    locale: 'id',
    symbol: 'Rp ',
    decimalDigits: 0,
  );

  static final NumberFormat _decimalFormat = NumberFormat.currency(
    locale: 'id',
    symbol: 'Rp ',
    decimalDigits: 2,
  );

  static String format(num amount) {
    if (amount == (amount).toInt()) {
      return _currencyFormat.format(amount);
    }
    return _decimalFormat.format(amount);
  }

  static String formatWithoutSymbol(num amount) {
    return NumberFormat('#,##0', 'id').format(amount);
  }

  static double parse(String text) {
    final cleaned = text.replaceAll(RegExp(r'[^0-9,]'), '');
    return double.tryParse(cleaned.replaceAll(',', '.')) ?? 0;
  }
}
