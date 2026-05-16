import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:just_audio/just_audio.dart';
import '../models/track.dart';

enum RepeatMode { off, all, one }

enum ShuffleMode { off, on }

class PlayerProvider extends ChangeNotifier {
  final AudioPlayer _player = AudioPlayer();

  Track? _currentTrack;
  List<Track> _queue = [];
  List<Track> _shuffledQueue = [];
  int _currentIndex = -1;
  bool _isPlaying = false;
  bool _isLoading = false;
  RepeatMode _repeatMode = RepeatMode.off;
  ShuffleMode _shuffleMode = ShuffleMode.off;
  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;
  double _volume = 1.0;
  bool _isMuted = false;
  String? _error;

  StreamSubscription? _playerStateSub;
  StreamSubscription? _positionSub;
  StreamSubscription? _durationSub;

  PlayerProvider() {
    _initListeners();
  }

  // Getters
  Track? get currentTrack => _currentTrack;
  List<Track> get queue => _queue;
  int get currentIndex => _currentIndex;
  bool get isPlaying => _isPlaying;
  bool get isLoading => _isLoading;
  RepeatMode get repeatMode => _repeatMode;
  ShuffleMode get shuffleMode => _shuffleMode;
  Duration get position => _position;
  Duration get duration => _duration;
  double get volume => _volume;
  bool get isMuted => _isMuted;
  String? get error => _error;
  bool get hasTrack => _currentTrack != null;

  double get positionFraction {
    if (_duration.inMilliseconds == 0) return 0;
    return (_position.inMilliseconds / _duration.inMilliseconds).clamp(0.0, 1.0);
  }

  void _initListeners() {
    _playerStateSub = _player.playerStateStream.listen((state) {
      final wasPlaying = _isPlaying;
      _isPlaying = state.playing;
      _isLoading = state.processingState == ProcessingState.loading ||
          state.processingState == ProcessingState.buffering;

      if (state.processingState == ProcessingState.completed) {
        _onTrackComplete();
      }

      if (wasPlaying != _isPlaying || _isLoading) {
        notifyListeners();
      }
    });

    _positionSub = _player.positionStream.listen((pos) {
      _position = pos;
      notifyListeners();
    });

    _durationSub = _player.durationStream.listen((dur) {
      if (dur != null) {
        _duration = dur;
        notifyListeners();
      }
    });
  }

  void _onTrackComplete() {
    if (_repeatMode == RepeatMode.one) {
      _player.seek(Duration.zero);
      _player.play();
    } else {
      nextTrack();
    }
  }

  List<Track> get _activeQueue =>
      _shuffleMode == ShuffleMode.on ? _shuffledQueue : _queue;

  Future<void> playTrack(Track track, {List<Track>? queue}) async {
    _error = null;

    if (queue != null) {
      _queue = List.from(queue);
      _currentIndex = _queue.indexWhere((t) => t.id == track.id);
      if (_currentIndex == -1) {
        _queue.insert(0, track);
        _currentIndex = 0;
      }
      if (_shuffleMode == ShuffleMode.on) {
        _buildShuffledQueue();
      }
    } else if (!_queue.any((t) => t.id == track.id)) {
      _queue.add(track);
      _currentIndex = _queue.length - 1;
    } else {
      _currentIndex = _queue.indexWhere((t) => t.id == track.id);
    }

    _currentTrack = track;
    notifyListeners();

    await _loadAndPlay(track);
  }

  Future<void> _loadAndPlay(Track track) async {
    try {
      _isLoading = true;
      notifyListeners();

      final url = track.localPath ?? track.streamUrl;
      if (url == null || url.isEmpty) {
        _error = 'No audio source available for this track';
        _isLoading = false;
        notifyListeners();
        return;
      }

      if (track.localPath != null) {
        await _player.setFilePath(track.localPath!);
      } else {
        await _player.setUrl(url);
      }

      await _player.play();
    } catch (e) {
      _error = 'Playback failed: ${e.toString()}';
      _isLoading = false;
      notifyListeners();
    }
  }

  void _buildShuffledQueue() {
    _shuffledQueue = List.from(_queue)..shuffle();
    // Ensure current track is first
    if (_currentTrack != null) {
      _shuffledQueue.remove(_currentTrack);
      _shuffledQueue.insert(0, _currentTrack!);
    }
  }

  Future<void> togglePlayPause() async {
    if (_isPlaying) {
      await _player.pause();
    } else {
      await _player.play();
    }
  }

  Future<void> nextTrack() async {
    if (_activeQueue.isEmpty) return;
    final nextIndex = (_activeQueue.indexWhere((t) => t.id == _currentTrack?.id) + 1);
    if (nextIndex < _activeQueue.length) {
      await playTrack(_activeQueue[nextIndex]);
    } else if (_repeatMode == RepeatMode.all) {
      await playTrack(_activeQueue.first);
    }
  }

  Future<void> previousTrack() async {
    if (_position.inSeconds > 3) {
      await _player.seek(Duration.zero);
      return;
    }
    if (_activeQueue.isEmpty) return;
    final idx = _activeQueue.indexWhere((t) => t.id == _currentTrack?.id);
    if (idx > 0) {
      await playTrack(_activeQueue[idx - 1]);
    } else if (_repeatMode == RepeatMode.all) {
      await playTrack(_activeQueue.last);
    }
  }

  Future<void> seekTo(double fraction) async {
    final targetMs = (_duration.inMilliseconds * fraction).round();
    await _player.seek(Duration(milliseconds: targetMs));
  }

  Future<void> seekToPosition(Duration position) async {
    await _player.seek(position);
  }

  void toggleShuffle() {
    _shuffleMode = _shuffleMode == ShuffleMode.off ? ShuffleMode.on : ShuffleMode.off;
    if (_shuffleMode == ShuffleMode.on) {
      _buildShuffledQueue();
    }
    notifyListeners();
  }

  void cycleRepeat() {
    _repeatMode = RepeatMode.values[(_repeatMode.index + 1) % RepeatMode.values.length];
    notifyListeners();
  }

  Future<void> setVolume(double vol) async {
    _volume = vol.clamp(0.0, 1.0);
    if (!_isMuted) {
      await _player.setVolume(_volume);
    }
    notifyListeners();
  }

  Future<void> toggleMute() async {
    _isMuted = !_isMuted;
    await _player.setVolume(_isMuted ? 0 : _volume);
    notifyListeners();
  }

  Future<void> addToQueue(Track track) async {
    if (!_queue.any((t) => t.id == track.id)) {
      _queue.add(track);
      notifyListeners();
    }
  }

  Future<void> removeFromQueue(int index) async {
    if (index >= 0 && index < _queue.length) {
      _queue.removeAt(index);
      notifyListeners();
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _playerStateSub?.cancel();
    _positionSub?.cancel();
    _durationSub?.cancel();
    _player.dispose();
    super.dispose();
  }
}
