import fsp from 'fs/promises';
import fss from 'fs';
import path from 'path';
import chalk from 'chalk';

const RESULTS_DIR = path.join(process.cwd(), '_logs/mcp');

if (!fss.existsSync(RESULTS_DIR)) {
  fss.mkdirSync(RESULTS_DIR, { recursive: true });
}


export interface ITestResult {
  // Идентификаторы теста / инструмента
  fullId: string;
  toolName: string;
  description: string;

  // Параметры вызова инструмента
  parameters: unknown | null;

  // Временные метаданные
  timestamp: string; // ISO-строка
  duration: number;  // миллисекунды

  // Статус выполнения
  status: 'pending' | 'passed' | 'failed' | 'skipped' | 'expected_failure';

  // Маркер-иконка для логов (может отсутствовать в "pending")
  marker?: string;

  // Ответ MCP
  response: unknown | null;

  // Ошибка (человеко-читаемое сообщение)
  error: string | null;

  // Дополнительные детали ошибки (структурированные)
  errorDetails?: unknown | null;

  // Полный MCP-ответ при ошибке (JSON-RPC ответ)
  fullMcpResponse?: unknown;

  // Заголовки запроса, с которыми шёл вызов MCP-сервера
  requestHeaders?: Record<string, string>;
}

/**
 * Format test result as Markdown
 */
export const formatResultAsMarkdown = (result: ITestResult) => {
  const t = '```';
  const mdText = (s: string | null) => `${t}\n${s}\n${t}`;
  const mdDescr = (s: string) => `${t}description\n${s}\n${t}`;
  const mdJson = (v: any) => `${t}json\n${v && JSON.stringify(v, null, 2)}\n${t}`;

  let resultStatus = '⚠️ RESULT STATUS UNKNOWN';
  let errorText = '';
  // md += `## Response\n\n\`\`\`json\n${JSON.stringify(result.response, null, 2)}\n\`\`\`\n\n`;

  if (result.status === 'passed') {
    resultStatus = '✅  PASSED';
  } else {
    // Show full MCP response as seen by the agent, or fallback to separate sections
    if (result.fullMcpResponse) {
      errorText = `## MCP Response (as seen by agent)\n\n${mdJson(result.fullMcpResponse)}\n\n`;
    } else {
      errorText = `## Error\n\n${mdText(result.error)}\n\n`;
      // Add detailed error information if available
      if (result.errorDetails) {
        errorText += `## Error Details\n\n${mdJson(result.errorDetails)}\n\n`;
      }
    }
    if (result.status === 'expected_failure') {
      resultStatus = '⚠️  Expected failure - test validation successful';
    } else {
      resultStatus = '❌  FAILED';
    }
  }

  let requestHeaders = '';
  if (result.requestHeaders && Object.keys(result.requestHeaders).length > 0) {
    requestHeaders = `\nHeaders:\n${Object.entries(result.requestHeaders).map(([k, v]) => `  ${k}: ${v}`).join('\n')}\n`;
  }

  // Format response section
  let responseText = '';
  if (result.response !== null && result.response !== undefined) {
    try {
      let parsedResponse: any = result.response;
      let isJsonParsed = false;

      // If response is a string, try to parse as JSON first
      if (typeof result.response === 'string') {
        try {
          parsedResponse = JSON.parse(result.response);
          isJsonParsed = true;
        } catch {
          // If not valid JSON, treat as text
          responseText = `## Response\n\n${mdText(result.response)}\n\n`;
        }
      } else if (typeof result.response === 'object') {
        isJsonParsed = true;
      }

      // If we have a successfully parsed or original object
      if (isJsonParsed && typeof parsedResponse === 'object') {
        let text = parsedResponse;
        let addText = '';
        // Check if response has content[0].text structure and extract text
        if (Array.isArray(parsedResponse?.content) && parsedResponse.content[0]?.text) {
          const textContent = parsedResponse.content[0].text;
          parsedResponse.content[0].text = '📋';
          text = parsedResponse;
          addText = `## Formatted Text 📋\n${mdText(textContent)}\n\n`;
        }
        responseText = `## Response\n\n${mdJson(text)}\n\n${addText}`;
      }

    } catch {
      // Fallback to text if any parsing errors
      responseText = `## Response\n\n${mdText(String(result.response))}\n\n`;
    }
  }

  return `${resultStatus} / ${result.timestamp} / ${result.duration}ms
# ${result.toolName}
${requestHeaders}
${mdDescr(result.description)}

parameters:
${mdJson(result.parameters)}

${responseText}${errorText}`;
};

/**
 * Log test result to individual file
 */
export const logResultToFile = async (result: ITestResult) => {
  // const filename = `${result.fullId}_${result.toolName}.md`;
  const filename = `${result.toolName}.md`;
  const filepath = path.join(RESULTS_DIR, filename);

  const content = formatResultAsMarkdown(result);

  try {
    await fsp.writeFile(filepath, content, 'utf-8');
  } catch (error: Error | any) {
    console.log(chalk.red(`  Failed to write log file: ${error.message}`));
  }
};
