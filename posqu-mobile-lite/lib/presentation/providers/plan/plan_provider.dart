import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/datasources/remote/tenant_remote_datasource.dart';
import '../../../core/network/network_info.dart';

class TenantPlan {
  final String tenantId;
  final String tenantName;
  final String slug;
  final String planSlug;
  final String planName;
  final bool isFree;
  final bool canUseDatabase;
  final bool canSync;
  final bool canStoreTransactions;
  final bool canViewReports;
  final bool canStoreProducts;

  const TenantPlan({
    required this.tenantId,
    required this.tenantName,
    required this.slug,
    required this.planSlug,
    required this.planName,
    required this.isFree,
    required this.canUseDatabase,
    required this.canSync,
    this.canStoreTransactions = true,
    this.canViewReports = true,
    this.canStoreProducts = true,
  });

  factory TenantPlan.freePlaceholder() => const TenantPlan(
        tenantId: '',
        tenantName: '',
        slug: '',
        planSlug: 'starter',
        planName: 'Starter',
        isFree: true,
        canUseDatabase: false,
        canSync: false,
        canStoreTransactions: false,
        canViewReports: false,
        canStoreProducts: false,
      );

  factory TenantPlan.fromJson(Map<String, dynamic> json) {
    final tenant = json['tenant'] as Map<String, dynamic>? ?? {};
    final plan = json['plan'] as Map<String, dynamic>? ?? {};
    final pkg = json['package'] as Map<String, dynamic>? ?? {};
    final slug = (pkg['slug'] ?? plan['slug'] ?? 'starter') as String;
    final isFree = pkg['isFree'] as bool? ?? (slug == 'starter' || slug == 'free');
    final canUseDatabase = pkg['canUseDatabase'] as bool? ?? !isFree;
    final canSync = pkg['canSync'] as bool? ?? canUseDatabase;
    return TenantPlan(
      tenantId: tenant['id'] as String? ?? '',
      tenantName: tenant['name'] as String? ?? '',
      slug: slug,
      planSlug: slug,
      planName: plan['name'] as String? ?? slug,
      isFree: isFree,
      canUseDatabase: canUseDatabase,
      canSync: canSync,
      canStoreTransactions: pkg['canStoreTransactions'] as bool? ?? canUseDatabase,
      canViewReports: pkg['canViewReports'] as bool? ?? canUseDatabase,
      canStoreProducts: pkg['canStoreProducts'] as bool? ?? canUseDatabase,
    );
  }
}

final tenantPlanProvider = FutureProvider<TenantPlan?>((ref) async {
  final networkInfo = ref.read(networkInfoProvider);
  if (!await networkInfo.isConnected) return null;
  try {
    final remote = ref.read(tenantRemoteDataSourceProvider);
    final json = await remote.getTenantPlan();
    return TenantPlan.fromJson(json);
  } catch (_) {
    return null;
  }
});

final canUseDatabaseProvider = Provider<bool>((ref) {
  final planAsync = ref.watch(tenantPlanProvider);
  final plan = planAsync.valueOrNull;
  // Jika belum load (offline atau error), anggap pro untuk tidak block offline SQLite
  // Tapi sync akan tetap block via PLAN_FREE_NO_DB dari server saat online
  if (plan == null) return true;
  return plan.canUseDatabase;
});

final canSyncProvider = Provider<bool>((ref) {
  final planAsync = ref.watch(tenantPlanProvider);
  final plan = planAsync.valueOrNull;
  if (plan == null) return true;
  return plan.canSync;
});
