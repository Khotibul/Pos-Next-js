import 'package:dartz/dartz.dart';
import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/errors/failures.dart';
import '../../core/network/mobile_api_gate.dart';
import '../../core/network/network_info.dart';
import '../../domain/entities/cashier_shift.dart';
import '../../domain/repositories/cashier_shift_repository.dart';
import '../datasources/local/database/app_database.dart';
import '../datasources/remote/shift_remote_datasource.dart';

final cashierShiftRepositoryProvider = Provider<CashierShiftRepository>((ref) {
  return CashierShiftRepositoryImpl(
    database: ref.read(appDatabaseProvider),
    remoteDataSource: ref.read(shiftRemoteDataSourceProvider),
    networkInfo: ref.read(networkInfoProvider),
  );
});

class CashierShiftRepositoryImpl implements CashierShiftRepository {
  final AppDatabase database;
  final ShiftRemoteDataSource remoteDataSource;
  final NetworkInfo networkInfo;

  CashierShiftRepositoryImpl({
    required this.database,
    required this.remoteDataSource,
    required this.networkInfo,
  });

  /// Hitung rekap shiftbook dari transaksi lokal yang menempel pada shift
  /// (shiftId) + pengeluaran kasir di rentang waktu shift. Selaras dengan
  /// `calculateShiftSummary` di backend pos-next-js.
  @override
  Future<Either<Failure, CashierShift>> computeShiftSummary(
    CashierShift shift,
  ) async {
    try {
      final sales = await database.saleDao.getByShiftId(shift.id);
      final end = shift.closedAt ?? DateTime.now();

      double totalSales = 0;
      double totalCash = 0;
      double totalQris = 0;
      double totalTransfer = 0;
      double totalEwallet = 0;
      for (final sale in sales) {
        totalSales += sale.total;
        final payments = await database.paymentDao.getBySaleId(sale.id);
        final method =
            payments.isNotEmpty ? payments.first.method.toLowerCase() : 'cash';
        switch (method) {
          case 'qris':
            totalQris += sale.total;
            break;
          case 'transfer':
            totalTransfer += sale.total;
            break;
          case 'ewallet':
            totalEwallet += sale.total;
            break;
          default:
            totalCash += sale.total;
        }
      }

      final totalExpenses = await database.cashTransactionDao.sumByType(
        'expense',
        startDate: shift.openedAt,
        endDate: end,
      );
      final totalIncome = await database.cashTransactionDao.sumByType(
        'income',
        startDate: shift.openedAt,
        endDate: end,
      );

      final cashSystem = totalCash;
      final expectedBalance =
          shift.openingCash + totalCash + totalIncome - totalExpenses;

      final updated = shift.copyWith(
        cashSystem: cashSystem,
        totalSales: totalSales,
        totalCash: totalCash,
        totalQris: totalQris,
        totalTransfer: totalTransfer,
        totalEwallet: totalEwallet,
        transactionCount: sales.length,
        totalExpenses: totalExpenses,
        expectedBalance: expectedBalance,
      );
      return Right(updated);
    } catch (e) {
      return Left(DatabaseFailure(message: 'Gagal menghitung rekap shift: $e'));
    }
  }

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
          isSynced: const Value(false),
        ),
      );
      // Coba push ke server bila online; gagal -> tetap lokal (isSynced=false) untuk sync berikutnya
      if (await networkInfo.isConnected && !MobileApiGate.isDisabled('shifts')) {
        try {
          await remoteDataSource.openShift({
            'id': data.id,
            'cashierId': data.cashierId,
            'branchId': data.branchId,
            'openingCash': data.openingCash,
            'openNote': data.openNote,
            'openedAt': data.openedAt.toIso8601String(),
          });
          await database.cashierShiftDao.markSynced([data.id]);
        } catch (_) {}
      }
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
          isSynced: const Value(false),
          updatedAt: Value(DateTime.now()),
        ),
      );
      if (await networkInfo.isConnected && !MobileApiGate.isDisabled('shifts')) {
        try {
          await remoteDataSource.closeShift(shift.id, {
            'closedAt': shift.closedAt?.toIso8601String(),
            'cashCounted': shift.cashCounted,
            'cashSystem': shift.cashSystem,
            'cashDifference': shift.cashDifference,
            'totalSales': shift.totalSales,
            'totalCash': shift.totalCash,
            'totalQris': shift.totalQris,
            'totalTransfer': shift.totalTransfer,
            'totalEwallet': shift.totalEwallet,
            'transactionCount': shift.transactionCount,
            'closeNote': shift.closeNote,
          });
          await database.cashierShiftDao.markSynced([shift.id]);
        } catch (_) {}
      }
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
