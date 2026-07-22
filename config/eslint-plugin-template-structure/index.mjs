import noDeepRelativeImport from './rules/no-deep-relative-import.mjs';
import noSpecOutsideE2e from './rules/no-spec-outside-e2e.mjs';
import actionsPurity from './rules/actions-purity.mjs';
import noUiKebabFilename from './rules/no-ui-kebab-filename.mjs';
import uiLayerImportDirection from './rules/ui-layer-import-direction.mjs';
import noFeatureUiTiers from './rules/no-feature-ui-tiers.mjs';
import noCrossPageImport from './rules/no-cross-page-import.mjs';
import requireUiStory from './rules/require-ui-story.mjs';
import requireUiUnitTest from './rules/require-ui-unit-test.mjs';
import noDirectApiFetch from './rules/no-direct-api-fetch.mjs';
import noArbitraryTailwind from './rules/no-arbitrary-tailwind.mjs';
import noConsoleInApiRoutes from './rules/no-console-in-api-routes.mjs';
import requireElementId from './rules/require-element-id.mjs';
import requireHtmlAttributesProps from './rules/require-html-attributes-props.mjs';
import noConsole from './rules/no-console.mjs';

/** @type {import('eslint').ESLint.Plugin} */
const templateStructurePlugin = {
  meta: {
    name: 'eslint-plugin-template-structure',
    version: '1.1.0',
  },
  rules: {
    'no-deep-relative-import': noDeepRelativeImport,
    'no-spec-outside-e2e': noSpecOutsideE2e,
    'actions-purity': actionsPurity,
    'no-ui-kebab-filename': noUiKebabFilename,
    'ui-layer-import-direction': uiLayerImportDirection,
    'no-feature-ui-tiers': noFeatureUiTiers,
    'no-cross-page-import': noCrossPageImport,
    'require-ui-story': requireUiStory,
    'require-ui-unit-test': requireUiUnitTest,
    'no-direct-api-fetch': noDirectApiFetch,
    'no-arbitrary-tailwind': noArbitraryTailwind,
    'no-console-in-api-routes': noConsoleInApiRoutes,
    'require-element-id': requireElementId,
    'require-html-attributes-props': requireHtmlAttributesProps,
    'no-console': noConsole,
  },
};

export default templateStructurePlugin;
