const ConversationBufferMemory = require('langchain.memory').ConversationBufferMemory;

const memory = new ConversationBufferMemory({ai_prefix: "Paco", human_prefix: "Patient"});
memory.chat_memory.add_ai_message(
    "Hello, I'm Paco, your medical knowledge assistant. How can I assist you today with your prescriptions?"
);

memory.chat_memory.add_user_message();

const state_store = {
    "transcript": "",
    "doctor_summary": "",
    "patient_instruction_memory": memory,
    "patient_mode": false,
    "patient_recording": false
};
