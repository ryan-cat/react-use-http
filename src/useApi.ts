import { AxiosError, AxiosResponse } from "axios";
import { useState, useEffect } from "react";
import axios from "axios";

const apiUrl = process.env.API_URL || "";

export interface ServerError {
  message: string;
  data: any;
}

export type ValidationErrors<B> = {
  $global?: string;
} & {
  [k in keyof B]?: string;
};

/////////////////////////// API GET ///////////////////////////

export interface IUseGetProps<D> extends IUseApiProps<D> {}

export interface IUseGetOutput<D>
  extends Omit<IUseApiOutput<D, any>, "data" | "http" | "validationErrors"> {
  fetch: () => void;
}

export const useGet = <D = any>(
  props: IUseGetProps<D>
): [D, IUseGetOutput<D>] => {
  const { data, http, ...rest } = useApi<D>(props);
  const { lazy } = props;

  useEffect(() => {
    if (!lazy) {
      fetch();
    }
  }, [lazy]);

  const fetch = () => {
    http();
  };

  return [
    data,
    {
      fetch,
      ...rest,
    },
  ];
};

/////////////////////////// API POST ///////////////////////////

export interface IUsePostProps<D>
  extends Omit<IUseApiProps<D>, "lazy" | "defaultData"> {}
export interface IUsePostOutput<D, B>
  extends Omit<IUseApiOutput<D, B>, "http" | "updateData" | "data"> {}

export const usePost = <D = any, B = any>(
  props: IUsePostProps<D>
): [(body: B) => Promise<D>, IUsePostOutput<D, B>] => {
  const { http, ...rest } = useApi<D, B>(props);

  return [http, rest];
};

/////////////////////////// API ///////////////////////////

interface IUseApiProps<D> {
  path: string;
  lazy?: boolean;
  defaultData?: D;
}

interface IUseApiOutput<D, B> {
  loading: boolean;
  error: string;
  detailedError: AxiosResponse<ServerError>;
  validationErrors: ValidationErrors<B>;
  data: D | null;
  updateData: (value: React.SetStateAction<D>) => void;
  http: (body?: B) => Promise<D>;
  clearError: () => void;
}

const useApi = <D = any, B = any>(
  props: IUseApiProps<D>
): IUseApiOutput<D, B> => {
  const { path, defaultData } = props;
  const url = `${apiUrl}${path}`;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AxiosError<ServerError>>(null);
  const [data, setData] = useState<D>(defaultData);
  const [lastBody, setLastBody] = useState<B>();

  const http = async (body?: B): Promise<D> => {
    setLoading(true);
    setLastBody(body);

    try {
      const result = await (body ? axios.post(url, body) : axios.get(url));
      const data = result && result.data;

      setData(data);

      return data || true;
    } catch (err) {
      setError(err);

      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateData = (value: React.SetStateAction<D>) => {
    setData(value);
  };

  const clearError = () => {
    setError(null);
  };

  const getValidationErrors = (): ValidationErrors<B> => {
    const errs = error?.response?.data?.data?.validationErrors;

    try {
      const result: ValidationErrors<B> = {};

      errs.forEach((err) => {
        const key =
          Object.keys(lastBody).find(
            (x) => x.toLowerCase() === err.propertyName.toLowerCase()
          ) || "$global";
        result[key] = !result[key]
          ? `${err.errorMessage}.`
          : `${result[key]} ${err.errorMessage}.`;
      });

      return result;
    } catch (err) {
      return {};
    }
  };

  const getErrorMessage = (): string => {
    return error && !error.response
      ? "An unexpected error has occurred"
      : error?.response?.data?.message;
  };

  return {
    data,
    loading,
    error: getErrorMessage(),
    detailedError: error?.response,
    validationErrors: getValidationErrors(),
    http,
    clearError,
    updateData,
  };
};
