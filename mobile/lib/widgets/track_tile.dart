import 'package:flutter/material.dart';
import '../models/track.dart';
import '../theme/app_theme.dart';
import 'album_art.dart';

class TrackTile extends StatelessWidget {
  final Track track;
  final bool isPlaying;
  final bool isFavourite;
  final VoidCallback onTap;
  final VoidCallback onFavouriteTap;
  final VoidCallback? onLongPress;
  final bool showMenu;

  const TrackTile({
    super.key,
    required this.track,
    required this.isPlaying,
    required this.isFavourite,
    required this.onTap,
    required this.onFavouriteTap,
    this.onLongPress,
    this.showMenu = true,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      onLongPress: onLongPress,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        color: isPlaying
            ? AppTheme.primaryAccent.withOpacity(0.06)
            : Colors.transparent,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(
          children: [
            // Album art with playing indicator
            SizedBox(
              width: 50,
              height: 50,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: AlbumArt(
                  url: track.albumCoverUrl,
                  size: 50,
                  isPlaying: isPlaying,
                ),
              ),
            ),
            const SizedBox(width: 12),
            // Track info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          track.title,
                          style: TextStyle(
                            color: isPlaying
                                ? AppTheme.primaryAccent
                                : Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (track.isExplicit) ...[
                        const SizedBox(width: 5),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 3, vertical: 1),
                          decoration: BoxDecoration(
                            color: AppTheme.textTertiary.withOpacity(0.3),
                            borderRadius: BorderRadius.circular(2),
                          ),
                          child: const Text(
                            'E',
                            style: TextStyle(
                              color: AppTheme.textTertiary,
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ],
                      if (track.quality != null) ...[
                        const SizedBox(width: 5),
                        _QualityBadge(quality: track.quality!),
                      ],
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    '${track.artist} · ${track.album}',
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
            const SizedBox(width: 4),
            // Duration
            Text(
              track.formattedDuration,
              style: const TextStyle(
                color: AppTheme.textTertiary,
                fontSize: 12,
              ),
            ),
            const SizedBox(width: 4),
            // Favourite button
            GestureDetector(
              onTap: onFavouriteTap,
              behavior: HitTestBehavior.opaque,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 200),
                  child: Icon(
                    isFavourite
                        ? Icons.favorite_rounded
                        : Icons.favorite_outline_rounded,
                    key: ValueKey(isFavourite),
                    color: isFavourite
                        ? const Color(0xFFEC4899)
                        : AppTheme.textTertiary,
                    size: 18,
                  ),
                ),
              ),
            ),
            if (showMenu)
              GestureDetector(
                onTap: () => _showTrackMenu(context),
                behavior: HitTestBehavior.opaque,
                child: const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                  child: Icon(
                    Icons.more_vert_rounded,
                    color: AppTheme.textTertiary,
                    size: 18,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  void _showTrackMenu(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.darkCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Drag handle
            Container(
              width: 36,
              height: 4,
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: AppTheme.textTertiary.withOpacity(0.4),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            // Track info header
            ListTile(
              leading: ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: SizedBox(
                  width: 48,
                  height: 48,
                  child: AlbumArt(url: track.albumCoverUrl, size: 48),
                ),
              ),
              title: Text(track.title,
                  style: const TextStyle(
                      color: Colors.white, fontWeight: FontWeight.w700)),
              subtitle: Text(track.artist,
                  style: const TextStyle(color: AppTheme.textSecondary)),
            ),
            const Divider(color: AppTheme.darkDivider, height: 1),
            _MenuOption(
              icon: isFavourite
                  ? Icons.favorite_rounded
                  : Icons.favorite_outline_rounded,
              label: isFavourite ? 'Remove from Favourites' : 'Add to Favourites',
              color: const Color(0xFFEC4899),
              onTap: () {
                Navigator.pop(ctx);
                onFavouriteTap();
              },
            ),
            _MenuOption(
              icon: Icons.playlist_add_rounded,
              label: 'Add to Playlist',
              onTap: () => Navigator.pop(ctx),
            ),
            _MenuOption(
              icon: Icons.queue_rounded,
              label: 'Add to Queue',
              onTap: () => Navigator.pop(ctx),
            ),
            _MenuOption(
              icon: Icons.download_rounded,
              label: 'Download',
              onTap: () => Navigator.pop(ctx),
            ),
            _MenuOption(
              icon: Icons.share_rounded,
              label: 'Share',
              onTap: () => Navigator.pop(ctx),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}

class _QualityBadge extends StatelessWidget {
  final String quality;
  const _QualityBadge({required this.quality});

  @override
  Widget build(BuildContext context) {
    Color bgColor;
    Color textColor;
    String label;

    switch (quality.toUpperCase()) {
      case 'MAX':
      case 'LOSSLESS':
        bgColor = const Color(0xFF1DB954).withOpacity(0.2);
        textColor = const Color(0xFF1DB954);
        label = quality == 'MAX' ? 'MAX' : 'FLAC';
      case 'HIGH':
        bgColor = Colors.white.withOpacity(0.1);
        textColor = Colors.white.withOpacity(0.8);
        label = 'HI';
      case 'ATMOS':
        bgColor = const Color(0xFF3B82F6).withOpacity(0.2);
        textColor = const Color(0xFF60A5FA);
        label = 'ATMOS';
      default:
        bgColor = Colors.white.withOpacity(0.07);
        textColor = Colors.white.withOpacity(0.5);
        label = quality;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(3),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: textColor,
          fontSize: 8,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.3,
        ),
      ),
    );
  }
}

class _MenuOption extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;

  const _MenuOption({
    required this.icon,
    required this.label,
    required this.onTap,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: color ?? Colors.white, size: 22),
      title: Text(
        label,
        style: TextStyle(
          color: color ?? Colors.white,
          fontSize: 15,
        ),
      ),
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 2),
    );
  }
}
