// Cards per page: two full rows of the 3-column grid, as in the design
export const REPORTS_PER_PAGE = 6;

// Pages to show: the first, the last, and the current one with its neighbours.
// Gaps become "…": 1 … 4 5 6 … 10
export const pageItems = (page: number, totalPages: number) => {
  const pages = [1, page - 1, page, page + 1, totalPages]
    .filter((p) => p >= 1 && p <= totalPages)
    .filter((p, i, all) => all.indexOf(p) === i)
    .sort((a, b) => a - b);

  const items: (number | 'gap')[] = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) items.push('gap');
    items.push(p);
  });
  return items;
};
