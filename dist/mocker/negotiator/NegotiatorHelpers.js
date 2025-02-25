"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const E = require("fp-ts/lib/Either");
const Array_1 = require("fp-ts/lib/Array");
const O = require("fp-ts/lib/Option");
const pipeable_1 = require("fp-ts/lib/pipeable");
const R = require("fp-ts/lib/Reader");
const RE = require("fp-ts/lib/ReaderEither");
const lodash_1 = require("lodash");
const withLogger_1 = require("../../withLogger");
const errors_1 = require("../errors");
const InternalHelpers_1 = require("./InternalHelpers");
const types_1 = require("../../types");
const outputNoContentFoundMessage = (contentTypes) => `Unable to find content for ${contentTypes}`;
const findEmptyResponse = (response, headers, mediaTypes) => pipeable_1.pipe(mediaTypes, Array_1.findIndex(ct => !ct.includes('*/*')), O.map(() => ({ code: response.code, headers })));
const helpers = {
    negotiateByPartialOptionsAndHttpContent({ code, exampleKey, dynamic }, httpContent) {
        const { mediaType } = httpContent;
        if (exampleKey) {
            const example = InternalHelpers_1.findExampleByKey(httpContent, exampleKey);
            if (example) {
                return E.right({
                    code,
                    mediaType,
                    bodyExample: example,
                });
            }
            else {
                return E.left(types_1.ProblemJsonError.fromTemplate(errors_1.NOT_FOUND, `Response for contentType: ${mediaType} and exampleKey: ${exampleKey} does not exist.`));
            }
        }
        else if (dynamic === true) {
            if (httpContent.schema) {
                return E.right({
                    code,
                    mediaType,
                    schema: httpContent.schema,
                });
            }
            else {
                return E.left(new Error(`Tried to force a dynamic response for: ${mediaType} but schema is not defined.`));
            }
        }
        else {
            const example = InternalHelpers_1.findBestExample(httpContent);
            if (example) {
                return E.right({
                    code,
                    mediaType,
                    bodyExample: example,
                });
            }
            else if (httpContent.schema) {
                return E.right({
                    code,
                    mediaType,
                    schema: httpContent.schema,
                });
            }
            else {
                return E.right({
                    code,
                    mediaType,
                });
            }
        }
    },
    negotiateDefaultMediaType(partialOptions, response) {
        const { code, dynamic, exampleKey } = partialOptions;
        const findHttpContent = InternalHelpers_1.hasContents(response)
            ? pipeable_1.pipe(InternalHelpers_1.findDefaultContentType(response), O.alt(() => InternalHelpers_1.findBestHttpContentByMediaType(response, ['application/json', '*/*'])))
            : O.none;
        return pipeable_1.pipe(findHttpContent, O.fold(() => E.right({
            code,
            mediaType: 'text/plain',
            bodyExample: {
                value: undefined,
                key: 'default',
            },
            headers: response.headers || [],
        }), content => pipeable_1.pipe(helpers.negotiateByPartialOptionsAndHttpContent({
            code,
            dynamic,
            exampleKey,
        }, content), E.map(contentNegotiationResult => ({
            headers: response.headers || [],
            ...contentNegotiationResult,
        })))));
    },
    negotiateOptionsBySpecificResponse(httpOperation, desiredOptions, response) {
        const { code, headers } = response;
        const { mediaTypes, dynamic, exampleKey } = desiredOptions;
        return logger => {
            if (httpOperation.method === 'head') {
                logger.info(`Responding with an empty body to a HEAD request.`);
                return E.right({
                    code: response.code,
                    headers: response.headers || [],
                });
            }
            if (mediaTypes) {
                const httpContent = InternalHelpers_1.hasContents(response) ? InternalHelpers_1.findBestHttpContentByMediaType(response, mediaTypes) : O.none;
                return pipeable_1.pipe(httpContent, O.fold(() => pipeable_1.pipe(findEmptyResponse(response, headers || [], mediaTypes), O.map(payloadlessResponse => {
                    logger.info(`${outputNoContentFoundMessage(mediaTypes)}. Sending an empty response.`);
                    return payloadlessResponse;
                }), E.fromOption(() => {
                    logger.warn(outputNoContentFoundMessage(mediaTypes));
                    return types_1.ProblemJsonError.fromTemplate(errors_1.NOT_ACCEPTABLE, `Unable to find content for ${mediaTypes}`);
                })), content => {
                    logger.success(`Found a compatible content for ${mediaTypes}`);
                    return pipeable_1.pipe(helpers.negotiateByPartialOptionsAndHttpContent({
                        code,
                        dynamic,
                        exampleKey,
                    }, content), E.map(contentNegotiationResult => ({
                        headers: headers || [],
                        ...contentNegotiationResult,
                        mediaType: contentNegotiationResult.mediaType === '*/*' ? 'text/plain' : contentNegotiationResult.mediaType,
                    })));
                }));
            }
            logger.trace('No mediaType provided. Fallbacking to the default media type (application/json)');
            return helpers.negotiateDefaultMediaType({
                code,
                dynamic,
                exampleKey,
            }, response);
        };
    },
    negotiateOptionsForDefaultCode(httpOperation, desiredOptions) {
        return pipeable_1.pipe(InternalHelpers_1.findLowest2xx(httpOperation.responses), RE.fromOption(() => types_1.ProblemJsonError.fromTemplate(errors_1.NO_SUCCESS_RESPONSE_DEFINED)), RE.chain(lowest2xxResponse => helpers.negotiateOptionsBySpecificResponse(httpOperation, desiredOptions, lowest2xxResponse)));
    },
    negotiateOptionsBySpecificCode(httpOperation, desiredOptions, code) {
        return pipeable_1.pipe(withLogger_1.default(logger => pipeable_1.pipe(InternalHelpers_1.findResponseByStatusCode(httpOperation.responses, code), O.alt(() => {
            logger.info(`Unable to find a ${code} response definition`);
            return InternalHelpers_1.createResponseFromDefault(httpOperation.responses, code);
        }))), R.chain(responseByForcedStatusCode => pipeable_1.pipe(responseByForcedStatusCode, RE.fromOption(() => types_1.ProblemJsonError.fromTemplate(errors_1.NOT_FOUND, `Requested status code ${code} is not defined in the document.`)), RE.chain(response => pipeable_1.pipe(helpers.negotiateOptionsBySpecificResponse(httpOperation, desiredOptions, response), RE.orElse(() => pipeable_1.pipe(helpers.negotiateOptionsForDefaultCode(httpOperation, desiredOptions), RE.mapLeft(error => new Error(`${error}. We tried default response, but we got ${error}`)))))))));
    },
    negotiateOptionsForValidRequest(httpOperation, desiredOptions) {
        const { code } = desiredOptions;
        if (code) {
            return helpers.negotiateOptionsBySpecificCode(httpOperation, desiredOptions, code);
        }
        return helpers.negotiateOptionsForDefaultCode(httpOperation, desiredOptions);
    },
    findResponse(httpResponses, statusCodes) {
        const [first, ...others] = statusCodes;
        return logger => pipeable_1.pipe(others.reduce((previous, current, index) => pipeable_1.pipe(previous, O.alt(() => {
            logger.trace(`Unable to find a ${statusCodes[index]} response definition`);
            return InternalHelpers_1.findResponseByStatusCode(httpResponses, current);
        })), pipeable_1.pipe(InternalHelpers_1.findResponseByStatusCode(httpResponses, first))), O.alt(() => {
            logger.trace(`Unable to find a ${lodash_1.tail(statusCodes)} response definition`);
            return pipeable_1.pipe(InternalHelpers_1.createResponseFromDefault(httpResponses, first), O.fold(() => {
                logger.trace("Unable to find a 'default' response definition");
                return O.none;
            }, response => {
                logger.success(`Created a ${response.code} from a default response`);
                return O.some(response);
            }));
        }), O.map(response => {
            logger.success(`Found response ${response.code}. I'll try with it.`);
            return response;
        }));
    },
    negotiateOptionsForInvalidRequest(httpResponses, statusCodes) {
        return pipeable_1.pipe(helpers.findResponse(httpResponses, statusCodes), R.chain(foundResponse => logger => pipeable_1.pipe(foundResponse, E.fromOption(() => new Error('No 422, 400, or default responses defined')), E.chain(response => {
            const contentWithExamples = response.contents && response.contents.find(InternalHelpers_1.contentHasExamples);
            if (contentWithExamples) {
                logger.success(`The response ${response.code} has an example. I'll keep going with this one`);
                return E.right({
                    code: response.code,
                    mediaType: contentWithExamples.mediaType,
                    bodyExample: contentWithExamples.examples[0],
                    headers: response.headers || [],
                });
            }
            else {
                logger.trace(`Unable to find a content with an example defined for the response ${response.code}`);
                const responseWithSchema = response.contents && response.contents.find(content => !!content.schema);
                if (responseWithSchema) {
                    logger.success(`The response ${response.code} has a schema. I'll keep going with this one`);
                    return E.right({
                        code: response.code,
                        mediaType: responseWithSchema.mediaType,
                        schema: responseWithSchema.schema,
                        headers: response.headers || [],
                    });
                }
                else {
                    return pipeable_1.pipe(findEmptyResponse(response, response.headers || [], lodash_1.get(contentWithExamples, 'mediaType', lodash_1.get(responseWithSchema, 'schema')) || ['*/*']), E.fromOption(() => {
                        logger.trace(`Unable to find a content with a schema defined for the response ${response.code}`);
                        return new Error(`Neither schema nor example defined for ${response.code} response.`);
                    }));
                }
            }
        }))));
    },
};
exports.default = helpers;
