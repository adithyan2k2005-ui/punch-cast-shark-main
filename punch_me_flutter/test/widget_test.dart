import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:punch_me_flutter/main.dart';
import 'package:punch_me_flutter/features/game/presentation/providers/game_provider.dart';

void main() {
  testWidgets('Splash screen rendering smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(
      ChangeNotifierProvider(
        create: (_) => GameProvider(),
        child: const MyApp(),
      ),
    );

    // Verify that Splash screen elements are rendered.
    expect(find.text('PUNCH ME'), findsOneWidget);
    expect(find.text('Stress relief · Mood lift'), findsOneWidget);
  });
}
