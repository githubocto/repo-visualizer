import { exec } from '@actions/exec'
import * as core from '@actions/core'
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import fs from "fs"

import { processDir } from "./process-dir.js"
import { Tree } from "./Tree.tsx"

const main = async () => {
  core.info('[INFO] Usage https://github.com/githubocto/repo-visualizer#readme')

  core.startGroup('Configuration')
  const username = 'repo-visualizer'
  await exec('git', ['config', 'user.name', username])
  await exec('git', [
    'config',
    'user.email',
    `${username}@users.noreply.github.com`,
  ])

  core.endGroup()


  const excludedPathsString = core.getInput("excluded_paths") || "node_modules,bower_components,dist,out,build,eject,.next,.netlify,.yarn,.git,.vscode,package-lock.json,yarn.lock"
  const excludedPaths = excludedPathsString.split(",").map(str => str.trim())
  const data = await processDir(`./`, excludedPaths);

  const componentCodeString = ReactDOMServer.renderToStaticMarkup(
    <Tree data={data} />
  );

  const outputFile = core.getInput("output_file") || "./diagram.svg"

  await fs.writeFileSync(outputFile, componentCodeString)

  await exec('git', ['add', outputFile])
  const diff = await execWithOutput('git', ['status', '--porcelain', outputFile])
  core.info(`diff: ${diff}`)
  if (!diff) {
    core.info('[INFO] No changes to the repo detected, exiting')
    return
  }

  await exec('git', ['commit', '-m', "Repo visualizer: updated diagram"])
  await exec('git', ['push'])

  console.log("All set!")
}

main()

function execWithOutput(command, args) {
  return new Promise((resolve, reject) => {
    try {
      exec(command, args, {
        listeners: {
          stdout: function (res) {
            core.info(res.toString())
            resolve(res.toString())
          },
          stderr: function (res) {
            core.info(res.toString())
            reject(res.toString())
          }
        }
      })
    } catch (e) {
      reject(e)
    }
  })
}

