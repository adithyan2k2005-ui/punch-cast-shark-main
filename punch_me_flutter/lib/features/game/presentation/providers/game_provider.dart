import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import '../../../../core/services/database_service.dart';
import '../../../../core/services/audio_service.dart';
import '../../data/models/player_profile.dart';

class GameProvider extends ChangeNotifier {
  PlayerProfile? _currentProfile;
  double _bagScale = 1.0;
  int _comboCount = 0;
  double _scoreMultiplier = 1.0;
  DateTime? _lastPunchTime;
  Timer? _shrinkTimer;
  Timer? _comboDecayTimer;

  // Settings
  bool _isDarkMode = true;
  bool _isSoundEnabled = true;
  bool _isMusicEnabled = true;
  bool _isVibrationEnabled = true;

  // Celebration state
  bool _newHighScoreReached = false;
  bool _levelUpReached = false;

  PlayerProfile? get currentProfile => _currentProfile;
  double get bagScale => _bagScale;
  int get comboCount => _comboCount;
  double get scoreMultiplier => _scoreMultiplier;
  bool get isDarkMode => _isDarkMode;
  bool get isSoundEnabled => _isSoundEnabled;
  bool get isMusicEnabled => _isMusicEnabled;
  bool get isVibrationEnabled => _isVibrationEnabled;
  bool get newHighScoreReached => _newHighScoreReached;
  bool get levelUpReached => _levelUpReached;

  GameProvider() {
    _loadSettingsAndProfile();
  }

  Future<void> _loadSettingsAndProfile() async {
    final prefs = await SharedPreferences.getInstance();
    _isDarkMode = prefs.getBool('pm_dark_mode') ?? true;
    _isSoundEnabled = prefs.getBool('sound_enabled') ?? true;
    _isMusicEnabled = prefs.getBool('music_enabled') ?? true;
    _isVibrationEnabled = prefs.getBool('vibration_enabled') ?? true;

    final savedId = prefs.getString('pm_last_login_id');
    if (savedId != null) {
      final profile = await DatabaseService.instance.getProfile(savedId);
      if (profile != null) {
        _currentProfile = profile.copyWith(
          lastPlayedDate: DateTime.now().toIso8601String(),
        );
        await DatabaseService.instance.saveProfile(_currentProfile!);
      }
    }
    notifyListeners();
  }

  void toggleTheme(bool value) async {
    _isDarkMode = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('pm_dark_mode', value);
    notifyListeners();
  }

  void toggleVibration(bool value) async {
    _isVibrationEnabled = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('vibration_enabled', value);
    notifyListeners();
  }

  void toggleSound(bool value) {
    _isSoundEnabled = value;
    AudioService.instance.toggleSound(value);
    notifyListeners();
  }

  void toggleMusic(bool value) {
    _isMusicEnabled = value;
    AudioService.instance.toggleMusic(value);
    notifyListeners();
  }

  Future<void> registerPlayer(String name, int age) async {
    final uniqueId = const Uuid().v4();
    final profile = PlayerProfile(
      id: uniqueId,
      name: name,
      age: age,
      lastPlayedDate: DateTime.now().toIso8601String(),
    );

    await DatabaseService.instance.saveProfile(profile);
    _currentProfile = profile;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('pm_last_login_id', uniqueId);
    notifyListeners();
  }

  Future<bool> loginPlayer(String id) async {
    final profile = await DatabaseService.instance.getProfile(id.trim());
    if (profile != null) {
      _currentProfile = profile.copyWith(
        lastPlayedDate: DateTime.now().toIso8601String(),
      );
      await DatabaseService.instance.saveProfile(_currentProfile!);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('pm_last_login_id', _currentProfile!.id);
      notifyListeners();
      return true;
    }
    return false;
  }

  Future<void> logout() async {
    _currentProfile = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('pm_last_login_id');
    notifyListeners();
  }

