const path = require('path');
const SassPlugin = require('sass-webpack-plugin');
const HtmlPlugin = require('html-webpack-plugin');
const PrettierPlugin = require("prettier-webpack-plugin");
const ExtractTextPlugin =  require("extract-text-webpack-plugin");

module.exports = {
  mode: 'development',
  // entry: {
  ///index: './src/js/main.js',
    //styles: './src/styles/main.scss'
  // },
  entry: ['./src/js/main.js', './src/styles/main.scss'],
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist')
  },
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    compress: true,
    port: 9000
  },
  plugins: [
    new PrettierPlugin({
      tabWidth: 2,                  // Specify the number of spaces per indentation-level.
      useTabs: false,               // Indent lines with tabs instead of spaces.
      semi: true,                   // Print semicolons at the ends of statements.
      encoding: 'utf-8',            // Which encoding scheme to use on files
      extensions: [ ".js", ".css", ".scss" ]
      }
    ),
    // new ExtractTextPlugin({ // define where to save the file
    //   filename: 'dist/index.css',
    //   allChunks: true,
    // }),
  ],
  module: {
    rules: [{
      test: /\.scss$/,
      use: [{
        loader: "style-loader"
      }, {
        loader: "css-loader"
      },
        {
        loader: "sass-loader",
      }
      ]
    },
      // { // sass / scss loader for webpack
      //   test: /\.scss$/,
      //   loader: ExtractTextPlugin.extract(['css-loader', 'sass-loader'])
      // }
    ]
  },
}