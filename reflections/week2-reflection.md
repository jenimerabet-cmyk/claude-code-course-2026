# My Week 2 Reflection
# Existing Skill Research

One existing Claude skill that could help me in the future is /review. This skill reviews code for correctness, readability, edge cases, and coding conventions. Since Im still learning programming and Node.js, it helps me catch mistakes.
I chose this skill because it doesnt only find problems but also explains them and suggests improvements. This helps me learn better programming practices as im learning code.

# What I Learned This Week

This week I learned how Claude uses tools to interact with a codebase. Claude doesnt directly do thigs but, it requests a tool through a tool_use block. The application then decides whether or not to execute that request.
After the tool runs, the result is returned through a tool_result block. Claude thenn reads the result and uses it to continue reasoning before generating a final response.
I also learned that the messages array stores conversation history and provides context for Claude.