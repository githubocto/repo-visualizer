# Repo Visualizer

A GitHub Action that creates an SVG diagram of your repo. Read more [in the writeup](https://octo.github.com/projects/repo-visualization).

**Please note that this is an experiment. If you have feature requests, please submit a PR or fork and use the code any way you need.**

For a full demo, check out the [githubocto/repo-visualizer-demo](https://github.com/githubocto/repo-visualizer-demo) repository.

## Inputs

## `output_file`

A path (relative to the root of your repo) to where you would like the diagram to live.

For example: images/diagram.svg

Default: diagram.svg

## `excluded_paths`

A list of paths to folders to exclude from the diagram, separated by commas.

For example: dist,node_modules

Default: node_modules,bower_components,dist,out,build,eject,.next,.netlify,.yarn,.vscode,package-lock.json,yarn.lock

## `excluded_globs`

A semicolon-delimited array of file [globs](https://globster.xyz/) to exclude from the diagram, using [micromatch](https://github.com/micromatch/micromatch) syntax. Provided as an array.

For example:

```yaml
excluded_globs: 'frontend/*.spec.js;**/*.{png,jpg};**/!(*.module).ts'
# Guide:
# - 'frontend/*.spec.js' # exclude frontend tests
# - '**/*.{png,ico,md}'  # all png, ico, md files in any directory
# - '**/!(*.module).ts'  # all TS files except module files
```

## `root_path`

The directory (and its children) that you want to visualize in the diagram, relative to the repository root.

For example: `src/`

Default: `''` (current directory)

## `max_depth`

The maximum number of nested folders to show files within. A higher number will take longer to render.

Default: 9

## `commit_message`

The commit message to use when updating the diagram. Useful for skipping CI. For example: `Updating diagram [skip ci]`

Default: `Repo visualizer: updated diagram`

## `branch`

The branch name to push the diagram to (branch will be created if it does not yet exist).

For example: `diagram`

## Example usage

You'll need to run the `actions/checkout` Action beforehand, to check out the code.

```yaml
- name: Checkout code
  uses: actions/checkout@master
- name: Update diagram
  uses: githubocto/repo-visualizer@0.6.1
  with:
    output_file: "images/diagram.svg"
    excluded_paths: "dist,node_modules"
```
