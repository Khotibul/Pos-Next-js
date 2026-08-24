import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('bundel seed initial_data.json valid dan berisi data tenant', () async {
    final raw = await rootBundle.loadString('assets/seed/initial_data.json');
    final data = jsonDecode(raw) as Map<String, dynamic>;

    expect(data['tenant'], isNotNull);
    final products = data['products'] as List;
    final categories = data['categories'] as List;
    final sales = data['sales'] as List;

    expect(products, isNotEmpty);
    expect(categories, isNotEmpty);

    for (final p in products) {
      final j = p as Map<String, dynamic>;
      expect(j['id'], isA<String>());
      expect(j['sku'], isA<String>());
      expect(j['name'], isA<String>());
      expect(j['sellingPrice'], isA<num>());
    }

    for (final s in sales) {
      final j = s as Map<String, dynamic>;
      expect(j['invoiceNo'], isA<String>());
      expect(j['items'], isA<List>());
    }
  });
}
