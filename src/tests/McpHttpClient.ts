import { appConfig } from '../core/index.js';

export const getJsonFromResult = (result: any) => {
  if (appConfig.toolAnswerAs === 'structuredContent') {
    return result?.result?.structuredContent || result?.structuredContent;
  } else {
    const text = result?.result?.content?.[0]?.text || result?.content?.[0]?.text || '';
    try {
      return JSON.parse(text);
    } catch {
      //
    }
  }
  return undefined;
};


/**
 * MCP HTTP Client for testing
 */
export class McpHttpClient {
  private readonly baseUrl: any;
  private readonly customHeaders: object;
  private requestId: number;

  constructor (baseUrl: string, customHeaders: Record<string, string> = {}) {
    this.baseUrl = baseUrl;
    this.customHeaders = customHeaders;
    this.requestId = 1;
  }

  /**
   * Send MCP request over HTTP
   */
  async sendRequest (method: string, params = {}) {
    const requestId = this.requestId++;

    const headers = {
      'Content-Type': 'application/json',
      ...this.customHeaders,
    };

    const body = {
      jsonrpc: '2.0',
      id: requestId,
      method,
      params,
    };

    try {
      const response = await fetch(`${this.baseUrl}/mcp`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.requestHeaders = headers;
        throw error;
      }

      const data: any = await response.json();

      if (data.error) {
        const error: any = new Error(`MCP Error: ${data.error.message || JSON.stringify(data.error)}`);
        error.requestHeaders = headers;
        error.data = data.error.data;
        error.fullMcpResponse = data; // Save full MCP JSON-RPC response
        throw error;
      }

      const res = getJsonFromResult(data.result);
      if (res?.message) {
        console.log('  message:', res.message);
      }

      // Return both result and request headers
      return {
        result: data.result,
        requestHeaders: headers,
      };
    } catch (error: Error | any) {
      // Preserve headers in error for debugging
      if (!error.requestHeaders) {
        error.requestHeaders = headers;
      }
      throw error;
    }
  }

  async listTools () {
    const { result } = await this.sendRequest('tools/list');
    return result;
  }

  async callTool (toolName: string, parameters = {}) {
    return this.sendRequest('tools/call', {
      name: toolName,
      arguments: parameters,
    });
  }

  async listResources () {
    const { result } = await this.sendRequest('resources/list');
    return result;
  }

  async readResource (uri: string) {
    return this.sendRequest('resources/read', {
      uri,
    });
  }

  async listPrompts () {
    const { result } = await this.sendRequest('prompts/list');
    return result;
  }

  async getPrompt (name: string, arguments_: Record<string, any> = {}) {
    return this.sendRequest('prompts/get', {
      name,
      arguments: arguments_,
    });
  }

  async ping () {
    return this.sendRequest('ping');
  }

  async health () {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }
}
