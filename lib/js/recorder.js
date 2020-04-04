(function(window){

  var WORKER_PATH = "packages/flutter_sound/js/recorderWorker.js";
  var BIT_DEPTH = 16;

  var Recorder = function(onInit, onEvent, onError, callback){

    var config = {
      "workerPath":WORKER_PATH,
      "callback": callback,
    };
    
    var worker;
    var recorder = this;
    var audioContext;
    var recording = false;
    
    try {
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
      window.URL = window.URL || window.webkitURL;

    } catch (e) {
      // Firefox 24: TypeError: AudioContext is not a constructor
      // Set media.webaudio.enabled = true (in about:config) to fix this.
      onError("Error initializing audio: " + e);
    }

    var currCallback = function(data) {
      
    }

    var initialized = false;
    function tryStartUserMedia(stream) {
      if(initialized)
        return;

      try {
        startUserMedia(stream);
        initialized = true;
      } catch(err) {
        console.log(err)
        onError("Error starting user media : " + err);
      }
    }

    var buffer = [];

    function startUserMedia(stream) {
      audioContext = new AudioContext();
      var input = audioContext.createMediaStreamSource(stream);

      //Firefox loses the audio input stream every five seconds
      // To fix added the input to window.source
      window.source = input;
      
      var bufferLen = config.bufferLen || 4096;
      var node = input.context.createScriptProcessor(bufferLen, 1, 1);

      
      node.onaudioprocess = function(e) {
        if (!recording) return;
        worker.postMessage({
          command: 'record',
          buffer: [
            e.inputBuffer.getChannelData(0)
          ]
        });
      }
      input.connect(node);

      node.connect(audioContext.destination);
                  
      worker = new Worker(config.workerPath || WORKER_PATH);

      worker.onerror = function(err) {
        console.error(err);
        onError(err.message);
      }

      worker.postMessage({
        command: 'init',
        config: {
          sampleRate: input.context.sampleRate,
          bitDepth: config.bitDepth || BIT_DEPTH
        }
      });

      var saveByteArray = (function () {
          var a = document.createElement("a");
          document.body.appendChild(a);
          a.style = "display: none";
          return function (data, name) {
              var blob = new Blob(data, {type: "octet/stream"}),
                  url = window.URL.createObjectURL(blob);
              a.href = url;
              a.download = name;
              a.click();
              window.URL.revokeObjectURL(url);
          };
      }());
      
      worker.onmessage = function(e) {
        
        var blob = e.data;
        
        var reader = new FileReader();
        reader.addEventListener("loadend", function() {
          callback(new Uint8Array(reader.result), true);
          worker.postMessage({ command: 'clear' });
        });
        reader.readAsArrayBuffer(blob);
        // saveByteArray([blob], 'example.txt');
      }

      if(onInit) {
        onInit(input.context.sampleRate);
      }
    }

    this.initialize = function() {
      navigator.mediaDevices.getUserMedia({
        "audio":{channelCount: 1}
      }).then(tryStartUserMedia).catch(function(e) {
        onError("No live audio input in this browser: " + e);
      });
    }

    this.setBitDepth = function (bitDepth) {
      config.bitDepth = bitDepth;

      worker.postMessage({
        command: 'setBitDepth',
        config: {
          bitDepth: bitDepth 
        }
      });    
    }
    
    this.configure = function(cfg){
      for (var prop in cfg){
        if (cfg.hasOwnProperty(prop)){
          config[prop] = cfg[prop];
        }
      }
    }

    this.record = function() {
      recording = true;
    }

    this.stop = function(exportAudio) {
      recording = false;
      if(exportAudio)
        recorder.exportWAV(callback);
    }

    this.play = function() {
      console.log("Not implemented");
    }

    this.clear = function(){
      worker.postMessage({ command: 'clear' });
    }

    this.getBuffer = function(cb) {
      currCallback = cb || config.callback;
      worker.postMessage({ command: 'getBuffer' })
    }

    this.exportWAV = function(cb, type){
      currCallback = cb || config.callback;
      type = type || config.type || 'audio/wav';
      if (!currCallback) throw new Error('Callback not set');
      worker.postMessage({
        command: 'exportWAV',
        type: type
      });
    }

    this.exportRAW = function(cb, type){
      currCallback = cb || config.callback;
      type = type || config.type || 'audio/raw';
      if (!currCallback) throw new Error('Callback not set');
      worker.postMessage({
        command: 'exportRAW',
        type: type
      });
    }

    this.export16kMono = function(cb, type){
      currCallback = cb || config.callback;
      type = type || config.type || 'audio/raw';
      if (!currCallback) throw new Error('Callback not set');
      
      worker.postMessage({
        command: 'export16kMono',
        type: type
      });
    }

   
  };

  if(!window.flutter_sound_web) {
    window.flutter_sound_web = {};
  }
  window.flutter_sound_web["Recorder"] = Recorder;

})(window);
