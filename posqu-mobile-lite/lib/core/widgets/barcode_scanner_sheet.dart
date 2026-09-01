import 'dart:io';

import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

/// Sheet scanner barcode — kamera perangkat sebagai metode utama.
/// - Android/iOS: kamera via mobile_scanner (dengan debounce barcode sama).
/// - Desktop: kamera tidak tersedia; di Kasir, alat scanner fisik
///   (pistol scanner) terdeteksi otomatis lewat listener global.
///
/// Return: string barcode yang terdeteksi, atau null bila dibatalkan.
Future<String?> showBarcodeScannerSheet(BuildContext context) async {
  final result = await showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (_) => const _BarcodeScannerSheet(),
  );
  return result;
}

class _BarcodeScannerSheet extends StatefulWidget {
  const _BarcodeScannerSheet();

  @override
  State<_BarcodeScannerSheet> createState() => _BarcodeScannerSheetState();
}

class _BarcodeScannerSheetState extends State<_BarcodeScannerSheet> {
  late final bool _canUseCamera;
  String? _lastCode;
  DateTime _lastTime = DateTime.fromMillisecondsSinceEpoch(0);

  @override
  void initState() {
    super.initState();
    _canUseCamera = Platform.isAndroid || Platform.isIOS;
  }

  void _emit(String code) {
    final now = DateTime.now();
    if (code.isEmpty) return;
    if (code == _lastCode && now.difference(_lastTime).inMilliseconds < 2500) {
      return;
    }
    _lastCode = code;
    _lastTime = now;
    Navigator.pop(context, code);
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: LayoutBuilder(
        builder: (context, constraints) {
          const preferredHeight = 420.0;
          final sheetHeight = constraints.maxHeight.isFinite &&
                  constraints.maxHeight < preferredHeight
              ? constraints.maxHeight
              : preferredHeight;

          return SizedBox(
            height: sheetHeight,
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      const Icon(Icons.qr_code_scanner, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Scan Barcode',
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(fontWeight: FontWeight.bold),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1),
                Expanded(
                  child: _canUseCamera
                      ? Stack(
                          children: [
                            MobileScanner(
                              onDetect: (capture) {
                                final code =
                                    capture.barcodes.firstOrNull?.rawValue;
                                if (code != null && code.isNotEmpty) {
                                  _emit(code);
                                }
                              },
                            ),
                            Positioned(
                              left: 12,
                              right: 12,
                              bottom: 12,
                              child: Center(
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 14,
                                    vertical: 8,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.black54,
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: const Text(
                                    'Arahkan barcode ke dalam kotak kamera',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        )
                      : SingleChildScrollView(
                          padding: const EdgeInsets.all(24),
                          child: Row(
                            children: [
                              const Icon(
                                Icons.info_outline,
                                color: Colors.blue,
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  'Perangkat ini tidak memiliki kamera. '
                                  'Gunakan alat scanner barcode fisik — '
                                  'deteksinya otomatis tanpa perlu klik apa pun.',
                                  style:
                                      Theme.of(context).textTheme.bodyMedium,
                                ),
                              ),
                            ],
                          ),
                        ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
