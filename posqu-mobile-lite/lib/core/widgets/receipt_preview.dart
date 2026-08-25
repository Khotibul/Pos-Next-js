import 'package:flutter/material.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart';

import '../../data/datasources/external/printer_device_service.dart';
import '../../domain/entities/sale.dart';
import '../utils/currency_formatter.dart';

class ReceiptConfig {
  final String paperSize;
  final String headerTitle;
  final String headerSubtitle;
  final String footerNote;
  final bool autoPrintAfterPayment;
  final bool showSku;
  final bool showTax;
  final bool showDiscount;
  final PrinterDeviceInfo? device;
  final String? qrisImage;

  const ReceiptConfig({
    this.paperSize = '58mm',
    this.headerTitle = 'POSQU Pro',
    this.headerSubtitle = '',
    this.footerNote = 'Terima kasih sudah berbelanja.',
    this.autoPrintAfterPayment = false,
    this.showSku = true,
    this.showTax = true,
    this.showDiscount = true,
    this.device,
    this.qrisImage,
  });

  factory ReceiptConfig.fromMap(Map<String, dynamic>? map) {
    final m = map ?? const {};
    return ReceiptConfig(
      paperSize: m['paperSize'] as String? ?? '58mm',
      headerTitle: m['headerTitle'] as String? ?? 'POSQU Pro',
      headerSubtitle: m['headerSubtitle'] as String? ?? '',
      footerNote: m['footerNote'] as String? ?? 'Terima kasih sudah berbelanja.',
      autoPrintAfterPayment: m['autoPrintAfterPayment'] as bool? ?? false,
      showSku: m['showSku'] as bool? ?? true,
      showTax: m['showTax'] as bool? ?? true,
      showDiscount: m['showDiscount'] as bool? ?? true,
      device: PrinterDeviceInfo.fromMap(m),
      qrisImage: m['qrisImage'] as String?,
    );
  }

  PdfPageFormat get pageFormat =>
      paperSize == '80mm' ? PdfPageFormat.roll80 : PdfPageFormat.roll57;
}

pw.Document buildReceiptPdf(Sale sale, ReceiptConfig config) {
  final doc = pw.Document();
  String money(double v) => CurrencyFormatter.formatWithoutSymbol(v);

  doc.addPage(
    pw.Page(
      pageFormat: config.pageFormat,
      margin: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 10),
      build: (context) {
        final rows = sale.items
            .map((item) => pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text(item.name,
                        style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold)),
                    pw.Row(
                      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                      children: [
                        pw.Text(
                          config.showSku && item.sku.isNotEmpty
                              ? '${item.qty} x ${money(item.price)}  [${item.sku}]'
                              : '${item.qty} x ${money(item.price)}',
                          style: const pw.TextStyle(fontSize: 7.5),
                        ),
                        pw.Text(money(item.lineTotal),
                            style: const pw.TextStyle(fontSize: 7.5)),
                      ],
                    ),
                    pw.SizedBox(height: 3),
                  ],
                ))
            .toList();

        final summary = <pw.Widget>[
          pw.Divider(),
          _row('Subtotal', money(sale.subtotal)),
          if (config.showDiscount)
            _row('Diskon', '-${money(sale.discount)}'),
          if (config.showTax) _row('Pajak', money(sale.tax)),
          pw.Divider(),
          _row('TOTAL', money(sale.total), bold: true),
          _row('Bayar (${sale.paymentMethod.toUpperCase()})',
              money(sale.paidAmount)),
          _row('Kembali', money(sale.changeAmount)),
          pw.Divider(),
          pw.Center(
            child: pw.Text(config.footerNote,
                style: const pw.TextStyle(fontSize: 7.5),
                textAlign: pw.TextAlign.center),
          ),
          pw.SizedBox(height: 6),
        ];

        return pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Center(
              child: pw.Text(config.headerTitle,
                  style: pw.TextStyle(
                      fontSize: 12, fontWeight: pw.FontWeight.bold)),
            ),
            if (config.headerSubtitle.isNotEmpty)
              pw.Center(
                child: pw.Text(config.headerSubtitle,
                    style: const pw.TextStyle(fontSize: 7.5)),
              ),
            pw.Divider(),
            pw.Text('No: ${sale.invoiceNo}',
                style: const pw.TextStyle(fontSize: 7.5)),
            pw.Text(_formatDate(sale.createdAt),
                style: const pw.TextStyle(fontSize: 7.5)),
            pw.SizedBox(height: 4),
            ...rows,
            ...summary,
          ],
        );
      },
    ),
  );
  return doc;
}

pw.Widget _row(String label, String value, {bool bold = false}) {
  return pw.Padding(
    padding: const pw.EdgeInsets.symmetric(vertical: 1),
    child: pw.Row(
      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
      children: [
        pw.Text(label,
            style: pw.TextStyle(
                fontSize: bold ? 9 : 7.5,
                fontWeight: bold ? pw.FontWeight.bold : pw.FontWeight.normal)),
        pw.Text(value,
            style: pw.TextStyle(
                fontSize: bold ? 9 : 7.5,
                fontWeight: bold ? pw.FontWeight.bold : pw.FontWeight.normal)),
      ],
    ),
  );
}

String _formatDate(DateTime dt) {
  final d = dt.toLocal();
  String two(int v) => v.toString().padLeft(2, '0');
  return '${two(d.day)}/${two(d.month)}/${d.year} ${two(d.hour)}:${two(d.minute)}';
}

