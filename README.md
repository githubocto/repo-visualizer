# Repo Visualizer

A GitHub Action that creates an SVG diagram of your repo.

## Inputs

## `github_token` **required**

We need your GitHub token to update the diagram. Specify it like:
`github_token: ${{ secrets.GITHUB_TOKEN }}`

## `output_file`

A path (relative to the root of your repo) to where you would like the diagram to live. For example: images/diagram.svg. Default: diagram.svg

## Example usage

```
uses: githubocto/repo-visualizer@v1.0
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    output_file: 'images/diagram.svg'
```
