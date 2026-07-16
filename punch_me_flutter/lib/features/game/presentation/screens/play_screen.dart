import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:confetti/confetti.dart';
import '../providers/game_provider.dart';
import '../widgets/punching_bag.dart';
import '../widgets/particle_overlay.dart';
import 'settings_screen.dart';

class PlayScreen extends StatefulWidget {
  const PlayScreen({super.key});

  @override
  State<PlayScreen> createState() => _PlayScreenState();
}

class _PlayScreenState extends State<PlayScreen> {
  late ConfettiController _confettiController;

  @override
  void initState() {
    super.initState();
    _confettiController = ConfettiController(duration: const Duration(seconds: 2));
  }

  @override
  void dispose() {
    _confettiController.dispose();
    super.dispose();
  }

  void _triggerHitEffect(BuildContext context, TapUpDetails details, GameProvider provider) {
    // 1. Trigger punch logical handler
    provider.punch();

    // 2. Play particle overlays around tap point (CAST SHARK effect)
    final renderBox = context.findRenderObject() as RenderBox?;
    if (renderBox != null) {
      final localPos = renderBox.globalToLocal(details.globalPosition);
      final overlay = ParticleOverlay.of(context);
      
      // Calculate floater text: "+1" or multiplier score
      final pointsAdded = (1 * provider.scoreMultiplier).toInt();
      final signText = "+$pointsAdded";
      final isCrit = provider.scoreMultiplier > 1.0;
      final themeColor = Theme.of(context).primaryColor;

      overlay?.showImpact(localPos, signText, themeColor, isCrit: isCrit);

      // Play high score celebration confetti
      if (provider.newHighScoreReached) {
        _confettiController.play();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.primaryColor;

    return Consumer<GameProvider>(
      builder: (context, provider, child) {
        final profile = provider.currentProfile;
        if (profile == null) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }

        return ParticleOverlay(
          child: Stack(
            alignment: Alignment.center,
            children: [
              Scaffold(
                appBar: AppBar(
                  backgroundColor: Colors.transparent,
                  elevation: 0,
                  title: Text(
                    'PUNCH ME',
                    style: TextStyle(
                      fontFamily: 'Outfit',
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.2,
                      color: primaryColor,
                    ),
                  ),
                  centerTitle: true,
                  actions: [
                    IconButton(
                      icon: const Icon(Icons.settings_outlined),
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const SettingsScreen()),
                        );
                      },
                    ),
                  ],
                ),
                body: SafeArea(
                  child: Column(
                    children: [
                      // Scoreboard Widget
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                        child: Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Column(
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                                  children: [
                                    _buildStatColumn('LEVEL', '${profile.level}', primaryColor, fontSize: 24),
                                    _buildStatColumn('SCORE', '${profile.score}', theme.colorScheme.secondary, fontSize: 24),
                                    _buildStatColumn('BEST', '${profile.highScore}', theme.textTheme.bodyLarge?.color ?? Colors.white, fontSize: 24),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                // Progress bar to next level
                                // Level = floor(score/50) + 1. Next level progress = (score % 50) / 50.
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: LinearProgressIndicator(
                                    value: (profile.score % 50) / 50.0,
                                    minHeight: 8,
                                    backgroundColor: theme.brightness == Brightness.dark 
                                        ? Colors.black26 
                                        : Colors.black12,
                                    valueColor: AlwaysStoppedAnimation<Color>(primaryColor),
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      '${50 - (profile.score % 50)} to next level',
                                      style: theme.textTheme.bodyMedium?.copyWith(fontSize: 11),
                                    ),
                                    Text(
                                      'Punches: ${profile.totalPunches}',
                                      style: theme.textTheme.bodyMedium?.copyWith(fontSize: 11),
                                    ),
                                  ],
                                )
                              ],
                            ),
                          ),
                        ),
                      ),

                      // Combos indicator & New High Score Banner
                      SizedBox(
                        height: 60,
                        child: Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              if (provider.newHighScoreReached)
                                const Text(
                                  '⭐ NEW HIGH SCORE ⭐',
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.amber,
                                    letterSpacing: 2.0,
                                  ),
                                )
                              else if (provider.levelUpReached)
                                Text(
                                  '🏆 LEVEL UP! LEVEL ${profile.level} 🏆',
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                    color: primaryColor,
                                    letterSpacing: 2.0,
                                  ),
                                )
                              else if (provider.comboCount > 1)
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: Colors.amber.withValues(alpha: 0.2),
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(color: Colors.amber.withValues(alpha: 0.5)),
                                      ),
                                      child: Text(
                                        'COMBO x${provider.comboCount}',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          color: Colors.amber,
                                          fontSize: 13,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      '(${provider.scoreMultiplier}x Multiplier)',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: theme.colorScheme.secondary,
                                      ),
                                    )
                                  ],
                                ),
                            ],
                          ),
                        ),
                      ),

                      // Punching bag centered section
                      Expanded(
                        child: Center(
                          child: LayoutBuilder(
                            builder: (context, constraints) {
                              return Stack(
                                alignment: Alignment.center,
                                children: [
                                  // Background glow ring
                                  Container(
                                    width: 250,
                                    height: 250,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      gradient: RadialGradient(
                                        colors: [
                                           primaryColor.withValues(alpha: 0.12 * provider.bagScale),
                                           Colors.transparent,
                                        ],
                                      ),
                                    ),
                                  ),
                                  // Main bag tap detector & visual
                                  PunchingBag(
                                    scale: provider.bagScale,
                                    level: profile.level,
                                    onPunch: (details) => _triggerHitEffect(context, details, provider),
                                  ),
                                ],
                              );
                            },
                          ),
                        ),
                      ),

                      // Action tips
                      Padding(
                        padding: const EdgeInsets.all(24.0),
                        child: Text(
                          'TAP BAG TO PUNCH\nPUNCH FAST TO MULTIPLY COMBOS',
                          textAlign: TextAlign.center,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            letterSpacing: 2.0,
                            height: 1.5,
                            fontSize: 11,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Confetti Overlay for High Score Celebrations
              Align(
                alignment: Alignment.topCenter,
                child: ConfettiWidget(
                  confettiController: _confettiController,
                  blastDirectionality: BlastDirectionality.explosive,
                  shouldLoop: false,
                  colors: const [
                    Colors.amber,
                    Colors.orange,
                    Colors.red,
                    Colors.green,
                    Colors.blue,
                  ],
                ),
              )
            ],
          ),
        );
      },
    );
  }

  Widget _buildStatColumn(String label, String value, Color color, {double fontSize = 20}) {
    return Column(
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 10,
            letterSpacing: 1.5,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontFamily: 'Outfit',
            fontSize: fontSize,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }
}
