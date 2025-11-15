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
 * MCP SSE Client for testing
 * Uses query parameters for request/response pattern
 */
export class McpSseClient {
  private readonly baseUrl: any;
  private readonly customHeaders: object;
  private requestId: number;

  constructor (baseUrl: string, customHeaders: Record<string, string> = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.customHeaders = customHeaders;
    this.requestId = 1;
  }

  /**
   * Send MCP request over SSE with query parameters
   */
  async sendRequest (method: string, params = {}): Promise<any> {
    const requestId = this.requestId++;
    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Request timeout for method: ${method}`));
      }, 30000); // 30 second timeout

      this.executeSSERequest(request).then(result => {
        clearTimeout(timeout);
        resolve(result);
      }).catch(error => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Execute SSE request with parameters in URL
   */
  private async executeSSERequest (request: any): Promise<any> {
    const url = new URL(`${this.baseUrl}/sse`);

    // Add request parameters as query parameters
    url.searchParams.set('request', JSON.stringify(request));

    // Add custom headers as query parameters
    Object.entries(this.customHeaders).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    return new Promise((resolve, reject) => {
      const eventSource = new EventSource(url.toString());

      const cleanup = () => {
        eventSource.close();
      };

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('SSE connection timeout'));
      }, 30000);

      eventSource.onopen = () => {
        console.log('SSE connection opened for request:', request.method);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Check if this is our response
          if (data.id === request.id) {
            clearTimeout(timeout);
            cleanup();

            if (data.error) {
              const errorObj = new Error(`MCP Error: ${data.error.message || JSON.stringify(data.error)}`);
              (errorObj as any).data = data.error.data;
              (errorObj as any).fullMcpResponse = data;
              reject(errorObj);
            } else {
              const res = getJsonFromResult(data.result);
              if (res?.message) {
                console.log('  message:', res.message);
              }

              resolve({
                result: data.result,
                requestHeaders: this.customHeaders,
              });
            }
          }
        } catch (error) {
          clearTimeout(timeout);
          cleanup();
          reject(error);
        }
      };

      eventSource.onerror = (error) => {
        clearTimeout(timeout);
        cleanup();
        reject(new Error(`SSE connection error: ${error}`));
      };
    });
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
