class Validators {
  Validators._();

  static String? required(String? value, [String field = 'Field ini']) {
    if (value == null || value.trim().isEmpty) {
      return '$field wajib diisi';
    }
    return null;
  }

  static String? email(String? value) {
    if (value == null || value.trim().isEmpty) return null;
    final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
    if (!emailRegex.hasMatch(value)) {
      return 'Format email tidak valid';
    }
    return null;
  }

  static String? phone(String? value) {
    if (value == null || value.trim().isEmpty) return null;
    final phoneRegex = RegExp(r'^0[0-9]{8,13}$');
    if (!phoneRegex.hasMatch(value)) {
      return 'Format nomor telepon tidak valid';
    }
    return null;
  }

  static String? number(String? value, [String field = 'Nilai']) {
    if (value == null || value.trim().isEmpty) return null;
    final number = double.tryParse(value.replaceAll(',', '.'));
    if (number == null) {
      return '$field harus berupa angka';
    }
    return null;
  }

  static String? positiveNumber(String? value, [String field = 'Nilai']) {
    final error = number(value, field);
    if (error != null) return error;
    final parsedNumber = double.parse(value!.replaceAll(',', '.'));
    if (parsedNumber <= 0) {
      return '$field harus lebih besar dari 0';
    }
    return null;
  }

  static String? minLength(String? value, int min, [String field = 'Field ini']) {
    if (value != null && value.length < min) {
      return '$field minimal $min karakter';
    }
    return null;
  }

  static String? maxLength(String? value, int max, [String field = 'Field ini']) {
    if (value != null && value.length > max) {
      return '$field maksimal $max karakter';
    }
    return null;
  }

  static String? password(String? value) {
    if (value == null || value.isEmpty) return 'Password wajib diisi';
    if (value.length < 6) return 'Password minimal 6 karakter';
    return null;
  }
}
