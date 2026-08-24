import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../providers/report/report_provider.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../core/utils/report_export.dart';
import '../../../domain/entities/report.dart';

enum _Preset { today, week, month, custom }

class ReportScreen extends ConsumerStatefulWidget {
  const ReportScreen({super.key});

  @override
  ConsumerState<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends ConsumerState<ReportScreen> {
  _Preset _preset = _Preset.today;
  DateTimeRange? _customRange;
  bool _exporting = false;

  (DateTime, DateTime) get _range {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    switch (_preset) {
      case _Preset.today:
        return (today, today);
      case _Preset.week:
        return (today.subtract(const Duration(days: 6)), today);
      case _Preset.month:
        return (DateTime(now.year, now.month, 1), today);
      case _Preset.custom:
        final r = _customRange;
        if (r != null) return (r.start, r.end);
        return (today, today);
    }
  }

  String get _rangeLabel {
    final (start, end) = _range;
    if (_preset == _Preset.custom) {
      return '${DateFormatter.formatDate(start)} - ${DateFormatter.formatDate(end)}';
    }
    switch (_preset) {
      case _Preset.today:
        return DateFormatter.formatFullDate(start);
      case _Preset.week:
        return '7 Hari Terakhir';
      case _Preset.month:
        return 'Bulan Ini';
      case _Preset.custom:
        return '';
    }
  }

  Future<void> _pickCustomRange() async {
    final now = DateTime.now();
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(now.year - 2),
      lastDate: now,
      initialDateRange: _customRange ??
          DateTimeRange(
            start: now.subtract(const Duration(days: 6)),
            end: now,
          ),
      helpText: 'Pilih Rentang Tanggal',
      saveText: 'Terapkan',
    );
    if (picked != null) {
      setState(() {
        _customRange = picked;
        _preset = _Preset.custom;
      });
    }
  }

