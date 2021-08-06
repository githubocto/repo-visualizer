# Repo Visualizer

A GitHub Action that creates an SVG diagram of your repo. Read more [in the writeup](https://octo.github.com/projects/repo-visualization).

**Please note that this is an experiment. If you have feature requests, please submit a PR or fork and use the code any way you need.**

For a full demo, check out the [githubocto/repo-visualizer](https://github.com/githubocto/repo-visualizer) repository.

## Inputs

## `output_file`

A path (relative to the root of your repo) to where you would like the diagram to live.

For example: images/diagram.svg

Default: diagram.svg

## `excluded_paths`

A list of paths to exclude from the diagram, separated by commas.

For example: dist,node_modules

Default: node_modules,bower_components,dist,out,build,eject,.next,.netlify,.yarn,.vscode,package-lock.json,yarn.lock

## `max_depth`

The maximum number of nested folders to show files within. A higher number will take longer to render.

Default: 5

## Example usage

You'll need to run the `actions/checkout` Action beforehand, to check out the code.

```yaml
- name: Checkout code
  uses: actions/checkout@master
- name: Update diagram
  uses: githubocto/repo-visualizer@main
  with:
    output_file: "images/diagram.svg"
    excluded_paths: "dist,node_modules"
    max_depth: 9
```
