const speechRecognition = require('speech-recognition');
const { ThreadPoolExecutor } = require('concurrent.futures');

function processAudio(recognizer, audio, model, fn) {
    const text = recognizer.recognizeWhisperApi(audio);
    console.log("[whisper] transcript: ", text);

    // Cancels the noise words to some extent
    if (text.length > 8) {
        fn(text);
    } else {
        console.log("[whisper] ignored cause noise:", text);
    }
}

const voiceRecognitionExecutor = new ThreadPoolExecutor(4);

function getCallback(fn) {

    function callback(recognizer, audio) {
        try {
            console.log("[whisper] processing audio");
            const future = voiceRecognitionExecutor.submit(processAudio,
                recognizer, audio,
                "small.en", fn);
            // future.result()
        } catch (error) {
            if (error instanceof speechRecognition.UnknownValueError) {
                console.log("[whisper] could not understand audio");
            } else if (error instanceof speechRecognition.RequestError) {
                console.log(
                    "[whisper] Could not request results from whisper; {0}".format(
                        error));
            }
        }
    }

    return callback;
}

function transcribeWhisper(fn) {
    const recognizer = new speechRecognition.Recognizer();
    const callback = getCallback(fn);
    const microphone = new speechRecognition.Microphone();
    with (microphone) {
        console.log("[whisper] Calibrating...");
        recognizer.adjustForAmbientNoise(source);
    }
    recognizer.listenInBackground(microphone, callback, phraseTimeLimit=10);
}
