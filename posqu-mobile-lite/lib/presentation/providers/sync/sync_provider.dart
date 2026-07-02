import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/repositories/sync_repository_impl.dart';
import '../../../domain/repositories/sync_repository.dart';
import '../../../domain/entities/sync_queue_item.dart';

final syncStatusProvider = FutureProvider<SyncStatus>((ref) async {
  final repository = ref.read(syncRepositoryProvider);
  final result = await repository.getSyncStatus();
  return result.fold((failure) => const SyncStatus(), (status) => status);
});

final syncActionProvider = Provider<SyncActions>((ref) {
  return SyncActions(ref.read(syncRepositoryProvider));
});

class SyncActions {
  final SyncRepository _repository;

  SyncActions(this._repository);

  Future<bool> syncNow() async {
    final result = await _repository.syncAll();
    return result.fold((failure) => false, (count) => true);
  }
}
