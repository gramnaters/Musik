import 'package:flutter/foundation.dart';
import '../models/track.dart';
import '../models/playlist.dart';
import 'package:uuid/uuid.dart';

class LibraryProvider extends ChangeNotifier {
  final _uuid = const Uuid();
  List<Track> _favourites = [];
  List<Playlist> _playlists = [];
  List<Track> _recentlyPlayed = [];

  List<Track> get favourites => _favourites;
  List<Playlist> get playlists => _playlists;
  List<Track> get recentlyPlayed => _recentlyPlayed;

  bool isFavourite(String trackId) =>
      _favourites.any((t) => t.id == trackId);

  void toggleFavourite(Track track) {
    final idx = _favourites.indexWhere((t) => t.id == track.id);
    if (idx >= 0) {
      _favourites.removeAt(idx);
    } else {
      _favourites.insert(0, track.copyWith(isFavourite: true));
    }
    notifyListeners();
  }

  void addToRecentlyPlayed(Track track) {
    _recentlyPlayed.removeWhere((t) => t.id == track.id);
    _recentlyPlayed.insert(0, track);
    if (_recentlyPlayed.length > 50) {
      _recentlyPlayed.removeLast();
    }
    notifyListeners();
  }

  Playlist createPlaylist(String name) {
    final playlist = Playlist(
      id: _uuid.v4(),
      name: name,
      createdAt: DateTime.now(),
    );
    _playlists.add(playlist);
    notifyListeners();
    return playlist;
  }

  void addTrackToPlaylist(String playlistId, Track track) {
    final idx = _playlists.indexWhere((p) => p.id == playlistId);
    if (idx >= 0) {
      final p = _playlists[idx];
      if (!p.tracks.any((t) => t.id == track.id)) {
        _playlists[idx] = p.copyWith(tracks: [...p.tracks, track]);
        notifyListeners();
      }
    }
  }

  void removeTrackFromPlaylist(String playlistId, String trackId) {
    final idx = _playlists.indexWhere((p) => p.id == playlistId);
    if (idx >= 0) {
      final p = _playlists[idx];
      _playlists[idx] = p.copyWith(
        tracks: p.tracks.where((t) => t.id != trackId).toList(),
      );
      notifyListeners();
    }
  }

  void deletePlaylist(String playlistId) {
    _playlists.removeWhere((p) => p.id == playlistId);
    notifyListeners();
  }
}
