import 'package:equatable/equatable.dart';

class SyncQueueItem extends Equatable {
  final int id;
  final String tableName;
  final String action;
  final String recordId;
  final Map<String, dynamic>? data;
  final String status;
  final int retryCount;
  final String? errorMessage;
  final DateTime createdAt;
  final DateTime? lastAttempt;

  const SyncQueueItem({
    required this.id,
    required this.tableName,
    required this.action,
    required this.recordId,
    this.data,
    required this.status,
    this.retryCount = 0,
    this.errorMessage,
    required this.createdAt,
    this.lastAttempt,
  });

  @override
  List<Object?> get props => [
        id,
        tableName,
        action,
        recordId,
        data,
        status,
        retryCount,
        errorMessage,
        createdAt,
        lastAttempt,
      ];
}

class SyncStatus {
  final int pendingCount;
  final int syncedCount;
  final int failedCount;
  final DateTime? lastSync;

  const SyncStatus({
    this.pendingCount = 0,
    this.syncedCount = 0,
    this.failedCount = 0,
    this.lastSync,
  });

  bool get isSyncing => pendingCount > 0;
}
