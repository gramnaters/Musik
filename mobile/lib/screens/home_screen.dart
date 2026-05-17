import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/player_provider.dart';
import '../providers/library_provider.dart';
import '../models/track.dart';
import '../theme/app_theme.dart';
import '../widgets/track_tile.dart';
import '../widgets/album_art.dart';
import 'now_playing_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  // Demo tracks representing the BeatBoss demo data
  static List<Track> get _demoTracks => [
        Track(
          id: '1',
          title: 'Blinding Lights',
          artist: 'The Weeknd',
          album: 'After Hours',
          albumCoverUrl:
              'https://i.scdn.co/image/ab67616d0000b273ef011fe3a3de38bd5b6c3ddb',
          durationMs: 200040,
          quality: 'HIGH',
          addedAt: DateTime.now(),
        ),
        Track(
          id: '2',
          title: 'Levitating',
          artist: 'Dua Lipa',
          album: 'Future Nostalgia',
          albumCoverUrl:
              'https://i.scdn.co/image/ab67616d0000b27313cf27af14c87b9afb56fc8b',
          durationMs: 203064,
          quality: 'MAX',
          addedAt: DateTime.now(),
        ),
        Track(
          id: '3',
          title: 'Stay',
          artist: 'The Kid LAROI, Justin Bieber',
          album: 'F*CK LOVE 3',
          albumCoverUrl:
              'https://i.scdn.co/image/ab67616d0000b273eb73ff840c73c1acf0e3b3d5',
          durationMs: 141000,
          quality: 'HIGH',
          addedAt: DateTime.now(),
        ),
        Track(
          id: '4',
          title: 'As It Was',
          artist: 'Harry Styles',
          album: "Harry's House",
          albumCoverUrl:
              'https://i.scdn.co/image/ab67616d0000b2732e8ed79e177ff6011076f5f0',
          durationMs: 167303,
          quality: 'LOSSLESS',
          addedAt: DateTime.now(),
        ),
        Track(
          id: '5',
          title: 'Heat Waves',
          artist: 'Glass Animals',
          album: 'Dreamland',
          albumCoverUrl:
              'https://i.scdn.co/image/ab67616d0000b273712701c5e263efc8726b1464',
          durationMs: 238805,
          quality: 'MAX',
          addedAt: DateTime.now(),
        ),
        Track(
          id: '6',
          title: 'Unholy',
          artist: 'Sam Smith, Kim Petras',
          album: 'Gloria',
          albumCoverUrl:
              'https://i.scdn.co/image/ab67616d0000b273b0f48fd8e9b5cac124b5e88f',
          durationMs: 156914,
          quality: 'HIGH',
          addedAt: DateTime.now(),
        ),
      ];

  @override
  Widget build(BuildContext context) {
    final library = context.watch<LibraryProvider>();
    final player = context.watch<PlayerProvider>();
    final tracks = _demoTracks;

    return Scaffold(
      backgroundColor: AppTheme.darkBg,
      body: CustomScrollView(
        slivers: [
          _buildSliverAppBar(context),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: _buildGreeting(),
            ),
          ),
          // Quick Access Grid
          if (library.recentlyPlayed.isNotEmpty || library.favourites.isNotEmpty)
            SliverToBoxAdapter(
              child: _buildQuickAccessGrid(context, library, player),
            ),
          // Featured Row
          SliverToBoxAdapter(
            child: _buildSectionHeader('Trending Now'),
          ),
          SliverToBoxAdapter(
            child: _buildHorizontalTrackList(context, tracks, player),
          ),
          // All Tracks
          SliverToBoxAdapter(
            child: _buildSectionHeader('Top Picks'),
          ),
          SliverList.builder(
            itemCount: tracks.length,
            itemBuilder: (context, index) {
              final track = tracks[index];
              return TrackTile(
                track: track,
                isPlaying: player.currentTrack?.id == track.id && player.isPlaying,
                isFavourite: library.isFavourite(track.id),
                onTap: () {
                  context.read<PlayerProvider>().playTrack(track, queue: tracks);
                  library.addToRecentlyPlayed(track);
                },
                onFavouriteTap: () => library.toggleFavourite(track),
              );
            },
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 16)),
        ],
      ),
    );
  }

  Widget _buildSliverAppBar(BuildContext context) {
    return SliverAppBar(
      floating: true,
      backgroundColor: AppTheme.darkBg,
      expandedHeight: 0,
      toolbarHeight: 56,
      title: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppTheme.primaryAccent,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.music_note_rounded, color: Colors.black, size: 20),
          ),
          const SizedBox(width: 10),
          const Text(
            'Musik',
            style: TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.5,
            ),
          ),
        ],
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.notifications_outlined, color: Colors.white),
          onPressed: () {},
        ),
        Padding(
          padding: const EdgeInsets.only(right: 12),
          child: GestureDetector(
            onTap: () {},
            child: const CircleAvatar(
              radius: 16,
              backgroundColor: AppTheme.darkElevated,
              child: Icon(Icons.person_rounded, size: 18, color: AppTheme.textSecondary),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildGreeting() {
    final hour = DateTime.now().hour;
    String greeting;
    if (hour < 12) {
      greeting = 'Good morning';
    } else if (hour < 18) {
      greeting = 'Good afternoon';
    } else {
      greeting = 'Good evening';
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Text(
        greeting,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 24,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.3,
        ),
      ),
    );
  }

  Widget _buildQuickAccessGrid(
      BuildContext context, LibraryProvider library, PlayerProvider player) {
    final items = [
      ...library.favourites.take(3),
      ...library.recentlyPlayed.take(3),
    ].take(6).toList();

    if (items.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
      child: GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 4.5,
          crossAxisSpacing: 8,
          mainAxisSpacing: 8,
        ),
        itemCount: items.length,
        itemBuilder: (context, index) {
          final track = items[index];
          return _QuickAccessCard(
            track: track,
            isPlaying: player.currentTrack?.id == track.id && player.isPlaying,
            onTap: () {
              player.playTrack(track);
              library.addToRecentlyPlayed(track);
            },
          );
        },
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 12),
      child: Text(
        title,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 20,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.3,
        ),
      ),
    );
  }

  Widget _buildHorizontalTrackList(
      BuildContext context, List<Track> tracks, PlayerProvider player) {
    return SizedBox(
      height: 200,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        itemCount: tracks.length,
        itemBuilder: (context, index) {
          final track = tracks[index];
          return GestureDetector(
            onTap: () {
              player.playTrack(track, queue: tracks);
              context.read<LibraryProvider>().addToRecentlyPlayed(track);
            },
            child: Container(
              width: 148,
              margin: const EdgeInsets.symmetric(horizontal: 4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Album art
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: AspectRatio(
                      aspectRatio: 1,
                      child: AlbumArt(
                        url: track.albumCoverUrl,
                        size: 148,
                        isPlaying:
                            player.currentTrack?.id == track.id && player.isPlaying,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    track.title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    track.artist,
                    style: const TextStyle(
                      color: AppTheme.textSecondary,
                      fontSize: 11,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _QuickAccessCard extends StatelessWidget {
  final Track track;
  final bool isPlaying;
  final VoidCallback onTap;

  const _QuickAccessCard({
    required this.track,
    required this.isPlaying,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        decoration: BoxDecoration(
          color: isPlaying
              ? AppTheme.primaryAccent.withOpacity(0.15)
              : AppTheme.darkCard,
          borderRadius: BorderRadius.circular(6),
          border: isPlaying
              ? Border.all(color: AppTheme.primaryAccent.withOpacity(0.3), width: 1)
              : null,
        ),
        child: Row(
          children: [
            // Thumbnail
            ClipRRect(
              borderRadius:
                  const BorderRadius.horizontal(left: Radius.circular(6)),
              child: SizedBox(
                width: 48,
                height: 48,
                child: AlbumArt(url: track.albumCoverUrl, size: 48),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                track.title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (isPlaying)
              const Padding(
                padding: EdgeInsets.only(right: 8),
                child: Icon(Icons.equalizer_rounded,
                    color: AppTheme.primaryAccent, size: 16),
              ),
          ],
        ),
      ),
    );
  }
}
