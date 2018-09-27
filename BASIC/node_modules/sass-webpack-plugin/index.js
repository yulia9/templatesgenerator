'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var path = _interopDefault(require('path'));
var lodash = _interopDefault(require('lodash'));
var sass = _interopDefault(require('node-sass'));
var postcss = _interopDefault(require('postcss'));
var autoprefixer = _interopDefault(require('autoprefixer'));

var _createClass$1 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck$1(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var EXCLUDE_PATTERN = /node_modules|bower_components/;

function addDep(list, item) {
  if (typeof list.has === 'function') {
    if (!list.has(item)) list.add(item);
  } else {
    if (list.indexOf(item) === -1) list.push(item);
  }
}

var Audit = function () {
  function Audit(rootDir) {
    _classCallCheck$1(this, Audit);

    this.rootDir = rootDir;
    this.includedFiles = [];
    this.result = null;
    this.lastStartAt = null;
    this.hash = null;
  }

  _createClass$1(Audit, [{
    key: 'isUpToDay',
    value: function isUpToDay(timestamps) {
      if (this.lastStartAt) {
        var maxTimestamp = this.includedFiles.reduce(function (acc, key) {
          if (timestamps[key] && acc < timestamps[key]) {
            return timestamps[key];
          } else {
            return acc;
          }
        }, 0);

        if (this.lastStartAt < maxTimestamp) {
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
  }, {
    key: 'track',
    value: function track(stats) {
      this.result = {
        includedFiles: stats.includedFiles.filter(function (file) {
          return !EXCLUDE_PATTERN.test(file);
        }),
        start: stats.start
      };
    }
  }, {
    key: 'handle',
    value: function handle(compilation) {
      if (this.result !== null) {
        this.lastStartAt = this.result.start;
        this.includedFiles = this.result.includedFiles;
        this.result = null;
      }

      addDep(compilation.contextDependencies, this.rootDir);
      this.includedFiles.forEach(function (file) {
        return addDep(compilation.fileDependencies, file);
      });
      if (this.hash && this.hash !== 'init') compilation.modifyHash(this.hash);
    }
  }]);

  return Audit;
}();

var _createClass$2 = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck$2(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var toSassOptions = function toSassOptions(file, outFile, options) {
  var result = Object.assign({ file }, options.sass);
  if (options.sourceMap) {
    result.sourceMap = true;
    result.outFile = outFile;
  }
  return result;
};

var strToAsset = function strToAsset(_source) {
  return {
    source: function source() {
      return _source;
    },
    size: function size() {
      return Buffer.byteLength(_source);
    }
  };
};

var bufferToAsset = function bufferToAsset(_source2) {
  return {
    source: function source() {
      return _source2;
    },
    size: function size() {
      return _source2.byteLength;
    }
  };
};

var _class = function () {
  function _class(file, outFile, options) {
    _classCallCheck$2(this, _class);

    this.file = file;
    this.outFile = outFile;
    this.sass = toSassOptions(file, outFile, options);
    this.withMapFile = this.sass.sourceMap && !this.sass.sourceMapEmbed;
    this.withAutoprefix = options.autoprefixer;
  }

  _createClass$2(_class, [{
    key: 'process',
    value: function process() {
      var _this = this;

      return new Promise(function (resolve, reject) {
        sass.render(_this.sass, function (err, sassResult) {
          if (err) return reject(err);

          var css = sassResult.css,
              map = sassResult.map;

          var output = [sassResult.stats];

          if (_this.withAutoprefix) {
            _this.autoprefix(css, map).then(function (postcssResult) {
              output.push(strToAsset(postcssResult.css));
              if (_this.withMapFile) {
                output.push(strToAsset(postcssResult.map.toString()));
              }
              resolve(output);
            });
          } else {
            output.push(bufferToAsset(css));
            if (_this.withMapFile) {
              output.push(bufferToAsset(map));
            }
            resolve(output);
          }
        });
      });
    }
  }, {
    key: 'autoprefix',
    value: function autoprefix(sassCss, sassMap) {
      var postcssConfig = { from: this.file, to: this.outFile };
      if (this.withMapFile) {
        postcssConfig.map = {
          annotation: false,
          sourceMapContents: this.sass.sourceMapContents,
          prev: sassMap.toString()
        };
      }
      return postcss([autoprefixer()]).process(sassCss, postcssConfig);
    }
  }]);

  return _class;
}();

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var MARK = 'sass-webpack-plugin';

var toFilename = function toFilename(originFile) {
  return path.basename(originFile).replace(/(scss|sass)$/i, 'css');
};

var wrapError = function wrapError(err) {
  var header = MARK;
  if (err.file && err.line) {
    header = `${header} ${err.file}:${err.line}`;
  }
  return new Error(`${header}\n\n${err.message}\n`);
};

// eslint-disable-next-line no-console
var printLine = function printLine(message) {
  return console.log(`[${MARK}] ${message}`);
};
var printConfigWarning = function printConfigWarning(message) {
  printLine(`${message}`);
  printLine('Please check the valid options at https://www.npmjs.com/package/sass-webpack-plugin');
};

var processFiles = function processFiles(files) {
  if (typeof files === 'string') {
    return { [path.resolve(files)]: toFilename(files) };
  } else if (Array.isArray(files)) {
    return files.reduce(function (acc, file) {
      acc[path.resolve(file)] = toFilename(file);
      return acc;
    }, {});
  } else if (typeof files === 'object') {
    return Object.keys(files).reduce(function (acc, file) {
      acc[path.resolve(file)] = files[file];
      return acc;
    }, {});
  } else {
    printConfigWarning('files argument should be string | array | object');
    process.exit(1);
  }
};

var KNOWN_OPTIONS = ['sourceMap', 'sass', 'autoprefixer'];
var processConfig = function processConfig(mode, config) {
  var options = { sourceMap: true, sass: { sourceMapContents: true } };

  if (mode === 'development' || mode === undefined) {
    options.sass.indentedSyntax = true;
    options.sass.indentWidth = 2;
    options.sass.sourceComments = true;
  } else if (mode === 'production') {
    options.sass.outputStyle = 'compressed';
    options.autoprefixer = true;
  } else if (typeof mode === 'object') {
    config = mode;
  }

  if (typeof config === 'object') {
    var unknownKeys = Object.keys(config).filter(function (key) {
      return KNOWN_OPTIONS.indexOf(key) === -1;
    });
    if (unknownKeys.length > 0) {
      printConfigWarning(`Only ${KNOWN_OPTIONS.join(',')} are valid options`);
    }
    lodash.merge(options, config);
  }

  return options;
};

var SassPlugin = function () {
  function SassPlugin(files, mode, config) {
    _classCallCheck(this, SassPlugin);

    this.files = processFiles(files);
    this.options = processConfig(mode, config);
  }

  _createClass(SassPlugin, [{
    key: 'apply',
    value: function apply(compiler) {
      var _this = this;

      Object.keys(this.files).forEach(function (file) {
        var audit = new Audit(path.dirname(file));
        var outFile = _this.files[file];
        var processor = new _class(file, outFile, _this.options);

        compiler.plugin('compilation', function (compilation) {
          // skip child compilers
          if (compilation.compiler !== compiler) return;

          if (audit.isUpToDay(compilation.fileTimestamps)) return;

          compilation.plugin('additional-assets', function (cb) {
            processor.process().then(function (_ref) {
              var _ref2 = _slicedToArray(_ref, 3),
                  stats = _ref2[0],
                  asset = _ref2[1],
                  sourceMaps = _ref2[2];

              audit.track(stats);
              compilation.assets[outFile] = asset;
              if (sourceMaps) {
                compilation.assets[`${outFile}.map`] = sourceMaps;
              }
              cb();
            }, function (err) {
              compilation.errors.push(wrapError(err));
              cb();
            });
          });
        });

        compiler.plugin('after-emit', function (compilation, cb) {
          audit.handle(compilation);
          cb();
        });
      });
    }
  }]);

  return SassPlugin;
}();

module.exports = SassPlugin;
