export type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
};

export type Paginated<T> = {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
};
