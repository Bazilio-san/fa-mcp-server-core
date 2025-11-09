/**
 * MCP Resources for Agent
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ROOT_PROJECT_DIR } from '../constants.js';
import { appConfig, getProjectData } from '../bootstrap/init-config.js';
import { IRequiredHttpHeader, IResourceData } from '../_types_/types.js';

let readme = fs.readFileSync(path.join(ROOT_PROJECT_DIR, './README.md'), 'utf-8');
let packageJson: any;
try {
  packageJson = JSON.parse(fs.readFileSync(path.join(ROOT_PROJECT_DIR, './package.json'), 'utf-8'));
  readme = readme.replace(/\[!\[Version]\([^)]+\)]\(([^)]+\))/, `Version: ${packageJson.version}`);
} catch (err) {
  console.error(err);
}


const createResources = (): IResourceData[] => {
  let { customResources, requiredHttpHeaders } = getProjectData();
  customResources = (customResources || []) as IResourceData[];
  const resources: IResourceData[] = [
    {
      uri: 'doc://readme',
      name: `README - ${appConfig.productName}`,
      description: `${appConfig.productName} project documentation:
installation, launch (STDIO/HTTP), MCP API, configuration, testing and deployment.`,
      mimeType: 'text/plain',
      content: readme,
    },
  ];
  requiredHttpHeaders = (requiredHttpHeaders || []) as IRequiredHttpHeader[];
  if (requiredHttpHeaders.length) {
    resources.push(
      {
        uri: 'required://http-headers',
        name: 'Required http headers',
        description: 'Required http headers',
        mimeType: 'application/json',
        content: requiredHttpHeaders,
      },
    );
  }
  return [...resources, ...customResources];
};

// Lazy initialization - resources are created when first accessed
let _resources: any[] | null = null;

const getResources = () => {
  if (!_resources) {
    _resources = createResources();
  }
  return _resources;
};

export const getResourcesList = () => {
  const resources = getResources();
  return {
    resources: resources.map(({ content, ...rest }) => ({ ...rest })),
  };
};

export const getResource = (uri: string) => {
  const resources = getResources();
  const resource = resources.find((r) => r.uri === uri);

  if (!resource) {
    throw new Error(`Unknown resource: ${uri}`);
  }

  return {
    contents: [
      {
        uri: resource.uri,
        mimeType: resource.mimeType,
        text: resource.content,
      },
    ],
  };
};