  Future<void> _export({required bool excel}) async {
    if (_exporting) return;
    setState(() => _exporting = true);
    try {
      final report =
          await ref.read(periodReportProvider(_range).future);
      if (excel) {
        await exportReportExcel(report);
      } else {
        await exportReportPdf(report);
      }
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final reportAsync = ref.watch(periodReportProvider(_range));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Laporan Penjualan'),
        automaticallyImplyLeading: false,
        actions: [
          IconButton(
            tooltip: 'Export Excel',
            icon: const Icon(Icons.grid_on_outlined, color: Colors.green),
            onPressed: _exporting ? null : () => _export(excel: true),
          ),
          IconButton(
            tooltip: 'Export PDF',
            icon: const Icon(Icons.picture_as_pdf_outlined, color: Colors.red),
            onPressed: _exporting ? null : () => _export(excel: false),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildPeriodSelector(),
          const SizedBox(height: 16),
          reportAsync.when(
            loading: () => const Padding(
              padding: EdgeInsets.all(48),
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (_, __) => const Card(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: Text('Gagal memuat laporan')),
              ),
            ),
            data: (report) => Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildOmzetCard(context, report),
                const SizedBox(height: 12),
                _buildStatGrid(context, report),
                const SizedBox(height: 16),
                _buildPaymentBreakdown(context, report),
                const SizedBox(height: 16),
                _buildDailyChart(context, report),
                const SizedBox(height: 16),
                _buildTransactionList(context, report),
              ],
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildPeriodSelector() {
    String label(_Preset p) {
      switch (p) {
        case _Preset.today:
          return 'Harian';
        case _Preset.week:
          return 'Mingguan';
        case _Preset.month:
          return 'Bulanan';
        case _Preset.custom:
          return 'Kustom';
      }
    }

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (final p in _Preset.values)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(
                label: Text(label(p)),
                selected: _preset == p,
                onSelected: (_) {
                  if (p == _Preset.custom) {
                    _pickCustomRange();
                  } else {
                    setState(() => _preset = p);
                  }
                },
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildOmzetCard(BuildContext context, PeriodReport report) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Theme.of(context).colorScheme.primary,
            Theme.of(context).colorScheme.tertiary,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context)
                .colorScheme
                .primary
                .withValues(alpha: 0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Omset',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.white70,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            CurrencyFormatter.format(report.totalSales),
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            _rangeLabel,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.white70,
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatGrid(BuildContext context, PeriodReport report) {
    final stats = [
      (
        Icons.receipt_long_outlined,
        'Transaksi',
        report.transactionCount.toString(),
        Colors.blue,
      ),
      (
        Icons.inventory_outlined,
        'Item Terjual',
        report.itemsSold.toString(),
        Colors.orange,
      ),
      (
        Icons.trending_up_outlined,
        'Laba Kotor',
        CurrencyFormatter.format(report.grossProfit),
        Colors.green,
      ),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final crossAxisCount = constraints.maxWidth >= 600 ? 3 : 2;
        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: constraints.maxWidth >= 600 ? 2.2 : 1.6,
          ),
          itemCount: stats.length,
          itemBuilder: (context, i) {
            final (icon, label, value, color) = stats[i];
            return Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceContainerLow,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Row(
                    children: [
                      Icon(icon, size: 16, color: color),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          label,
                          style: Theme.of(context).textTheme.bodySmall,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      value,
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildPaymentBreakdown(BuildContext context, PeriodReport report) {
    final methods = [
      ('Tunai', report.totalCash, Colors.green),
      ('QRIS', report.totalQris, Colors.purple),
      ('Transfer', report.totalTransfer, Colors.blue),
      ('E-Wallet', report.totalEwallet, Colors.orange),
    ];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Metode Pembayaran',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            ...methods.map(
              (m) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      decoration:
                          BoxDecoration(color: m.$3, shape: BoxShape.circle),
                    ),
                    const SizedBox(width: 10),
                    Expanded(child: Text(m.$1)),
                    Text(
                      CurrencyFormatter.format(m.$2),
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDailyChart(BuildContext context, PeriodReport report) {
    final days = report.days;
    final maxSales = days.fold<double>(
      0,
      (max, d) => d.totalSales > max ? d.totalSales : max,
    );

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Omset Harian',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            if (days.isEmpty || maxSales == 0)
              const Center(child: Text('Belum ada data'))
            else
              SizedBox(
                height: 140,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: days.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, i) {
                    final d = days[i];
                    final heightFactor =
                        maxSales == 0 ? 0.0 : d.totalSales / maxSales;
                    return SizedBox(
                      width: 44,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Tooltip(
                            message: CurrencyFormatter.format(d.totalSales),
                            child: Container(
                              height:
                                  20 + (100 * heightFactor).clamp(4, 100),
                              width: 22,
                              decoration: BoxDecoration(
                                color: d.totalSales > 0
                                    ? Theme.of(context).colorScheme.primary
                                    : Theme.of(context).dividerColor,
                                borderRadius: const BorderRadius.vertical(
                                  top: Radius.circular(6),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            '${d.date.day}',
                            style: Theme.of(context).textTheme.labelSmall,
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildTransactionList(BuildContext context, PeriodReport report) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Transaksi (${report.transactions.length})',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            if (report.transactions.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Center(child: Text('Belum ada transaksi')),
              )
            else
              ...report.transactions.take(20).map(
                    (t) => ListTile(
                      contentPadding: EdgeInsets.zero,
                      dense: true,
                      leading: CircleAvatar(
                        radius: 18,
                        backgroundColor: Theme.of(context)
                            .colorScheme
                            .primaryContainer
                            .withValues(alpha: 0.5),
                        child: Icon(
                          _methodIcon(t.paymentMethod),
                          size: 18,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                      title: Text(
                        t.invoiceNo,
                        style: const TextStyle(
                            fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                      subtitle: Text(
                        '${DateFormatter.formatDateTime(t.createdAt)} • ${t.paymentMethod.toUpperCase()}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      trailing: Text(
                        CurrencyFormatter.format(t.total),
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                    ),
                  ),
            if (report.transactions.length > 20)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Center(
                  child: Text(
                    '+ ${report.transactions.length - 20} transaksi lainnya (lihat di export)',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  IconData _methodIcon(String method) {
    switch (method) {
      case 'qris':
        return Icons.qr_code;
      case 'transfer':
        return Icons.account_balance;
      case 'ewallet':
        return Icons.wallet;
      default:
        return Icons.money;
    }
  }
}
