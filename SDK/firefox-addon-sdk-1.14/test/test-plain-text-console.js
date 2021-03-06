/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const prefs = require("sdk/preferences/service");
const { id, name } = require("sdk/self");

const ADDON_LOG_LEVEL_PREF = "extensions." + id + ".sdk.console.logLevel";
const SDK_LOG_LEVEL_PREF = "extensions.sdk.console.logLevel";

const HAS_ORIGINAL_ADDON_LOG_LEVEL = prefs.has(ADDON_LOG_LEVEL_PREF);
const ORIGINAL_ADDON_LOG_LEVEL = prefs.get(ADDON_LOG_LEVEL_PREF);
const HAS_ORIGINAL_SDK_LOG_LEVEL = prefs.has(SDK_LOG_LEVEL_PREF);
const ORIGINAL_SDK_LOG_LEVEL = prefs.get(SDK_LOG_LEVEL_PREF);

exports.testPlainTextConsole = function(test) {
  var prints = [];
  function print(message) {
    prints.push(message);
  }
  function lastPrint() {
    var last = prints.slice(-1)[0];
    prints = [];
    return last;
  }

  prefs.set(SDK_LOG_LEVEL_PREF, "all");
  prefs.reset(ADDON_LOG_LEVEL_PREF);

  var Console = require("sdk/console/plain-text").PlainTextConsole;
  var con = new Console(print);

  test.pass("PlainTextConsole instantiates");

  con.log('testing', 1, [2, 3, 4]);
  test.assertEqual(lastPrint(), "info: " + name + ": testing 1 2,3,4\n",
                   "PlainTextConsole.log() must work.");

  con.info('testing', 1, [2, 3, 4]);
  test.assertEqual(lastPrint(), "info: " + name + ": testing 1 2,3,4\n",
                   "PlainTextConsole.info() must work.");

  con.warn('testing', 1, [2, 3, 4]);
  test.assertEqual(lastPrint(), "warn: " + name + ": testing 1 2,3,4\n",
                   "PlainTextConsole.warn() must work.");

  con.error('testing', 1, [2, 3, 4]);
  test.assertEqual(lastPrint(), "error: " + name + ": testing 1 2,3,4\n",
                   "PlainTextConsole.error() must work.");

  con.debug('testing', 1, [2, 3, 4]);
  test.assertEqual(lastPrint(), "debug: " + name + ": testing 1 2,3,4\n",
                   "PlainTextConsole.debug() must work.");

  con.log('testing', undefined);
  test.assertEqual(lastPrint(), "info: " + name + ": testing undefined\n",
                   "PlainTextConsole.log() must stringify undefined.");

  con.log('testing', null);
  test.assertEqual(lastPrint(), "info: " + name + ": testing null\n",
                   "PlainTextConsole.log() must stringify null.");

  con.log("testing", { toString: function() "obj.toString()" });
  test.assertEqual(lastPrint(), "info: " + name + ": testing obj.toString()\n",
                   "PlainTextConsole.log() must stringify custom toString.");

  con.log("testing", { toString: function() { throw "fail!"; } });
  test.assertEqual(lastPrint(), "info: " + name + ": testing <toString() error>\n",
                   "PlainTextConsole.log() must stringify custom bad toString.");

  con.exception(new Error("blah"));

  var tbLines = prints[0].split("\n");
  test.assertEqual(tbLines[0], "error: " + name + ": An exception occurred.");
  test.assertEqual(tbLines[1], "Error: blah");
  test.assertEqual(tbLines[2], module.uri + " 71");
  test.assertEqual(tbLines[3], "Traceback (most recent call last):");

  prints = [];
  con.trace();
  tbLines = prints[0].split("\n");
  test.assertEqual(tbLines[0], "info: " + name + ": Traceback (most recent call last):");
  test.assertEqual(tbLines[tbLines.length - 4].trim(), "con.trace();");

  // Whether or not console methods should print at the various log levels,
  // structured as a hash of levels, each of which contains a hash of methods,
  // each of whose value is whether or not it should print, i.e.:
  // { [level]: { [method]: [prints?], ... }, ... }.
  let levels = {
    all:   { debug: true,  log: true,  info: true,  warn: true,  error: true  },
    debug: { debug: true,  log: true,  info: true,  warn: true,  error: true  },
    info:  { debug: false, log: true,  info: true,  warn: true,  error: true  },
    warn:  { debug: false, log: false, info: false, warn: true,  error: true  },
    error: { debug: false, log: false, info: false, warn: false, error: true  },
    off:   { debug: false, log: false, info: false, warn: false, error: false },
  };

  // The messages we use to test the various methods, as a hash of methods.
  let messages = {
    debug: "debug: " + name + ": \n",
    log: "info: " + name + ": \n",
    info: "info: " + name + ": \n",
    warn: "warn: " + name + ": \n",
    error: "error: " + name + ": \n",
  };

  for (let level in levels) {
    let methods = levels[level];
    for (let method in methods) {
      // We have to reset the log level pref each time we run the test
      // because the test runner relies on the console to print test output,
      // and test results would not get printed to the console for some
      // values of the pref.
      prefs.set(SDK_LOG_LEVEL_PREF, level);
      con[method]("");
      prefs.set(SDK_LOG_LEVEL_PREF, "all");
      test.assertEqual(lastPrint(), (methods[method] ? messages[method] : null),
                       "at log level '" + level + "', " + method + "() " +
                       (methods[method] ? "prints" : "doesn't print"));
    }
  }

  prefs.set(SDK_LOG_LEVEL_PREF, "off");
  prefs.set(ADDON_LOG_LEVEL_PREF, "all");
  con.debug("");
  test.assertEqual(lastPrint(), messages["debug"],
                   "addon log level 'all' overrides SDK log level 'off'");

  prefs.set(SDK_LOG_LEVEL_PREF, "all");
  prefs.set(ADDON_LOG_LEVEL_PREF, "off");
  con.error("");
  prefs.reset(ADDON_LOG_LEVEL_PREF);
  test.assertEqual(lastPrint(), null,
                   "addon log level 'off' overrides SDK log level 'all'");

  if (HAS_ORIGINAL_ADDON_LOG_LEVEL)
    prefs.set(ADDON_LOG_LEVEL_PREF, ORIGINAL_ADDON_LOG_LEVEL);
  else
    prefs.reset(ADDON_LOG_LEVEL_PREF);

  if (HAS_ORIGINAL_SDK_LOG_LEVEL)
    prefs.set(SDK_LOG_LEVEL_PREF, ORIGINAL_SDK_LOG_LEVEL);
  else
    prefs.reset(SDK_LOG_LEVEL_PREF);
};
