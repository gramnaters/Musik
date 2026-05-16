import 'dart:ui';
import 'package:flutter/material.dart' hide RepeatMode;
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../providers/player_provider.dart';
import '../providers/library_provider.dart';
import '../models/track.dart';
import '../theme/app_theme.dart';
import '../widgets/album_art.dart';

class NowPlayingScreen extends StatefulWidget {
  const NowPlayingScreen({super.key});

  static void show(BuildContext context) {
    Navigator.of(context).push(
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) =>
            const NowPlayingScreen(),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          final curve =
              CurvedAnimation(parent: animation, curve: Curves.easeOutCubic);
          return SlideTransition(
            position:
                Tween<Offset>(begin: const Offset(0, 1), end: Offset.zero)
                    .animate(curve),
            child: child,
          );
        },
        transitionDuration: const Duration(milliseconds: 350),
        opaque: true,
        barrierColor: Colors.transparent,
      ),
    );
  }

  @override
  State<NowPlayingScreen> createState() => _NowPlayingScreenState();
}

class _NowPlayingScreenState extends State<NowPlayingScreen>
    with TickerProviderStateMixin {
  late AnimationController _artController;
  late Animation<double> _artScale;
  bool _isDraggingSeek = false;
  double _seekDragValue = 0;

  @override
  void initState() {
    super.initState();
    SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
    ));
    _artController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _artScale = Tween<double>(begin: 0.85, end: 1.0).animate(
      CurvedAnimation(parent: _artController, curve: Curves.easeOutBack),
    );

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final isPlaying = context.read<PlayerProvider>().isPlaying;
      if (isPlaying) _artController.forward();
    });
  }

  @override
  void dispose() {
    _artController.dispose();
    super.dispose();
  }

  void _handlePlayStateChange(bool isPlaying) {
    if (isPlaying) {
      _artController.forward();
    } else {
      _artController.reverse();
    }
  }

  @override
  Widget build(BuildContext context) {
    final player = context.watch<PlayerProvider>();
    final library = context.watch<LibraryProvider>();
    final track = player.currentTrack;

    // Keep art scale in sync with play state
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _handlePlayStateChange(player.isPlaying);
    });

    if (track == null) {
      return const Scaffold(backgroundColor: AppTheme.darkBg);
    }

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Blurred background art
          _BlurredBackground(imageUrl: track.albumCoverUrl),
          // Dark overlay
          Container(color: Colors.black.withOpacity(0.45)),
          // Content
          SafeArea(
            child: Column(
              children: [
                _buildTopBar(context),
                const SizedBox(height: 16),
                // Album art
                Expanded(
                  flex: 5,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 32),
                    child: ScaleTransition(
                      scale: _artScale,
                      child: AspectRatio(
                        aspectRatio: 1,
                        child: Hero(
                          tag: 'album_art_${track.id}',
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: track.albumCoverUrl != null
                                ? CachedNetworkImage(
                                    imageUrl: track.albumCoverUrl!,
                                    fit: BoxFit.cover,
                                    errorWidget: (_, __, ___) =>
                                        const _ArtPlaceholder(),
                                  )
                                : const _ArtPlaceholder(),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                // Track info + like
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 28),
                  child: _buildTrackInfo(context, track, library),
                ),
                const SizedBox(height: 16),
                // Seek bar
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: _buildSeekBar(context, player),
                ),
                const SizedBox(height: 12),
                // Playback controls
                _buildControls(context, player),
                const SizedBox(height: 12),
                // Volume slider
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: _buildVolumeRow(context, player),
                ),
                const SizedBox(height: 12),
                // Queue / extra row
                _buildBottomRow(context),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTopBar(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.keyboard_arrow_down_rounded,
                color: Colors.white, size: 32),
            onPressed: () => Navigator.of(context).pop(),
          ),
          const Expanded(
            child: Column(
              children: [
                Text(
                  'NOW PLAYING',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.5,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.more_vert_rounded,
                color: Colors.white, size: 24),
            onPressed: () {},
          ),
        ],
      ),
    );
  }

  Widget _buildTrackInfo(
      BuildContext context, Track track, LibraryProvider library) {
    final isFav = library.isFavourite(track.id);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
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
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.3,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  if (track.quality != null) ...[
                    const SizedBox(width: 8),
                    _QualityChip(quality: track.quality!),
                  ],
                ],
              ),
              const SizedBox(height: 4),
              Text(
                track.artist,
                style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              if (track.album.isNotEmpty)
                Text(
                  track.album,
                  style: const TextStyle(
                    color: Colors.white38,
                    fontSize: 13,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
            ],
          ),
        ),
        const SizedBox(width: 16),
        GestureDetector(
          onTap: () => library.toggleFavourite(track),
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 250),
            transitionBuilder: (child, anim) => ScaleTransition(
              scale: anim,
              child: child,
            ),
            child: Icon(
              isFav ? Icons.favorite_rounded : Icons.favorite_outline_rounded,
              key: ValueKey(isFav),
              color:
                  isFav ? const Color(0xFFEC4899) : Colors.white.withOpacity(0.6),
              size: 28,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSeekBar(BuildContext context, PlayerProvider player) {
    final positionFraction = _isDraggingSeek
        ? _seekDragValue
        : player.positionFraction;

    final String posStr = _formatDuration(_isDraggingSeek
        ? Duration(
            milliseconds:
                (player.duration.inMilliseconds * _seekDragValue).round())
        : player.position);
    final String durStr = _formatDuration(player.duration);

    return Column(
      children: [
        SliderTheme(
          data: SliderThemeData(
            thumbColor: Colors.white,
            activeTrackColor: Colors.white,
            inactiveTrackColor: Colors.white.withOpacity(0.25),
            trackHeight: 3,
            thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
            overlayShape: const RoundSliderOverlayShape(overlayRadius: 16),
            overlayColor: Colors.white.withOpacity(0.15),
          ),
          child: Slider(
            value: positionFraction.clamp(0.0, 1.0),
            onChangeStart: (v) {
              setState(() {
                _isDraggingSeek = true;
                _seekDragValue = v;
              });
            },
            onChanged: (v) {
              setState(() => _seekDragValue = v);
            },
            onChangeEnd: (v) {
              setState(() => _isDraggingSeek = false);
              player.seekTo(v);
            },
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(posStr,
                  style:
                      const TextStyle(color: Colors.white60, fontSize: 12)),
              Text(durStr,
                  style:
                      const TextStyle(color: Colors.white60, fontSize: 12)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildControls(BuildContext context, PlayerProvider player) {
    final isShuffling = player.shuffleMode == ShuffleMode.on;
    final repeatMode = player.repeatMode;

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        // Shuffle
        _ControlButton(
          icon: Icons.shuffle_rounded,
          size: 22,
          color: isShuffling ? AppTheme.primaryAccent : Colors.white60,
          onTap: () => player.toggleShuffle(),
          dot: isShuffling,
        ),
        // Previous
        _ControlButton(
          icon: Icons.skip_previous_rounded,
          size: 40,
          color: Colors.white,
          onTap: () => player.previousTrack(),
        ),
        // Play / Pause
        GestureDetector(
          onTap: () => player.togglePlayPause(),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: 68,
            height: 68,
            decoration: const BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
            ),
            child: player.isLoading
                ? const Padding(
                    padding: EdgeInsets.all(18),
                    child: CircularProgressIndicator(
                      strokeWidth: 3,
                      valueColor: AlwaysStoppedAnimation(Colors.black),
                    ),
                  )
                : Icon(
                    player.isPlaying
                        ? Icons.pause_rounded
                        : Icons.play_arrow_rounded,
                    color: Colors.black,
                    size: 36,
                  ),
          ),
        ),
        // Next
        _ControlButton(
          icon: Icons.skip_next_rounded,
          size: 40,
          color: Colors.white,
          onTap: () => player.nextTrack(),
        ),
        // Repeat
        _ControlButton(
          icon: repeatMode == RepeatMode.one
              ? Icons.repeat_one_rounded
              : Icons.repeat_rounded,
          size: 22,
          color:
              repeatMode != RepeatMode.off ? AppTheme.primaryAccent : Colors.white60,
          onTap: () => player.cycleRepeat(),
          dot: repeatMode != RepeatMode.off,
        ),
      ],
    );
  }

  Widget _buildVolumeRow(BuildContext context, PlayerProvider player) {
    return Row(
      children: [
        GestureDetector(
          onTap: () => player.toggleMute(),
          child: Icon(
            player.isMuted || player.volume == 0
                ? Icons.volume_off_rounded
                : player.volume < 0.5
                    ? Icons.volume_down_rounded
                    : Icons.volume_up_rounded,
            color: Colors.white60,
            size: 20,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: SliderTheme(
            data: SliderThemeData(
              thumbColor: Colors.white,
              activeTrackColor: Colors.white,
              inactiveTrackColor: Colors.white.withOpacity(0.2),
              trackHeight: 2,
              thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 5),
              overlayShape: const RoundSliderOverlayShape(overlayRadius: 12),
              overlayColor: Colors.white.withOpacity(0.1),
            ),
            child: Slider(
              value: player.isMuted ? 0 : player.volume,
              onChanged: (v) => player.setVolume(v),
            ),
          ),
        ),
        const SizedBox(width: 8),
        const Icon(Icons.volume_up_rounded, color: Colors.white60, size: 20),
      ],
    );
  }

  Widget _buildBottomRow(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _BottomAction(
            icon: Icons.devices_rounded,
            label: 'Devices',
            onTap: () {},
          ),
          _BottomAction(
            icon: Icons.download_rounded,
            label: 'Download',
            onTap: () {},
          ),
          _BottomAction(
            icon: Icons.queue_music_rounded,
            label: 'Queue',
            onTap: () {},
          ),
          _BottomAction(
            icon: Icons.share_rounded,
            label: 'Share',
            onTap: () {},
          ),
        ],
      ),
    );
  }

  String _formatDuration(Duration d) {
    final m = d.inMinutes;
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$m:$s';
  }
}

