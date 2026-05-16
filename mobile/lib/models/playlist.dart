import 'track.dart';

class Playlist {
  final String id;
  final String name;
  final String? description;
  final String? coverUrl;
  final List<Track> tracks;
  final DateTime createdAt;
  final bool isUserCreated;

  const Playlist({
    required this.id,
    required this.name,
    this.description,
    this.coverUrl,
    this.tracks = const [],
    required this.createdAt,
    this.isUserCreated = true,
  });

  Playlist copyWith({
    String? name,
    String? description,
    String? coverUrl,
    List<Track>? tracks,
  }) {
    return Playlist(
      id: id,
      name: name ?? this.name,
      description: description ?? this.description,
      coverUrl: coverUrl ?? this.coverUrl,
      tracks: tracks ?? this.tracks,
      createdAt: createdAt,
      isUserCreated: isUserCreated,
    );
  }

  int get trackCount => tracks.length;

  Duration get totalDuration => tracks.fold(
        Duration.zero,
        (total, t) => total + Duration(milliseconds: t.durationMs),
      );
}
