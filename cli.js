#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

// Import the core functionality
const { generateDiagram, getDefaultExcludedPaths, validateOptions } = require('./src/core.js');

const program = new Command();

program
  .name('repo-visualizer')
  .description('Create SVG diagrams of repository structure')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate a repository visualization diagram')
  .option('-o, --output <file>', 'output file path', 'diagram.svg')
  .option('-p, --path <path>', 'root path to visualize', '')
  .option('-d, --max-depth <number>', 'maximum depth of nested folders', '9')
  .option('-e, --exclude <paths>', 'comma-separated list of paths to exclude', getDefaultExcludedPaths().join(','))
  .option('-g, --exclude-globs <globs>', 'semicolon-separated list of glob patterns to exclude', '')
  .option('-c, --color-encoding <type>', 'color encoding type (type, number-of-changes, last-change)', 'type')
  .option('--file-colors <json>', 'custom file colors as JSON string', '{}')
  .option('--width <number>', 'diagram width', '1000')
  .option('--height <number>', 'diagram height', '1000')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🔍 Analyzing repository structure...'));
      
      // Parse options
      const rootPath = options.path || '';
      const maxDepth = parseInt(options.maxDepth, 10);
      const excludedPaths = options.exclude.split(',').map(str => str.trim());
      const excludedGlobs = options.excludeGlobs ? options.excludeGlobs.split(';').map(str => str.trim()) : [];
      const colorEncoding = options.colorEncoding;
      const customFileColors = JSON.parse(options.fileColors);
      const outputFile = options.output;
      const width = parseInt(options.width, 10);
      const height = parseInt(options.height, 10);

      // Validate options
      const validation = validateOptions({
        maxDepth,
        width,
        height,
        colorEncoding,
        rootPath,
        customFileColors: options.fileColors
      });

      if (!validation.isValid) {
        validation.errors.forEach(error => {
          console.error(chalk.red(`❌ ${error}`));
        });
        process.exit(1);
      }

      console.log(chalk.blue(`📁 Processing directory: ${rootPath || '.'}`));
      console.log(chalk.blue(`📊 Max depth: ${maxDepth}`));
      console.log(chalk.blue(`🎨 Color encoding: ${colorEncoding}`));
      console.log(chalk.blue(`📄 Output file: ${outputFile}`));

      // Generate the diagram using the core module
      const result = await generateDiagram({
        rootPath,
        maxDepth,
        excludedPaths,
        excludedGlobs,
        colorEncoding,
        customFileColors,
        outputFile
      });

      if (!result.success) {
        console.error(chalk.red(`❌ ${result.error}`));
        process.exit(1);
      }

      console.log(chalk.green(`✅ Diagram generated successfully: ${result.outputFile}`));
      console.log(chalk.gray(`📏 File size: ${result.fileSizeKB} KB`));
      
    } catch (error) {
      console.error(chalk.red('❌ Error generating diagram:'), error.message);
      process.exit(1);
    }
  });

program
  .command('info')
  .description('Show information about the repository visualizer')
  .action(() => {
    console.log(chalk.blue.bold('📊 Repository Visualizer'));
    console.log(chalk.gray('A tool to create SVG diagrams of repository structure'));
    console.log('');
    console.log(chalk.yellow('Usage:'));
    console.log('  repo-visualizer generate [options]');
    console.log('');
    console.log(chalk.yellow('Examples:'));
    console.log('  repo-visualizer generate');
    console.log('  repo-visualizer generate -o my-diagram.svg');
    console.log('  repo-visualizer generate -p src -d 5');
    console.log('  repo-visualizer generate --exclude "node_modules,dist" --exclude-globs "*.test.js;**/*.spec.ts"');
    console.log('');
    console.log(chalk.yellow('For more information, run:'));
    console.log('  repo-visualizer generate --help');
  });

// Handle unknown commands
program.on('command:*', () => {
  console.error(chalk.red('❌ Invalid command. See --help for available commands.'));
  process.exit(1);
});

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
