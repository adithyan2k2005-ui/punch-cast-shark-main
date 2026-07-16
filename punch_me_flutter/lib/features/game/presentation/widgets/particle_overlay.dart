import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

class ParticleOverlay extends StatefulWidget {
  final Widget child;

  const ParticleOverlay({
    super.key,
    required this.child,
  });

  static _ParticleOverlayState? of(BuildContext context) {
    return context.findAncestorStateOfType<_ParticleOverlayState>();
  }

  @override
  State<ParticleOverlay> createState() => _ParticleOverlayState();
}

class _ParticleOverlayState extends State<ParticleOverlay> with SingleTickerProviderStateMixin {
  final List<_Particle> _particles = [];
  final List<_Floater> _floaters = [];
  late Ticker _ticker;
  final Random _random = Random();

  @override
  void initState() {
    super.initState();
    _ticker = createTicker((elapsed) {
      if (!mounted) return;
      _updateParticles();
    });
    _ticker.start();
  }

  @override
  void dispose() {
    _ticker.dispose();
    super.dispose();
  }

  void _updateParticles() {
    final now = DateTime.now();
    bool changed = false;

    // Update floaters
    if (_floaters.isNotEmpty) {
      _floaters.removeWhere((f) {
        final age = now.difference(f.createdAt).inMilliseconds;
        if (age > 800) {
          return true;
        }
        // float up
        f.yOffset = -50.0 * (age / 800.0);
        f.opacity = 1.0 - (age / 800.0);
        return false;
      });
      changed = true;
    }

    // Update particles
    if (_particles.isNotEmpty) {
      _particles.removeWhere((p) {
        final age = now.difference(p.createdAt).inMilliseconds;
        if (age > 600) {
          return true;
        }
        final progress = age / 600.0;
        p.currentPosition = Offset(
          p.startPosition.dx + p.velocity.dx * progress,
          p.startPosition.dy + p.velocity.dy * progress + 20.0 * progress * progress, // gravity arc
        );
        p.opacity = 1.0 - progress;
        p.scale = p.startScale * (1.0 - progress);
        return false;
      });
      changed = true;
    }

    if (changed) {
      setState(() {});
    }
  }

  // Show "CAST SHARK" visual hit impact
  void showImpact(Offset position, String text, Color themeColor, {bool isCrit = false}) {
    final now = DateTime.now();

    // 1. Add floating text
    setState(() {
      _floaters.add(_Floater(
        text: text,
        position: position,
        createdAt: now,
        color: isCrit ? const Color(0xFFFFD700) : themeColor,
        isCrit: isCrit,
      ));

      // 2. Add particles bursting outwards (CAST SHARK effect)
      final numParticles = isCrit ? 16 : 8;
      for (int i = 0; i < numParticles; i++) {
        final angle = _random.nextDouble() * 2 * pi;
        final speed = 30.0 + _random.nextDouble() * 50.0;
        final velocity = Offset(cos(angle) * speed, sin(angle) * speed);
        
        _particles.add(_Particle(
          startPosition: position,
          currentPosition: position,
          velocity: velocity,
          color: isCrit 
            ? (_random.nextBool() ? const Color(0xFFFFD700) : Colors.orange)
            : (_random.nextBool() ? themeColor : Colors.white70),
          createdAt: now,
          startScale: 4.0 + _random.nextDouble() * 6.0,
        ));
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        // Particle overlay painter
        IgnorePointer(
          child: CustomPaint(
            size: Size.infinite,
            painter: ParticlePainter(
              particles: _particles,
              floaters: _floaters,
            ),
          ),
        ),
      ],
    );
  }
}

class _Particle {
  final Offset startPosition;
  Offset currentPosition;
  final Offset velocity;
  final Color color;
  final DateTime createdAt;
  final double startScale;
  double scale = 1.0;
  double opacity = 1.0;

  _Particle({
    required this.startPosition,
    required this.currentPosition,
    required this.velocity,
    required this.color,
    required this.createdAt,
    required this.startScale,
  });
}

class _Floater {
  final String text;
  final Offset position;
  final DateTime createdAt;
  final Color color;
  final bool isCrit;
  double yOffset = 0.0;
  double opacity = 1.0;

  _Floater({
    required this.text,
    required this.position,
    required this.createdAt,
    required this.color,
    required this.isCrit,
  });
}

class ParticlePainter extends CustomPainter {
  final List<_Particle> particles;
  final List<_Floater> floaters;

  ParticlePainter({
    required this.particles,
    required this.floaters,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // 1. Draw particles
    for (final p in particles) {
      final paint = Paint()
        ..color = p.color.withValues(alpha: p.opacity.clamp(0.0, 1.0))
        ..style = PaintingStyle.fill;
      canvas.drawCircle(p.currentPosition, p.scale, paint);
    }

    // 2. Draw floater texts
    for (final f in floaters) {
      final textPainter = TextPainter(
        text: TextSpan(
          text: f.text,
          style: TextStyle(
            fontSize: f.isCrit ? 22 : 16,
            fontWeight: FontWeight.bold,
            color: f.color.withValues(alpha: f.opacity.clamp(0.0, 1.0)),
            shadows: [
              Shadow(
                color: Colors.black.withValues(alpha: 0.5 * f.opacity),
                offset: const Offset(1, 1),
                blurRadius: 4,
              )
            ],
          ),
        ),
        textDirection: TextDirection.ltr,
      );
      textPainter.layout();
      textPainter.paint(
        canvas,
        Offset(
          f.position.dx - textPainter.width / 2,
          f.position.dy - textPainter.height / 2 + f.yOffset,
        ),
      );
    }
  }

  @override
  bool shouldRepaint(covariant ParticlePainter oldDelegate) {
    return true;
  }
}