  void punch() {
    if (_currentProfile == null) return;

    final now = DateTime.now();
    
    // 1. Calculate Combo and Multiplier
    if (_lastPunchTime != null) {
      final difference = now.difference(_lastPunchTime!).inMilliseconds;
      if (difference < 800) {
        _comboCount++;
        // Multiplier goes up every 5 combo punches, capped at 5.0x
        _scoreMultiplier = 1.0 + (_comboCount ~/ 5) * 0.5;
        if (_scoreMultiplier > 5.0) _scoreMultiplier = 5.0;
      } else {
        _comboCount = 0;
        _scoreMultiplier = 1.0;
      }
    } else {
      _comboCount = 0;
      _scoreMultiplier = 1.0;
    }
    _lastPunchTime = now;

    // 2. Play Sound and Vibration
    AudioService.instance.playPunch();
    if (_isVibrationEnabled) {
      HapticFeedback.lightImpact();
    }

    // 3. Score additions & high score checking
    final int scoreEarned = (1 * _scoreMultiplier).toInt();
    final int newScore = _currentProfile!.score + scoreEarned;
    final int totalPunches = _currentProfile!.totalPunches + 1;

    bool isNewHighScore = false;
    if (newScore > _currentProfile!.highScore) {
      isNewHighScore = true;
      if (!_newHighScoreReached && _currentProfile!.highScore > 0) {
        // High score announcement triggers celebration sound & confetti
        _newHighScoreReached = true;
        AudioService.instance.playHighScore();
        if (_isVibrationEnabled) {
          HapticFeedback.heavyImpact();
        }
        // Auto reset toast after 3s
        Timer(const Duration(seconds: 3), () {
          _newHighScoreReached = false;
          notifyListeners();
        });
      }
    }

    // 4. Level calculations
    // Formula: Level = (Score / 50).floor() + 1
    final int newLevel = (newScore ~/ 50) + 1;
    bool isLevelUp = newLevel > _currentProfile!.level;

    if (isLevelUp) {
      _levelUpReached = true;
      AudioService.instance.playLevelUp();
      if (_isVibrationEnabled) {
        HapticFeedback.mediumImpact();
      }
      Timer(const Duration(seconds: 3), () {
        _levelUpReached = false;
        notifyListeners();
      });
    }

    // Update Profile Map & SQLite
    _currentProfile = _currentProfile!.copyWith(
      score: newScore,
      totalPunches: totalPunches,
      level: newLevel,
      highScore: isNewHighScore ? newScore : _currentProfile!.highScore,
      lastPlayedDate: now.toIso8601String(),
    );

    // SQLite auto-save on every punch (runs in background)
    DatabaseService.instance.saveProfile(_currentProfile!);

    // 5. Bag Growth animation scaling
    _bagScale += 0.02;
    if (_bagScale > 2.0) _bagScale = 2.0;

    // Restart Shrinking & Combo Decay timers
    _resetTimers();
    notifyListeners();
  }

  void _resetTimers() {
    _shrinkTimer?.cancel();
    _comboDecayTimer?.cancel();

    // Shrink timer: Start after 800ms of inactivity. Shrink scale by 0.01 every 100ms.
    _shrinkTimer = Timer(const Duration(milliseconds: 800), () {
      _shrinkTimer = Timer.periodic(const Duration(milliseconds: 100), (timer) {
        if (_bagScale > 1.0) {
          _bagScale -= 0.01;
          if (_bagScale < 1.0) _bagScale = 1.0;
          notifyListeners();
        } else {
          timer.cancel();
        }
      });
    });

    // Combo decay timer: Start after 1500ms of inactivity. Resets combo to 0.
    _comboDecayTimer = Timer(const Duration(milliseconds: 1500), () {
      _comboCount = 0;
      _scoreMultiplier = 1.0;
      notifyListeners();
    });
  }

  Future<void> resetProgress() async {
    if (_currentProfile == null) return;
    final id = _currentProfile!.id;
    final name = _currentProfile!.name;
    final age = _currentProfile!.age;

    // Reset details to 0/1
    _currentProfile = PlayerProfile(
      id: id,
      name: name,
      age: age,
      lastPlayedDate: DateTime.now().toIso8601String(),
    );
    await DatabaseService.instance.saveProfile(_currentProfile!);
    _bagScale = 1.0;
    _comboCount = 0;
    _scoreMultiplier = 1.0;
    _resetTimers();
    notifyListeners();
  }

  Future<List<PlayerProfile>> getLeaderboard() async {
    return await DatabaseService.instance.getAllProfiles();
  }

  @override
  void dispose() {
    _shrinkTimer?.cancel();
    _comboDecayTimer?.cancel();
    super.dispose();
  }
}
