
/*
 * This is a flutter_sound module.
 * flutter_sound is distributed with a MIT License
 *
 * Copyright (c) 2018 dooboolab
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 */
@JS('flutter_sound_web')
library flutter_sound_web;

import 'package:js/js.dart';
import 'dart:async';
import 'dart:core';

import 'package:flutter/services.dart';
import 'package:flutter_web_plugins/flutter_web_plugins.dart';
import 'flutter_sound.dart';

@JS()
class Recorder {
  external Recorder(Function onInit, Function onEvent, Function onError,
      Function callback);
  external void record();
  external void stop(bool export);
  external void clear();
  external void initialize();
  external void setBitDepth(int bitDepth);
}


class FlutterSoundWebPlugin  {

  static MethodChannel _channel;

  static int _sampleRate;

  static void registerWith(Registrar registrar) {
    _channel = MethodChannel(
      'flutter_sound',
      const StandardMethodCodec(),
      registrar.messenger,
    );

    final FlutterSoundWebPlugin instance = FlutterSoundWebPlugin();
    _channel.setMethodCallHandler(instance.handleMethodCall);

    print("registering");

    _recorder = Recorder(allowInterop((sampleRate) {
      _sampleRate = sampleRate;
      _channel.invokeMethod("initialized", sampleRate);
    }), allowInterop((event) {

    }), allowInterop((error) {
      _channel.invokeMethod("recordError", error);
    }), allowInterop((data, done) {
      _channel.invokeMethod("recordedData", data);
      if(done)
        _channel.invokeMethod("recordingComplete");
    }));
  }

  static Recorder _recorder;

  FlutterSoundWebPlugin() {
    
  }

  Future<dynamic> handleMethodCall(MethodCall call) async {

    final method = call.method;

    switch (method) {
      case 'isEncoderSupported':
      {
        return call.arguments['codec'] == t_CODEC.CODEC_PCM.index;
      }
      case 'isDecoderSupported':
      {
        return call.arguments['codec'] == t_CODEC.CODEC_PCM.index;
      }
      case 'startRecorder':
      {
         if(call.arguments["sampleRate"] != null) {
            print("Cannot specify sampleRate for web plugin, this is being ignored.");
         }
         final int numChannels = call.arguments['numChannels'];
         final int bitRate = call.arguments['bitRate'];
         int bitDepth = bitRate ~/ numChannels ~/ _sampleRate;
         final int codec = call.arguments['codec'];
         if(codec != t_CODEC.CODEC_PCM.index)
          throw new Exception("Unsupported codec");

         _recorder.setBitDepth(bitDepth);
         print("Starting recorder with $numChannels channels, sampleRate $_sampleRate, bitDepth $bitDepth");
        _recorder.setBitDepth(16);

         _recorder.record();
         return "started";
      }
      case 'stopRecorder':
      {
        final bool export = call.arguments;
          _recorder.stop(export);
        return "stopped";
      }
      case 'initializeMediaPlayer':
      {
        _recorder.initialize();
        break;
      }
      case 'releaseMediaPlayer':{
        _recorder.stop(false);
        _recorder.clear();
        _recorder = null;
        break;
      }
      default:
          throw new ArgumentError('Unknown method ${call.method} ');
    }
  }
}