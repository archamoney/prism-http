"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const faker = require("faker");
const lodash_1 = require("lodash");
const jsf = require("json-schema-faker");
const sampler = require("openapi-sampler");
const Either_1 = require("fp-ts/lib/Either");
jsf.extend('faker', () => faker);
jsf.option({
    failOnInvalidTypes: false,
    failOnInvalidFormat: false,
    alwaysFakeOptionals: true,
    optionalsProbability: 1,
    fixedProbabilities: true,
    ignoreMissingRefs: true,
    maxItems: 20,
    maxLength: 100,
});
function generate(source) {
    return Either_1.tryCatch(() => {
        const dynamicResult = jsf.generate(lodash_1.cloneDeep(source));
        if (source && source.properties && dynamicResult) {
            for (const key in dynamicResult) {
                if (source.properties[key] && source.properties[key]['x-static']) {
                    dynamicResult[key] = source.properties[key]['x-static'];
                }
            }
        }
        return dynamicResult;
    }, Either_1.toError);
}
exports.generate = generate;
function generateStatic(source) {
    return Either_1.tryCatch(() => sampler.sample(source), Either_1.toError);
}
exports.generateStatic = generateStatic;
