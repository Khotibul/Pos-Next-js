import 'package:dartz/dartz.dart';
import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/errors/failures.dart';
import '../../domain/entities/cashier_shift.dart';
import '../../domain/repositories/cashier_shift_repository.dart';
import '../datasources/local/database/app_database.dart';

final cashierShiftRepositoryProvider = Provider<CashierShiftRepository>((ref) {
  return CashierShiftRepositoryImpl(database: ref.read(appDatabaseProvider));
});

class CashierShiftRepositoryImpl implements CashierShiftRepository {
  final AppDatabase database;

  CashierShiftRepositoryImpl({required this.database});

  @override
  Future<Either<Failure, CashierShift>> openShift(CashierShift shift) async {
    try {
      final companion = CashierShiftsTableCompanion(
        userId: Value(shift.userId),
        openTime: Value(shift.openTime),
        status: const Value('open'),
        openingBalance: Value(shift.openingBalance),
      );
      await database.cashierShiftDao.insertShift(companion);
      return Right(shift);
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal membuka shift'));
    }
  }

  @override
  Future<Either<Failure, CashierShift>> closeShift(CashierShift shift) async {
    try {
      await database.cashierShiftDao.updateShift(
        CashierShiftsTableCompanion(
          id: Value(shift.id),
          closeTime: Value(shift.closeTime),
          status: const Value('closed'),
          closingBalance: Value(shift.closingBalance),
          expectedBalance: Value(shift.expectedBalance),
          difference: Value(shift.difference),
          totalSales: Value(shift.totalSales),
          totalCash: Value(shift.totalCash),
          totalQris: Value(shift.totalQris),
          totalTransfer: Value(shift.totalTransfer),
          totalExpenses: Value(shift.totalExpenses),
          notes: Value(shift.notes),
        ),
      );
      return Right(shift);
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal menutup shift'));
    }
  }

  @override
  Future<Either<Failure, CashierShift>> getActiveShift(int userId) async {
    try {
      final shift = await database.cashierShiftDao.getActiveShift(userId);
      if (shift == null) {
        return const Left(DatabaseFailure(message: 'Tidak ada shift aktif'));
      }
      return Right(_toEntity(shift));
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal mengambil shift aktif'));
    }
  }

  @override
  Future<Either<Failure, CashierShift>> getShift(int id) async {
    try {
      final shift = await database.cashierShiftDao.getById(id);
      if (shift == null) {
        return const Left(DatabaseFailure(message: 'Shift tidak ditemukan'));
      }
      return Right(_toEntity(shift));
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal mengambil shift'));
    }
  }

  @override
  Future<Either<Failure, List<CashierShift>>> getShifts({
    int page = 1,
    int limit = 20,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final shifts = await database.cashierShiftDao.getAll(
        startDate: startDate,
        endDate: endDate,
      );
      return Right(shifts.map((s) => _toEntity(s)).toList());
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal mengambil daftar shift'));
    }
  }

  CashierShift _toEntity(CashierShiftsTableData s) {
    return CashierShift(
      id: s.id,
      userId: s.userId,
      openTime: s.openTime,
      closeTime: s.closeTime,
      status: s.status,
      openingBalance: s.openingBalance,
      closingBalance: s.closingBalance,
      expectedBalance: s.expectedBalance,
      difference: s.difference,
      totalSales: s.totalSales,
      totalCash: s.totalCash,
      totalQris: s.totalQris,
      totalTransfer: s.totalTransfer,
      totalExpenses: s.totalExpenses,
      notes: s.notes,
    );
  }
}
