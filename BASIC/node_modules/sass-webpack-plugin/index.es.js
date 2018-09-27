import path from 'path';
import lodash from 'lodash';
import sass from 'node-sass';
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';

const EXCLUDE_PATTERN = /node_modules|bower_components/;

function addDep(list, item) {
    if(typeof list.has === 'function') {
        if(!list.has(item)) list.add(item);
    } else {
        if(list.indexOf(item) === -1) list.push(item);
    }
}

class Audit {
  constructor(rootDir) {
    this.rootDir = rootDir;
    this.includedFiles = [];
    this.result = null;
    this.lastStartAt = null;
    this.hash = null;
  }

  isUpToDay(timestamps) {
    if(this.lastStartAt) {
      var maxTimestamp = this.includedFiles.reduce(function(acc, key) {
        if(timestamps[key] && acc < timestamps[key]) {
          return timestamps[key];
        } else {
          return acc;
        }
      }, 0);

      if(this.lastStartAt < maxTimestamp) {
        this.hash = maxTimestamp.toString();
      } else {
        this.hash = null;
        return true;
      }
    } else {
      this.hash = 'init';
    }

    return false;
  }

  track(stats) {
    this.result = {
      includedFiles: stats.includedFiles.filter(file => !EXCLUDE_PATTERN.test(file)),
      start: stats.start
    };
  }

  handle(compilation) {
    if(this.result !== null) {
      this.lastStartAt = this.result.start;
      this.includedFiles = this.result.includedFiles;
      this.result = null;
    }

    addDep(compilation.contextDependencies, this.rootDir);
    this.includedFiles.forEach(file => addDep(compilation.fileDependencies, file));
    if(this.hash && this.hash !== 'init') compilation.modifyHash(this.hash);
  }
}

const toSassOptions = (file, outFile, options) => {
  let result = Object.assign({ file }, options.sass);
  if(options.sourceMap) {
    result.sourceMap = true;
    result.outFile = outFile;
  }
  return result;
};

const strToAsset = source => ({
  source: () => source,
  size: () => Buffer.byteLength(source)
});

const bufferToAsset = source => ({
  source: () => source,
  size: () => source.byteLength
});


var Processor = class {
  constructor(file, outFile, options) {
    this.file = file;
    this.outFile = outFile;
    this.sass = toSassOptions(file, outFile, options);
    this.withMapFile = this.sass.sourceMap && !this.sass.sourceMapEmbed;
    this.withAutoprefix = options.autoprefixer;
  }

  process() {
    return new Promise((resolve, reject) => {
      sass.render(this.sass, (err, sassResult) => {
        if(err) return reject(err);

        let { css, map } = sassResult;
        let output = [sassResult.stats];

        if(this.withAutoprefix) {
          this.autoprefix(css, map).then(postcssResult => {
            output.push(strToAsset(postcssResult.css));
            if(this.withMapFile) {
              output.push(strToAsset(postcssResult.map.toString()));
            }
            resolve(output);
          });
        } else {
          output.push(bufferToAsset(css));
          if(this.withMapFile) {
            output.push(bufferToAsset(map));
          }
          resolve(output);
        }
      });
    });
  }

  autoprefix(sassCss, sassMap) {
    let postcssConfig = { from: this.file, to: this.outFile };
    if(this.withMapFile) {
      postcssConfig.map = {
        annotation: false,
        sourceMapContents: this.sass.sourceMapContents,
        prev: sassMap.toString()
      };
    }
    return postcss([autoprefixer()]).process(sassCss, postcssConfig);
  }
};

const MARK = 'sass-webpack-plugin';

const toFilename = originFile => path.basename(originFile).replace(/(scss|sass)$/i, 'css');

const wrapError = err => {
  let header = MARK;
  if(err.file && err.line) {
    header = `${header} ${err.file}:${err.line}`;
  }
  return new Error(`${header}\n\n${err.message}\n`);
};

// eslint-disable-next-line no-console
const printLine = message => console.log(`[${MARK}] ${message}`);
const printConfigWarning = message => {
  printLine(`${message}`);
  printLine('Please check the valid options at https://www.npmjs.com/package/sass-webpack-plugin');
};

const processFiles = files => {
  if(typeof files === 'string') {
    return { [path.resolve(files)]: toFilename(files) };
  } else if(Array.isArray(files)) {
    return files.reduce((acc, file) => {
      acc[path.resolve(file)] = toFilename(file);
      return acc;
    }, {});
  } else if(typeof files === 'object') {
    return Object.keys(files).reduce((acc, file) => {
      acc[path.resolve(file)] = files[file];
      return acc;
    }, {});
  } else {
    printConfigWarning('files argument should be string | array | object');
    process.exit(1);
  }
};

const KNOWN_OPTIONS = ['sourceMap', 'sass', 'autoprefixer'];
const processConfig = (mode, config) => {
  let options = { sourceMap: true, sass: { sourceMapContents: true } };

  if(mode === 'development' || mode === undefined) {
    options.sass.indentedSyntax = true;
    options.sass.indentWidth = 2;
    options.sass.sourceComments = true;
  } else if(mode === 'production') {
    options.sass.outputStyle = 'compressed';
    options.autoprefixer = true;
  } else if(typeof mode === 'object') {
    config = mode;
  }

  if(typeof config === 'object') {
    let unknownKeys = Object.keys(config).filter(key => KNOWN_OPTIONS.indexOf(key) === -1);
    if(unknownKeys.length > 0) {
      printConfigWarning(`Only ${KNOWN_OPTIONS.join(',')} are valid options`);
    }
    lodash.merge(options, config);
  }

  return options;
};

class SassPlugin {
  constructor(files, mode, config) {
    this.files = processFiles(files);
    this.options = processConfig(mode, config);
  }

  apply(compiler) {
    Object.keys(this.files).forEach(file => {
      let audit = new Audit(path.dirname(file));
      let outFile = this.files[file];
      let processor = new Processor(file, outFile, this.options);

      compiler.plugin('compilation', (compilation) => {
        // skip child compilers
        if(compilation.compiler !== compiler) return;

        if(audit.isUpToDay(compilation.fileTimestamps)) return;

        compilation.plugin('additional-assets', cb => {
          processor.process().then(([stats, asset, sourceMaps]) => {
            audit.track(stats);
            compilation.assets[outFile] = asset;
            if(sourceMaps) {
              compilation.assets[`${outFile}.map`] = sourceMaps;
            }
            cb();
          }, err => {
            compilation.errors.push(wrapError(err));
            cb();
          });
        });
      });

      compiler.plugin('after-emit', (compilation, cb) => {
        audit.handle(compilation);
        cb();
      });
    });
  }
}

export default SassPlugin;
