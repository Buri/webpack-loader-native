'use strict'

const getOptions = require('loader-utils').getOptions
const defaultOptions = {
  mode: 'inline',
  external: {
    directory: () => __dirname,
    file: (file) => file,
    lockNodeVersion: true
  },
  static: {
    url: () => {
      throw new Error('Url is required argument for static link type')
    }
  },
  inline: {
    tempDir: 'os.tmpdir()',
    transient: false,
  }
}

const val = (op, ...args) => {
  if (typeof op === 'function') {
    return op(...args)
  }
  return op
}

module.exports = function(content) {
  const options = Object.assign({}, defaultOptions, getOptions(this))
  switch (options.mode) {
    case 'external':
      return external.call(this, content, options.external)
    case 'inline':
      return inline.call(this, content, options.inline)
    case 'static':
      return _static.call(this, content, options.static)
    default:
      throw new Error(`Invalid mode ${options.mode}, expected one of external, static, inline`)
  }
}
module.exports.raw = true

function external(content, opts) {
  throw new Error('This feature is not yet complete')
}

function _static(content, opts) {
  const filename = val(opts.url)
  return `try 
  {
    global.process.dlopen(module, '${filename}') 
  } catch(e) {
    throw new Error('Cannot open ${filename}: ' + e);
  }`
}

function inline(content, opts) {
  const lib = content.toString('base64')
  const filename = this.resourcePath.replace(/\//g, '_')
  return `
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const filename = path.join(${val(opts.tempDir)}, ${JSON.stringify(filename)});
    const lib = ${JSON.stringify(lib)};
  try 
  {
    const buffer = Buffer.from(lib, 'base64');
    fs.writeFileSync(filename, buffer);
    
    global.process.dlopen(module, filename);
    ${val(opts.transient) ? 'fs.unlinkSync(filename)' : ''}; 
  } catch(e) {
    throw new Error('Cannot open ' + filename + ': ' + e);
  }`
}