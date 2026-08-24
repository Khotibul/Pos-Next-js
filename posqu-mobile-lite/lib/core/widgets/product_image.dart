import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';

/// Thumbnail foto produk yang mendukung semua sumber seperti di website:
/// - data URI base64  (ProductImage.url di pos-next-js)
/// - http(s) URL      (gambar yang disajikan server)
/// - path file lokal  (hasil kamera/galeri di perangkat)
class ProductImageThumb extends StatelessWidget {
  final String? url;
  final double size;
  final BorderRadius? borderRadius;

  const ProductImageThumb({
    super.key,
    this.url,
    this.size = 48,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.4),
        borderRadius: borderRadius ?? BorderRadius.circular(8),
      ),
      clipBehavior: Clip.antiAlias,
      child: _buildChild(context),
    );
  }

  Widget _buildChild(BuildContext context) {
    final src = url;
    if (src == null || src.isEmpty) return _placeholder(context);

    try {
      if (src.startsWith('data:image')) {
        final base64Part = src.split(',').last;
        final bytes = base64Decode(base64Part);
        return Image.memory(
          bytes,
          fit: BoxFit.cover,
          cacheWidth: (size * 2).round(),
          errorBuilder: (_, __, ___) => _placeholder(context),
        );
      }

      if (src.startsWith('http://') || src.startsWith('https://')) {
        return Image.network(
          src,
          fit: BoxFit.cover,
          cacheWidth: (size * 2).round(),
          errorBuilder: (_, __, ___) => _placeholder(context),
          loadingBuilder: (context, child, progress) {
            if (progress == null) return child;
            return Center(
              child: SizedBox(
                width: size * 0.3,
                height: size * 0.3,
                child: const CircularProgressIndicator(strokeWidth: 2),
              ),
            );
          },
        );
      }

      final file = File(src);
      if (file.existsSync()) {
        return Image.file(
          file,
          fit: BoxFit.cover,
          cacheWidth: (size * 2).round(),
          errorBuilder: (_, __, ___) => _placeholder(context),
        );
      }
    } catch (_) {
      return _placeholder(context);
    }
    return _placeholder(context);
  }

  Widget _placeholder(BuildContext context) {
    return Icon(
      Icons.inventory_2_outlined,
      size: size * 0.5,
      color: Theme.of(context).colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
    );
  }
}
