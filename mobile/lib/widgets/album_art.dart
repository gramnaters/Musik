import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:shimmer/shimmer.dart';
import '../theme/app_theme.dart';

class AlbumArt extends StatelessWidget {
  final String? url;
  final double size;
  final bool isPlaying;
  final double borderRadius;

  const AlbumArt({
    super.key,
    this.url,
    required this.size,
    this.isPlaying = false,
    this.borderRadius = 0,
  });

  @override
  Widget build(BuildContext context) {
    Widget art;

    if (url != null && url!.isNotEmpty) {
      art = CachedNetworkImage(
        imageUrl: url!,
        width: size,
        height: size,
        fit: BoxFit.cover,
        placeholder: (context, url) => Shimmer.fromColors(
          baseColor: AppTheme.darkCard,
          highlightColor: AppTheme.darkElevated,
          child: Container(color: AppTheme.darkCard),
        ),
        errorWidget: (context, url, error) => _Placeholder(size: size),
      );
    } else {
      art = _Placeholder(size: size);
    }

    if (isPlaying) {
      return Stack(
        alignment: Alignment.center,
        children: [
          art,
          Container(
            width: size,
            height: size,
            color: Colors.black.withOpacity(0.4),
          ),
          const _PlayingEqualizer(),
        ],
      );
    }

    return art;
  }
}

class _Placeholder extends StatelessWidget {
  final double size;
  const _Placeholder({required this.size});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFF3B3B3B),
            const Color(0xFF1E1E1E),
          ],
        ),
      ),
      child: Icon(
        Icons.music_note_rounded,
        color: AppTheme.textTertiary,
        size: size * 0.35,
      ),
    );
  }
}

class _PlayingEqualizer extends StatefulWidget {
  const _PlayingEqualizer();

  @override
  State<_PlayingEqualizer> createState() => _PlayingEqualizerState();
}

class _PlayingEqualizerState extends State<_PlayingEqualizer>
    with TickerProviderStateMixin {
  late final List<AnimationController> _controllers;
  late final List<Animation<double>> _animations;

  @override
  void initState() {
    super.initState();
    _controllers = List.generate(
      3,
      (i) => AnimationController(
        vsync: this,
        duration: Duration(milliseconds: 400 + i * 120),
      )..repeat(reverse: true),
    );
    _animations = _controllers.map((c) {
      return Tween<double>(begin: 0.3, end: 1.0).animate(
        CurvedAnimation(parent: c, curve: Curves.easeInOut),
      );
    }).toList();
  }

  @override
  void dispose() {
    for (final c in _controllers) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: List.generate(3, (i) {
        return AnimatedBuilder(
          animation: _animations[i],
          builder: (context, _) {
            return Container(
              width: 3,
              height: 14 * _animations[i].value,
              margin: const EdgeInsets.symmetric(horizontal: 1),
              decoration: BoxDecoration(
                color: AppTheme.primaryAccent,
                borderRadius: BorderRadius.circular(1.5),
              ),
            );
          },
        );
      }),
    );
  }
}
