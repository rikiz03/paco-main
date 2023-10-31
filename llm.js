const ChatOpenAI = require('langchain').chat_models.ChatOpenAI;
const StreamingStdOutCallbackHandler = require('langchain').callbacks.streaming_stdout.StreamingStdOutCallbackHandler;
const PromptTemplate = require('langchain').prompts.prompt.PromptTemplate;
const LLMChain = require('langchain').chains.LLMChain;
const ConversationChain = require('langchain').chains.ConversationChain;
const state_store = require('./state');
require('dotenv').config();

const gpt3 = new ChatOpenAI({
    // model: 'gpt-4',
    temperature: 0.2,
    streaming: true,
    verbose: true
});

const gpt4 = new ChatOpenAI({
    model: 'gpt-4',
    temperature: 0.2,
    streaming: true,
    verbose: true
});

const clinical_note_writer_template = new PromptTemplate({
    input_variables: ["transcript", "input"],
    template:
        `Based on the conversation transcript and doctor's hints provided below, generate a clinical note in the following format:
        Diagnosis:
        History of Presenting Illness:
        Medications (Prescribed): List current medications and note if they are being continued, or if any new ones have been added.
        Lab Tests (Ordered):
        Please consider any information in the transcript that might be relevant to each of these sections, and use the doctor's hint as a guide.`
});

const cds_helper_ddx_prompt = new PromptTemplate({
    input_variables: ["transcript"],
    template:
        `##DDX model
        Based on the provided transcript snippets from a doctor-patient consultation, parse the information to generate a differential diagnosis. The results should be organized as follows:
        Differential Diagnosis: List each possible diagnosis with a model confidence score from 0-100 (example: [30]), 100 being most confident.
        Please consider the patient's stated symptoms, their medical history, and any other relevant information presented in the transcript. The consultation snippets are as follows:

        {transcript}
        Differential Diagnosis:
        `
});

const cds_helper_qa_prompt = new PromptTemplate({
    input_variables: ["transcript"],
    template:
        `##Doctor QA model
        Based on the provided transcript snippets from a doctor-patient consultation, internally generate a differential diagnosis based on the patient's stated symptoms, their medical history, and any other relevant information presented in the transcript. Then, suggest potential questions the doctor could ask to facilitate the diagnosis process. The questions should be aimed at clarifying the diagnosis or gathering more information to refine the differential diagnosis.
        The differential diagnosis should not be output. The results should be formatted as follows:
        Questions to Ask: Provide a list of top 3 relevant questions the doctor could ask to further clarify the diagnosis. The question is succint and short.
        The consultation snippets are as follows:
        {transcript}
        Questions to Ask:
        `
});

const patient_instructions_template = new PromptTemplate({
    input_variables: ["history", "input", "doctor_summary"],
    template:
        `As a medical chatbot named Paco, your task is to answer patient questions about their prescriptions. You should provide complete, scientifically-grounded, and actionable answers to queries, based on the provided recent clinical note.
Remember to introduce yourself as Paco only at the start of the conversation. You can communicate fluently in the patient’s language of choice, such as English and Hindi. If the patient asks a question unrelated to the diagnosis or medications in the clinical note, your response should be, ‘I cannot answer this question.’

### Recent Prescription
{doctor_summary}

Let's begin the conversation:
{history}
Patient: {input}
Paco:"""
});

const cds_helper = new LLMChain({
    llm: gpt3,
    prompt: cds_helper,
    verbose: true
});
// gpt4=gpt3
const cds_helper_ddx = new LLMChain({
    llm: gpt4,
    prompt: cds_helper_ddx_prompt,
    verbose: true
});
const cds_helper_qa = new LLMChain({
    llm: gpt4,
    prompt: cds_helper_qa_prompt,
    verbose: true
});

const clinical_note_writer = new LLMChain({
    llm: gpt4,
    prompt: clinical_note_writer_template,
    verbose: true
});
const patient_instructor = new LLMChain({
    llm: gpt4,
    prompt: patient_instructions_template,
    verbose: true
});