Future<void> printReceipt(Sale sale, ReceiptConfig config) async {
  // 1) Printer Bluetooth/USB terpilih -> kirim ESC/POS langsung.
  if (config.device != null) {
    try {
      await PrinterDeviceService.printReceipt(
        config.device!,
        sale,
        headerTitle: config.headerTitle,
        headerSubtitle: config.headerSubtitle,
        footerNote: config.footerNote,
        paperSize: config.paperSize,
        showSku: config.showSku,
        showDiscount: config.showDiscount,
        showTax: config.showTax,
      );
      return;
    } catch (_) {
      // Printer tidak terjangkau -> fallback ke dialog cetak sistem.
    }
  }

  // 2) Dialog cetak sistem (PDF).
  final doc = buildReceiptPdf(sale, config);
  await Printing.layoutPdf(
    onLayout: (format) async => doc.save(),
    name: 'struk-${sale.invoiceNo}',
  );
}

Future<void> shareReceipt(Sale sale, ReceiptConfig config) async {
  final doc = buildReceiptPdf(sale, config);
  final bytes = await doc.save();
  await Share.shareXFiles(
    [XFile.fromData(bytes, mimeType: 'application/pdf', name: 'struk-${sale.invoiceNo}.pdf')],
    text: 'Struk ${sale.invoiceNo}',
  );
}

/// Menampilkan preview struk + aksi cetak / bagikan.
/// Dipanggil setelah transaksi berhasil.
Future<void> showReceiptPreview(
  BuildContext context,
  Sale sale,
  ReceiptConfig config,
) async {
  await showDialog(
    context: context,
    builder: (dialogContext) => Dialog(
      child: Container(
        constraints: const BoxConstraints(maxWidth: 340, maxHeight: 600),
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const Icon(Icons.receipt_long, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Struk ${sale.invoiceNo}',
                    style: Theme.of(dialogContext)
                        .textTheme
                        .titleMedium
                        ?.copyWith(fontWeight: FontWeight.bold),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, size: 20),
                  onPressed: () => Navigator.pop(dialogContext),
                ),
              ],
            ),
            const Divider(),
            Expanded(
              child: SingleChildScrollView(
                child: Container(
                  color: Colors.white,
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Center(
                        child: Text(
                          config.headerTitle,
                          style: const TextStyle(
                              fontSize: 15, fontWeight: FontWeight.bold),
                        ),
                      ),
                      if (config.headerSubtitle.isNotEmpty)
                        Center(
                          child: Text(config.headerSubtitle,
                              style: const TextStyle(fontSize: 11)),
                        ),
                      const Divider(),
                      Text('No: ${sale.invoiceNo}',
                          style: const TextStyle(fontSize: 11)),
                      Text(_formatDate(sale.createdAt),
                          style: const TextStyle(fontSize: 11)),
                      const Divider(height: 16),
                      ...sale.items.map((item) => Padding(
                            padding: const EdgeInsets.only(bottom: 6),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(item.name,
                                    style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold)),
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      '${item.qty} x ${CurrencyFormatter.formatWithoutSymbol(item.price)}'
                                      '${config.showSku && item.sku.isNotEmpty ? '  [${item.sku}]' : ''}',
                                      style: const TextStyle(fontSize: 11),
                                    ),
                                    Text(
                                      CurrencyFormatter.formatWithoutSymbol(
                                          item.lineTotal),
                                      style: const TextStyle(fontSize: 11),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          )),
                      const Divider(),
                      _previewRow('Subtotal',
                          CurrencyFormatter.formatWithoutSymbol(sale.subtotal)),
                      if (config.showDiscount)
                        _previewRow('Diskon',
                            '-${CurrencyFormatter.formatWithoutSymbol(sale.discount)}'),
                      if (config.showTax)
                        _previewRow('Pajak',
                            CurrencyFormatter.formatWithoutSymbol(sale.tax)),
                      const Divider(),
                      _previewRow('TOTAL',
                          CurrencyFormatter.formatWithoutSymbol(sale.total),
                          bold: true),
                      _previewRow(
                          'Bayar (${sale.paymentMethod.toUpperCase()})',
                          CurrencyFormatter.formatWithoutSymbol(
                              sale.paidAmount)),
                      _previewRow('Kembali',
                          CurrencyFormatter.formatWithoutSymbol(
                              sale.changeAmount)),
                      const Divider(),
                      Center(
                        child: Text(
                          config.footerNote,
                          style: const TextStyle(fontSize: 11),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => shareReceipt(sale, config),
                    icon: const Icon(Icons.share, size: 18),
                    label: const Text('Bagikan'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () => printReceipt(sale, config),
                    icon: const Icon(Icons.print, size: 18),
                    label: const Text('Cetak'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    ),
  );
}

Widget _previewRow(String label, String value, {bool bold = false}) {
  return Padding(
    padding: const EdgeInsets.symmetric(vertical: 1),
    child: Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label,
            style: TextStyle(
                fontSize: bold ? 13 : 11,
                fontWeight: bold ? FontWeight.bold : FontWeight.normal)),
        Text(value,
            style: TextStyle(
                fontSize: bold ? 13 : 11,
                fontWeight: bold ? FontWeight.bold : FontWeight.normal)),
      ],
    ),
  );
}
