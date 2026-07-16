import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/game_provider.dart';
import 'play_screen.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _ageController = TextEditingController();
  final _loginIdController = TextEditingController();
  bool _isRegistering = true;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _nameController.dispose();
    _ageController.dispose();
    _loginIdController.dispose();
    super.dispose();
  }

  void _submit() async {
    setState(() {
      _errorMessage = null;
      _isLoading = true;
    });

    final provider = Provider.of<GameProvider>(context, listen: false);

    if (_isRegistering) {
      if (_formKey.currentState?.validate() ?? false) {
        final name = _nameController.text.trim();
        final age = int.parse(_ageController.text.trim());

        await provider.registerPlayer(name, age);
        _navigateToPlay();
      }
    } else {
      final loginId = _loginIdController.text.trim();
      if (loginId.isEmpty) {
        setState(() {
          _errorMessage = "Please enter a valid Login ID.";
          _isLoading = false;
        });
        return;
      }

      final success = await provider.loginPlayer(loginId);
      if (success) {
        _navigateToPlay();
      } else {
        setState(() {
          _errorMessage = "No profile found for this ID. Please try again.";
          _isLoading = false;
        });
      }
    }

    setState(() {
      _isLoading = false;
    });
  }

  void _navigateToPlay() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const PlayScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.primaryColor;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Top Title "ALL IS WELL"
              const SizedBox(height: 20),
              Text(
                'ALL IS WELL',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: 'Outfit',
                  fontSize: 36,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 3.0,
                  color: primaryColor,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Take a breath. Then swing.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(
                  letterSpacing: 1.5,
                ),
              ),
              const SizedBox(height: 48),

              // Glassmorphic Style Card for Registration/Login Form
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Form tabs (New Player vs Resume ID)
                      Row(
                        children: [
                          Expanded(
                            child: GestureDetector(
                              onTap: () => setState(() => _isRegistering = true),
                              child: Column(
                                children: [
                                  Text(
                                    'New Player',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: _isRegistering ? primaryColor : theme.disabledColor,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Container(
                                    height: 2,
                                    color: _isRegistering ? primaryColor : Colors.transparent,
                                  )
                                ],
                              ),
                            ),
                          ),
                          Expanded(
                            child: GestureDetector(
                              onTap: () => setState(() => _isRegistering = false),
                              child: Column(
                                children: [
                                  Text(
                                    'Sign In',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: !_isRegistering ? primaryColor : theme.disabledColor,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Container(
                                    height: 2,
                                    color: !_isRegistering ? primaryColor : Colors.transparent,
                                  )
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 32),

                      // Actual Inputs
                      if (_isRegistering)
                        Form(
                          key: _formKey,
                          child: Column(
                            children: [
                              TextFormField(
                                controller: _nameController,
                                decoration: const InputDecoration(
                                  labelText: 'Name',
                                  border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(12))),
                                  prefixIcon: Icon(Icons.person_outline),
                                ),
                                validator: (value) {
                                  if (value == null || value.trim().isEmpty) {
                                    return 'Please enter your name';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 20),
                              TextFormField(
                                controller: _ageController,
                                decoration: const InputDecoration(
                                  labelText: 'Age',
                                  border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(12))),
                                  prefixIcon: Icon(Icons.calendar_today_outlined),
                                ),
                                keyboardType: TextInputType.number,
                                validator: (value) {
                                  if (value == null || value.trim().isEmpty) {
                                    return 'Please enter your age';
                                  }
                                  final age = int.tryParse(value);
                                  if (age == null || age < 4 || age > 120) {
                                    return 'Enter a valid age (4 - 120)';
                                  }
                                  return null;
                                },
                              ),
                            ],
                          ),
                        )
                      else
                        Column(
                          children: [
                            TextFormField(
                              controller: _loginIdController,
                              decoration: const InputDecoration(
                                labelText: 'Paste Login ID',
                                border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(12))),
                                prefixIcon: Icon(Icons.vpn_key_outlined),
                              ),
                            ),
                          ],
                        ),

                      if (_errorMessage != null) ...[
                        const SizedBox(height: 16),
                        Text(
                          _errorMessage!,
                          style: const TextStyle(color: Colors.redAccent, fontSize: 13),
                          textAlign: TextAlign.center,
                        ),
                      ],

                      const SizedBox(height: 32),

                      // Submit Button
                      ElevatedButton(
                        onPressed: _isLoading ? null : _submit,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: primaryColor,
                          foregroundColor: theme.colorScheme.onPrimary,
                          padding: const EdgeInsets.symmetric(vertical: 16.0),
                          shape: const RoundedRectangleBorder(
                            borderRadius: BorderRadius.all(Radius.circular(16)),
                          ),
                          elevation: 8,
                          shadowColor: primaryColor.withValues(alpha: 0.4),
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                ),
                              )
                            : Text(
                                _isRegistering ? 'Create Account' : 'Continue',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 1.0,
                                ),
                              ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
