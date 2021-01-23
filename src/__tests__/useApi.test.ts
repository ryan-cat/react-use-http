import axios from 'axios';
import { usePost, useGet } from './../useApi';
import { renderHook, act } from '@testing-library/react-hooks';
import MockAdapter from 'axios-mock-adapter';

const mockedApi = new MockAdapter(axios);

describe('use api', () => {
  afterEach(() => {
    mockedApi.reset();
  });

  test('should render get with default value', async () => {
    const data = 'hello';
    const { result } = renderHook(() => useGet<string>({ path: '/path', defaultData: data, lazy: true }));

    expect(result.current[0]).toBe(data);
  });

  test('should update data for get', async () => {
    const data = 'hello';
    const { result } = renderHook(() => useGet<string>({ path: '/path', defaultData: data, lazy: true }));

    act(() => result.current[1].updateData('world'));

    expect(result.current[0]).toBe('world');
  });

  test('should perform get', async () => {
    const data = { greeting: 'hello' };
    const path = '/greeting';
    mockedApi.onGet().reply(200, data);

    const { result, waitForNextUpdate } = renderHook(() => useGet({ path }));

    expect(result.current[1].loading).toBe(true);

    await waitForNextUpdate();

    expect(result.current[1].loading).toBe(false);
    expect(result.current[0]).toEqual(data);
    expect(result.current[1].error).toBeFalsy();
    expect(result.current[1].detailedError).toBeFalsy();

    expect(mockedApi.history.get).toHaveLength(1);
    expect(mockedApi.history.get[0].url).toBe(path);
  });

  test('should perform get lazily using fetch', async () => {
    const data = { greeting: 'hello' };
    const path = '/greeting';
    mockedApi.onGet().reply(200, data);

    const { result, waitForNextUpdate } = renderHook(() => useGet({ path, lazy: true }));

    expect(result.current[1].loading).toBe(false);

    act(() => {
      result.current[1].fetch();
    });

    expect(result.current[1].loading).toBe(true);

    await waitForNextUpdate();

    expect(result.current[0]).toEqual(data);
    expect(result.current[1].loading).toBe(false);

    expect(mockedApi.history.get).toHaveLength(1);
    expect(mockedApi.history.get[0].url).toEqual(path);
  });

  test('should perform post', async () => {
    const path = '/user/create';
    const body = {
      name: 'bob',
      age: 20
    };

    const data = { user: body };
    mockedApi.onPost().reply(200, data);

    const { result, waitForNextUpdate } = renderHook(() => usePost({ path }));

    expect(result.current[1].loading).toBe(false);

    let postResult;
    act(() => {
      postResult = result.current[0](body);
    });

    expect(result.current[1].loading).toBe(true);

    await waitForNextUpdate();

    postResult = await postResult;

    expect(postResult).toEqual(data);

    expect(result.current[1].loading).toBe(false);
    expect(result.current[1].validationErrors).toEqual({});
    expect(result.current[1].error).toBeFalsy();
    expect(result.current[1].detailedError).toBeFalsy();

    expect(mockedApi.history.post).toHaveLength(1);
    expect(JSON.parse(mockedApi.history.post[0].data)).toEqual(body);
    expect(mockedApi.history.post[0].url).toBe(path);
  });

  test('should have error and validation errors and then clear them', async () => {
    const validationErrors = [
      { propertyName: 'test', errorMessage: 'test message' },
      { propertyName: 'test', errorMessage: 'test message 2' },
      { propertyName: 'test2', errorMessage: 'test2 message' },
      { propertyName: '', errorMessage: 'global message' }
    ];

    const error = {
      data: {
        message: 'Validation error',
        data: {
          validationErrors
        }
      }
    };
    mockedApi.onPost().reply(400, error.data);

    const { result, waitForNextUpdate } = renderHook(() => usePost({ path: '/error' }));

    act(() => {
      result.current[0]({ test: 1, Test2: 2 });
    });

    await waitForNextUpdate();

    expect(result.current[1].detailedError).toMatchObject(error);
    expect(result.current[1].error).toBe(error.data.message);
    expect(Object.keys(result.current[1].validationErrors).sort()).toEqual(['$global', 'test', 'Test2'].sort());

    expect(result.current[1].validationErrors.test).toBe(`${validationErrors[0].errorMessage}. ${validationErrors[1].errorMessage}.`);
    expect(result.current[1].validationErrors.Test2).toBe(`${validationErrors[2].errorMessage}.`);
    expect(result.current[1].validationErrors.$global).toBe(`${validationErrors[3].errorMessage}.`);

    act(() => result.current[1].clearError());

    expect(result.current[1].error).toBeFalsy();
    expect(result.current[1].detailedError).toBeFalsy();
    expect(result.current[1].validationErrors).toEqual({});
  });

  test('should have error and no validation errors should default to empty object', async () => {
    const error = {
      data: {
        message: 'server error'
      }
    };
    mockedApi.onPost().reply(500, error.data);

    const { result, waitForNextUpdate } = renderHook(() => usePost({ path: '/error' }));

    act(() => {
      result.current[0]({});
    });

    await waitForNextUpdate();

    expect(result.current[1].detailedError).toMatchObject(error);
    expect(result.current[1].error).toBe(error.data.message);
    expect(result.current[1].validationErrors).toEqual({});
  });

  test('should have network error and generic error message', async () => {
    mockedApi.onGet().networkError();

    const { result, waitForNextUpdate } = renderHook(() => useGet({ path: '/error' }));

    await waitForNextUpdate();

    expect(result.current[1].detailedError).toBeFalsy();
    expect(result.current[1].error).toBe('An unexpected error has occurred');
  });
});
