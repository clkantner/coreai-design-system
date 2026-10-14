---
name: start-app
description: 'Start the CoreaAI Sandbox dev server and open it via Playwright MCP. USE WHEN: the user asks you to "start the app", "run the dev server", "open the app", or "launch CoreaAI Sandbox".'
---

# Start the App

Run the app startup and then open the app using the Playwright MCP tools.

Read the `README.md` file for any setup or configuration instructions before starting the app.

First, check whether the app is already available at `http://localhost:5173/`. Reuse the running server when it is healthy.

If dependencies are missing, run `npm run setup` to authenticate the private `@coreai` feed and install dependencies. If the credential provider reports an authentication error, tell the user that waiting 1–2 hours and retrying `npm run setup` may resolve a temporary access or credential propagation delay. For persistent setup errors, follow the [CoreaAI Sandbox installation guide](../../../README.md#installation).

If no server is running, start `npm run dev` using asynchronous terminal execution (`mode: "async"`). Async mode is appropriate because the development server must remain active while work continues. Keep the returned terminal ID so the server can be stopped later.

Do not poll the terminal or add artificial delays. Wait for the automatic terminal notification that the server is ready or needs input. Use `get_terminal_output` only when the execution result explicitly says the process timed out, moved to the background, or needs input.

Once the server is ready, use the Playwright MCP tools to open and interact with `http://localhost:5173/`. If the first navigation occurs while Vite is still compiling and renders blank, wait for the ready notification and reload once.

If Playwright tools are unavailable, leave the server running and give the user the URL instead of restarting the workflow.
