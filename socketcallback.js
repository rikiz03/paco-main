class SocketIOCallback {
  constructor(fn) {
      this.fn = fn;
      this.current_text = "";
  }

  on_llm_start(serialized, prompts, kwargs) {
      this.current_text = "";
  }

  on_llm_new_token(token, kwargs) {
      this.current_text += token;
      this.fn(this.current_text);
  }

  on_llm_end(response, kwargs) {
      this.current_text = "";
  }

  on_llm_error(error, kwargs) {}

  on_chain_start(serialized, inputs, kwargs) {}

  on_chain_end(outputs, kwargs) {}

  on_chain_error(error, kwargs) {}

  on_tool_start(serialized, input_str, kwargs) {}

  on_agent_action(action, kwargs) {}

  on_tool_end(output, kwargs) {}

  on_tool_error(error, kwargs) {}

  on_text(text, kwargs) {}

  on_agent_finish(finish, kwargs) {}
}
