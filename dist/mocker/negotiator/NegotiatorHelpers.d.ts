import { IHttpOperation, IHttpOperationResponse, IMediaTypeContent } from '@stoplight/types';
import * as E from 'fp-ts/lib/Either';
import { NonEmptyArray } from 'fp-ts/lib/NonEmptyArray';
import * as O from 'fp-ts/lib/Option';
import * as R from 'fp-ts/lib/Reader';
import * as RE from 'fp-ts/lib/ReaderEither';
import { Logger } from 'pino';
import { IHttpNegotiationResult, NegotiatePartialOptions } from './types';
declare const helpers: {
    negotiateByPartialOptionsAndHttpContent({ code, exampleKey, dynamic }: NegotiatePartialOptions, httpContent: IMediaTypeContent): E.Either<Error, Pick<IHttpNegotiationResult, "code" | "mediaType" | "bodyExample" | "schema">>;
    negotiateDefaultMediaType(partialOptions: NegotiatePartialOptions, response: IHttpOperationResponse): E.Either<Error, IHttpNegotiationResult>;
    negotiateOptionsBySpecificResponse(httpOperation: IHttpOperation, desiredOptions: import("../../types").IHttpOperationConfig, response: IHttpOperationResponse): RE.ReaderEither<Logger, Error, IHttpNegotiationResult>;
    negotiateOptionsForDefaultCode(httpOperation: IHttpOperation, desiredOptions: import("../../types").IHttpOperationConfig): RE.ReaderEither<Logger, Error, IHttpNegotiationResult>;
    negotiateOptionsBySpecificCode(httpOperation: IHttpOperation, desiredOptions: import("../../types").IHttpOperationConfig, code: string): RE.ReaderEither<Logger, Error, IHttpNegotiationResult>;
    negotiateOptionsForValidRequest(httpOperation: IHttpOperation, desiredOptions: import("../../types").IHttpOperationConfig): RE.ReaderEither<Logger, Error, IHttpNegotiationResult>;
    findResponse(httpResponses: IHttpOperationResponse[], statusCodes: NonEmptyArray<string>): R.Reader<Logger, O.Option<IHttpOperationResponse>>;
    negotiateOptionsForInvalidRequest(httpResponses: IHttpOperationResponse[], statusCodes: NonEmptyArray<string>): RE.ReaderEither<Logger, Error, IHttpNegotiationResult>;
};
export default helpers;
