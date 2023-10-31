const socketio = require('socket.io');
const express = require('express');
const { patient_instructor, clinical_note_writer } = require('./llm');
const { SocketIOCallback } = require('./socketcallback');
const { state_store } = require('./state');
const { synthesize } = require('./text_to_speech_google');
const logging = require('logging');

logging.getLogger('werkzeug').setLevel(logging.ERROR);

require('dotenv').config();
const sio = socketio.Server({ cors: { origin: '*' }, async_mode: 'threading' });
const app = express();
app.use(sio.engine);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

sio.on('connect', (socket) => {
    console.log('connect ', socket.id);
});

sio.on('disconnect', (socket) => {
    console.log('disconnect ', socket.id);
});

sio.on('start_recording', (socket) => {
    console.log('start recording ', socket.id);
});

sio.on('stop_recording', (socket) => {
    console.log('stop recording ', socket.id);
});

sio.on('set_summary', (socket, text) => {
    state_store.doctor_summary = text;
    console.log('set_summary', socket.id, state_store.doctor_summary);
});

sio.on('generate_notes', (socket, doctors_hints) => {
    console.log("transcript for note generation", state_store.transcript);
    console.log("doctors_hints", doctors_hints);
    const steam_handler = new SocketIOCallback((x) => sio.emit('generate_notes', x));
    const notes = clinical_note_writer.run(
        {
            "input": doctors_hints,
            "transcript": state_store.transcript
        },
        callbacks=[steam_handler]);
    console.log("Generated notes", notes);
    sio.emit('generate_notes', notes, socket.id);
});

sio.on('patient_mode', (socket, boolean) => {
    state_store.patient_mode = boolean;
    console.log('patient_mode', socket.id, boolean);
});

sio.on('patient_recording', (socket, boolean) => {
    state_store.patient_recording = boolean;
    console.log('patient_recording', socket.id, boolean);
});

sio.on('patient_message', (socket, text) => {
    console.log("[socket] received patient message", text)
    const callback = new SocketIOCallback(
        (partial_ai_response) => sio.emit(
            'patient_message',
            {
                "text": partial_ai_response,
                "done": false
            },
            socket.id
        )
    );
    const memory = state_store.patient_instruction_memory;
    const history = memory.load_memory_variables({})["history"];
    console.log("history from memory", history);
    const ai_response = patient_instructor.run(
        {
            "input": text,
            "history": history,
            "doctor_summary": state_store["doctor_summary"]
        },
        callbacks=[callback]
    );
    memory.chat_memory.add_user_message(text);
    memory.chat_memory.add_ai_message(ai_response);
    const audio = synthesize(ai_response);
    sio.emit(
        'patient_message',
        {
            "text": ai_response,
            "done": true,
            "audio": audio
        },
        socket.id
    );
});

sio.on('transcript', (socket, text) => {
    sio.emit('transcript', text)
});

sio.on('patient_transcript', (socket, text) => {
    sio.emit('patient_transcript', text)
});

sio.on('ai_note', (socket, text) => {
    sio.emit('ai_note', text)
});

sio.on('cds_ddx', (socket, text) => {
    sio.emit('cds_ddx', text)
});

sio.on('cds_qa', (socket, text) => {
    sio.emit('cds_qa', text)
});

sio.on('patient_instructions', (socket, text) => {
    sio.emit('patient_instructions', text)
});

sio.on('patient_audio_message', (socket, content) => {
    sio.emit('patient_audio_message', content)
});

app.listen(5000, () => console.log(`Server running on port 5000`));
