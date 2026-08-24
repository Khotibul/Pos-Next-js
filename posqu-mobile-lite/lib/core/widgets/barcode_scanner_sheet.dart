import 'dart:io';

import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

/// Sheet pemindai barcode yang bisa dipakai ulang.
/// - Android/iOS: kamera via mobile_scanner (dengan debounce barcode sama).
/// - Desktop/web: input manual.
///
/// Return: string barcode yang discan/diketik, atau null bila dibatalkan.
Future<String?> showBarcodeScannerSheet(BuildContext context) async {
  final result = await showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
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
  final _manualController = TextEditingController();

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
      child: Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  const Icon(Icons.qr_code_scanner, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text('Scan Barcode',
                        style: Theme.of(context)
                            .textTheme
                            .titleMedium
                            ?.copyWith(fontWeight: FontWeight.bold)),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            if (_canUseCamera)
              SizedBox(
                height: 300,
                child: MobileScanner(
                  onDetect: (capture) {
                    final code = capture.barcodes.firstOrNull?.rawValue;
                    if (code != null && code.isNotEmpty) _emit(code);
                  },
                ),
              )
            else
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline, color: Colors.blue),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Kamera tidak tersedia di perangkat ini. Ketik barcode secara manual.',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                  ],
                ),
              ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: TextField(
                controller: _manualController,
                autofocus: !_canUseCamera,
                decoration: InputDecoration(
                  labelText: 'Atau ketik barcode / SKU',
                  prefixIcon: const Icon(Icons.edit_outlined),
                  border: const OutlineInputBorder(),
                  suffixIcon: IconButton(
                    icon: const Icon(Icons.arrow_forward),
                    onPressed: () => _emit(_manualController.text.trim()),
                  ),
                ),
                onSubmitted: _emit,
              ),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}
