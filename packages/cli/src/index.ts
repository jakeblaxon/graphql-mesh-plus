#!/usr/bin/env node
var fs = require("fs");
var nodeEval = require("node-eval");

function readModuleFile(path: string, callback: any) {
  try {
    var filename = require.resolve(path);
    fs.readFile(filename, "utf8", callback);
  } catch (e) {
    callback(e);
  }
}

var filename = require.resolve("@graphql-mesh/cli")
readModuleFile(filename, function (err: any, words: string) {
  words = words.replace(
    "const runtime = require('@graphql-mesh/runtime');",
    "const runtime = require('@graphql-mesh/runtime');"
    + "\nruntime.findAndParseConfig = require('@jakeblaxon-graphql-mesh/runtime').findAndParseConfig;"
  );
  module.exports = nodeEval(words, filename);
});
