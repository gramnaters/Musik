import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/player_provider.dart';
import '../providers/library_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/track_tile.dart';
import '../models/track.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final TextEditingController _controller = TextEditingController();
  String _query = '';

  static final _allTracks = [
    Track(id: '1', title: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours',
        albumCoverUrl: 'https://i.scdn.co/image/ab67616d0000b273ef011fe3a3de38bd5b6c3ddb',
        durationMs: 200040, quality: 'HIGH', addedAt: DateTime.now()),
    Track(id: '2', title: 'Levitating', artist: 'Dua Lipa', album: 'Future Nostalgia',
        albumCoverUrl: 'https://i.scdn.co/image/ab67616d0000b27313cf27af14c87b9afb56fc8b',
        durationMs: 203064, quality: 'MAX', addedAt: DateTime.now()),
    Track(id: '3', title: 'Stay', artist: 'The Kid LAROI, Justin Bieber', album: 'F*CK LOVE 3',
        albumCoverUrl: 'https://i.scdn.co/image/ab67616d0000b273eb73ff840c73c1acf0e3b3d5',
        durationMs: 141000, quality: 'HIGH', addedAt: DateTime.now()),
    Track(id: '4', title: 'As It Was', artist: 'Harry Styles', album: "Harry's House",
        albumCoverUrl: 'https://i.scdn.co/image/ab67616d0000b2732e8ed79e177ff6011076f5f0',
        durationMs: 167303, quality: 'LOSSLESS', addedAt: DateTime.now()),
    Track(id: '5', title: 'Heat Waves', artist: 'Glass Animals', album: 'Dreamland',
        albumCoverUrl: 'https://i.scdn.co/image/ab67616d0000b273712701c5e263efc8726b1464',
        durationMs: 238805, quality: 'MAX', addedAt: DateTime.now()),
    Track(id: '6', title: 'Unholy', artist: 'Sam Smith', album: 'Gloria',
        albumCoverUrl: 'https://i.scdn.co/image/ab67616d0000b273b0f48fd8e9b5cac124b5e88f',
        durationMs: 156914, quality: 'HIGH', addedAt: DateTime.now()),
  ];

  List<Track> get _filteredTracks {
    if (_query.isEmpty) return [];
    final q = _query.toLowerCase();
    return _allTracks
        .where((t) =>
            t.title.toLowerCase().contains(q) ||
            t.artist.toLowerCase().contains(q) ||
            t.album.toLowerCase().contains(q))
        .toList();
  }

  static const _genres = [
    ('Pop', Color(0xFF8B5CF6)),
    ('Hip-Hop', Color(0xFFEC4899)),
    ('Electronic', Color(0xFF06B6D4)),
    ('Rock', Color(0xFFF59E0B)),
    ('R&B', Color(0xFF10B981)),
    ('Jazz', Color(0xFFEF4444)),
    ('Classical', Color(0xFF3B82F6)),
    ('Metal', Color(0xFF6B7280)),
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final player = context.watch<PlayerProvider>();
    final library = context.watch<LibraryProvider>();

    return Scaffold(
      backgroundColor: AppTheme.darkBg,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            backgroundColor: AppTheme.darkBg,
            title: const Text('Search', style: TextStyle(fontWeight: FontWeight.w800)),
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(60),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: TextField(
                  controller: _controller,
                  autofocus: false,
                  style: const TextStyle(color: Colors.white, fontSize: 15),
                  decoration: InputDecoration(
                    hintText: 'Songs, artists, albums…',
                    filled: true,
                    fillColor: AppTheme.darkElevated,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: BorderSide.none,
                    ),
                    prefixIcon: const Icon(Icons.search_rounded, color: AppTheme.textTertiary),
                    suffixIcon: _query.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear_rounded, color: AppTheme.textTertiary),
                            onPressed: () {
                              _controller.clear();
                              setState(() => _query = '');
                            },
                          )
                        : null,
                    contentPadding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  onChanged: (v) => setState(() => _query = v),
                ),
              ),
            ),
          ),
          if (_query.isEmpty) ...[
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: Text(
                  'Browse Categories',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              sliver: SliverGrid.builder(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: 2.3,
                  crossAxisSpacing: 8,
                  mainAxisSpacing: 8,
                ),
                itemCount: _genres.length,
                itemBuilder: (context, index) {
                  final (name, color) = _genres[index];
                  return _GenreCard(name: name, color: color);
                },
              ),
            ),
          ] else if (_filteredTracks.isEmpty) ...[
            SliverFillRemaining(
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.search_off_rounded, size: 64, color: AppTheme.textTertiary),
                    const SizedBox(height: 16),
                    Text('No results for "$_query"',
                        style: const TextStyle(color: AppTheme.textSecondary, fontSize: 16)),
                  ],
                ),
              ),
            ),
          ] else ...[
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                child: Text('${_filteredTracks.length} results',
                    style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
              ),
            ),
            SliverList.builder(
              itemCount: _filteredTracks.length,
              itemBuilder: (context, index) {
                final track = _filteredTracks[index];
                return TrackTile(
                  track: track,
                  isPlaying:
                      player.currentTrack?.id == track.id && player.isPlaying,
                  isFavourite: library.isFavourite(track.id),
                  onTap: () {
                    player.playTrack(track, queue: _filteredTracks);
                    library.addToRecentlyPlayed(track);
                  },
                  onFavouriteTap: () => library.toggleFavourite(track),
                );
              },
            ),
          ],
          const SliverToBoxAdapter(child: SizedBox(height: 16)),
        ],
      ),
    );
  }
}

class _GenreCard extends StatelessWidget {
  final String name;
  final Color color;

  const _GenreCard({required this.name, required this.color});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {},
      child: Container(
        decoration: BoxDecoration(
          color: color.withOpacity(0.8),
          borderRadius: BorderRadius.circular(8),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          children: [
            Expanded(
              child: Text(
                name,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.2,
                ),
              ),
            ),
            Icon(Icons.music_note_rounded, color: Colors.white.withOpacity(0.6), size: 28),
          ],
        ),
      ),
    );
  }
}
