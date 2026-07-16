class PlayerProfile {
  final String id;
  final String name;
  final int age;
  final int level;
  final int score;
  final int highScore;
  final int totalPunches;
  final String lastPlayedDate;
  final int coins;
  final String achievements; // Comma-separated list or JSON string

  PlayerProfile({
    required this.id,
    required this.name,
    required this.age,
    this.level = 1,
    this.score = 0,
    this.highScore = 0,
    this.totalPunches = 0,
    required this.lastPlayedDate,
    this.coins = 0,
    this.achievements = '',
  });

  // Convert to Map for SQLite
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'age': age,
      'level': level,
      'score': score,
      'highScore': highScore,
      'totalPunches': totalPunches,
      'lastPlayedDate': lastPlayedDate,
      'coins': coins,
      'achievements': achievements,
    };
  }

  // Convert from SQLite Map
  factory PlayerProfile.fromMap(Map<String, dynamic> map) {
    return PlayerProfile(
      id: map['id'] as String,
      name: map['name'] as String,
      age: map['age'] as int,
      level: map['level'] as int,
      score: map['score'] as int,
      highScore: map['highScore'] as int,
      totalPunches: map['totalPunches'] as int,
      lastPlayedDate: map['lastPlayedDate'] as String,
      coins: map['coins'] as int,
      achievements: map['achievements'] as String? ?? '',
    );
  }

  // CopyWith helper
  PlayerProfile copyWith({
    String? id,
    String? name,
    int? age,
    int? level,
    int? score,
    int? highScore,
    int? totalPunches,
    String? lastPlayedDate,
    int? coins,
    String? achievements,
  }) {
    return PlayerProfile(
      id: id ?? this.id,
      name: name ?? this.name,
      age: age ?? this.age,
      level: level ?? this.level,
      score: score ?? this.score,
      highScore: highScore ?? this.highScore,
      totalPunches: totalPunches ?? this.totalPunches,
      lastPlayedDate: lastPlayedDate ?? this.lastPlayedDate,
      coins: coins ?? this.coins,
      achievements: achievements ?? this.achievements,
    );
  }
}
