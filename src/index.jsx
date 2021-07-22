import * as core from '@actions/core'
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import fs from "fs"

import { processDir } from "./process-dir.js"
import { Tree } from "./Tree.tsx"

const main = async () => {
  core.info('[INFO] Usage https://github.com/githubocto/repo-visualizer#readme')

  const data = await processDir(`./`);

  const componentCodeString = ReactDOMServer.renderToStaticMarkup(<Tree data={data} />);

  const outputFile = core.getInput("output_file") || "./diagram.svg"

  await fs.writeFileSync(outputFile, componentCodeString)
  console.log("All set!")
}

main()
