import 'dart:convert';
import 'package:json_annotation/json_annotation.dart';

import '../../domain/entities/sync_queue_item.dart';

part 'sync_queue_model.g.dart';

@JsonSerializable()
class SyncQueueModel {
  final int id;
  @JsonKey(name: 'table_name')
  final String tableName;
  final String action;
  @JsonKey(name: 'record_id')
  final String recordId;
  final String? data;
  final String status;
  @JsonKey(name: 'retry_count')
  final int retryCount;
  @JsonKey(name: 'error_message')
  final String? errorMessage;
  @JsonKey(name: 'created_at')
  final DateTime createdAt;
  @JsonKey(name: 'last_attempt')
  final DateTime? lastAttempt;

  const SyncQueueModel({
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

  factory SyncQueueModel.fromJson(Map<String, dynamic> json) =>
      _$SyncQueueModelFromJson(json);

  Map<String, dynamic> toJson() => _$SyncQueueModelToJson(this);

  SyncQueueItem toEntity() {
    Map<String, dynamic>? parsedData;
    if (data != null) {
      try {
        parsedData = jsonDecode(data!);
      } catch (_) {}
    }
    return SyncQueueItem(
      id: id,
      tableName: tableName,
      action: action,
      recordId: recordId,
      data: parsedData,
      status: status,
      retryCount: retryCount,
      errorMessage: errorMessage,
      createdAt: createdAt,
      lastAttempt: lastAttempt,
    );
  }
}
