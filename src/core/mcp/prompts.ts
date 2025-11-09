/**
 * MCP Prompts for fin-office SQL Agent
 * Two-level agent description system for LLM agent selection
 */
import { IGetPromptRequest, IPromptContent } from '../_types_/types.js';
import { getProjectData } from '../bootstrap/init-config.js';

function createPrompts () {
  const { agentBrief, agentPrompt, customPrompts = [] } = getProjectData();
  return [
    {
      name: 'agent_brief',
      description: 'Brief description of the agent to be selected in the agent system',
      arguments: [],
      content: agentBrief,
    },
    {
      name: 'agent_prompt',
      description: 'Detailed prompt of the agent',
      arguments: [],
      content: agentPrompt,
    },
    ...customPrompts,
  ];
}

// Lazy initialization - prompts are created when first accessed
let _prompts: any[] | null = null;

function getPrompts () {
  if (!_prompts) {
    _prompts = createPrompts();
  }
  return _prompts;
}


export function getPromptsList () {
  const prompts = getPrompts();
  return {
    prompts: prompts.map(({ content, ...rest }) => ({ ...rest })),
  };
}

export const getPrompt = async (request: IGetPromptRequest): Promise<any> => {
  const { name } = request.params;
  const prompts = getPrompts();
  let content: IPromptContent = prompts.filter((p) => p.name === name).map((p) => p.content)[0] || null;
  if (typeof content === 'function') {
    content = await content(request);
  }
  if (!content) {
    throw new Error(`Unknown prompt: ${name}`);
  }

  return {
    messages: [
      {
        role: 'system',
        content: {
          type: 'text',
          text: content,
        },
      },
    ],
  };
};
