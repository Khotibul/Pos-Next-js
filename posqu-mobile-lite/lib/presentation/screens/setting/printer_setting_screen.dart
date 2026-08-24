import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/repositories/setting_repository_impl.dart';

class PrinterSettingScreen extends ConsumerStatefulWidget {
  const PrinterSettingScreen({super.key});

  @override
  ConsumerState<PrinterSettingScreen> createState() =>
      _PrinterSettingScreenState();
}

class _PrinterSettingScreenState extends ConsumerState<PrinterSettingScreen> {
  final _headerTitleController = TextEditingController();
  final _headerSubtitleController = TextEditingController();
  final _footerNoteController = TextEditingController();
  final _printerNameController = TextEditingController();

  String _paperSize = '58mm';
  bool _autoPrint = false;
  bool _showSku = true;
  bool _showTax = true;
  bool _showDiscount = true;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadConfig();
  }

  Future<void> _loadConfig() async {
    final repository = ref.read(settingRepositoryProvider);
    final result = await repository.getPrinterConfig();
    result.fold((_) {}, (config) {
      final map = config ?? const <String, dynamic>{};
      _headerTitleController.text = map['headerTitle'] as String? ?? 'POSQU Pro';
      _headerSubtitleController.text = map['headerSubtitle'] as String? ?? '';
      _footerNoteController.text =
          map['footerNote'] as String? ?? 'Terima kasih sudah berbelanja.';
      _printerNameController.text = map['printerName'] as String? ?? '';
      _paperSize = map['paperSize'] as String? ?? '58mm';
      _autoPrint = map['autoPrintAfterPayment'] as bool? ?? false;
      _showSku = map['showSku'] as bool? ?? true;
      _showTax = map['showTax'] as bool? ?? true;
      _showDiscount = map['showDiscount'] as bool? ?? true;
    });
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _save() async {
    final repository = ref.read(settingRepositoryProvider);
    await repository.setPrinterConfig({
      'paperSize': _paperSize,
      'headerTitle': _headerTitleController.text.trim(),
      'headerSubtitle': _headerSubtitleController.text.trim(),
      'footerNote': _footerNoteController.text.trim(),
      'printerName': _printerNameController.text.trim(),
      'autoPrintAfterPayment': _autoPrint,
      'showSku': _showSku,
      'showTax': _showTax,
      'showDiscount': _showDiscount,
    });
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pengaturan printer & struk disimpan')),
      );
    }
  }

  @override
  void dispose() {
    _headerTitleController.dispose();
    _headerSubtitleController.dispose();
    _footerNoteController.dispose();
    _printerNameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Printer & Struk')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Printer & Struk'),
        actions: [
          IconButton(
            icon: const Icon(Icons.save_outlined),
            tooltip: 'Simpan',
            onPressed: _save,
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _sectionTitle('Printer'),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  TextField(
                    controller: _printerNameController,
                    decoration: const InputDecoration(
                      labelText: 'Nama Printer Bluetooth',
                      hintText: 'mis. RPP02N',
                      prefixIcon: Icon(Icons.print_outlined),
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text('Ukuran Kertas',
                        style: Theme.of(context).textTheme.bodySmall),
                  ),
                  SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(value: '58mm', label: Text('58 mm')),
                      ButtonSegment(value: '80mm', label: Text('80 mm')),
                    ],
                    selected: {_paperSize},
                    onSelectionChanged: (v) =>
                        setState(() => _paperSize = v.first),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          _sectionTitle('Format Struk'),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  TextField(
                    controller: _headerTitleController,
                    decoration: const InputDecoration(
                      labelText: 'Judul Atas Struk',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _headerSubtitleController,
                    decoration: const InputDecoration(
                      labelText: 'Sub-judul (alamat / telp)',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _footerNoteController,
                    decoration: const InputDecoration(
                      labelText: 'Catatan Kaki Struk',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 8),
                  SwitchListTile(
                    title: const Text('Tampilkan SKU'),
                    value: _showSku,
                    onChanged: (v) => setState(() => _showSku = v),
                  ),
                  SwitchListTile(
                    title: const Text('Tampilkan Diskon'),
                    value: _showDiscount,
                    onChanged: (v) => setState(() => _showDiscount = v),
                  ),
                  SwitchListTile(
                    title: const Text('Tampilkan Pajak'),
                    value: _showTax,
                    onChanged: (v) => setState(() => _showTax = v),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          _sectionTitle('Transaksi'),
          Card(
            child: SwitchListTile(
              title: const Text('Cetak otomatis setelah bayar'),
              subtitle:
                  const Text('Langsung buka dialog cetak saat transaksi selesai'),
              secondary: const Icon(Icons.bolt_outlined),
              value: _autoPrint,
              onChanged: (v) => setState(() => _autoPrint = v),
            ),
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: _save,
            icon: const Icon(Icons.save_outlined),
            label: const Text('Simpan Pengaturan'),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _sectionTitle(String text) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Text(text,
          style: Theme.of(context)
              .textTheme
              .titleMedium
              ?.copyWith(fontWeight: FontWeight.bold)),
    );
  }
}
