const normalizeQueryValue = (value: any) => {
  if (value === "null") return null;
  if (value === "undefined") return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
};

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildCaseInsensitiveExactRegex = (value: string) =>
  new RegExp(`^${escapeRegex(value)}$`, "i");

const buildFilterFromQuery = (queryParams: any = {}) => {
  const filter: any = {};

  Object.keys(queryParams).forEach((key) => {
    if (["page", "limit", "sort", "search"].includes(key)) return;

    const value = queryParams[key];

    if (typeof value === "string" && value.includes(",")) {
      const values = value.split(",").map((v) => normalizeQueryValue(v));
      filter[key] = { $in: values };
    } else {
      filter[key] = normalizeQueryValue(value);
    }
  });

  return filter;
};

const buildSortOptions = (queryParams: any = {}) => {
  const options: any = {};
  if (queryParams.sort) {
    const sortObj: any = {};
    queryParams.sort.split(",").forEach((field: string) => {
      if (field.startsWith("-")) sortObj[field.substring(1)] = -1;
      else sortObj[field] = 1;
    });
    options.sort = sortObj;
  } else {
    options.sort = { createdAt: -1 };
  }
  return options;
};

const buildPaginationOptions = (queryParams: any = {}) => {
  const options: any = {};
  const page = Number(queryParams.page) || 1;
  const limit = queryParams.limit ? Number(queryParams.limit) : 0;

  if (limit > 0) {
    options.skip = (page - 1) * limit;
    options.limit = limit;
  } else {
    options.skip = 0;
    options.limit = 0;
  }

  return options;
};

export function buildDynamicSearch(model: any, queryParams: any = {}) {
  const filter: any = {};
  const search: any = {};
  const options: any = {};

  // --- Search (dynamic string fields)
  if (queryParams.search) {
    const regex = new RegExp(queryParams.search, "i");
    const stringFields = Object.keys(model.schema.paths)
      .filter((key) => model.schema.paths[key].instance === "String");
    search.$or = stringFields.map((field) => ({ [field]: regex }));
  }

  // --- Filters
  Object.assign(filter, buildFilterFromQuery(queryParams));
  Object.keys(filter).forEach((key) => {
    const isStringField = model?.schema?.paths?.[key]?.instance === "String";
    if (!isStringField) return;

    const value = filter[key];
    if (typeof value === "string") {
      filter[key] = buildCaseInsensitiveExactRegex(value);
      return;
    }

    if (value && typeof value === "object" && Array.isArray(value.$in)) {
      filter[key] = {
        $in: value.$in.map((entry: any) =>
          typeof entry === "string"
            ? buildCaseInsensitiveExactRegex(entry)
            : entry
        ),
      };
    }
  });

  // --- Sorting
  Object.assign(options, buildSortOptions(queryParams));

  // --- Pagination
  Object.assign(options, buildPaginationOptions(queryParams));

  return { filter, search, options };
}

const normalizeComparable = (value: any) => {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "object" && typeof value.toString === "function") {
    return value.toString();
  }
  return value;
};

export function applyDynamicSearchToArray<T extends Record<string, any>>(
  items: T[],
  queryParams: any = {},
  options: { stringFields?: string[] } = {}
) {
  const filter = buildFilterFromQuery(queryParams);
  const sortOptions = buildSortOptions(queryParams).sort as Record<string, 1 | -1>;
  const pagination = buildPaginationOptions(queryParams);
  const searchTerm = queryParams.search ? String(queryParams.search) : "";
  const regex = searchTerm ? new RegExp(searchTerm, "i") : null;
  const stringFields = options.stringFields || [];

  let result = items.filter((item) => {
    if (regex && stringFields.length > 0) {
      const matches = stringFields.some((field) => {
        const value = item[field];
        if (value === undefined || value === null) return false;
        return regex.test(String(value));
      });
      if (!matches) return false;
    }

    return Object.keys(filter).every((key) => {
      const rule = filter[key];
      const itemValue = normalizeComparable(item[key]);
      if (rule && typeof rule === "object" && "$in" in rule) {
        return (rule.$in as any[]).some(
          (val) => {
            if (val instanceof RegExp) return val.test(String(itemValue ?? ""));
            if (typeof val === "string" && typeof itemValue === "string") {
              return val.toLowerCase() === itemValue.toLowerCase();
            }
            return normalizeComparable(val) === itemValue;
          }
        );
      }
      if (rule instanceof RegExp) return rule.test(String(itemValue ?? ""));
      if (typeof rule === "string" && typeof itemValue === "string") {
        return rule.toLowerCase() === itemValue.toLowerCase();
      }
      return normalizeComparable(rule) === itemValue;
    });
  });

  if (sortOptions && Object.keys(sortOptions).length > 0) {
    const sortFields = Object.keys(sortOptions);
    result = result.sort((a, b) => {
      for (const field of sortFields) {
        const direction = sortOptions[field];
        const aValue = normalizeComparable(a[field]);
        const bValue = normalizeComparable(b[field]);
        if (aValue === bValue) continue;
        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;
        return aValue > bValue ? direction : -direction;
      }
      return 0;
    });
  }

  const total = result.length;
  if (pagination.limit > 0) {
    result = result.slice(pagination.skip, pagination.skip + pagination.limit);
  }

  return { data: result, total };
}
