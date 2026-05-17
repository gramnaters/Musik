import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.darkBg,
      appBar: AppBar(
        title: const Text('Settings'),
        backgroundColor: AppTheme.darkBg,
      ),
      body: ListView(
        children: [
          const _SectionHeader('Playback'),
          _SettingsTile(
            icon: Icons.high_quality_rounded,
            iconColor: const Color(0xFF1DB954),
            title: 'Audio Quality',
            subtitle: 'Maximum — Lossless FLAC',
            onTap: () {},
          ),
          _SettingsTile(
            icon: Icons.equalizer_rounded,
            iconColor: const Color(0xFF06B6D4),
            title: 'Equalizer',
            subtitle: 'Custom preset',
            onTap: () {},
          ),
          _SettingsTile(
            icon: Icons.skip_next_rounded,
            iconColor: const Color(0xFFEC4899),
            title: 'Crossfade',
            subtitle: 'Off',
            onTap: () {},
          ),
          const _SectionHeader('Library'),
          _SettingsTile(
            icon: Icons.folder_open_rounded,
            iconColor: const Color(0xFFF59E0B),
            title: 'Music Folder',
            subtitle: 'Not configured',
            onTap: () {},
          ),
          _SettingsTile(
            icon: Icons.download_rounded,
            iconColor: const Color(0xFF8B5CF6),
            title: 'Downloads',
            subtitle: 'Storage: 0 MB',
            onTap: () {},
          ),
          const _SectionHeader('Connections'),
          _SettingsTile(
            icon: Icons.extension_rounded,
            iconColor: const Color(0xFF06B6D4),
            title: 'Addons & Extensions',
            subtitle: 'EclipseMusic & compatible addons',
            onTap: () {},
          ),
          _SettingsTile(
            icon: Icons.last_page_rounded,
            iconColor: const Color(0xFFEF4444),
            title: 'Last.fm Scrobbling',
            subtitle: 'Not connected',
            onTap: () {},
          ),
          const _SectionHeader('Appearance'),
          _SettingsTile(
            icon: Icons.palette_rounded,
            iconColor: const Color(0xFFF59E0B),
            title: 'Player Theme',
            subtitle: 'Tidal Glass',
            onTap: () {},
          ),
          const _SectionHeader('About'),
          _SettingsTile(
            icon: Icons.info_outline_rounded,
            iconColor: AppTheme.textTertiary,
            title: 'Version',
            subtitle: '1.0.0',
            onTap: () {},
            showArrow: false,
          ),
          _SettingsTile(
            icon: Icons.code_rounded,
            iconColor: AppTheme.textTertiary,
            title: 'Open Source',
            subtitle: 'github.com/gramnaters/Musik',
            onTap: () {},
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader(this.title);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
      child: Text(
        title.toUpperCase(),
        style: const TextStyle(
          color: AppTheme.textTertiary,
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.2,
        ),
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final bool showArrow;

  const _SettingsTile({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.showArrow = true,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: iconColor.withOpacity(0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: iconColor, size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.w500)),
                  Text(subtitle,
                      style: const TextStyle(
                          color: AppTheme.textSecondary, fontSize: 12)),
                ],
              ),
            ),
            if (showArrow)
              const Icon(Icons.chevron_right_rounded,
                  color: AppTheme.textTertiary, size: 20),
          ],
        ),
      ),
    );
  }
}
