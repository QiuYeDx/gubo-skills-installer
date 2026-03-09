#!/usr/bin/env node
import { main } from '../src/install.mjs';

main().catch((err) => {
  if (err.name === 'ExitPromptError') {
    console.log('\n\n  已取消安装。\n');
    process.exit(0);
  }
  console.error(err);
  process.exit(1);
});
