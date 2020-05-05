import { DiagnosticSeverity } from '@stoplight/types';
import * as convertAjvErrorsModule from '../utils';
import { convertAjvErrors, validateAgainstSchema } from '../utils';
import { ErrorObject } from 'ajv';
import { assertSome, assertNone } from '@stoplight/prism-core/src/__tests__/utils';

describe('convertAjvErrors()', () => {
  const errorObjectFixture: ErrorObject = {
    dataPath: 'a.b',
    keyword: 'required',
    message: 'c is required',
    schemaPath: '..',
    params: {},
  };

  describe('all fields defined', () => {
    it('converts properly', () => {
      expect(convertAjvErrors([errorObjectFixture], DiagnosticSeverity.Error)).toMatchSnapshot();
    });
  });

  describe('keyword field is missing', () => {
    it('converts properly', () => {
      expect(
        convertAjvErrors([Object.assign({}, errorObjectFixture, { keyword: undefined })], DiagnosticSeverity.Error)
      ).toMatchSnapshot();
    });
  });

  describe('message field is missing', () => {
    it('converts properly', () => {
      expect(
        convertAjvErrors([Object.assign({}, errorObjectFixture, { message: undefined })], DiagnosticSeverity.Error)[0]
      ).toHaveProperty('message', '');
    });
  });
});

describe('validateAgainstSchema()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(convertAjvErrorsModule, 'convertAjvErrors');
  });

  describe('has no validation errors', () => {
    it('returns no validation errors', () => {
      assertNone(validateAgainstSchema('test', { type: 'string' }, true, 'pfx'));
      expect(convertAjvErrorsModule.convertAjvErrors).not.toHaveBeenCalled();
    });
  });

  describe('has validation errors', () => {
    it('returns validation errors', () => {
      jest.spyOn(convertAjvErrorsModule, 'convertAjvErrors').mockImplementationOnce(() => [
        {
          message: 'should be number',
          code: '10',
          path: [],
          severity: DiagnosticSeverity.Error,
          summary: 'should be number',
        },
      ]);
      assertSome(validateAgainstSchema('test', { type: 'number' }, true, 'pfx'), error =>
        expect(error).toContainEqual(expect.objectContaining({ message: 'should be number' }))
      );

      expect(convertAjvErrorsModule.convertAjvErrors).toHaveBeenCalledWith(
        [
          {
            dataPath: '',
            keyword: 'type',
            message: 'should be number',
            params: { type: 'number' },
            schemaPath: '#/type',
          },
        ],
        DiagnosticSeverity.Error,
        'pfx'
      );
    });
  });

  describe('with coercing', () => {
    it('will not return error for convertible values', () => {
      assertNone(
        validateAgainstSchema({ test: 10 }, { type: 'object', properties: { test: { type: 'string' } } }, true)
      );
    });
  });

  describe('with no coercing', () => {
    it('will return error for convertible values', () => {
      assertSome(
        validateAgainstSchema({ test: 10 }, { type: 'object', properties: { test: { type: 'string' } } }, false),
        error => expect(error).toContainEqual(expect.objectContaining({ message: 'should be string' }))
      );
    });
  });
});
