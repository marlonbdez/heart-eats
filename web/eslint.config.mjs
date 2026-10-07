import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      '.next/',
      'out/',
      'next-env.d.ts',
      'public/maplibre/',
      'playwright-report/',
      'test-results/',
    ],
  },
];

export default eslintConfig;
