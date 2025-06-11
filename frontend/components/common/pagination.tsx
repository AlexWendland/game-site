type PaginationProps = {
  min: number;
  max: number;
  current: number;
  onChange: (page: number) => void;
};

const ELLIPSIS = "\u2026";
const LOWER_ELLIPSIS = "low-ellipsis";
const UPPER_ELLIPSIS = "up-ellipsis";
const PAGE_SIZE = 7;
const PAGE_EDGE_SIZE = 5;

function generatePageNumbers(
  min: number,
  max: number,
  current: number,
): (number | typeof LOWER_ELLIPSIS | typeof UPPER_ELLIPSIS)[] {
  // All pages can fit on one slider
  if (max - min + 1 <= PAGE_SIZE) {
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }
  // Close to the end
  if (current - min < PAGE_SIZE - 3) {
    return [
      ...Array.from({ length: PAGE_EDGE_SIZE }, (_, i) => min + i),
      UPPER_ELLIPSIS,
      max,
    ];
  }
  if (max - current < PAGE_SIZE - 3) {
    return [
      min,
      LOWER_ELLIPSIS,
      ...Array.from({ length: PAGE_EDGE_SIZE }, (_, i) => max - 4 + i),
    ];
  }
  // In the middle
  return [
    min,
    LOWER_ELLIPSIS,
    current - 1,
    current,
    current + 1,
    UPPER_ELLIPSIS,
    max,
  ];
}

export function Pagination({ min, max, current, onChange }: PaginationProps) {
  const handlePrev = () => {
    if (current > min) {
      onChange(current - 1);
    }
  };

  const handleNext = () => {
    if (current < max) {
      onChange(current + 1);
    }
  };

  const pages = generatePageNumbers(min, max, current);

  return (
    <nav className="flex items-center justify-center my-8">
      <ul className="flex items-center -space-x-px h-10 text-base transition-all duration-300">
        {/* Previous Arrow */}
        <li>
          <button
            onClick={handlePrev}
            disabled={current === min}
            className="flex items-center justify-center px-4 h-10 ms-0 leading-tight text-gray-500 bg-white border border-e-0 border-gray-300 rounded-s-lg enabled:hover:bg-gray-100 enabled:hover:text-gray-700 disabled:opacity-50"
          >
            <span className="sr-only">Previous</span>
            <svg
              className="w-3 h-3 rtl:rotate-180"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 6 10"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 1 1 5l4 4"
              />
            </svg>
          </button>
        </li>
        {/* Page Numbers or ellipsis */}
        {pages.map((pageNumber) => {
          if (pageNumber === LOWER_ELLIPSIS || pageNumber === UPPER_ELLIPSIS) {
            return (
              <li
                key={pageNumber}
                className="flex items-center justify-center px-4 h-10 w-10 sm:w-12 select-none"
              >
                <span className="text-gray-500">{ELLIPSIS}</span>
              </li>
            );
          }
          return (
            <li key={pageNumber}>
              <button
                onClick={() => onChange(pageNumber)}
                aria-current={current === pageNumber ? "page" : undefined}
                className={`flex items-center justify-center px-4 h-10 w-10 sm:w-12 leading-tight border border-gray-300 transition-colors duration-200
                ${
                  current === pageNumber
                    ? "z-10 text-white bg-blue-600 border-blue-600"
                    : "text-gray-500 bg-white hover:bg-gray-100 hover:text-gray-700"
                }
              `}
              >
                {pageNumber}
              </button>
            </li>
          );
        })}

        {/* Next Arrow */}
        <li>
          <button
            onClick={handleNext}
            disabled={current === max}
            className="flex items-center justify-center px-4 h-10 leading-tight text-gray-500 bg-white border border-gray-300 rounded-e-lg enabled:hover:bg-gray-100 enabled:hover:text-gray-700 disabled:opacity-50"
          >
            <span className="sr-only">Next</span>
            <svg
              className="w-3 h-3 rtl:rotate-180"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 6 10"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="m1 9 4-4-4-4"
              />
            </svg>
          </button>
        </li>
      </ul>
    </nav>
  );
}
