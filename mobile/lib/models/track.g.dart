// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'track.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class TrackAdapter extends TypeAdapter<Track> {
  @override
  final int typeId = 0;

  @override
  Track read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return Track(
      id: fields[0] as String,
      title: fields[1] as String,
      artist: fields[2] as String,
      album: fields[3] as String,
      albumCoverUrl: fields[4] as String?,
      streamUrl: fields[5] as String?,
      durationMs: fields[6] as int,
      isExplicit: fields[7] as bool,
      quality: fields[8] as String?,
      isFavourite: fields[9] as bool,
      localPath: fields[10] as String?,
      addedAt: fields[11] as DateTime,
    );
  }

  @override
  void write(BinaryWriter writer, Track obj) {
    writer
      ..writeByte(12)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.title)
      ..writeByte(2)
      ..write(obj.artist)
      ..writeByte(3)
      ..write(obj.album)
      ..writeByte(4)
      ..write(obj.albumCoverUrl)
      ..writeByte(5)
      ..write(obj.streamUrl)
      ..writeByte(6)
      ..write(obj.durationMs)
      ..writeByte(7)
      ..write(obj.isExplicit)
      ..writeByte(8)
      ..write(obj.quality)
      ..writeByte(9)
      ..write(obj.isFavourite)
      ..writeByte(10)
      ..write(obj.localPath)
      ..writeByte(11)
      ..write(obj.addedAt);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TrackAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}
