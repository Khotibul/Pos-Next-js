import 'package:dartz/dartz.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:posqu_mobile_lite/core/errors/failures.dart';
import 'package:posqu_mobile_lite/data/datasources/local/hive_cache.dart';
import 'package:posqu_mobile_lite/data/repositories/product_repository_impl.dart';
import 'package:posqu_mobile_lite/data/repositories/sale_repository_impl.dart';
import 'package:posqu_mobile_lite/data/repositories/setting_repository_impl.dart';
import 'package:posqu_mobile_lite/domain/entities/product.dart';
import 'package:posqu_mobile_lite/domain/entities/sale.dart';
import 'package:posqu_mobile_lite/domain/repositories/product_repository.dart';
import 'package:posqu_mobile_lite/domain/repositories/sale_repository.dart';
import 'package:posqu_mobile_lite/domain/repositories/setting_repository.dart';
import 'package:posqu_mobile_lite/presentation/providers/kasir/kasir_provider.dart';
import 'package:posqu_mobile_lite/presentation/providers/product/product_provider.dart';
import 'package:posqu_mobile_lite/presentation/screens/kasir/kasir_screen.dart';

class _MockSaleRepository extends Mock implements SaleRepository {}

class _MockProductRepository extends Mock implements ProductRepository {}

class _MockSettingRepository extends Mock implements SettingRepository {}

class _MockHiveCache extends Mock implements HiveCache {}

class _FakeSale extends Fake implements Sale {}

void main() {
  setUpAll(() {
    registerFallbackValue(_FakeSale());
  });

  testWidgets(
    'checkout tunai mempertahankan uang diterima dan kembalian setelah dialog ditutup',
    (tester) async {
      await tester.binding.setSurfaceSize(const Size(1200, 800));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      final saleRepository = _MockSaleRepository();
      final productRepository = _MockProductRepository();
      final settingRepository = _MockSettingRepository();
      final cache = _MockHiveCache();
      Sale? capturedSale;

      when(settingRepository.getPrinterConfig).thenAnswer(
        (_) async => const Right<Failure, Map<String, dynamic>?>(
          <String, dynamic>{'autoPrintAfterPayment': false},
        ),
      );
      when(() => saleRepository.createSale(any())).thenAnswer((invocation) async {
        final sale = invocation.positionalArguments.single as Sale;
        capturedSale = sale;
        return Right<Failure, Sale>(sale);
      });

      final now = DateTime(2026, 8, 31);
      final product = Product(
        id: 'product-1',
        sku: 'SKU-001',
        name: 'Produk Tes',
        sellingPrice: 75000,
        stock: 0,
        createdAt: now,
        updatedAt: now,
      );

      final container = ProviderContainer(
        overrides: [
          saleRepositoryProvider.overrideWithValue(saleRepository),
          productRepositoryProvider.overrideWithValue(productRepository),
          settingRepositoryProvider.overrideWithValue(settingRepository),
          hiveCacheProvider.overrideWithValue(cache),
          productListProvider.overrideWith((ref) async => [product]),
        ],
      );
      addTearDown(container.dispose);
      container.read(kasirStateProvider.notifier).addProduct(product);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(home: KasirScreen()),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Bayar (Rp 75.000)'));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField).last, '100000');
      await tester.pump();
      expect(find.text('Rp 25.000'), findsOneWidget);

      await tester.tap(find.widgetWithText(FilledButton, 'Bayar'));
      await tester.pumpAndSettle();

      expect(capturedSale, isNotNull);
      expect(capturedSale!.paidAmount, 100000);
      expect(capturedSale!.changeAmount, 25000);
      verify(() => saleRepository.createSale(any())).called(1);

      await tester.tap(find.byIcon(Icons.close));
      await tester.pumpAndSettle();
    },
  );
}
