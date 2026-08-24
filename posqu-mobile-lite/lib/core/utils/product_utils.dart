import 'package:uuid/uuid.dart';

/// Generator SKU — selaras dengan website pos-next-js
/// (src/features/products/data/service.ts -> genSku):
/// `SKU-` + 8 karakter pertama UUID v4 dalam huruf besar.
String generateSku() {
  final hex = const Uuid().v4().replaceAll('-', '').toUpperCase();
  return 'SKU-${hex.substring(0, 8)}';
}

/// Slugify — selaras dengan website (slugify di service.ts).
String slugify(String input) {
  return input
      .toLowerCase()
      .trim()
      .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
      .replaceAll(RegExp(r'(^-|-$)+'), '');
}

/// Margin persen — selaras dengan website (computeMarginPct):
/// ((selling - cost) / selling) * 100, min 0.
double computeMarginPct(double cost, double selling) {
  if (selling <= 0) return 0;
  final pct = ((selling - cost) / selling) * 100;
  if (pct.isNaN || pct.isInfinite || pct < 0) return 0;
  return pct;
}
