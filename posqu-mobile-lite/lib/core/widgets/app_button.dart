import 'package:flutter/material.dart';

class AppButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool loading;
  final bool expanded;
  final IconData? icon;
  final ButtonType type;
  final double? height;

  const AppButton({
    super.key,
    required this.label,
    this.onPressed,
    this.loading = false,
    this.expanded = true,
    this.icon,
    this.type = ButtonType.primary,
    this.height,
  });

  @override
  Widget build(BuildContext context) {
    final button = _buildButton(context);
    if (expanded) {
      return SizedBox(width: double.infinity, child: button);
    }
    return button;
  }

  Widget _buildButton(BuildContext context) {
    final style = _getStyle(context);
    final child = loading
        ? const SizedBox(
            height: 20,
            width: 20,
            child: CircularProgressIndicator(strokeWidth: 2),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 20),
                const SizedBox(width: 8),
              ],
              Text(label, style: style.textStyle?.resolve(<WidgetState>{})),
            ],
          );

    return switch (type) {
      ButtonType.primary => ElevatedButton(
          onPressed: loading ? null : onPressed,
          style: ElevatedButton.styleFrom(
            minimumSize: Size.fromHeight(height ?? 48),
          ),
          child: child,
        ),
      ButtonType.secondary => OutlinedButton(
          onPressed: loading ? null : onPressed,
          style: OutlinedButton.styleFrom(
            minimumSize: Size.fromHeight(height ?? 48),
          ),
          child: child,
        ),
      ButtonType.text => TextButton(
          onPressed: loading ? null : onPressed,
          style: TextButton.styleFrom(
            minimumSize: Size.fromHeight(height ?? 48),
          ),
          child: child,
        ),
      ButtonType.danger => ElevatedButton(
          onPressed: loading ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: Theme.of(context).colorScheme.error,
            foregroundColor: Theme.of(context).colorScheme.onError,
            minimumSize: Size.fromHeight(height ?? 48),
          ),
          child: child,
        ),
    };
  }

  ButtonStyle _getStyle(BuildContext context) {
    return switch (type) {
      ButtonType.primary => ElevatedButton.styleFrom(
          minimumSize: Size.fromHeight(height ?? 48),
        ),
      ButtonType.secondary => OutlinedButton.styleFrom(
          minimumSize: Size.fromHeight(height ?? 48),
        ),
      ButtonType.text => TextButton.styleFrom(
          minimumSize: Size.fromHeight(height ?? 48),
        ),
      ButtonType.danger => ElevatedButton.styleFrom(
          backgroundColor: Theme.of(context).colorScheme.error,
          foregroundColor: Theme.of(context).colorScheme.onError,
          minimumSize: Size.fromHeight(height ?? 48),
        ),
    };
  }
}

enum ButtonType { primary, secondary, text, danger }
