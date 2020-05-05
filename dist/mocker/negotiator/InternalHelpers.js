"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeIs = require("type-is");
const Array_1 = require("fp-ts/lib/Array");
const Option_1 = require("fp-ts/lib/Option");
const Ord_1 = require("fp-ts/lib/Ord");
const pipeable_1 = require("fp-ts/lib/pipeable");
function findBestExample(httpContent) {
    return httpContent.examples && httpContent.examples[0];
}
exports.findBestExample = findBestExample;
function findExampleByKey(httpContent, exampleKey) {
    return httpContent.examples && httpContent.examples.find(example => example.key === exampleKey);
}
exports.findExampleByKey = findExampleByKey;
function hasContents(v) {
    return !!v.contents;
}
exports.hasContents = hasContents;
function findBestHttpContentByMediaType(response, mediaType) {
    return pipeable_1.pipe(response.contents, Array_1.findFirst(content => typeIs.is(mediaType.join(','), [content.mediaType]) !== false));
}
exports.findBestHttpContentByMediaType = findBestHttpContentByMediaType;
function findDefaultContentType(response) {
    return pipeable_1.pipe(response.contents, Array_1.findFirst(content => content.mediaType === '*/*'));
}
exports.findDefaultContentType = findDefaultContentType;
const byResponseCode = Ord_1.ord.contramap(Ord_1.ordNumber, response => parseInt(response.code));
function findLowest2xx(httpResponses) {
    const generic2xxResponse = () => pipeable_1.pipe(findResponseByStatusCode(httpResponses, '2XX'), Option_1.alt(() => createResponseFromDefault(httpResponses, '200')));
    const first2xxResponse = pipeable_1.pipe(httpResponses, Array_1.filter(response => /2\d\d/.test(response.code)), Array_1.sort(byResponseCode), Array_1.head);
    return pipeable_1.pipe(first2xxResponse, Option_1.alt(generic2xxResponse));
}
exports.findLowest2xx = findLowest2xx;
function findResponseByStatusCode(responses, statusCode) {
    return pipeable_1.pipe(responses, Array_1.findFirst(response => response.code.toLowerCase() === statusCode.toLowerCase()));
}
exports.findResponseByStatusCode = findResponseByStatusCode;
function createResponseFromDefault(responses, statusCode) {
    return pipeable_1.pipe(responses, Array_1.findFirst(response => response.code === 'default'), Option_1.map(response => Object.assign({}, response, { code: statusCode })));
}
exports.createResponseFromDefault = createResponseFromDefault;
function contentHasExamples(content) {
    return !!content.examples && content.examples.length !== 0;
}
exports.contentHasExamples = contentHasExamples;
