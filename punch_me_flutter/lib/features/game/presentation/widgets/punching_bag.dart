import 'package:flutter/material.dart';

class PunchingBag extends StatefulWidget {
  final double scale;
  final int level;
  final Function(TapUpDetails details) onPunch;

  const PunchingBag({
    super.key,
    required this.scale,
    required this.level,
    required this.onPunch,
  });

  @override
  State<PunchingBag> createState() => _PunchingBagState();
}

class _PunchingBagState extends State<PunchingBag> with SingleTickerProviderStateMixin {
  late AnimationController _swingController;
  late Animation<double> _swingAnimation;

  @override
  void initState() {
    super.initState();
    _swingController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );

    // Creates an oscillating sway decay animation
    _swingAnimation = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0.0, end: 0.12).chain(CurveTween(curve: Curves.easeOut)), weight: 20),
      TweenSequenceItem(tween: Tween(begin: 0.12, end: -0.08).chain(CurveTween(curve: Curves.easeInOut)), weight: 25),
      TweenSequenceItem(tween: Tween(begin: -0.08, end: 0.05).chain(CurveTween(curve: Curves.easeInOut)), weight: 25),
      TweenSequenceItem(tween: Tween(begin: 0.05, end: -0.02).chain(CurveTween(curve: Curves.easeInOut)), weight: 20),
      TweenSequenceItem(tween: Tween(begin: -0.02, end: 0.0).chain(CurveTween(curve: Curves.easeIn)), weight: 10),
    ]).animate(_swingController);
  }

  @override
  void dispose() {
    _swingController.dispose();
    super.dispose();
  }

  void _handleTap(TapUpDetails details) {
    _swingController.forward(from: 0.0);
    widget.onPunch(details);
  }

  Color _getBagColor(int level) {
    const colors = [
      Color(0xFFEF4444), // Level 1: Red
      Color(0xFFF97316), // Level 2: Orange
      Color(0xFFFACC15), // Level 3: Yellow
      Color(0xFF22C55E), // Level 4: Green
      Color(0xFF3B82F6), // Level 5: Blue
      Color(0xFF8B5CF6), // Level 6: Purple
      Color(0xFFEC4899), // Level 7: Pink
      Color(0xFFFFD700), // Level 8+: Shiny Gold
    ];
    int index = (level - 1) % colors.length;
    return colors[index];
  }

  @override
  Widget build(BuildContext context) {
    final bagColor = _getBagColor(widget.level);

    return GestureDetector(
      onTapUp: _handleTap,
      child: AnimatedBuilder(
        animation: _swingAnimation,
        builder: (context, child) {
          // Calculate rotation angle and offset to simulate hanging swinging
          final angle = _swingAnimation.value;
          
          return Transform.scale(
            scale: widget.scale,
            child: Transform(
              alignment: Alignment.topCenter,
              transform: Matrix4.identity()
                ..setEntry(3, 2, 0.001) // perspective
                ..rotateZ(angle),
              child: SizedBox(
                width: 200,
                height: 250,
                child: CustomPaint(
                  painter: BagPainter(color: bagColor, level: widget.level),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class BagPainter extends CustomPainter {
  final Color color;
  final int level;

  BagPainter({required this.color, required this.level});

  @override
  void paint(Canvas canvas, Size size) {
    final width = size.width;
    final height = size.height;

    // Paints
    final strapPaint = Paint()
      ..color = const Color(0xFF6B7280)
      ..style = PaintingStyle.fill;

    final ringPaint = Paint()
      ..color = const Color(0xFF4B5563)
      ..style = PaintingStyle.fill;

    final shadowPaint = Paint()
      ..color = const Color(0x66000000)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8);

    // 1. Draw strap
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(width / 2 - 6, 4, 12, 28),
        const Radius.circular(3),
      ),
      strapPaint,
    );

    // 2. Draw hanging metal bar/ring
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(width / 2 - 32, 26, 64, 12),
        const Radius.circular(4),
      ),
      ringPaint,
    );

    // 3. Draw base shadow ellipse on the floor
    canvas.drawOval(
      Rect.fromLTRB(width / 2 - 68, height - 18, width / 2 + 68, height - 2),
      shadowPaint,
    );

    // 4. Draw bag body gradient
    final Rect bodyRect = Rect.fromLTWH(width / 2 - 60, 38, 120, 180);
    final RRect bodyRRect = RRect.fromRectAndRadius(bodyRect, const Radius.circular(32));

    // Glow effect (increases with level)
    if (level > 2) {
      final glowPaint = Paint()
        ..color = color.withValues(alpha: 0.3)
        ..maskFilter = MaskFilter.blur(BlurStyle.normal, 10 + (level * 2.0).clamp(0, 20));
      canvas.drawRRect(bodyRRect, glowPaint);
    }

    final bodyPaint = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          color,
          color.withValues(alpha: 0.75),
          const Color(0xFF0A0A14), // Dark shading on bottom right
        ],
        stops: const [0.0, 0.6, 1.0],
      ).createShader(bodyRect)
      ..style = PaintingStyle.fill;

    canvas.drawRRect(bodyRRect, bodyPaint);

    // 5. Draw stripes
    final stripePaint = Paint()
      ..color = const Color(0x30000000)
      ..style = PaintingStyle.fill;

    canvas.drawRect(Rect.fromLTWH(width / 2 - 60, 88, 120, 10), stripePaint);
    canvas.drawRect(Rect.fromLTWH(width / 2 - 60, 152, 120, 10), stripePaint);

    // 6. Draw specular shine/reflection
    final highlightRect = Rect.fromLTWH(width / 2 - 50, 48, 16, 155);
    final highlightPaint = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.centerLeft,
        end: Alignment.centerRight,
        colors: [
          Color(0x38FFFFFF),
          Color(0x14FFFFFF),
          Color(0x00FFFFFF),
        ],
      ).createShader(highlightRect)
      ..style = PaintingStyle.fill;

    canvas.drawRRect(
      RRect.fromRectAndRadius(highlightRect, const Radius.circular(8)),
      highlightPaint,
    );

    // Specular dot
    final dotPaint = Paint()
      ..color = const Color(0x18FFFFFF)
      ..style = PaintingStyle.fill;
    canvas.drawOval(
      Rect.fromLTRB(width / 2 - 38, 62 - 12, width / 2 - 26, 62 + 12),
      dotPaint,
    );
  }

  @override
  bool shouldRepaint(covariant BagPainter oldDelegate) {
    return oldDelegate.color != color || oldDelegate.level != level;
  }
}
