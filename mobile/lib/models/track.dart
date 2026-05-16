import 'package:hive/hive.dart';

part 'track.g.dart';

@HiveType(typeId: 0)
class Track extends HiveObject {
  @HiveField(0)
  final String id;

  @HiveField(1)
  final String title;

  @HiveField(2)
  final String artist;

  @HiveField(3)
  final String album;

  @HiveField(4)
  final String? albumCoverUrl;

  @HiveField(5)
  final String? streamUrl;

  @HiveField(6)
  final int durationMs;

  @HiveField(7)
  final bool isExplicit;

  @HiveField(8)
  final String? quality; // 'MAX', 'HIGH', 'NORMAL', 'LOSSLESS', 'ATMOS'

  @HiveField(9)
  final bool isFavourite;

  @HiveField(10)
  final String? localPath;

  @HiveField(11)
  final DateTime addedAt;

  Track({
    required this.id,
    required this.title,
    required this.artist,
    required this.album,
    this.albumCoverUrl,
    this.streamUrl,
    this.durationMs = 0,
    this.isExplicit = false,
    this.quality,
    this.isFavourite = false,
    this.localPath,
    required this.addedAt,
  });

  Track copyWith({
    String? title,
    String? artist,
    String? album,
    String? albumCoverUrl,
    String? streamUrl,
    int? durationMs,
    bool? isExplicit,
    String? quality,
    bool? isFavourite,
    String? localPath,
  }) {
    return Track(
      id: id,
      title: title ?? this.title,
      artist: artist ?? this.artist,
      album: album ?? this.album,
      albumCoverUrl: albumCoverUrl ?? this.albumCoverUrl,
      streamUrl: streamUrl ?? this.streamUrl,
      durationMs: durationMs ?? this.durationMs,
      isExplicit: isExplicit ?? this.isExplicit,
      quality: quality ?? this.quality,
      isFavourite: isFavourite ?? this.isFavourite,
      localPath: localPath ?? this.localPath,
      addedAt: addedAt,
    );
  }

  String get formattedDuration {
    final d = Duration(milliseconds: durationMs);
    final m = d.inMinutes;
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'artist': artist,
        'album': album,
        'albumCoverUrl': albumCoverUrl,
        'streamUrl': streamUrl,
        'durationMs': durationMs,
        'isExplicit': isExplicit,
        'quality': quality,
        'isFavourite': isFavourite,
        'localPath': localPath,
        'addedAt': addedAt.toIso8601String(),
      };

  factory Track.fromJson(Map<String, dynamic> json) => Track(
        id: json['id'] as String,
        title: json['title'] as String,
        artist: json['artist'] as String,
        album: json['album'] as String? ?? '',
        albumCoverUrl: json['albumCoverUrl'] as String?,
        streamUrl: json['streamUrl'] as String?,
        durationMs: json['durationMs'] as int? ?? 0,
        isExplicit: json['isExplicit'] as bool? ?? false,
        quality: json['quality'] as String?,
        isFavourite: json['isFavourite'] as bool? ?? false,
        localPath: json['localPath'] as String?,
        addedAt: json['addedAt'] != null
            ? DateTime.parse(json['addedAt'] as String)
            : DateTime.now(),
      );

  @override
  bool operator ==(Object other) => other is Track && id == other.id;

  @override
  int get hashCode => id.hashCode;
}
