# Repo Visualizer

A GitHub Action that creates an SVG diagram of your repo. Read more [in the writeup](https://octo.github.com/projects/repo-visualization).

**Please note that this is an experiment. If you have feature requests, please submit a PR or fork and use the code any way you need.**

For a full demo, check out the [githubocto/repo-visualizer-demo](https://github.com/githubocto/repo-visualizer-demo) repository.

## Inputs

### `output_file`

A path (relative to the root of your repo) to where you would like the diagram to live.

For example: images/diagram.svg

Default: diagram.svg

### `excluded_paths`

A list of paths to folders to exclude from the diagram, separated by commas.

For example: dist,node_modules

Default: node_modules,bower_components,dist,out,build,eject,.next,.netlify,.yarn,.vscode,package-lock.json,yarn.lock

### `excluded_globs`

A semicolon-delimited array of file [globs](https://globster.xyz/) to exclude from the diagram, using [micromatch](https://github.com/micromatch/micromatch) syntax. Provided as an array.

For example:

```yaml
excluded_globs: "frontend/*.spec.js;**/*.{png,jpg};**/!(*.module).ts"
# Guide:
# - 'frontend/*.spec.js' # exclude frontend tests
# - '**/*.{png,ico,md}'  # all png, ico, md files in any directory
# - '**/!(*.module).ts'  # all TS files except module files
```

### `root_path`

The directory (and its children) that you want to visualize in the diagram, relative to the repository root.

For example: `src/`

Default: `''` (current directory)

### `max_depth`

The maximum number of nested folders to show files within. A higher number will take longer to render.

Default: 9

### `should_push`

Whether to make a new commit with the diagram and push it to the original repository.

Should be a boolean value, i.e. `true` or `false`. See `commit_message` and `branch` for how to customise the commit.

Default: `true`

### `commit_message`

The commit message to use when updating the diagram. Useful for skipping CI. For example: `Updating diagram [skip ci]`

Default: `Repo visualizer: updated diagram`

### `branch`

The branch name to push the diagram to (branch will be created if it does not yet exist).

For example: `diagram`

### `artifact_name`

The name of an [artifact](https://docs.github.com/en/actions/guides/storing-workflow-data-as-artifacts) to create containing the diagram.

If unspecified, no artifact will be created.

Default: `''` (no artifact)

### `file_colors`

You can customize the colors for specific file extensions. Key/value pairs will extend the [default colors](https://github.com/githubocto/repo-visualizer/pull/src/language-colors.json).

For example: '{"js": "red","ts": "green"}'
default: '{}'

## Outputs

### `svg`

The contents of the diagram as text. This can be used if you don't want to handle new files.

## Example usage

You'll need to run the `actions/checkout` Action beforehand, to check out the code.

```yaml
- name: Checkout code
  uses: actions/checkout@master
- name: Update diagram
  uses: githubocto/repo-visualizer@0.7.1
  with:
    output_file: "images/diagram.svg"
    excluded_paths: "dist,node_modules"
```


## Accessing the diagram

By default, this action will create a new commit with the diagram on the specified branch.

If you want to avoid new commits, you can create an artifact to accompany the workflow run,
by specifying an `artifact_name`. You can then download the diagram using the
[`actions/download-artifact`](https://github.com/marketplace/actions/download-a-build-artifact)
action from a later step in your workflow,
or by using the [GitHub API](https://docs.github.com/en/rest/reference/actions#artifacts).

Example:
```yaml
- name: Update diagram
  id: make_diagram
  uses: githubocto/repo-visualizer@0.7.1
  with:
    output_file: "output-diagram.svg"
    artifact_name: "my-diagram"
- name: Get artifact
  uses: actions/download-artifact@v2
  with:
    name: "my-diagram"
    path: "downloads"
```
In this example, the diagram will be available at downloads/my-diagram.svg
Note that this will still also create a commit, unless you specify `should_push: false`!

Alternatively, the SVG description of the diagram is available in the `svg` output,
which you can refer to in your workflow as e.g. `${{ steps.make_diagram.outputs.svg }}`.
