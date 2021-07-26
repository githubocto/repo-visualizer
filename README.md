# Repo Visualizer

A GitHub Action that creates an SVG diagram of your repo.

## Inputs

## `output_file`

A path (relative to the root of your repo) to where you would like the diagram to live.

For example: images/diagram.svg

Default: diagram.svg

## `excluded_paths`

A list of paths to exclude from the diagram.

For example: dist

Default: ""

## Example usage

You'll need to run the `actions/checkout` Action beforehand, to check out the code.

```
- name: Checkout code
  uses: actions/checkout@master
- name: Update diagram
  uses: githubocto/repo-visualizer@main
  with:
    output_file: 'images/diagram.svg'
```
