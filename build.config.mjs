// build.config.mjs
import { defineBuildConfig } from 'obuild/config';

export default defineBuildConfig({
  entries: [{ type: 'bundle', input: './src/cli.ts' }],
});