// ── Blurred Background ────────────────────────────────────────────────────────

class _BlurredBackground extends StatelessWidget {
  final String? imageUrl;
  const _BlurredBackground({this.imageUrl});

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        if (imageUrl != null)
          CachedNetworkImage(
            imageUrl: imageUrl!,
            fit: BoxFit.cover,
            errorWidget: (_, __, ___) =>
                Container(color: const Color(0xFF1A1A1A)),
          )
        else
          Container(color: const Color(0xFF1A1A1A)),
        BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 60, sigmaY: 60),
          child: Container(color: Colors.black.withOpacity(0.55)),
        ),
      ],
    );
  }
}

// ── Quality Chip ──────────────────────────────────────────────────────────────

class _QualityChip extends StatelessWidget {
  final String quality;
  const _QualityChip({required this.quality});

  @override
  Widget build(BuildContext context) {
    final isMax = quality == 'MAX' || quality == 'LOSSLESS';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: isMax
            ? AppTheme.primaryAccent.withOpacity(0.2)
            : Colors.white.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(
          color: isMax
              ? AppTheme.primaryAccent.withOpacity(0.5)
              : Colors.white.withOpacity(0.2),
          width: 0.5,
        ),
      ),
      child: Text(
        quality == 'LOSSLESS' ? 'FLAC' : quality,
        style: TextStyle(
          color: isMax ? AppTheme.primaryAccent : Colors.white70,
          fontSize: 9,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}

// ── Control Button ────────────────────────────────────────────────────────────

class _ControlButton extends StatelessWidget {
  final IconData icon;
  final double size;
  final Color color;
  final VoidCallback onTap;
  final bool dot;

  const _ControlButton({
    required this.icon,
    required this.size,
    required this.color,
    required this.onTap,
    this.dot = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: size),
            if (dot)
              Container(
                width: 4,
                height: 4,
                margin: const EdgeInsets.only(top: 3),
                decoration: BoxDecoration(
                  color: color,
                  shape: BoxShape.circle,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ── Bottom Action ─────────────────────────────────────────────────────────────

class _BottomAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _BottomAction({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: Colors.white60, size: 20),
          const SizedBox(height: 3),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white54,
              fontSize: 10,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Art Placeholder ───────────────────────────────────────────────────────────

class _ArtPlaceholder extends StatelessWidget {
  const _ArtPlaceholder();

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF3B3B3B), Color(0xFF1A1A1A)],
        ),
      ),
      child: const Center(
        child: Icon(Icons.music_note_rounded,
            color: Colors.white24, size: 80),
      ),
    );
  }
}
