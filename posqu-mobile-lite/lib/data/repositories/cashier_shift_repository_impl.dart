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
      final now = DateTime.now();
      final data = shift.copyWith(openedAt: now, createdAt: now, updatedAt: now);
      await database.cashierShiftDao.insertShift(
        CashierShiftsTableCompanion(
          id: Value(data.id),
          branchId: Value(data.branchId),
          cashierId: Value(data.cashierId),
          openedAt: Value(data.openedAt),
          status: const Value('OPEN'),
          openingCash: Value(data.openingCash),
          openNote: Value(data.openNote),
        ),
      );
      return Right(data);
    } catch (e) {
      return Left(DatabaseFailure(message: 'Gagal membuka shift: $e'));
    }
  }

  @override
  Future<Either<Failure, CashierShift>> closeShift(CashierShift shift) async {
    try {
      await database.cashierShiftDao.updateShift(
        CashierShiftsTableCompanion(
          id: Value(shift.id),
          closedAt: Value(shift.closedAt),
          status: const Value('CLOSED'),
          cashSystem: Value(shift.cashSystem),
          cashCounted: Value(shift.cashCounted),
          cashDifference: Value(shift.cashDifference),
          totalSales: Value(shift.totalSales),
          totalCash: Value(shift.totalCash),
          totalQris: Value(shift.totalQris),
          totalTransfer: Value(shift.totalTransfer),
          totalEwallet: Value(shift.totalEwallet),
          transactionCount: Value(shift.transactionCount),
          closingBalance: Value(shift.closingBalance),
          expectedBalance: Value(shift.expectedBalance),
          totalExpenses: Value(shift.totalExpenses),
          closeNote: Value(shift.closeNote ?? shift.openNote),
          updatedAt: Value(DateTime.now()),
        ),
      );
      return Right(shift);
    } catch (e) {
      return Left(DatabaseFailure(message: 'Gagal menutup shift: $e'));
    }
  }

  @override
  Future<Either<Failure, CashierShift>> getActiveShift(String cashierId) async {
    try {
      final shift = await database.cashierShiftDao.getActiveShift(cashierId);
      if (shift == null) {
        return const Left(DatabaseFailure(message: 'Tidak ada shift aktif'));
      }
      return Right(_toEntity(shift));
    } catch (e) {
      return const Left(DatabaseFailure(message: 'Gagal mengambil shift aktif'));
    }
  }

  @override
  Future<Either<Failure, CashierShift>> getShift(String id) async {
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
      branchId: s.branchId,
      cashierId: s.cashierId,
      openedAt: s.openedAt,
      closedAt: s.closedAt,
      status: s.status,
      openingCash: s.openingCash,
      cashSystem: s.cashSystem,
      cashCounted: s.cashCounted,
      cashDifference: s.cashDifference,
      totalSales: s.totalSales,
      totalCash: s.totalCash,
      totalQris: s.totalQris,
      totalTransfer: s.totalTransfer,
      totalEwallet: s.totalEwallet,
      transactionCount: s.transactionCount,
      openNote: s.openNote,
      closeNote: s.closeNote,
      approvedById: s.approvedById,
      approvedAt: s.approvedAt,
      closingBalance: s.closingBalance,
      expectedBalance: s.expectedBalance,
      totalExpenses: s.totalExpenses,
      isSynced: s.isSynced,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    );
  }
}
