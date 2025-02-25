"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("@stoplight/types");
const caseless = require("caseless");
const Array_1 = require("fp-ts/lib/Array");
const O = require("fp-ts/lib/Option");
const E = require("fp-ts/lib/Either");
const typeIs = require("type-is");
const pipeable_1 = require("fp-ts/lib/pipeable");
const lodash_1 = require("lodash");
const security_1 = require("./validators/security");
exports.validateSecurity = security_1.validateSecurity;
const uri_template_lite_1 = require("uri-template-lite");
const deserializers_1 = require("./deserializers");
const spec_1 = require("./utils/spec");
const validators_1 = require("./validators");
const utils_1 = require("./validators/utils");
const path_1 = require("./validators/path");
exports.bodyValidator = new validators_1.HttpBodyValidator('body');
exports.headersValidator = new validators_1.HttpHeadersValidator(deserializers_1.header, 'header');
exports.queryValidator = new validators_1.HttpQueryValidator(deserializers_1.query, 'query');
exports.pathValidator = new path_1.HttpPathValidator(deserializers_1.path, 'path');
const checkBodyIsProvided = (requestBody, body) => pipeable_1.pipe(requestBody, E.fromPredicate(requestBody => !(!!requestBody.required && !body), () => [{ code: 'required', message: 'Body parameter is required', severity: types_1.DiagnosticSeverity.Error }]));
const validateIfBodySpecIsProvided = (body, mediaType, contents) => pipeable_1.pipe(utils_1.sequenceOption(O.fromNullable(body), O.fromNullable(contents)), O.fold(() => E.right(body), ([body, contents]) => exports.bodyValidator.validate(body, contents, mediaType)));
const validateBody = (requestBody, body, mediaType) => pipeable_1.pipe(checkBodyIsProvided(requestBody, body), E.chain(() => validateIfBodySpecIsProvided(body, mediaType, requestBody.contents)));
const validateInput = ({ resource, element }) => {
    const mediaType = caseless(element.headers || {}).get('content-type');
    const { request } = resource;
    const { body } = element;
    return pipeable_1.pipe(E.fromNullable(undefined)(request), E.fold(e => E.right(e), request => utils_1.sequenceValidation(request.body ? validateBody(request.body, body, mediaType) : E.right(undefined), request.headers ? exports.headersValidator.validate(element.headers || {}, request.headers) : E.right(undefined), request.query ? exports.queryValidator.validate(element.url.query || {}, request.query) : E.right(undefined), request.path
        ? exports.pathValidator.validate(getPathParams(element.url.path, resource.path), request.path)
        : E.right(undefined))), E.map(() => element));
};
exports.validateInput = validateInput;
const findResponseByStatus = (responses, statusCode) => pipeable_1.pipe(spec_1.findOperationResponse(responses, statusCode), E.fromOption(() => ({
    message: `Unable to match the returned status code with those defined in the document: ${responses
        .map(response => response.code)
        .join(',')}`,
    severity: lodash_1.inRange(statusCode, 200, 300) ? types_1.DiagnosticSeverity.Error : types_1.DiagnosticSeverity.Warning,
})), E.mapLeft(error => [error]));
const validateMediaType = (contents, mediaType) => pipeable_1.pipe(contents, Array_1.findFirst(c => !!typeIs.is(mediaType, [c.mediaType])), E.fromOption(() => ({
    message: `The received media type "${mediaType || ''}" does not match the one${contents.length > 1 ? 's' : ''} specified in the current response: ${contents.map(c => c.mediaType).join(', ')}`,
    severity: types_1.DiagnosticSeverity.Error,
})), E.mapLeft(e => [e]));
const validateOutput = ({ resource, element }) => {
    const mediaType = caseless(element.headers || {}).get('content-type');
    return pipeable_1.pipe(findResponseByStatus(resource.responses, element.statusCode), E.chain(response => utils_1.sequenceValidation(pipeable_1.pipe(O.fromNullable(response.contents), O.chain(contents => pipeable_1.pipe(contents, O.fromPredicate(Array_1.isNonEmpty))), O.fold(() => E.right(undefined), contents => validateMediaType(contents, mediaType))), exports.bodyValidator.validate(element.body, response.contents || [], mediaType), exports.headersValidator.validate(element.headers || {}, response.headers || []))), E.map(() => element));
};
exports.validateOutput = validateOutput;
function getPathParams(path, template) {
    return new uri_template_lite_1.URI.Template(template).match(path);
}
