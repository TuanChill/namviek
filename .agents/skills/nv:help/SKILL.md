---
name: nv:help
description: Show available Namviek MCP tools. Use when the user asks what MCP commands exist, wants help, or needs to inspect tool categories before running a command.
---

# nv:help

Use this skill to call `mcp_help` manually.

## Inputs

- Optional `category`
- Optional exact `toolName`

## Workflow

1. Call `mcp_help`.
2. If the user asked about one area, pass `category`.
3. If the user asked about one tool, pass `toolName`.
4. Return the grouped tools and highlight the next relevant command.

## Example

"Call mcp_help with category='record'."