import { IHttpContent, IHttpOperationResponse, IMediaTypeContent } from '@stoplight/types';
import { NonEmptyArray } from 'fp-ts/lib/NonEmptyArray';
import { Option } from 'fp-ts/lib/Option';
import { ContentExample, PickRequired } from '../../';
export declare type IWithExampleMediaContent = IMediaTypeContent & {
    examples: NonEmptyArray<ContentExample>;
};
export declare function findBestExample(httpContent: IHttpContent): import("@stoplight/types").INodeExample | import("@stoplight/types").INodeExternalExample | undefined;
export declare function findExampleByKey(httpContent: IHttpContent, exampleKey: string): import("@stoplight/types").INodeExample | import("@stoplight/types").INodeExternalExample | undefined;
export declare function hasContents(v: IHttpOperationResponse): v is PickRequired<IHttpOperationResponse, 'contents'>;
export declare function findBestHttpContentByMediaType(response: PickRequired<IHttpOperationResponse, 'contents'>, mediaType: string[]): Option<IMediaTypeContent>;
export declare function findDefaultContentType(response: PickRequired<IHttpOperationResponse, 'contents'>): Option<IMediaTypeContent>;
export declare function findLowest2xx(httpResponses: IHttpOperationResponse[]): Option<IHttpOperationResponse>;
export declare function findResponseByStatusCode(responses: IHttpOperationResponse[], statusCode: string): Option<IHttpOperationResponse>;
export declare function createResponseFromDefault(responses: IHttpOperationResponse[], statusCode: string): Option<IHttpOperationResponse>;
export declare function contentHasExamples(content: IMediaTypeContent): content is IWithExampleMediaContent;
