export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const randomError = (errorRate: number = 0) => {
  if (Math.random() < errorRate) {
    throw new Error('Simulated network error');
  }
};

export function paginate<T>(items: T[], page: number, limit: number) {
  const start = (page - 1) * limit;
  const end = start + limit;
  return {
    data: items.slice(start, end),
    meta: {
      total: items.length,
      page,
      limit,
      totalPages: Math.ceil(items.length / limit),
    }
  };
}
