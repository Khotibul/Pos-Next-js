import 'dart:io';

import 'package:excel/excel.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../domain/entities/product.dart';

/// Header kolom Excel untuk produk.
const _headers = [
  'SKU',
  'Nama',
  'Barcode',
  'Kategori',
  'Merek',
  'Supplier',
  'Satuan',
  'Harga Beli',
  'Harga Jual',
  'Margin %',
  'Pajak %',
  'Berat',
  'Volume',
  'Stok Min',
  'Reorder',
  'Harga Grosir',
  'Diskon Grosir %',
  'Min Qty Grosir',
  'Aktif',
  'Featured',
  'Konsinyasi',
  'Tipe',
];

/// Convert value to appropriate CellValue type for excel v4.
CellValue? _toCellValue(dynamic v) {
  if (v == null) return null;
      if (v is num) return DoubleCellValue(v.toDouble());
      final s = v.toString();
      return s.isEmpty ? null : TextCellValue(s);
}

/// Export daftar produk ke file Excel (.xlsx) lalu share.
/// Mengembalikan path file yang dihasilkan.
Future<String> exportProductsToExcel(List<Product> products) async {
  final excel = Excel.createExcel();
  final sheet = excel['Produk'];

  // Header
  for (var i = 0; i < _headers.length; i++) {
    final cell = sheet.cell(CellIndex.indexByColumnRow(columnIndex: i, rowIndex: 0));
    cell.value = TextCellValue(_headers[i]);
    cell.cellStyle = CellStyle(
      bold: true,
      backgroundColorHex: ExcelColor.fromHexString('#4472C4'),
      fontColorHex: ExcelColor.white,
    );
  }

  // Data
  for (var r = 0; r < products.length; r++) {
    final p = products[r];
    final row = r + 1;
    final values = <dynamic>[
      p.sku,
      p.name,
      p.barcode ?? '',
      p.categoryName ?? '',
      p.brandId ?? '',
      (p.supplierName ?? p.supplierId) ?? '',
      p.unit,
      p.costPrice,
      p.sellingPrice,
      p.marginPct,
      p.taxRate,
      p.weight,
      p.volume,
      p.minStock,
      p.reorderPoint,
      p.wholesalePrice,
      p.wholesaleDiscountPercent,
      p.wholesaleMinQty,
      p.isActive ? 'Y' : 'N',
      p.isFeatured ? 'Y' : 'N',
      p.isConsignment ? 'Y' : 'N',
      p.type,
    ];
    for (var c = 0; c < values.length; c++) {
      sheet.cell(CellIndex.indexByColumnRow(columnIndex: c, rowIndex: row))
          .value = _toCellValue(values[c]);
    }
  }

  // Simpan ke file
  final dir = await getApplicationDocumentsDirectory();
  final timestamp = DateTime.now().millisecondsSinceEpoch;
  final filePath = '${dir.path}/produk_export_$timestamp.xlsx';
  final fileBytes = excel.save();

  if (fileBytes != null) {
    final file = File(filePath)..writeAsBytesSync(fileBytes);
    return file.path;
  }
  throw Exception('Gagal menyimpan file Excel');
}

/// Share file Excel produk via share sheet.
Future<void> shareProductExcel(String filePath) async {
  await Share.shareXFiles([XFile(filePath)], text: 'Daftar Produk POSQU');
}

/// Parse file Excel (.xlsx) dan konversi ke list Product.
/// Kolom: SKU, Nama, Barcode, Kategori, Merek, Supplier, Satuan,
///        HargaBeli, HargaJual, Margin%, Pajak%, Berat, Volume,
///        StokMin, Reorder, HargaGrosir, DiskonGrosir%, MinQtyGrosir,
///        Aktif, Featured, Konsinyasi, Tipe
///
/// [existingProducts] dipakai untuk mengisi field yang tidak ada di Excel
/// (categoryId, brandId, supplierId, unitId, id, dll).
Future<List<Product>> importProductsFromExcel(
  String filePath, {
  required Map<String, Product> existingBySku,
}) async {
  final file = File(filePath);
  final bytes = await file.readAsBytes();
  final excel = Excel.decodeBytes(bytes);

  if (excel.tables.isEmpty) {
    throw Exception('File Excel kosong atau tidak valid');
  }

  final sheet = excel.tables.values.first;
  if (sheet.maxRows < 2) {
    throw Exception('File Excel tidak memiliki data produk');
  }

  final imported = <Product>[];
  final now = DateTime.now();

  // Skip header row (index 0)
  for (var r = 1; r < sheet.maxRows; r++) {
    final row = sheet.row(r);
    if (row.isEmpty) continue;

    String? cellVal(int col) {
      if (col >= row.length) return null;
      final v = row[col]?.value;
      if (v == null) return null;
      final s = v.toString().trim();
      return s.isEmpty ? null : s;
    }

    double cellNum(int col) {
      final v = cellVal(col);
      if (v == null) return 0;
      return double.tryParse(v) ?? 0;
    }

    bool cellBool(int col) {
      final v = cellVal(col);
      if (v == null) return false;
      final upper = v.toUpperCase();
      return upper == 'Y' || upper == 'TRUE' || upper == '1';
    }

    final sku = cellVal(0);
    final name = cellVal(1);
    if (sku == null || name == null) continue; // skip baris tanpa SKU/nama

    // Cek duplikat SKU
    if (existingBySku.containsKey(sku)) {
      continue; // skip duplikat
    }

    final product = Product(
      id: '', // akan digenerate di repository
      sku: sku,
      name: name,
      barcode: cellVal(2),
      categoryName: cellVal(3),
      brandId: cellVal(4),
      supplierId: cellVal(5),
      supplierName: cellVal(5),
      unit: cellVal(6) ?? 'pcs',
      costPrice: cellNum(7),
      sellingPrice: cellNum(8),
      marginPct: cellNum(9),
      taxRate: cellNum(10),
      weight: cellNum(11),
      volume: cellNum(12),
      minStock: cellNum(13),
      reorderPoint: cellNum(14),
      wholesalePrice: cellNum(15),
      wholesaleDiscountPercent: cellNum(16),
      wholesaleMinQty: cellNum(17).toInt(),
      isActive: cellBool(18),
      isFeatured: cellBool(19),
      isConsignment: cellBool(20),
      type: cellVal(21) ?? 'SINGLE',
      stock: 0,
      imageUrl: null,
      createdAt: now,
      updatedAt: now,
    );

    imported.add(product);
  }

  return imported;
}
