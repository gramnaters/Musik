import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/player_provider.dart';
import '../providers/library_provider.dart';
import '../theme/app_theme.dart';
import '../screens/now_playing_screen.dart';
import 'album_art.dart';

class MiniPlayer extends StatelessWidget {
  const MiniPlayer({super.key});

  @override
  Widget build(BuildContext context) {
    final player = context.watch<PlayerProvider>();
    final library = context.watch<LibraryProvider>();
    final track = player.currentTrack;
    if (track == null) return const SizedBox.shrink();

    final isFav = library.isFavourite(track.id);

    return GestureDetector(
      onTap: () => NowPlayingScreen.show(context),
      child: Container(
        margin: const EdgeInsets.fromLTRB(8, 4, 8, 4),
        decoration: BoxDecoration(
          color: const Color(0xFF1E1E1E),
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.5),
              blurRadius: 20,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Progress bar (thin line at top)
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
              child: LinearProgressIndicator(
                value: player.positionFraction,
                backgroundColor: Colors.white.withOpacity(0.08),
                valueColor: const AlwaysStoppedAnimation(AppTheme.primaryAccent),
                minHeight: 2,
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Row(
                children: [
                  // Album art
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: SizedBox(
                      width: 44,
                      height: 44,
                      child: AlbumArt(
                        url: track.albumCoverUrl,
                        size: 44,
                        isPlaying: player.isPlaying,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  // Track info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          track.title,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 1),
                        Text(
                          track.artist,
                          style: const TextStyle(
                            color: AppTheme.textSecondary,
                            fontSize: 12,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  // Controls
                  _MiniControl(
                    icon: isFav ? Icons.favorite_rounded : Icons.favorite_outline_rounded,
                    color: isFav ? const Color(0xFFEC4899) : AppTheme.textSecondary,
                    onTap: () => library.toggleFavourite(track),
                  ),
                  const SizedBox(width: 4),
                  _PlayPauseButton(
                    isPlaying: player.isPlaying,
                    isLoading: player.isLoading,
                    onTap: () => player.togglePlayPause(),
                  ),
                  const SizedBox(width: 4),
                  _MiniControl(
                    icon: Icons.skip_next_rounded,
                    color: AppTheme.textSecondary,
                    onTap: () => player.nextTrack(),
                    size: 28,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MiniControl extends StatelessWidget {
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  final double size;

  const _MiniControl({
    required this.icon,
    required this.color,
    required this.onTap,
    this.size = 22,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.all(6),
        child: Icon(icon, color: color, size: size),
      ),
    );
  }
}

class _PlayPauseButton extends StatelessWidget {
  final bool isPlaying;
  final bool isLoading;
  final VoidCallback onTap;

  const _PlayPauseButton({
    required this.isPlaying,
    required this.isLoading,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 38,
        height: 38,
        decoration: const BoxDecoration(
          color: Colors.white,
          shape: BoxShape.circle,
        ),
        child: isLoading
            ? const Padding(
                padding: EdgeInsets.all(10),
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  valueColor: AlwaysStoppedAnimation(Colors.black),
                ),
              )
            : Icon(
                isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                color: Colors.black,
                size: 22,
              ),
      ),
    );
  }
}
