import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../providers/game_provider.dart';
import 'welcome_screen.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  void _copyToClipboard(BuildContext context, String text) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Login ID copied to clipboard!'),
        duration: Duration(seconds: 2),
      ),
    );
  }

  void _showResetDialog(BuildContext context, GameProvider provider) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Reset Progress?'),
        content: const Text(
          'This will reset your score, level, high score, and stats to zero. Your profile name and Login ID will remain unchanged. Are you sure?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              provider.resetProgress();
              Navigator.of(ctx).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Progress has been reset!')),
              );
            },
            child: const Text(
              'Reset',
              style: TextStyle(color: Colors.redAccent),
            ),
          ),
        ],
      ),
    );
  }

  void _showLogoutDialog(BuildContext context, GameProvider provider) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign Out?'),
        content: const Text(
          'Make sure you copy your Login ID first, or you will not be able to log back into this profile on this or other devices.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.of(ctx).pop(); // pop dialog
              Navigator.of(context).pop(); // pop settings screen
              await provider.logout();
              if (context.mounted) {
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(builder: (_) => const WelcomeScreen()),
                );
              }
            },
            child: const Text(
              'Sign Out',
              style: TextStyle(color: Colors.redAccent),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.primaryColor;

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Settings',
          style: TextStyle(fontFamily: 'Outfit', fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
      ),
      body: Consumer<GameProvider>(
        builder: (context, provider, child) {
          final profile = provider.currentProfile;
          if (profile == null) return const SizedBox();

          return ListView(
            padding: const EdgeInsets.all(16.0),
            children: [
              // User Card with login ID
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'PLAYER PROFILE',
                        style: TextStyle(
                          fontSize: 10,
                          letterSpacing: 1.5,
                          fontWeight: FontWeight.bold,
                          color: primaryColor,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        profile.name,
                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        'Age: ${profile.age}',
                        style: theme.textTheme.bodyMedium,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'LOGIN ID (Use this to resume on other devices)',
                        style: TextStyle(
                          fontSize: 9,
                          letterSpacing: 1.0,
                          color: theme.colorScheme.secondary,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: theme.brightness == Brightness.dark 
                              ? Colors.black26 
                              : Colors.black12,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          profile.id,
                          style: const TextStyle(
                            fontFamily: 'Courier',
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      OutlinedButton.icon(
                        onPressed: () => _copyToClipboard(context, profile.id),
                        icon: const Icon(Icons.copy_outlined, size: 16),
                        label: const Text('Copy Login ID'),
                        style: OutlinedButton.styleFrom(
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Settings Items List
              _buildSectionHeader(context, 'PREFERENCES'),
              Card(
                child: Column(
                  children: [
                    SwitchListTile(
                      title: const Text('Dark Mode'),
                      subtitle: const Text('Toggle between dark and light themes'),
                      value: provider.isDarkMode,
                      activeColor: primaryColor,
                      onChanged: provider.toggleTheme,
                    ),
                    const Divider(height: 1),
                    SwitchListTile(
                      title: const Text('Vibration'),
                      subtitle: const Text('Haptic feedback on punches'),
                      value: provider.isVibrationEnabled,
                      activeColor: primaryColor,
                      onChanged: provider.toggleVibration,
                    ),
                    const Divider(height: 1),
                    SwitchListTile(
                      title: const Text('Sound Effects (SFX)'),
                      subtitle: const Text('Satisfying punch and combo hits'),
                      value: provider.isSoundEnabled,
                      activeColor: primaryColor,
                      onChanged: provider.toggleSound,
                    ),
                    const Divider(height: 1),
                    SwitchListTile(
                      title: const Text('Background Music'),
                      subtitle: const Text('Relaxing gaming tunes'),
                      value: provider.isMusicEnabled,
                      activeColor: primaryColor,
                      onChanged: provider.toggleMusic,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              _buildSectionHeader(context, 'DANGER ZONE'),
              Card(
                child: Column(
                  children: [
                    ListTile(
                      title: const Text('Reset Progress', style: TextStyle(color: Colors.redAccent)),
                      subtitle: const Text('Resets score, level, and stats to zero'),
                      leading: const Icon(Icons.refresh_outlined, color: Colors.redAccent),
                      onTap: () => _showResetDialog(context, provider),
                    ),
                    const Divider(height: 1),
                    ListTile(
                      title: const Text('Sign Out', style: TextStyle(color: Colors.redAccent)),
                      subtitle: const Text('Switch profiles or sign in with another ID'),
                      leading: const Icon(Icons.logout_outlined, color: Colors.redAccent),
                      onTap: () => _showLogoutDialog(context, provider),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              _buildSectionHeader(context, 'ABOUT'),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        'PUNCH ME',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Version 1.0.0\n\nA Flutter-based stress-relief simulator designed to improve mood and focus through quick interactive haptic punch sessions.',
                        style: theme.textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 40),
            ],
          );
        },
      ),
    );
  }

  Widget _buildSectionHeader(BuildContext context, String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 8.0, bottom: 8.0),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 11,
          letterSpacing: 1.0,
          fontWeight: FontWeight.bold,
          color: Theme.of(context).disabledColor,
        ),
      ),
    );
  }
}
