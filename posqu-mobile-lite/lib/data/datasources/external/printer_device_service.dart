import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter_bluetooth_serial/flutter_bluetooth_serial.dart';
import 'package:flutter_usb_printer/flutter_usb_printer.dart';

import '../../../domain/entities/sale.dart';
import '../../../core/utils/currency_formatter.dart';

/// Dilempar saat printer belum tersedia / tidak dapat dihubungi.
class PrinterNotAvailableException implements Exception {
  final String message;
  const PrinterNotAvailableException(this.message);

  @override
  String toString() => message;
}

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
        'printerName': name,
        'printerType': type,
        if (address != null) 'printerAddress': address,
        if (vendorId != null) 'usbVendorId': vendorId,
        if (productId != null) 'usbProductId': productId,
      };

  static PrinterDeviceInfo? fromMap(Map<String, dynamic>? map) {
    if (map == null) return null;
    final type =
        (map['printerType'] as String?) ?? map['type'] as String?;
    final name =
        (map['printerName'] as String?) ?? map['name'] as String?;
    if (type == null || name == null || name.isEmpty) return null;
    return PrinterDeviceInfo(
      name: name,
      type: type,
      address: (map['printerAddress'] as String?) ??
          map['address'] as String?,
      vendorId: (map['usbVendorId'] as num?)?.toInt(),
      productId: (map['usbProductId'] as num?)?.toInt(),
    );
  }
}

class PrinterDeviceService {
  PrinterDeviceService._();

  static const MethodChannel _permissionChannel =
      MethodChannel('posqu/permissions');

  /// Encode teks menjadi byte ESC/POS yang aman.
  /// - Karakter ASCII/Latin-1 (<= 0xFF) ditulis langsung.
  /// - Tanda kutip/em-dash "pintar" (dari keyboard HP) dipetakan ke ASCII.
  /// - Karakter lain (> 0xFF, mis. emoji) diganti '?' agar tidak
  ///   menyebabkan [_enc]/[UTF8] gagal mencetak di MPOS printer.
  static List<int> _enc(String text) {
    const smart = <int, String>{
      0x2018: "'", 0x2019: "'", // ' '
      0x201C: '"', 0x201D: '"', // " "
      0x2013: '-', 0x2014: '-', // - -
      0x2026: '...', 0x00A0: ' ', // … dan NBSP
    };
    final out = <int>[];
    for (final r in text.runes) {
      if (r <= 0xFF) {
        out.add(r);
      } else {
        final sub = smart[r];
        if (sub != null) {
          out.addAll(sub.runes);
        } else {
          out.add(0x3F);
        }
      }
    }
    return out;
  }

  /// Minta izin runtime Bluetooth (Android 12+: CONNECT/SCAN,
  /// di bawahnya: lokasi). Polling hasil hingga 10 detik.
  static Future<bool> _ensurePermissions() async {
    if (!Platform.isAndroid) return true;
    try {
      final granted =
          await _permissionChannel.invokeMethod('hasPrinterPermissions');
      if (granted == true) return true;
      await _permissionChannel.invokeMethod('requestPrinterPermissions');
      for (var i = 0; i < 20; i++) {
        await Future.delayed(const Duration(milliseconds: 500));
        final check =
            await _permissionChannel.invokeMethod('hasPrinterPermissions');
        if (check == true) return true;
      }
      return false;
    } catch (_) {
      // Channel tidak tersedia (perangkat lama) -> jangan blokir.
      return true;
    }
  }

