import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/datasources/external/printer_device_service.dart';
import '../../../data/repositories/setting_repository_impl.dart';
import 'dart:io';

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
  bool _scanning = false;
  bool _testing = false;
  List<PrinterDeviceInfo> _devices = [];
  PrinterDeviceInfo? _selected;

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
      _selected = PrinterDeviceInfo.fromMap(map);
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
      'printerName': _selected?.name ?? _printerNameController.text.trim(),
      if (_selected != null) ..._selected!.toMap(),
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

  Future<void> _scanDevices() async {
    setState(() => _scanning = true);
    try {
      final devices = await PrinterDeviceService.scanDevices();
      if (!mounted) return;
      setState(() => _devices = devices);
      if (devices.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Tidak ada printer terdeteksi. Pastikan printer Bluetooth sudah '
              'di-pairing, atau printer USB/Type-C tercolok.',
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal memindai: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _scanning = false);
    }
  }

  Future<void> _testPrint() async {
    final device = _selected;
    if (device == null) return;
    setState(() => _testing = true);
    try {
      await _save();
      await PrinterDeviceService.printTestPage(
        device,
        title: _headerTitleController.text.trim(),
        paperSize: _paperSize,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Test print terkirim ke ${device.name}')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Test print gagal: $e'),
          backgroundColor: Colors.orange,
        ),
      );
    } finally {
      if (mounted) setState(() => _testing = false);
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

    final isAndroid = Platform.isAndroid;

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
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (isAndroid) ...[
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            _selected == null
                                ? 'Belum ada printer dipilih'
                                : 'Terpilih: ${_selected!.name} (${_selected!.type == 'bluetooth' ? 'Bluetooth' : 'USB/Type-C'})',
                            style: Theme.of(context)
                                .textTheme
                                .bodyMedium
                                ?.copyWith(
                                  fontWeight: FontWeight.w600,
                                  color: _selected == null
                                      ? Theme.of(context).hintColor
                                      : Colors.green,
                                ),
                          ),
                        ),
                        FilledButton.tonalIcon(
                          onPressed: _scanning ? null : _scanDevices,
                          icon: _scanning
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2),
                                )
                              : const Icon(Icons.search, size: 18),
                          label: Text(_scanning ? 'Memindai...' : 'Pindai'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                  ] else ...[
                    Row(
                      children: [
                        const Icon(Icons.info_outline,
                            size: 18, color: Colors.blue),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Deteksi printer Bluetooth/USB hanya di Android. '
                            'Di desktop gunakan tombol Cetak pada struk '
                            '(dialog cetak sistem).',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                  ],
                  TextField(
                    controller: _printerNameController,
                    decoration: const InputDecoration(
                      labelText: 'Nama Printer (manual)',
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
                  const SizedBox(height: 4),
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

          // ===== DAFTAR PERANGKAT TERDETEKSI =====
          if (isAndroid && _devices.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(
              'Perangkat Tersedia (${_devices.length})',
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 6),
            ..._devices.map((d) {
              final isSelected = _selected != null &&
                  _selected!.type == d.type &&
                  _selected!.name == d.name &&
                  (d.type != 'bluetooth' || _selected!.address == d.address);
              return Card(
                margin: const EdgeInsets.only(bottom: 6),
                child: ListTile(
                  dense: true,
                  leading: Icon(
                    d.type == 'bluetooth'
                        ? Icons.bluetooth
                        : Icons.usb,
                    color: isSelected
                        ? Colors.green
                        : Theme.of(context).colorScheme.primary,
                  ),
                  title: Text(
                    d.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                  subtitle: Text(
                    d.type == 'bluetooth'
                        ? 'Bluetooth • ${d.address ?? '-'}'
                        : 'USB/Type-C • ID ${d.vendorId}:${d.productId}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  trailing: isSelected
                      ? const Icon(Icons.check_circle, color: Colors.green)
                      : TextButton(
                          onPressed: () {
                            setState(() {
                              _selected = d;
                              _printerNameController.text = d.name;
                            });
                          },
                          child: const Text('Pilih'),
                        ),
                  onTap: () {
                    setState(() {
                      _selected = d;
                      _printerNameController.text = d.name;
                    });
                  },
                ),
              );
            }),
          ],

          // ===== TEST PRINT =====
          if (isAndroid && _selected != null) ...[
            const SizedBox(height: 4),
            OutlinedButton.icon(
              onPressed: _testing ? null : _testPrint,
              icon: _testing
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.print_outlined, size: 18),
              label: Text(_testing ? 'Mencetak...' : 'Test Cetak'),
            ),
          ],

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
              subtitle: const Text(
                  'Langsung kirim struk ke printer terpilih saat transaksi selesai'),
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
