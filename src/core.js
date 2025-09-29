const React = require('react');
const ReactDOMServer = require('react-dom/server');
const fs = require('fs');
const { processDir } = require('./process-dir.js');

// Import Tree component - this will be resolved by ts-node
const { Tree } = require('./Tree.tsx');

/**
 * Generate a repository visualization diagram
 * @param {Object} options - Configuration options
 * @param {string} options.rootPath - Root path to visualize
 * @param {number} options.maxDepth - Maximum depth of nested folders
 * @param {string[]} options.excludedPaths - Array of paths to exclude
 * @param {string[]} options.excludedGlobs - Array of glob patterns to exclude
 * @param {string} options.colorEncoding - Color encoding type
 * @param {Object} options.customFileColors - Custom file colors
 * @param {string} options.outputFile - Output file path
 * @returns {Promise<Object>} Result object with success status and file info
 */
async function generateDiagram(options = {}) {
  const {
    rootPath = '',
    maxDepth = 9,
    excludedPaths = [],
    excludedGlobs = [],
    colorEncoding = 'type',
    customFileColors = {},
    outputFile = 'diagram.svg'
  } = options;

  try {
    // Process the directory
    const data = await processDir(rootPath, excludedPaths, excludedGlobs);
    
    if (!data) {
      throw new Error('Failed to process directory');
    }

    // Generate the SVG
    const componentCodeString = ReactDOMServer.renderToStaticMarkup(
      React.createElement(Tree, {
        data: data,
        maxDepth: maxDepth,
        colorEncoding: colorEncoding,
        customFileColors: customFileColors
      })
    );

    // Write the output file
    const outputDir = require('path').dirname(outputFile);
    if (outputDir !== '.' && !fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputFile, componentCodeString);
    
    const stats = fs.statSync(outputFile);
    
    return {
      success: true,
      outputFile: outputFile,
      fileSize: stats.size,
      fileSizeKB: (stats.size / 1024).toFixed(2)
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get default excluded paths
 * @returns {string[]} Array of default excluded paths
 */
function getDefaultExcludedPaths() {
  return [
    'node_modules',
    'bower_components',
    'dist',
    'out',
    'build',
    'eject',
    '.next',
    '.netlify',
    '.yarn',
    '.git',
    '.vscode',
    'package-lock.json',
    'yarn.lock'
  ];
}

/**
 * Validate configuration options
 * @param {Object} options - Configuration options to validate
 * @returns {Object} Validation result with isValid and errors
 */
function validateOptions(options) {
  const errors = [];
  
  if (options.maxDepth && (options.maxDepth < 1 || options.maxDepth > 20)) {
    errors.push('Max depth must be between 1 and 20');
  }
  
  if (options.width && (options.width < 100 || options.width > 5000)) {
    errors.push('Width must be between 100 and 5000 pixels');
  }
  
  if (options.height && (options.height < 100 || options.height > 5000)) {
    errors.push('Height must be between 100 and 5000 pixels');
  }
  
  if (options.colorEncoding && !['type', 'number-of-changes', 'last-change'].includes(options.colorEncoding)) {
    errors.push('Color encoding must be one of: type, number-of-changes, last-change');
  }
  
  if (options.rootPath && !fs.existsSync(options.rootPath)) {
    errors.push(`Root path '${options.rootPath}' does not exist`);
  }
  
  if (options.customFileColors) {
    try {
      if (typeof options.customFileColors === 'string') {
        JSON.parse(options.customFileColors);
      }
    } catch (e) {
      errors.push('Custom file colors must be valid JSON');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

module.exports = {
  generateDiagram,
  getDefaultExcludedPaths,
  validateOptions
};
