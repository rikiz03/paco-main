const { execSync } = require('child_process');
const fs = require('fs');
const speech = require('@google-cloud/speech');

const RATE = 16000;
const CHUNK = parseInt(RATE / 10); // 100ms
const SPEAKER_DIARIZATION = true;
const MODEL = 'medical_conversation';

class MicrophoneStream {
  constructor(rate, chunk) {
    this._rate = rate;
    this._chunk = chunk;
    this._buff = [];
    this.closed = true;
  }

  _fillBuffer(inData, frameCount, timeInfo, statusFlags) {
    this._buff.push(inData);
    return [null, speech.StreamingRecognizeResponse.status.UNKNOWN];
  }

  *generator() {
    while (!this.closed) {
      const chunk = this._buff.shift();
      if (chunk === undefined) {
        yield null;
      } else {
        yield Buffer.concat([chunk]);
      }
    }
  }

  async open() {
    this._audioClient = new speech.v1p1beta1.SpeechClient();
    this._audioStream = this._audioClient
      .streamingRecognize()
      .on('data', response => this._onData(response.results))
      .on('error', error => console.error(error));

    this._audioStream.write({
      streaming_config: {
        config: {
          encoding: 'LINEAR16',
          sample_rate_hertz: this._rate,
          language_code: 'en-US',
          diarization_config: {
            enable_speaker_diarization: SPEAKER_DIARIZATION,
            min_speaker_count: 2,
            max_speaker_count: 2,
          },
          model: MODEL,
          enable_automatic_punctuation: true,
          use_enhanced: true,
        },
      },
    });

    this.closed = false;
    return this;
  }

  close() {
    if (!this.closed) {
      this._audioStream.end();
      this.closed = true;
    }
  }

  _onData(results) {
    for (const result of results) {
      if (!result.alternatives) {
        continue;
      }

      const transcript = result.alternatives[0].transcript;
      if (result.is_final) {
        const speakerArray = result.alternatives[0].words.map(word => word.speaker_tag);
        const mostCommonSpeakerTag = this._mostFrequent(speakerArray);
        console.log(`[gcp voice] transcript: ${transcript}, speaker: ${mostCommonSpeakerTag}`);
        const probableSpeaker = `**Speaker ${mostCommonSpeakerTag}:** `;
        if (this._fn) {
          this._fn(probableSpeaker + transcript);
        }
      }
    }
  }

  _mostFrequent(list) {
    return list.reduce((a, b, i, arr) =>
      (arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b), null);
  }
}

function listenPrintLoop(stream, fn) {
  stream.on('data', response => {
    if (response.results && response.results.length) {
      const result = response.results[0];
      if (result.alternatives && result.alternatives.length) {
        const transcript = result.alternatives[0].transcript;
        if (!result.is_final) {
          // Do something with interim result if needed
        } else {
          const speakerArray = result.alternatives[0].words.map(word => word.speaker_tag);
          const mostCommonSpeakerTag = mostFrequent(speakerArray);
          console.log(`[gcp voice] transcript: ${transcript}, speaker: ${mostCommonSpeakerTag}`);
          const probableSpeaker = `**Speaker ${mostCommonSpeakerTag}:** `;
          if (fn) {
            fn(probableSpeaker + transcript);
          }
        }
      }
    }
  });

  stream.on('error', error => {
    console.error(error);
  });
}

function mostFrequent(list) {
  return list.reduce((a, b, i, arr) =>
    (arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b), null);
}

async function transcribeGcp(fn) {
  console.log('[gcp voice] Recording...');

  const stream = new MicrophoneStream(RATE, CHUNK);
  await stream.open();

  listenPrintLoop(stream, fn);

  // If you want to close the stream later, use stream.close()
}

module.exports = { transcribeGcp };
