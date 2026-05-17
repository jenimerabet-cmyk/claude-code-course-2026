const fs = require("node:fs");
const path = require("node:path");
const Anthropic = require("@anthropic-ai/sdk");
const { toolDefinitions, handleToolCall } = require("./tools");

const MODEL = "claude-sonnet-4-6";

//This is the maximum number of reasoning cycles the agent is allowed to run
//reasoning cycles is basically how many times it thinks/loops for an answer. 
const MAX_ITERATIONS = 10;

// Sets it up with the your own api key with Claude to communicate to it. 
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

//Tells Claude how to act and adds your personal preferences from Claud.md if it exists.
function loadSystemPrompt() {
  const base =
    "You are devlens, an AI assistant embedded in the user's project directory. " +
    "You have tools for reading files, writing files, running shell commands, " +
    "and listing directories. When the user asks a question that depends on the " +
    "contents of the codebase, use the tools — do not guess.";

//This is the file location where the the person's custom instructions are stored
  const claudeMdPath = path.resolve(process.cwd(), "CLAUDE.md");

//If claude.md doesn't exist, it returs to default instructions
  if (!fs.existsSync(claudeMdPath)) return base;

  //Read claude.md and attach it to system prompt
  const claudeMd = fs.readFileSync(claudeMdPath, "utf-8");
  return `${base}\n\n--- Project context (from CLAUDE.md) ---\n${claudeMd}`;
}

/**
 * Main chat function:
 * - Sends messages to Claude
 * - Handles tool calls (file reading, commands)
 * - Loops until Claude finishes responding
 */
async function chat(userMessage, history) {

//Builds thefull conversation history including new user message
  const messages = [...history, { role: "user", content: userMessage }];

//stores what the agent did
  const trace = [];

  // Agent loop: lets Claude to think and use tools multiple times
  for (let i = 0; i < MAX_ITERATIONS; i++) {

    //sends current conversation to Claude API
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: loadSystemPrompt(),
      tools: toolDefinitions,
      messages,
    });

    //Adds claude's response to conversation history
    messages.push({ role: "assistant", content: response.content });

    //Records all response blocks
    for (const block of response.content) {
      if (block.type === "text") {
        trace.push({ type: "text", text: block.text });
      } else if (block.type === "tool_use") {
        trace.push({
          type: "tool_use",
          id: block.id,
          name: block.name,
          input: block.input
        });
      }
    }

    //Checks if claude requested any tools
    const toolUses = response.content.filter((b) => b.type === "tool_use");

    //If no tools were requested, then claude is done
    if (toolUses.length === 0) {
      const reply = response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n");

      return { reply, history: messages, trace, iterations: i + 1 };
    }

    //If requested executes each tool request
    const toolResults = [];
    for (const block of toolUses) {
      const result = await handleToolCall(block.name, block.input);

      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: result
      });

      trace.push({
        type: "tool_result",
        tool_use_id: block.id,
        name: block.name,
        content: result
      });
    }

    //Sends tool results back into conversation so claude can continue thinking
    messages.push({ role: "user", content: toolResults });
  }

  //if loop hits limit, it stops executing. 
  return {
    reply: `(Stopped after ${MAX_ITERATIONS} iterations — Claude kept asking for tools. Task may be incomplete.)`,
    history: messages,
    trace,
    iterations: MAX_ITERATIONS,
  };
}

module.exports = { chat };