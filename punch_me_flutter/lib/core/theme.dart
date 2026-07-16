import 'package:flutter/material.dart';

class AppTheme {
  // Dark Theme Colors
  static const Color darkBg = Color(0xFF0F1015);
  static const Color darkCard = Color(0xFF181A22);
  static const Color darkPrimary = Color(0xFFE5C384); // Champagne gold
  static const Color darkAccent = Color(0xFFDB9F5A); // Peach/bronze gold
  static const Color darkText = Color(0xFFF0F2F5);
  static const Color darkMuted = Color(0xFF888B97);
  static const Color darkBorder = Color(0xFF262A35);

  // Light Theme Colors
  static const Color lightBg = Color(0xFFFDFBF7); // Soft ivory
  static const Color lightCard = Color(0xFFF0EFEA);
  static const Color lightPrimary = Color(0xFFC7923E); // Sunlit gold
  static const Color lightAccent = Color(0xFFD57F54); // Peach/bronze
  static const Color lightText = Color(0xFF1E2129);
  static const Color lightMuted = Color(0xFF757885);
  static const Color lightBorder = Color(0xFFE0DFD8);

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: darkBg,
      primaryColor: darkPrimary,
      colorScheme: const ColorScheme.dark(
        primary: darkPrimary,
        secondary: darkAccent,
        surface: darkCard,
        error: Colors.redAccent,
      ),
      textTheme: const TextTheme(
        headlineLarge: TextStyle(
          fontFamily: 'Outfit',
          fontSize: 32,
          fontWeight: FontWeight.bold,
          letterSpacing: 1.5,
          color: darkPrimary,
        ),
        titleLarge: TextStyle(
          fontFamily: 'Outfit',
          fontSize: 20,
          fontWeight: FontWeight.bold,
          letterSpacing: 1.0,
          color: darkText,
        ),
        bodyLarge: TextStyle(
          fontFamily: 'PlusJakartaSans',
          fontSize: 16,
          color: darkText,
        ),
        bodyMedium: TextStyle(
          fontFamily: 'PlusJakartaSans',
          fontSize: 14,
          color: darkMuted,
        ),
      ),
      cardTheme: const CardTheme(
        color: darkCard,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(20)),
          side: BorderSide(color: darkBorder, width: 1.0),
        ),
      ),
    );
  }

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: lightBg,
      primaryColor: lightPrimary,
      colorScheme: const ColorScheme.light(
        primary: lightPrimary,
        secondary: lightAccent,
        surface: lightCard,
        error: Colors.red,
      ),
      textTheme: const TextTheme(
        headlineLarge: TextStyle(
          fontFamily: 'Outfit',
          fontSize: 32,
          fontWeight: FontWeight.bold,
          letterSpacing: 1.5,
          color: lightPrimary,
        ),
        titleLarge: TextStyle(
          fontFamily: 'Outfit',
          fontSize: 20,
          fontWeight: FontWeight.bold,
          letterSpacing: 1.0,
          color: lightText,
        ),
        bodyLarge: TextStyle(
          fontFamily: 'PlusJakartaSans',
          fontSize: 16,
          color: lightText,
        ),
        bodyMedium: TextStyle(
          fontFamily: 'PlusJakartaSans',
          fontSize: 14,
          color: lightMuted,
        ),
      ),
      cardTheme: const CardTheme(
        color: lightCard,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(20)),
          side: BorderSide(color: lightBorder, width: 1.0),
        ),
      ),
    );
  }
}
