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
    const dynamicResult = jsf.generate(cloneDeep(source));

    if (source && source.properties && dynamicResult) {
        for (const key in dynamicResult) {
            if (source.properties[key] && source.properties[key]['x-static']) {
                dynamicResult[key] = source.properties[key]['x-static'];
            }
        }
    }
    
    return dynamicResult;
  }, toError);
}

export function generateStatic(source: JSONSchema): Either<Error, unknown> {
  return tryCatch(() => sampler.sample(source), toError);
}
