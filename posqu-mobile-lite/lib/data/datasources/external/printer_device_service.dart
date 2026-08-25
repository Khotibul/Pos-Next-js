import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_bluetooth_serial/flutter_bluetooth_serial.dart';
import 'package:flutter_usb_printer/flutter_usb_printer.dart';

import '../../../domain/entities/sale.dart';
import '../../../core/utils/currency_formatter.dart';

/// Informasi perangkat printer yang terdeteksi.
class PrinterDeviceInfo {
  final String name;
  final String type; // 'bluetooth' | 'usb'
  final String? address; // MAC address (bluetooth)
  final int? vendorId; // USB
  final int? productId; // USB

  const PrinterDeviceInfo({
    required this.name,
    required this.type,
    this.address,
    this.vendorId,
    this.productId,
  });

  Map<String, dynamic> toMap() => {
        'name': name,
        'type': type,
        if (address != null) 'address': address,
        if (vendorId != null) 'usbVendorId': vendorId,
        if (productId != null) 'usbProductId': productId,
      };

  static PrinterDeviceInfo? fromMap(Map<String, dynamic>? map) {
    if (map == null) return null;
    final type = map['printerType'] as String?;
    final name = map['printerName'] as String?;
    if (type == null || name == null || name.isEmpty) return null;
    return PrinterDeviceInfo(
      name: name,
      type: type,
      address: map['printerAddress'] as String?,
      vendorId: (map['usbVendorId'] as num?)?.toInt(),
      productId: (map['usbProductId'] as num?)?.toInt(),
    );
  }
}

class PrinterDeviceService {
  PrinterDeviceService._();

  /// Pindai printer yang tersedia:
  /// - Bluetooth: semua perangkat yang sudah paired/bonded.
  /// - USB/Type-C: printer yang sedang tercolok (OTG).
  /// Hanya didukung di Android.
  static Future<List<PrinterDeviceInfo>> scanDevices() async {
    if (!Platform.isAndroid) {
      throw UnsupportedError('Scan printer hanya didukung di Android');
    }

    final devices = <PrinterDeviceInfo>[];

    try {
      final bt = FlutterBluetoothSerial.instance;
      final bonded = await bt.getBondedDevices();
      for (final d in bonded) {
        devices.add(PrinterDeviceInfo(
          name: d.name ?? d.address,
          type: 'bluetooth',
          address: d.address,
        ));
      }
    } catch (_) {
      // Bluetooth off / tidak tersedia -> lanjut ke USB.
    }

    try {
      final usbList = await FlutterUsbPrinter.getUSBDeviceList();
      {
        for (final raw in usbList) {
          final map = Map<String, dynamic>.from(raw as Map);
          final vendorId = _toInt(map['vendorId']);
          final productId = _toInt(map['productId']);
          devices.add(PrinterDeviceInfo(
            name: (map['productName'] ?? map['deviceName'] ?? 'USB Printer')
                .toString(),
            type: 'usb',
            vendorId: vendorId,
            productId: productId,
          ));
        }
      }
    } catch (_) {
      // Tidak ada printer USB.
    }

    return devices;
  }

  static int? _toInt(dynamic v) {
    if (v is int) return v;
    if (v is String) {
      final cleaned = v.replaceAll(RegExp(r'[^0-9]'), '');
      return int.tryParse(cleaned.isEmpty ? v : cleaned) ??
          int.tryParse(v) ??
          (v.isNotEmpty ? v.codeUnitAt(0) : null);
    }
    return null;
  }

  /// Kirim bytes mentah ke printer sesuai tipe perangkat.
  static Future<void> sendBytes(
    PrinterDeviceInfo device,
    List<int> bytes,
  ) async {
    if (device.type == 'bluetooth') {
      final address = device.address;
      if (address == null || address.isEmpty) {
        throw Exception('Alamat Bluetooth printer belum ada');
      }
      final connection = await BluetoothConnection.toAddress(address);
      try {
        connection.output.add(Uint8List.fromList(bytes.toList()));
        await connection.output.allSent;
      } finally {
        await Future.delayed(const Duration(milliseconds: 200));
        await connection.close();
      }
    } else {
      final vendorId = device.vendorId;
      final productId = device.productId;
      if (vendorId == null || productId == null) {
        throw Exception('ID perangkat USB printer belum ada');
      }
      final printer = FlutterUsbPrinter();
      await printer.connect(vendorId, productId);
      await printer.write(Uint8List.fromList(bytes.toList()));
      await printer.close();
    }
  }

