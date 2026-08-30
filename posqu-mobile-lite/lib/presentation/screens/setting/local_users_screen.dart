import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:drift/drift.dart' show Value;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../data/datasources/local/database/app_database.dart';

final localUsersProvider = FutureProvider<List<UsersTableData>>((ref) async {
  final db = ref.watch(appDatabaseProvider);
  return db.userDao.getAll();
});

class LocalUsersScreen extends ConsumerWidget {
  const LocalUsersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final usersAsync = ref.watch(localUsersProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Akun Lokal (Offline)'),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddDialog(context, ref),
        icon: const Icon(Icons.person_add),
        label: const Text('Tambah Akun'),
      ),
      body: Column(
        children: [
          Container(
            width: double.infinity,
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                const Icon(Icons.info_outline, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Akun di sini bisa login saat offline. Akun yang pernah login online akan otomatis tersimpan di sini.',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: usersAsync.when(
              data: (users) {
                if (users.isEmpty) {
                  return const Center(child: Text('Belum ada akun lokal'));
                }
                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  itemCount: users.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final user = users[index];
                    return Card(
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: Theme.of(context).colorScheme.primary,
                          child: Text(
                            (user.name ?? user.email ?? '?').substring(0, 1).toUpperCase(),
                            style: const TextStyle(color: Colors.white),
                          ),
                        ),
                        title: Text(user.name ?? 'Tanpa Nama'),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(user.email ?? '-', style: Theme.of(context).textTheme.bodySmall),
                            const SizedBox(height: 2),
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: user.isSuperAdmin ? Colors.red.withValues(alpha: 0.1) : Colors.blue.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    user.isSuperAdmin ? 'ADMIN' : 'USER',
                                    style: TextStyle(
                                      fontSize: 10,
                                      color: user.isSuperAdmin ? Colors.red : Colors.blue,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                if (!user.isActive)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: Colors.grey.withValues(alpha: 0.2),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: const Text('NONAKTIF', style: TextStyle(fontSize: 10)),
                                  ),
                              ],
                            ),
                          ],
                        ),
                        trailing: PopupMenuButton<String>(
                          onSelected: (value) async {
                            if (value == 'delete') {
                              final confirm = await showDialog<bool>(
                                context: context,
                                builder: (ctx) => AlertDialog(
                                  title: const Text('Hapus Akun Lokal?'),
                                  content: Text('Hapus ${user.email}? Akun masih bisa login online jika ada di server.'),
                                  actions: [
                                    TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
                                    FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Hapus')),
                                  ],
                                ),
                              );
                              if (confirm == true) {
                                final db = ref.read(appDatabaseProvider);
                                await db.userDao.deleteUser(user.id);
                                ref.invalidate(localUsersProvider);
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Akun lokal dihapus')),
                                  );
                                }
                              }
                            } else if (value == 'reset') {
                              _showResetPasswordDialog(context, ref, user);
                            }
                          },
                          itemBuilder: (ctx) => [
                            const PopupMenuItem(value: 'reset', child: Text('Reset Password')),
                            const PopupMenuItem(value: 'delete', child: Text('Hapus Akun')),
                          ],
                        ),
                      ),
                    );
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, __) => Center(child: Text('Gagal memuat: $e')),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _showAddDialog(BuildContext context, WidgetRef ref) async {
    final emailController = TextEditingController();
    final nameController = TextEditingController();
    final passwordController = TextEditingController();
    String role = 'USER';

    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setState) => AlertDialog(
          title: const Text('Tambah Akun Lokal'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: emailController,
                  decoration: const InputDecoration(labelText: 'Email *', prefixIcon: Icon(Icons.email_outlined)),
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: nameController,
                  decoration: const InputDecoration(labelText: 'Nama', prefixIcon: Icon(Icons.person_outline)),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: passwordController,
                  decoration: const InputDecoration(labelText: 'Password *', prefixIcon: Icon(Icons.lock_outline)),
                  obscureText: true,
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: role,
                  decoration: const InputDecoration(labelText: 'Role', prefixIcon: Icon(Icons.shield_outlined)),
                  items: const [
                    DropdownMenuItem(value: 'USER', child: Text('USER')),
                    DropdownMenuItem(value: 'ADMIN', child: Text('ADMIN')),
                  ],
                  onChanged: (v) => setState(() => role = v ?? 'USER'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Simpan')),
          ],
        ),
      ),
    );

    if (result != true) return;

    final email = emailController.text.trim().toLowerCase();
    final name = nameController.text.trim();
    final password = passwordController.text;

    if (email.isEmpty || !email.contains('@')) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Email tidak valid')));
      return;
    }
    if (password.length < 6) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Password minimal 6 karakter')));
      return;
    }

    try {
      final db = ref.read(appDatabaseProvider);
      final hashed = sha256.convert(utf8.encode(password)).toString();
      await db.userDao.upsertUser(UsersTableCompanion(
        id: Value(const Uuid().v4()),
        email: Value(email),
        name: Value(name.isEmpty ? email.split('@').first : name),
        passwordHash: Value(hashed),
        isActive: const Value(true),
        isSuperAdmin: Value(role == 'ADMIN'),
        emailVerified: Value(DateTime.now()),
        updatedAt: Value(DateTime.now()),
      ));
      ref.invalidate(localUsersProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Akun $email ditambahkan. Bisa login offline.')));
      }
    } catch (e) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal: $e')));
    }
  }

  Future<void> _showResetPasswordDialog(BuildContext context, WidgetRef ref, UsersTableData user) async {
    final passwordController = TextEditingController();
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Reset Password ${user.email}'),
        content: TextField(
          controller: passwordController,
          decoration: const InputDecoration(labelText: 'Password Baru', prefixIcon: Icon(Icons.lock_outline)),
          obscureText: true,
          autofocus: true,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Simpan')),
        ],
      ),
    );
    if (result != true) return;
    final newPass = passwordController.text;
    if (newPass.length < 6) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Password minimal 6 karakter')));
      return;
    }
    try {
      final db = ref.read(appDatabaseProvider);
      final hashed = sha256.convert(utf8.encode(newPass)).toString();
      await db.userDao.updateUser(UsersTableCompanion(
        id: Value(user.id),
        passwordHash: Value(hashed),
        updatedAt: Value(DateTime.now()),
      ));
      ref.invalidate(localUsersProvider);
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Password diperbarui')));
    } catch (e) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Gagal: $e')));
    }
  }
}
