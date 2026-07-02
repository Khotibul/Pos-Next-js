import 'package:equatable/equatable.dart';

abstract class Failure extends Equatable {
  final String message;

  const Failure({required this.message});

  @override
  List<Object> get props => [message];
}

class ServerFailure extends Failure {
  final int? statusCode;

  const ServerFailure({required super.message, this.statusCode});
}

class CacheFailure extends Failure {
  const CacheFailure({required super.message});
}

class DatabaseFailure extends Failure {
  const DatabaseFailure({required super.message});
}

class NetworkFailure extends Failure {
  const NetworkFailure({required super.message});
}

class AuthFailure extends Failure {
  const AuthFailure({required super.message});
}

class CancelledFailure extends Failure {
  const CancelledFailure({required super.message});
}

class SyncFailure extends Failure {
  const SyncFailure({required super.message});
}

class ValidationFailure extends Failure {
  final Map<String, String>? errors;

  const ValidationFailure({required super.message, this.errors});
}
