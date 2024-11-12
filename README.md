# WordPress Release Action

## Overview

The WordPress Release Action simplifies the process of creating standardized releases for WordPress plugins or themes. It automates the generation of metadata files, packages your code, and creates a GitHub release with the packaged code attached.

### Features

- Supports both WordPress plugins and themes
- Generates appropriate header files based on your `composer.json`
- Creates a (blank) fallback screenshot if needed for compatibility
- Packages your code into a zip file, excluding unnecessary files
- Creates a GitHub release with customizable options
- Allows inclusion of additional files in the release
- It uses `softprops/action-gh-release@v2` to handle the release

## Getting Started

Here's a minimal example to get you started:

```yaml
- name: WordPress Release
  uses: pfaciana/wordpress-release
  with:
    main-file: index.php
    release-tag: ${{ github.ref_name }}
```

This basic configuration will create a release whenever a new tag starting with 'v' is pushed.

## Usage

### Full Usage

Here's a more comprehensive example showcasing most of the action's features:

```yaml
name: Create WordPress Release

on:
  workflow_dispatch:
  push:
    branches:
      - master

jobs:
  create-release:
    runs-on: ubuntu-20.04
    permissions:
      contents: write
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Fetch all history for all branches and tags
          fetch-tags: true  # Fetch all tags

      - name: Create Release
        id: create_release
        uses: pfaciana/wordpress-release
        with:
          main-file: style.css
          fallback-screenshot: yes
          zip-ignore: .zipignore
          release-tag: ${{ needs.get-tag-name.outputs.tag-name }}
          release-body: ${{ needs.create-release-changelog.outputs.changelog }}
          additional-files: |
            CHANGELOG.md
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          DEBUG_MODE: ${{ vars.DEBUG_MODE || '0' }}
```

### Inputs

| Name                | Description                                                         | Required | Default                          |
|---------------------|---------------------------------------------------------------------|----------|----------------------------------|
| main-file           | Relative path to the loader file                                    | Yes      | `index.php`                      |
| main-file-prepend   | Content that will be prepended to the loader file                   | No       |                                  |
| main-file-append    | Content that will be appended to the loader file                    | No       |                                  |
| fallback-screenshot | If a transparent screenshot should be created when not found        | No       | `false`                          |
| zip-file            | Name of the `zip` file                                              | No       | `{repository-name}.zip`          |
| zip-ignore          | Location of the zip exclude file                                    | No       | `.zipignore` in action directory |
| release-tag         | Tag of the release                                                  | Yes      |                                  |
| release-name        | Name of the release                                                 | No       | Release {release-tag}            |
| release-body        | Body of the release                                                 | No       |                                  |
| release-draft       | If the release is a draft                                           | No       | `false`                          |
| release-prerelease  | If the release is a prerelease                                      | No       | `false`                          |
| additional-files    | Additional files to include in the release (one file path per line) | No       |                                  |

> The `zip-ignore` is a text file that gets passed to the `zip` command as an exclude file. If you have an `.gitattributes` file for your repo, you can pass that as the `zip-ignore` input, and a `git archive --format=zip` will get run in place of the `zip` command.

> It should be noted that inputs like `release-tag`, `release-body`, `additional-files` should be dynamically created in steps prior to calling this action. That will be custom to your specific repo and not detailed in this doc.

### Outputs

| Name         | Description                                          |
|--------------|------------------------------------------------------|
| project-name | The name of the project extracted from composer.json |

## Examples

### Theme Release with Custom Options

This example shows how to create a release for a WordPress theme with some custom options:

```yaml
name: Release Theme

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: WordPress Release
        uses: pfaciana/wordpress-release
        with:
          main-file: 'style.css'
          fallback-screenshot: 'true'
          zip-ignore: .gitattributes
          zip-file: 'my-custom-theme.zip'
          release-tag: ${{ github.ref_name }}
          release-name: 'Theme Update ${{ github.ref_name }}'
          release-body: |
            Check out our latest theme update!

            New features:
            - Improved responsiveness
            - New color schemes
          release-draft: 'true'
```

### Release with Additional Files

This example demonstrates how to include additional files in your release:

```yaml
name: Release with Docs

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: WordPress Release
        uses: pfaciana/wordpress-release
        with:
          main-file: 'plugin-loader.php'
          release-tag: ${{ github.ref_name }}
          additional-files: |
            README.md
            docs/user-guide.pdf
            assets/banner.png
```

## FAQ

### Q: Does this action work for both plugins and themes?

A: Yes, this action supports both WordPress plugins and themes. It determines the type based on the extension of the main file you specify (`.php` for plugins, `.css` for themes).

### Q: Can I customize which files are included in the zip?

A: Absolutely! You can create a custom `.zipignore` file in your repository and specify its location using the `zip-ignore` input. This file works similarly to `.gitignore`, allowing you to exclude specific files or directories from the release zip.

### Q: What happens if I don't have a screenshot for my theme?

A: If you set `fallback-screenshot` to `true` and no screenshot is found, the action will create a transparent 1x1 pixel PNG file named `screenshot.png`. This ensures your theme meets WordPress requirements.

### Q: What happens if I set `fallback-screenshot` to `true` but my theme already has a screenshot?

A: If you set `fallback-screenshot` to `true` and your theme already has a valid screenshot file (e.g., `screenshot.png`, `screenshot.jpg`, etc.), the action will not create a new fallback screenshot. It only creates a fallback transparent screenshot when no existing screenshot is found. This ensures that your existing, custom screenshot is preserved and used for your theme.

### Q: Does this action handle version bumping?

A: No, this action does not automatically bump version numbers. You should manage your versioning separately, typically by pushing a new tag to trigger the release workflow.

### Q: How does this action handle dependencies?

A: This action does not directly manage your project's dependencies. It assumes that your project's dependencies are already installed and properly managed. For PHP dependencies managed by Composer, the action will run `composer install --no-dev` and `composer dumpautoload -o` to ensure optimized autoloading in the release.

### Q: Can I use this action for non-WordPress projects?

A: While this action is specifically designed for WordPress plugins and themes, you could potentially use it for other PHP projects. However, you would lose many of the WordPress-specific benefits, such as automatic header generation. For non-WordPress projects, you might want to consider a more general-purpose release action.

### Q: Does this action support multisite WordPress installations?

A: Yes, this action creates releases that are compatible with both single-site and multisite WordPress installations. However, if your plugin or theme has specific multisite features or requirements, you'll need to handle those in your code.

### Q: How does the action handle large plugins or themes?

A: The action should work fine for most plugin and theme sizes. However, if you have a particularly large project, you might encounter GitHub's file size limits (currently 2GB for release assets). In such cases, you may need to consider alternative distribution methods for your full package.

### Q: Can I use this action to release to the WordPress.org repository?

A: This action creates GitHub releases, not WordPress.org releases. However, you could potentially use the zip file created by this action as part of a separate workflow to deploy to WordPress.org. You would need to add additional steps to your workflow to handle the WordPress.org SVN deployment process.

### Q: Can I use this action to create pre-releases or draft releases?

A: Yes, you can use the `release-draft` and `release-prerelease` inputs to create draft releases or pre-releases respectively. This is useful for testing or staged rollouts.

### Q: How does this action handle assets like images or JavaScript files?

A: Any assets that are part of your repository and not excluded by your `.zipignore` file will be included in the release zip file. If you have specific assets you want to attach separately to the release, you can list them in the `additional-files` input.