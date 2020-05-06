import * as faker from 'faker';
import { cloneDeep } from 'lodash';
import { JSONSchema } from '../../types';

// @ts-ignore
import * as jsf from 'json-schema-faker';
// @ts-ignore
import * as sampler from 'openapi-sampler';
import { Either, tryCatch, toError } from 'fp-ts/lib/Either';

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

export function generate(source: JSONSchema): Either<Error, unknown> {
  return tryCatch(() => {
    const processedSource = cloneDeep(source);
    if (processedSource.oneOf) { processedSource.oneOf = processedSource.oneOf.filter(o => !o['x-exclude']); }
    if (processedSource.anyOf) { processedSource.anyOf = processedSource.anyOf.filter(o => !o['x-exclude']); }
    if (processedSource.allOf) { processedSource.allOf = processedSource.allOf.filter(o => !o['x-exclude']); }
    
    const dynamicResult = jsf.generate(cloneDeep(processedSource));
    const sourceDataSet = (processedSource.oneOf ? processedSource.oneOf : (processedSource.allOf ? processedSource.allOf : processedSource.anyOf));
    const targetSource = (processedSource.properties ?
      processedSource :
      (!sourceDataSet ?
        processedSource :
        find(sourceDataSet, o => {
          if (!o.properties) { return dynamicResult; }

          const oKeys = Object.keys(o.properties);
          const resultKeys = Object.keys(dynamicResult);
          const largerKeys = (oKeys.length > resultKeys.length ? oKeys : resultKeys);
          const smallerKeys = (oKeys.length < resultKeys.length ? oKeys : resultKeys);

          return (largerKeys.length == smallerKeys.length && some(largerKeys, key => smallerKeys.includes(key)));
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
  }, toError);
}

export function generateStatic(source: JSONSchema): Either<Error, unknown> {
  return tryCatch(() => sampler.sample(source), toError);
}
