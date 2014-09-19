'use strict';

var fs = require('fs'),
    path = require('path'),
    mkdirp = require('mkdirp'),
    tv4 = require('tv4'),
    create = require('./create');

module.exports = function (options) {
    var apiPath, modelsPath, handlersPath, testsPath, api;

    function usage() {
        console.error('swaggerize --api <swagger document> [[--models <models dir>] | [--handlers <handlers dir>] | [--tests <tests dir>]]');
        return 1;
    }

    apiPath = options.api;
    modelsPath = options.models;
    handlersPath = options.handlers;
    testsPath = options.tests;

    if (!apiPath || !(modelsPath || handlersPath || testsPath)) {
        return usage();
    }

    apiPath = path.resolve(apiPath);
    modelsPath && (modelsPath = path.resolve(modelsPath));
    handlersPath && (handlersPath = path.resolve(handlersPath));
    testsPath && (testsPath = path.resolve(testsPath));

    api = require(apiPath);

    if (validate(api)) {
        return 1;
    }

    if (testsPath) {
        if (!handlersPath) {
            console.error('tests can not be generated without handlers path.');
            return usage();
        }
        if ((api.definitions && !modelsPath)) {
            console.error('api contains models, so tests can not be generated without handlers and models paths.');
            return usage();
        }
    }

    [apiPath, modelsPath, handlersPath, testsPath].forEach(function (filePath) {
        if (!filePath) {
            return;
        }

        if (!fs.existsSync(filePath)) {
            mkdirp.sync(filePath);
        }
    });

    modelsPath && create.models(api.definitions, modelsPath);
    handlersPath && create.handlers(api.paths, handlersPath);

    testsPath && create.tests(api, testsPath, apiPath, handlersPath, modelsPath);

    return 0;
};

function validate(api) {
    var schema, validator, validation;

    schema = require('swaggerize-builder/lib/schema/swagger-spec/schemas/v2.0/schema.json');
    validator = tv4.freshApi();

    validation = validator.validateResult(api, schema);

    if (!validation.valid) {
        console.error('%s (at %s)', validation.error.message, validation.error.dataPath || '/');
        if (validation.error.subErrors) {
            validation.error.subErrors.forEach(function (subError) {
                console.error('%s (at %s)', subError, subError.dataPath);
            });
        }
        return 1;
    }
}
