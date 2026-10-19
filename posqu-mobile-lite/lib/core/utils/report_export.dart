import 'dart:io';

import 'package:excel/excel.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import '../../domain/entities/report.dart';
import 'currency_formatter.dart';

/// Export laporan penjualan — kolom transaksi selaras dengan export CSV
/// pos-next-js (invoice_no, created_at, status, subtotal, discount, tax, total).

String _fmtDate(DateTime d) {
  String two(int v) => v.toString().padLeft(2, '0');
  return '${two(d.day)}/${two(d.month)}/${d.year}';
}

String _fmtDateTime(DateTime d) {
  String two(int v) => v.toString().padLeft(2, '0');
  return '${_fmtDate(d)} ${two(d.hour)}:${two(d.minute)}';
}

String _periodLabel(PeriodReport r) =>
    '${_fmtDate(r.start)} - ${_fmtDate(r.end)}';

String reportPeriodLabel(PeriodReport r) => _periodLabel(r);

String buildReportSummaryText(PeriodReport report) {
  String money(double v) => CurrencyFormatter.format(v);
  final buf = StringBuffer()
    ..writeln('Laporan Penjualan POSQU')
    ..writeln('Periode: ${_periodLabel(report)}')
    ..writeln('Omset: ${money(report.totalSales)}')
    ..writeln('Transaksi: ${report.transactionCount}')
    ..writeln('Item Terjual: ${report.itemsSold}')
    ..writeln('Laba Kotor: ${money(report.grossProfit)}')
    ..writeln('Tunai: ${money(report.totalCash)}')
    ..writeln('QRIS: ${money(report.totalQris)}')
    ..writeln('Transfer: ${money(report.totalTransfer)}')
    ..writeln('E-Wallet: ${money(report.totalEwallet)}');
  return buf.toString().trimRight();
}

Future<File> _writeTemp(String name, List<int> bytes) async {
  final dir = await getTemporaryDirectory();
  final file = File('${dir.path}/$name');
  await file.writeAsBytes(bytes);
  return file;
}

// ================= EXCEL =================

Future<File> buildReportExcelFile(PeriodReport report) async {
  final excel = Excel.createExcel();
  final sheet = excel['Laporan Penjualan'];

  // Ringkasan
  sheet.appendRow([TextCellValue('LAPORAN PENJUALAN')]);
  sheet.appendRow([TextCellValue('Periode'), TextCellValue(_periodLabel(report))]);
  sheet.appendRow([TextCellValue('')]);
  sheet.appendRow([TextCellValue('Ringkasan')]);
  sheet.appendRow([TextCellValue('Omset'), TextCellValue(CurrencyFormatter.formatWithoutSymbol(report.totalSales))]);
  sheet.appendRow([TextCellValue('Jumlah Transaksi'), TextCellValue('${report.transactionCount}')]);
  sheet.appendRow([TextCellValue('Item Terjual'), TextCellValue('${report.itemsSold}')]);
  sheet.appendRow([TextCellValue('Laba Kotor'), TextCellValue(CurrencyFormatter.formatWithoutSymbol(report.grossProfit))]);
  sheet.appendRow([TextCellValue('Tunai'), TextCellValue(CurrencyFormatter.formatWithoutSymbol(report.totalCash))]);
  sheet.appendRow([TextCellValue('QRIS'), TextCellValue(CurrencyFormatter.formatWithoutSymbol(report.totalQris))]);
  sheet.appendRow([TextCellValue('Transfer'), TextCellValue(CurrencyFormatter.formatWithoutSymbol(report.totalTransfer))]);
  sheet.appendRow([TextCellValue('E-Wallet'), TextCellValue(CurrencyFormatter.formatWithoutSymbol(report.totalEwallet))]);

  // Rincian per hari
  sheet.appendRow([TextCellValue('')]);
  sheet.appendRow([TextCellValue('Rincian Harian')]);
  sheet.appendRow([
    TextCellValue('Tanggal'),
    TextCellValue('Transaksi'),
    TextCellValue('Omset'),
  ]);
  for (final day in report.days) {
    sheet.appendRow([
      TextCellValue(_fmtDate(day.date)),
      IntCellValue(day.transactionCount),
      DoubleCellValue(day.totalSales),
    ]);
  }

  // Transaksi — kolom sama dengan export CSV pos-next-js
  sheet.appendRow([TextCellValue('')]);
  sheet.appendRow([TextCellValue('Daftar Transaksi')]);
  sheet.appendRow([
    TextCellValue('invoice_no'),
    TextCellValue('created_at'),
    TextCellValue('status'),
    TextCellValue('subtotal'),
    TextCellValue('discount'),
    TextCellValue('tax'),
    TextCellValue('total'),
    TextCellValue('metode_bayar'),
  ]);
  for (final t in report.transactions) {
    sheet.appendRow([
      TextCellValue(t.invoiceNo),
      TextCellValue(t.createdAt.toIso8601String()),
      TextCellValue(t.status),
      DoubleCellValue(t.subtotal),
      DoubleCellValue(t.discount),
      DoubleCellValue(t.tax),
      DoubleCellValue(t.total),
      TextCellValue(t.paymentMethod),
    ]);
  }

  try {
    if (excel.getDefaultSheet() != 'Laporan Penjualan') {
      excel.delete('Sheet1');
    }
  } catch (_) {}

  final bytes = excel.save();
  if (bytes == null) {
    throw Exception('Gagal membuat file Excel (data kosong)');
  }
  final file = await _writeTemp(
      'laporan-penjualan-${_fmtDate(report.start).replaceAll('/', '')}.xlsx',
      bytes);
  if (!await file.exists()) {
    throw Exception('Gagal menyimpan file Excel');
  }
  return file;
}

