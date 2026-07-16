import 'dart:async';
import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';
import '../../features/game/data/models/player_profile.dart';

class DatabaseService {
  static final DatabaseService instance = DatabaseService._init();
  static Database? _database;

  DatabaseService._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('punch_me.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getApplicationDocumentsDirectory();
    final path = join(dbPath.path, filePath);

    return await openDatabase(
      path,
      version: 1,
      onCreate: _createDB,
    );
  }

  Future _createDB(Database db, int version) async {
    await db.execute('''
      CREATE TABLE players (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        level INTEGER NOT NULL,
        score INTEGER NOT NULL,
        highScore INTEGER NOT NULL,
        totalPunches INTEGER NOT NULL,
        lastPlayedDate TEXT NOT NULL,
        coins INTEGER NOT NULL,
        achievements TEXT NOT NULL
      )
    ''');
  }

  Future<void> saveProfile(PlayerProfile profile) async {
    final db = await instance.database;
    await db.insert(
      'players',
      profile.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<PlayerProfile?> getProfile(String id) async {
    final db = await instance.database;
    final maps = await db.query(
      'players',
      columns: null,
      where: 'id = ?',
      whereArgs: [id],
    );

    if (maps.isNotEmpty) {
      return PlayerProfile.fromMap(maps.first);
    } else {
      return null;
    }
  }

  Future<List<PlayerProfile>> getAllProfiles() async {
    final db = await instance.database;
    final result = await db.query('players', orderBy: 'highScore DESC');
    return result.map((json) => PlayerProfile.fromMap(json)).toList();
  }

  Future<void> deleteProfile(String id) async {
    final db = await instance.database;
    await db.delete(
      'players',
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<void> clearAll() async {
    final db = await instance.database;
    await db.delete('players');
  }
}
