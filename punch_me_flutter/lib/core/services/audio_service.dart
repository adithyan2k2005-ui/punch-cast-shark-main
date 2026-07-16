import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AudioService {
  static final AudioService instance = AudioService._init();
  final AudioPlayer _sfxPlayer = AudioPlayer();
  final AudioPlayer _musicPlayer = AudioPlayer();

  bool _isMusicEnabled = true;
  bool _isSoundEnabled = true;

  AudioService._init() {
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    _isMusicEnabled = prefs.getBool('music_enabled') ?? true;
    _isSoundEnabled = prefs.getBool('sound_enabled') ?? true;
  }

  bool get isMusicEnabled => _isMusicEnabled;
  bool get isSoundEnabled => _isSoundEnabled;

  void toggleMusic(bool enabled) {
    _isMusicEnabled = enabled;
    SharedPreferences.getInstance().then((prefs) {
      prefs.setBool('music_enabled', enabled);
    });
    if (!enabled) {
      _musicPlayer.stop();
    }
  }

  void toggleSound(bool enabled) {
    _isSoundEnabled = enabled;
    SharedPreferences.getInstance().then((prefs) {
      prefs.setBool('sound_enabled', enabled);
    });
    if (!enabled) {
      _sfxPlayer.stop();
    }
  }

  // Plays a sound from assets. Gracefully catches exceptions if the file is missing/unloaded.
  Future<void> playSound(String fileName) async {
    if (!_isSoundEnabled) return;
    try {
      // Use AssetSource so that audioplayers loads it from pubspec assets/
      await _sfxPlayer.play(AssetSource('sounds/$fileName'));
    } catch (e) {
      // Fallback: If assets are not compiled or missing, trigger native system feedback (click)
      // so the user still gets audio feedback, and print a warning.
      try {
        SystemSound.play(SystemSoundType.click);
      } catch (_) {}
      debugPrint("SFX error loading assets/sounds/$fileName: $e. Falling back to system click.");
    }
  }

  Future<void> playPunch() async {
    await playSound('punch.mp3');
  }

  Future<void> playLevelUp() async {
    await playSound('level_up.mp3');
  }

  Future<void> playHighScore() async {
    await playSound('high_score.mp3');
  }

  void dispose() {
    _sfxPlayer.dispose();
    _musicPlayer.dispose();
  }
}