  /// Pindai printer yang tersedia:
  /// - Bluetooth: semua perangkat yang sudah paired/bonded.
  /// - USB/Type-C: printer yang sedang tercolok (OTG).
  /// Hanya didukung di Android. Melempar [PrinterNotAvailableException]
  /// dengan pesan ramah bila izin ditolak / Bluetooth tidak aktif.
  static Future<List<PrinterDeviceInfo>> scanDevices() async {
    if (!Platform.isAndroid) {
      throw UnsupportedError('Scan printer hanya didukung di Android');
    }

    final permitted = await _ensurePermissions();
    if (!permitted) {
      throw const PrinterNotAvailableException(
        'Izin Bluetooth belum diberikan. '
        'Izinkan akses Bluetooth untuk aplikasi ini lalu pindai ulang.',
      );
    }

    final devices = <PrinterDeviceInfo>[];
    String? btError;

    final bt = FlutterBluetoothSerial.instance;
    var btOn = false;
    try {
      btOn = await bt.isEnabled ?? false;
    } catch (_) {
      btOn = false;
    }

    if (!btOn) {
      var enabled = false;
      try {
        enabled = await bt.requestEnable() ?? false;
      } catch (_) {
        enabled = false;
      }
      if (!enabled) {
        btError =
            'Bluetooth tidak aktif. Nyalakan Bluetooth lalu pindai ulang.';
      }
    }

    if (btError == null) {
      try {
        final bonded = await bt.getBondedDevices();
        for (final d in bonded) {
          devices.add(PrinterDeviceInfo(
            name: d.name ?? d.address,
            type: 'bluetooth',
            address: d.address,
          ));
        }
      } catch (e) {
        btError ??= 'Gagal membaca perangkat Bluetooth: $e';
      }
    }

    try {
      final usbList = await FlutterUsbPrinter.getUSBDeviceList();
      for (final raw in usbList) {
        final map = Map<String, dynamic>.from(raw);
        devices.add(PrinterDeviceInfo(
          name: (map['productName'] ?? map['deviceName'] ?? 'USB Printer')
              .toString(),
          type: 'usb',
          vendorId: _toInt(map['vendorId']),
          productId: _toInt(map['productId']),
        ));
      }
    } catch (_) {
      // Tidak ada printer USB -> abaikan.
    }

    if (devices.isEmpty && btError != null) {
      throw PrinterNotAvailableException(btError);
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
        throw const PrinterNotAvailableException('Alamat Bluetooth printer belum ada');
      }
      final BluetoothConnection connection;
      try {
        connection = await BluetoothConnection.toAddress(address)
            .timeout(const Duration(seconds: 8));
      } catch (_) {
        throw PrinterNotAvailableException(
          'Tidak dapat terhubung ke ${device.name}. Pastikan printer menyala dan dalam jangkauan.',
        );
      }
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
        throw const PrinterNotAvailableException('ID perangkat USB printer belum ada');
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
    buffer.addAll(_enc('\n'));
    buffer.addAll([0x1B, 0x61, 0x01]); // align center
    buffer.addAll([0x1B, 0x45, 0x01]); // bold on
    buffer.addAll(_enc('$title\n'));
    buffer.addAll([0x1B, 0x45, 0x00]); // bold off
    buffer.addAll(_enc('Test Print\n'));
    buffer.addAll(_enc('${DateTime.now()}\n'));
    buffer.addAll([0x1B, 0x61, 0x00]); // align left
    buffer.addAll(_enc('${line()}\n'));
    buffer.addAll(_enc('Printer : ${device.name}\n'));
    buffer.addAll(_enc('Tipe    : ${device.type.toUpperCase()}\n'));
    buffer.addAll(_enc('${line()}\n'));
    buffer.addAll(_enc('Printer siap digunakan.\n\n\n'));
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
    buffer.addAll(_enc('$headerTitle\n\n'));
    buffer.addAll([0x1B, 0x45, 0x00]);
    if (headerSubtitle.isNotEmpty) {
      buffer.addAll(_enc('$headerSubtitle\n'));
    }
    buffer.addAll([0x1B, 0x61, 0x00]);
    buffer.addAll(_enc('${line()}\n'));
    buffer.addAll(_enc('No  : ${sale.invoiceNo}\n'));
    buffer.addAll(_enc('Tgl : $dateStr\n'));
    buffer.addAll(_enc('${line()}\n'));

    for (final item in sale.items) {
      buffer.addAll(_enc('${item.name}\n'));
      if (showSku && item.sku.isNotEmpty) {
        buffer.addAll(_enc('  [${item.sku}]\n'));
      }
      buffer.addAll(
        _enc('${row("${item.qty} x ${money(item.price)}", money(item.lineTotal))}\n'),
      );
    }

    buffer.addAll(_enc('${line()}\n'));
    buffer.addAll(_enc('${row('Subtotal', money(sale.subtotal))}\n'));
    if (showDiscount) {
      buffer.addAll(_enc('${row('Diskon', money(sale.discount))}\n'));
    }
    if (showTax) {
      buffer.addAll(_enc('${row('Pajak', money(sale.tax))}\n'));
    }
    buffer.addAll(_enc('${line()}\n'));
    buffer.addAll([0x1B, 0x45, 0x01]);
    buffer.addAll(_enc('${row('TOTAL', money(sale.total))}\n'));
    buffer.addAll([0x1B, 0x45, 0x00]);
    buffer.addAll(_enc(
        '${row('Bayar (${sale.paymentMethod.toUpperCase()})', money(sale.paidAmount))}\n'));
    if (sale.changeAmount > 0.5) {
      buffer.addAll(_enc('${row('Kembali', money(sale.changeAmount))}\n'));
    }
    buffer.addAll(_enc('${line()}\n'));
    buffer.addAll([0x1B, 0x61, 0x01]);
    buffer.addAll(_enc('$footerNote\n\n\n'));
    buffer.addAll([0x1D, 0x56, 0x42, 0x00]);

    await sendBytes(device, buffer);
  }
}
