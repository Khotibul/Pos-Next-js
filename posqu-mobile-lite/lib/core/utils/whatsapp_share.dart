import 'dart:io';

import 'package:flutter/services.dart';

class WhatsAppShare {
  static const MethodChannel _channel = MethodChannel('posqu/share');

  static Future<bool> get isAvailable async {
    if (!Platform.isAndroid) return false;
    try {
      return await _channel.invokeMethod('isWhatsAppInstalled') == true;
    } catch (_) {
      return false;
    }
  }

  static Future<bool> shareText(String message) async {
    if (!Platform.isAndroid) return false;
    try {
      final ok =
          await _channel.invokeMethod('shareToWhatsApp', {'text': message});
      return ok == true;
    } catch (_) {
      return false;
    }
  }

  static Future<bool> shareFile(String path, {String? text}) async {
    if (!Platform.isAndroid) return false;
    try {
      final ok = await _channel.invokeMethod('shareToWhatsApp', {
        if (text != null) 'text': text,
        'path': path,
      });
      return ok == true;
    } catch (_) {
      return false;
    }
  }
}
