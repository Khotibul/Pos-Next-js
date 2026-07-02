import 'package:dartz/dartz.dart';
import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/errors/failures.dart';
import '../../domain/entities/cashier_shift.dart';
import '../../domain/repositories/cash_repository.dart';
import '../datasources/local/database/app_database.dart';

final cashRepositoryProvider = Provider<CashRepository>((ref) {
  return CashRepositoryImpl(database: ref.read(appDatabaseProvider));
});

class CashRepositoryImpl implements CashRepository {
  final AppDatabase database;

  CashRepositoryImpl({required this.database});

  @override
  Future<Either<Failure, CashTransaction>> createCashTransaction(
      CashTransaction transaction) async {
    try {
      final companion = CashTransactionsTableCompanion(
        shiftId: Value(transaction.shiftId),
        type: Value(transaction.type),
        category: Value(transaction.category),
        amount: Value(transaction.amount),
        description: Value(transaction.description),
        referenceType: Value(transaction.referenceType),
        referenceId: Value(transaction.referenceId),
        transactionDate: Value(transaction.transactionDate),
        userId: Value(transaction.userId),
      );
      await database.cashTransactionDao.insertTransaction(companion);
      return Right(transaction);
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal mencatat transaksi kas'));
    }
  }

  @override
  Future<Either<Failure, double>> getCashBalance() async {
    try {
      final balance = await database.cashTransactionDao.getBalance();
      return Right(balance);
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal mengambil saldo kas'));
    }
  }

  @override
  Future<Either<Failure, List<CashTransaction>>> getCashTransactions({
    int page = 1,
    int limit = 20,
    DateTime? startDate,
    DateTime? endDate,
    String? type,
  }) async {
    try {
      final transactions = await database.cashTransactionDao.getAll(
        startDate: startDate,
        endDate: endDate,
        type: type,
      );
      return Right(transactions.map((t) => _toEntity(t)).toList());
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal mengambil transaksi kas'));
    }
  }

  CashTransaction _toEntity(CashTransactionsTableData t) {
    return CashTransaction(
      id: t.id,
      shiftId: t.shiftId,
      type: t.type,
      category: t.category,
      amount: t.amount,
      description: t.description,
      referenceType: t.referenceType,
      referenceId: t.referenceId,
      transactionDate: t.transactionDate,
      userId: t.userId,
      createdAt: t.createdAt,
    );
  }
}
