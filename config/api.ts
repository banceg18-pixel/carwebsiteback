import type { Core } from '@strapi/strapi';

const config: Core.Config.Api = {
  rest: {
    defaultLimit: 25,
    maxLimit: 500,
    withCount: true,
    strictParams: true,
  },
  documents: {
    strictParams: true,
  },
};

export default config;