// ================= PDF =================

pw.Document buildReportPdf(PeriodReport report) {
  final doc = pw.Document();
  String money(double v) => CurrencyFormatter.formatWithoutSymbol(v);

  final summaryData = [
    ['Omset', money(report.totalSales)],
    ['Jumlah Transaksi', '${report.transactionCount}'],
    ['Item Terjual', '${report.itemsSold}'],
    ['Laba Kotor', money(report.grossProfit)],
    ['Tunai', money(report.totalCash)],
    ['QRIS', money(report.totalQris)],
    ['Transfer', money(report.totalTransfer)],
    ['E-Wallet', money(report.totalEwallet)],
  ];

  doc.addPage(
    pw.MultiPage(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(28),
      build: (context) => [
        pw.Header(
          child: pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text('Laporan Penjualan',
                  style: pw.TextStyle(
                      fontSize: 18, fontWeight: pw.FontWeight.bold)),
              pw.Text('Periode: ${_periodLabel(report)}',
                  style: const pw.TextStyle(fontSize: 10)),
            ],
          ),
        ),
        pw.Text('Ringkasan',
            style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
        pw.SizedBox(height: 6),
        pw.Table(
          border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
          children: [
            for (final row in summaryData)
              pw.TableRow(
                decoration: pw.BoxDecoration(
                  color: row[0] == 'Omset' ? PdfColors.blue50 : null,
                ),
                children: [
                  pw.Padding(
                    padding: const pw.EdgeInsets.symmetric(
                        horizontal: 8, vertical: 4),
                    child: pw.Text(row[0], style: const pw.TextStyle(fontSize: 9)),
                  ),
                  pw.Padding(
                    padding: const pw.EdgeInsets.symmetric(
                        horizontal: 8, vertical: 4),
                    child: pw.Text(row[1],
                        style: pw.TextStyle(
                            fontSize: 9,
                            fontWeight: row[0] == 'Omset'
                                ? pw.FontWeight.bold
                                : pw.FontWeight.normal)),
                  ),
                ],
              ),
          ],
        ),
        pw.SizedBox(height: 16),
        pw.Text('Rincian Harian',
            style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
        pw.SizedBox(height: 6),
        pw.TableHelper.fromTextArray(
          headers: ['Tanggal', 'Transaksi', 'Omset'],
          data: report.days
              .map((d) => [
                    _fmtDate(d.date),
                    '${d.transactionCount}',
                    money(d.totalSales),
                  ])
              .toList(),
          headerStyle: pw.TextStyle(
              fontSize: 9, fontWeight: pw.FontWeight.bold, color: PdfColors.white),
          headerDecoration:
              const pw.BoxDecoration(color: PdfColors.blue700),
          cellStyle: const pw.TextStyle(fontSize: 9),
          cellAlignment: pw.Alignment.centerLeft,
        ),
        pw.SizedBox(height: 16),
        pw.Text('Daftar Transaksi',
            style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
        pw.SizedBox(height: 6),
        pw.TableHelper.fromTextArray(
          headers: const [
            'invoice_no',
            'Tanggal',
            'Status',
            'Subtotal',
            'Diskon',
            'Pajak',
            'Total',
            'Metode',
          ],
          data: report.transactions
              .map((t) => [
                    t.invoiceNo,
                    _fmtDateTime(t.createdAt),
                    t.status,
                    money(t.subtotal),
                    money(t.discount),
                    money(t.tax),
                    money(t.total),
                    t.paymentMethod,
                  ])
              .toList(),
          headerStyle: pw.TextStyle(
              fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.white),
          headerDecoration:
              const pw.BoxDecoration(color: PdfColors.blue700),
          cellStyle: const pw.TextStyle(fontSize: 8),
          cellAlignment: pw.Alignment.centerLeft,
        ),
      ],
    ),
  );
  return doc;
}

Future<File> buildReportPdfFile(PeriodReport report) async {
  final doc = buildReportPdf(report);
  final bytes = await doc.save();
  final file = await _writeTemp(
      'laporan-penjualan-${_fmtDate(report.start).replaceAll('/', '')}.pdf',
      bytes);
  if (!await file.exists()) {
    throw Exception('Gagal menyimpan file PDF');
  }
  return file;
}

Future<void> printReportPdf(PeriodReport report) async {
  final doc = buildReportPdf(report);
  await Printing.layoutPdf(
    onLayout: (format) async => doc.save(),
    name: 'laporan-penjualan-${_fmtDate(report.start).replaceAll('/', '')}',
  );
}
