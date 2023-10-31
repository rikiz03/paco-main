const { transcribe_gcp } = require('./transcribe_google');
const { transcribe_whisper } = require('./transcribe_whisper');
const { Thread } = require('threading');
const { send_transcript, start_socketio_server, send_ai_note, send_patient_transcript, send_cds_ddx, send_cds_qa } = require('./app');
const { state_store } = require('./state');
const { cds_helper, cds_helper_ddx, cds_helper_qa } = require('./llm');
const { SocketIOCallback } = require('./socketcallback');
const { ThreadPoolExecutor } = require('concurrent.futures');
const os = require('os');
const { load_dotenv } = require('dotenv');

load_dotenv();

// const USE_WHISPER = os.getenv("USE_WHISPER", "false") == "true";

// if (USE_WHISPER) {
//     transcribe = transcribe_whisper;
// } else {
//     transcribe = transcribe_gcp;
// }
const transcribe = transcribe_whisper;
let ai_note_set = 0;

function run_on_transcript(text, sendFn, chain) {
    console.log("[tread] running transcript", text);
    let callbacks = null;
    if (ai_note_set < 2) {
        callbacks = [new SocketIOCallback(sendFn)];
        ai_note_set += 1;
    }
    console.log("[thread] runnin chain", text, sendFn, chain);
    const final_result = chain.run({"transcript": text}, callbacks=callbacks);
    console.log("[thread] final_result", final_result);
    sendFn(final_result);
    console.log("[thread] final_result sent", sendFn.name);
}

function transcript_callback(text) {
    console.log("[main] transcript callback. patient_mode:{}, patient_recording:{}".
          format(state_store["patient_mode"],
                 state_store["patient_recording"]));
    if (state_store["patient_mode"] && state_store["patient_recording"]) {
        send_patient_transcript(text);
    }
    if (!state_store["patient_mode"]) {
        state_store["transcript"] += text + "\n";
        send_transcript(state_store["transcript"]);
        const e = new ThreadPoolExecutor(4);
        e.submit(run_on_transcript, state_store["transcript"], send_cds_qa,
                     cds_helper_qa);
        e.submit(run_on_transcript, state_store["transcript"],
                     send_cds_ddx, cds_helper_ddx);
        // callbacks = None
        // if not ai_note_set:
        //     stream_callback = SocketIOCallback(lambda x: send_ai_note(x))
        //     callbacks = [stream_callback]
        //     ai_note_set = True
        // ai_note = cds_helper.run({"transcript": state_store["transcript"]},
        //                          callbacks=callbacks)
        // send_ai_note(ai_note)
    }
}

if (require.main === module) {
    // cds_helper_ddx.run({"transcript": "hello world"}, callbacks=None)
    console.log("[main] Running server thread");
    const thread = new Thread(start_socketio_server);
    thread.start();
    console.log("[main] Running transcribe thread");
    transcribe(transcript_callback);
    thread.join();
}
