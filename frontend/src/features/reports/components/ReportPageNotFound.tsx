import { Icon } from '../../../components/Icon';
import { buttonStyles } from '../../../styles/theme';
import './ReportGrid.css';

interface ReportPageNotFoundProps {
  page: number;
  totalPages: number;
  onGoToFirstPage: () => void;
}

export function ReportPageNotFound({
  page,
  totalPages,
  onGoToFirstPage,
}: ReportPageNotFoundProps) {
  return (
    <div className="reports-empty">
      <Icon name="find_in_page" />
      <h2> There's no page {page}</h2>
      <p>
        The list has {totalPages} {totalPages === 1 ? 'page' : 'pages'}.
      </p>
      <button
        type="button"
        onClick={onGoToFirstPage}
        style={buttonStyles.outline}
      >
        Go to the first page
      </button>
    </div>
  );
}
