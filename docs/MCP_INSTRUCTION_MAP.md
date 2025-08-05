# MCP Server Tool Mapping Instructions

This document provides guidelines for mapping different types of user queries to the appropriate MCP server tools.

## Available MCP Servers

1. **Perplexity Search**
   - Use for: Real-time web searches and up-to-date information
   - Trigger keywords: "search web", "find online", "latest information", "current status"
   - Example: "What's the latest version of Next.js?"

2. **Playwright MCP**
   - Use for: Browser automation, testing, and web interaction
   - Trigger keywords: "test website", "automate browser", "check page", "web automation"
   - Example: "Test if our login page works"

3. **DuckDuckGo MCP Server**
   - Use for: Privacy-focused web searches
   - Trigger keywords: "private search", "anonymous search", "secure lookup"
   - Example: "Find information about security best practices"

4. **Linear**
   - Use for: Project management and issue tracking
   - Trigger keywords: "create ticket", "track issue", "project management", "sprint"
   - Example: "Create a new bug ticket"

5. **Office Word Document Server**
   - Use for: Document processing and manipulation
   - Trigger keywords: "edit document", "create doc", "word processing"
   - Example: "Create a new documentation file"

6. **Sequential Thinking Tools**
   - Use for: Complex problem-solving requiring step-by-step analysis
   - Trigger keywords: "analyze step by step", "break down problem", "complex solution"
   - Example: "Help me plan the architecture for a new feature"

7. **Time MCP Server**
   - Use for: Time-related operations and scheduling
   - Trigger keywords: "schedule", "timing", "date operations"
   - Example: "When should we schedule the deployment?"

8. **Google Cloud**
   - Use for: Google Cloud Platform operations and monitoring
   - Trigger keywords: "cloud logs", "GCP", "monitoring", "cloud functions"
   - Example: "Check the error logs in our cloud functions"

9. **Memory Tool**
   - Use for: Storing and retrieving conversation context
   - Trigger keywords: "remember", "recall", "store information"
   - Example: "Remember my preferred deployment settings"

10. **Github**
    - Use for: GitHub repository management and operations
    - Trigger keywords: "git", "repository", "commit", "pull request"
    - Example: "Create a new branch for feature development"

## Priority Rules

When multiple tools could apply, follow these priority rules:

1. **Security First**: For security-related queries, prioritize tools in this order:
   - Google Cloud (for logs and monitoring)
   - Github (for security patches)
   - Memory Tool (for security preferences)

2. **Development Flow**: For development-related queries:
   - Github (for code management)
   - Linear (for task tracking)
   - Sequential Thinking Tools (for planning)

3. **Documentation**: For documentation-related queries:
   - Office Word Document Server
   - Github (for markdown files)
   - Perplexity Search (for references)

## Context Awareness

The tool selection should consider:

1. **Project Context**
   - Current working directory
   - Active git branch
   - Recent file changes

2. **User Intent**
   - Explicit tool requests
   - Implicit needs based on query type
   - Previous conversation context

3. **Task Complexity**
   - Simple queries → Single tool
   - Complex queries → Multiple tools in sequence

## Multi-Tool Scenarios

Some queries may require multiple tools. Common combinations:

1. **Feature Development**
   ```
   Sequential Thinking Tools → Github → Linear
   (Plan → Implement → Track)
   ```

2. **Bug Investigation**
   ```
   Google Cloud → Github → Playwright
   (Logs → Code → Test)
   ```

3. **Documentation Update**
   ```
   Perplexity Search → Office Word → Github
   (Research → Write → Store)
   ```

## Error Handling

When a tool fails or is unavailable:

1. Try alternative tools based on the priority rules
2. Inform the user of the fallback
3. Store the failure in Memory Tool for future reference

## Best Practices

1. **Tool Selection**
   - Always explain why a particular tool was chosen
   - Be transparent about tool limitations
   - Suggest alternative tools when appropriate

2. **Efficiency**
   - Use the minimum number of tools necessary
   - Avoid tool switching unless necessary
   - Cache results when possible using Memory Tool

3. **User Communication**
   - Explain tool selection rationale
   - Provide progress updates for multi-tool operations
   - Document any persistent changes made

## Maintenance

This instruction map should be updated when:

1. New MCP servers are added
2. Existing servers are modified
3. New use cases are identified
4. Better tool combinations are discovered

## Version Control

- Document version: 1.0
- Last updated: Current Date
- Maintainer: AI Assistant 