  /// Struk tes sederhana (ESC/POS).
  static Future<void> printTestPage(PrinterDeviceInfo device,
      {String title = 'POSQU Pro', String paperSize = '58mm'}) async {
    final width = paperSize == '80mm' ? 48 : 32;
    String line() => '-' * width;

    final buffer = <int>[0x1B, 0x40]; // init
    buffer.addAll(latin1.encode('\n'));
    buffer.addAll([0x1B, 0x61, 0x01]); // align center
    buffer.addAll([0x1B, 0x45, 0x01]); // bold on
    buffer.addAll(latin1.encode('$title\n'));
    buffer.addAll([0x1B, 0x45, 0x00]); // bold off
    buffer.addAll(latin1.encode('Test Print\n'));
    buffer.addAll(latin1.encode('${DateTime.now()}\n'));
    buffer.addAll([0x1B, 0x61, 0x00]); // align left
    buffer.addAll(latin1.encode('${line()}\n'));
    buffer.addAll(latin1.encode('Printer : ${device.name}\n'));
    buffer.addAll(latin1.encode('Tipe    : ${device.type.toUpperCase()}\n'));
    buffer.addAll(latin1.encode('${line()}\n'));
    buffer.addAll(latin1.encode('Printer siap digunakan.\n\n\n'));
    buffer.addAll([0x1D, 0x56, 0x42, 0x00]); // cut

    await sendBytes(device, buffer);
  }

  /// Cetak struk transaksi langsung via BT/USB (ESC/POS).
  /// Fallback dilempar sebagai exception bila gagal.
  static Future<void> printReceipt(
    PrinterDeviceInfo device,
    Sale sale, {
    String headerTitle = 'POSQU Pro',
    String headerSubtitle = '',
    String footerNote = 'Terima kasih sudah berbelanja.',
    String paperSize = '58mm',
    bool showSku = true,
    bool showDiscount = true,
    bool showTax = true,
  }) async {
    final width = paperSize == '80mm' ? 48 : 32;
    String money(double v) => CurrencyFormatter.formatWithoutSymbol(v);

    String row(String label, String value) {
      final space = width - label.length - value.length;
      if (space <= 0) return '$label $value';
      return '$label${' ' * space}$value';
    }

    String line() => '-' * width;

    String two(int v) => v.toString().padLeft(2, '0');
    final d = sale.createdAt.toLocal();
    final dateStr =
        '${two(d.day)}/${two(d.month)}/${d.year} ${two(d.hour)}:${two(d.minute)}';

    final buffer = <int>[0x1B, 0x40];
    buffer.addAll([0x1B, 0x61, 0x01]);
    buffer.addAll([0x1B, 0x45, 0x01]);
    buffer.addAll(latin1.encode('$headerTitle\n\n'));
    buffer.addAll([0x1B, 0x45, 0x00]);
    if (headerSubtitle.isNotEmpty) {
      buffer.addAll(latin1.encode('$headerSubtitle\n'));
    }
    buffer.addAll([0x1B, 0x61, 0x00]);
    buffer.addAll(latin1.encode('${line()}\n'));
    buffer.addAll(latin1.encode('No  : ${sale.invoiceNo}\n'));
    buffer.addAll(latin1.encode('Tgl : $dateStr\n'));
    buffer.addAll(latin1.encode('${line()}\n'));

    for (final item in sale.items) {
      buffer.addAll(latin1.encode('${item.name}\n'));
      final skuPart = showSku && item.sku.isNotEmpty ? ' [${item.sku}]' : '';
      buffer.addAll(latin1.encode('${row("${item.qty} x ${money(item.price)}", money(item.lineTotal))}$skuPart\n'));
    }

    buffer.addAll(latin1.encode('${line()}\n'));
    buffer.addAll(latin1.encode('${row('Subtotal', money(sale.subtotal))}\n'));
    if (showDiscount) {
      buffer.addAll(latin1.encode('${row('Diskon', money(sale.discount))}\n'));
    }
    if (showTax) {
      buffer.addAll(latin1.encode('${row('Pajak', money(sale.tax))}\n'));
    }
    buffer.addAll(latin1.encode('${line()}\n'));
    buffer.addAll([0x1B, 0x45, 0x01]);
    buffer.addAll(latin1.encode('${row('TOTAL', money(sale.total))}\n'));
    buffer.addAll([0x1B, 0x45, 0x00]);
    buffer.addAll(latin1.encode(
        '${row('Bayar (${sale.paymentMethod.toUpperCase()})', money(sale.paidAmount))}\n'));
    buffer.addAll(latin1.encode('${row('Kembali', money(sale.changeAmount))}\n'));
    buffer.addAll(latin1.encode('${line()}\n'));
    buffer.addAll([0x1B, 0x61, 0x01]);
    buffer.addAll(latin1.encode('$footerNote\n\n\n'));
    buffer.addAll([0x1D, 0x56, 0x42, 0x00]);

    await sendBytes(device, buffer);
  }
}
