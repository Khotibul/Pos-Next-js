import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/env_config.dart';
import '../../../core/network/mobile_api_gate.dart';
import '../../../data/repositories/setting_repository_impl.dart';
import '../../providers/setting/setting_provider.dart';
import '../../providers/auth/auth_provider.dart';

class SettingScreen extends ConsumerWidget {
  const SettingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final effectiveUrl = ref.watch(effectiveApiBaseUrlProvider);
    final mode = ref.watch(apiBaseUrlModeProvider);
    final manualAsync = ref.watch(apiBaseUrlProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Pengaturan')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text('Tampilan',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          )),
                ),
                SwitchListTile(
                  title: const Text('Mode Gelap'),
                  subtitle: const Text('Gunakan tema gelap'),
                  secondary: const Icon(Icons.dark_mode),
                  value: themeMode == 'dark',
                  onChanged: (v) {
                    ref.read(themeModeProvider.notifier).setThemeMode(
                          v ? 'dark' : 'light',
                        );
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.palette_outlined),
                  title: const Text('Warna Tema'),
                  subtitle: const Text('Biru (default)'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {},
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Text('Koneksi',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                              )),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: mode == 'manual' ? Colors.orange.withOpacity(0.12) : Colors.green.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          mode == 'manual' ? 'Manual' : 'Otomatis',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: mode == 'manual' ? Colors.orange : Colors.green,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                ListTile(
                  leading: const Icon(Icons.cloud_outlined),
                  title: const Text('URL API'),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        effectiveUrl,
                        style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        mode == 'manual'
                            ? 'Manual dari pengaturan sistem'
                            : 'Otomatis dari sistem (.env → ${EnvConfig.apiBaseUrl})',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 11),
                      ),
                      if (mode == 'manual')
                        Text(
                          'Default sistem: ${EnvConfig.apiBaseUrl}',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 10, color: Colors.grey),
                        ),
                    ],
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => _showApiUrlDialog(context, ref),
                ),
                ListTile(
                  leading: const Icon(Icons.sync),
                  title: const Text('Sinkronisasi'),
                  subtitle: manualAsync.when(
                    data: (m) => Text(m != null && m.trim().isNotEmpty ? 'Manual aktif' : 'Sinkron ke $effectiveUrl'),
                    loading: () => const Text('Memuat...'),
                    error: (_, __) => const Text('Error'),
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {},
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text('Printer',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          )),
                ),
                ListTile(
                  leading: const Icon(Icons.print_outlined),
                  title: const Text('Konfigurasi Printer'),
                  subtitle: const Text('Bluetooth / Thermal, ukuran kertas'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/settings/printer'),
                ),
                ListTile(
                  leading: const Icon(Icons.description_outlined),
                  title: const Text('Format Struk'),
                  subtitle: const Text('Header, footer, dan opsi cetak'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/settings/printer'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text('Akun Lokal (Offline)',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          )),
                ),
                ListTile(
                  leading: const Icon(Icons.people_outline),
                  title: const Text('Kelola Akun Lokal'),
                  subtitle: const Text('Akun yang bisa login saat offline'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/settings/local-users'),
                ),
                const Divider(height: 1),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Text(
                    'Tip: Login online sekali dengan email apa pun akan otomatis menyimpannya sebagai akun lokal.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text('Akun',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          )),
                ),
                ListTile(
                  leading: const Icon(Icons.logout, color: Colors.red),
                  title: const Text('Keluar', style: TextStyle(color: Colors.red)),
                  onTap: () => _confirmLogout(context, ref),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Center(
            child: Text(
              'POSQU Pro v1.0.8 • $effectiveUrl',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
          ),
        ],
      ),
    );
  }

  void _showApiUrlDialog(BuildContext context, WidgetRef ref) {
    final manual = ref.read(effectiveApiBaseUrlProvider) == EnvConfig.apiBaseUrl
        ? (ref.read(apiBaseUrlProvider).valueOrNull ?? '')
        : ref.read(effectiveApiBaseUrlProvider);
    final isManual = ref.read(apiBaseUrlModeProvider) == 'manual';
    final controller = TextEditingController(text: isManual ? manual : '');
    String selectedMode = isManual ? 'manual' : 'otomatis';

    showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('URL API'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Tentukan sumber URL API untuk sinkronisasi database:',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 12),
                RadioListTile<String>(
                  value: 'otomatis',
                  groupValue: selectedMode,
                  title: const Text('Otomatis (default sistem)'),
                  subtitle: Text(EnvConfig.apiBaseUrl, style: const TextStyle(fontSize: 11)),
                  contentPadding: EdgeInsets.zero,
                  onChanged: (v) => setState(() => selectedMode = v!),
                ),
                RadioListTile<String>(
                  value: 'manual',
                  groupValue: selectedMode,
                  title: const Text('Manual'),
                  subtitle: const Text('Input URL sendiri', style: TextStyle(fontSize: 11)),
                  contentPadding: EdgeInsets.zero,
                  onChanged: (v) => setState(() => selectedMode = v!),
                ),
                if (selectedMode == 'manual') ...[
                  const SizedBox(height: 8),
                  TextField(
                    controller: controller,
                    decoration: InputDecoration(
                      hintText: EnvConfig.apiBaseUrl,
                      labelText: 'URL Manual',
                      prefixIcon: const Icon(Icons.link),
                      helperText: 'Contoh: https://posqupro.co-id.id/api\natau http://10.0.2.2:3000/api (emulator)',
                    ),
                    keyboardType: TextInputType.url,
                  ),
                ] else
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.green.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.info_outline, size: 16, color: Colors.green),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Pakai ${EnvConfig.apiBaseUrl}\nSinkron otomatis ke PostgreSQL via posqupro.co-id.id',
                            style: const TextStyle(fontSize: 11),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Batal')),
            FilledButton(
              onPressed: () async {
                if (selectedMode == 'otomatis') {
                  await ref.read(settingRepositoryProvider).updateApiBaseUrl('');
                  ref.invalidate(apiBaseUrlProvider);
                  // Dio akan auto-update via effectiveApiBaseUrlProvider listener
                  MobileApiGate.reset();
                } else {
                  final text = controller.text.trim();
                  if (text.isEmpty) {
                    ScaffoldMessenger.of(dialogContext).showSnackBar(const SnackBar(content: Text('URL manual tidak boleh kosong')));
                    return;
                  }
                  if (!text.startsWith('http://') && !text.startsWith('https://')) {
                    ScaffoldMessenger.of(dialogContext).showSnackBar(const SnackBar(content: Text('URL harus diawali http:// atau https://')));
                    return;
                  }
                  await ref.read(settingRepositoryProvider).updateApiBaseUrl(text);
                  ref.invalidate(apiBaseUrlProvider);
                  // Dio baseUrl akan update otomatis via provider listen
                  MobileApiGate.reset();
                }
                if (dialogContext.mounted) Navigator.pop(dialogContext);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(selectedMode == 'otomatis' ? 'URL diatur otomatis' : 'URL manual disimpan — sinkron akan pakai ${controller.text.trim()}')),
                  );
                }
              },
              child: const Text('Simpan'),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmLogout(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Keluar'),
        content: const Text('Apakah Anda yakin ingin keluar?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Batal')),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              ref.read(authStateProvider.notifier).logout();
            },
            child: const Text('Keluar'),
          ),
        ],
      ),
    );
  }
}
