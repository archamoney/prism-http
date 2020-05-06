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
        const processedSource = lodash_1.cloneDeep(source)
        if (processedSource.oneOf) { processedSource.oneOf = processedSource.oneOf.filter(o => !o['x-exclude']); }
        if (processedSource.anyOf) { processedSource.anyOf = processedSource.anyOf.filter(o => !o['x-exclude']); }
        if (processedSource.allOf) { processedSource.allOf = processedSource.allOf.filter(o => !o['x-exclude']); }
        
        const dynamicResult = jsf.generate(lodash_1.cloneDeep(processedSource));
        const sourceDataSet = (processedSource.oneOf ? processedSource.oneOf : (processedSource.allOf ? processedSource.allOf : processedSource.anyOf));
        const targetSource = (processedSource.properties ?
            processedSource :
            (!sourceDataSet ?
                processedSource :
                lodash_1.find(sourceDataSet, o => {
                    if (!o.properties) { return dynamicResult; }

                    const oKeys = Object.keys(o.properties);
                    const resultKeys = Object.keys(dynamicResult);
                    const largerKeys = (oKeys.length > resultKeys.length ? oKeys : resultKeys);
                    const smallerKeys = (oKeys.length < resultKeys.length ? oKeys : resultKeys);

                    return (largerKeys.length == smallerKeys.length && lodash_1.some(largerKeys, key => smallerKeys.includes(key)));
                })
            )
        );

        if (targetSource && targetSource.properties && dynamicResult) {
            for (const key in dynamicResult) {
                if (targetSource.properties[key]) {
                    if (targetSource.properties[key]['x-static']) {
                        dynamicResult[key] = targetSource.properties[key]['x-static'];
                    }
                    else if (targetSource.properties[key].allOf) {
                        const valueContainingObject = lodash_1.find(targetSource.properties[key].allOf, o => o['x-static']);

                        if (valueContainingObject) {
                            dynamicResult[key] = valueContainingObject['x-static'];
                        }
                    }
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
