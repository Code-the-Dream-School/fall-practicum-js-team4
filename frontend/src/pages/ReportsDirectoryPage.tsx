import { Link } from 'react-router';
import { PATHS } from '../app/paths';
import { buttonStyles, textStyles } from '../styles/theme';
import type { ReportListResponse, ReportType } from '../types/reports';
import { Icon } from '../components/Icon';
import { QueryView } from '../components/QueryView';
import {
  ReportFilters,
  ReportGrid,
  hasActiveFilters,
  useReportFilters,
  useReports,
} from '../features/reports';
import './ReportsDirectoryPage.css';

const CONTENT: Record<
  ReportType,
  {
    title: string;
    subtitle: string;
    cta: string;
    ctaTo: string;
    tone: 'lost' | 'found';
    loading: string;
    // Plural, lowercase: "3 lost pets"
    noun: string;
  }
> = {
  LOST: {
    title: 'Lost Pets Directory',
    subtitle: 'Community-reported missing pets.',
    cta: '+ File Lost Pet Report',
    ctaTo: PATHS.reportLost,
    tone: 'lost',
    loading: 'Loading lost pets...',
    noun: 'lost pets',
  },
  FOUND: {
    title: 'Found Pets Directory',
    subtitle: 'Pets found and waiting for their families.',
    cta: '+ File Found Pet Report',
    ctaTo: PATHS.reportFound,
    tone: 'found',
    loading: 'Loading found pets...',
    noun: 'found pets',
  },
};

// "3 lost pets match your filters", "Showing 20 of 45 lost pets"
const resultsSummary = (
  { reports, total }: ReportListResponse,
  noun: string,
  filtered: boolean,
) => {
  const count =
    total === 1 ? `1 ${noun.replace(/s$/, '')}` : `${total} ${noun}`;
  const shown =
    reports.length < total ? `Showing ${reports.length} of ${count}` : count;
  if (!filtered) return shown;
  return reports.length < total
    ? `${shown} matching your filters`
    : `${count} ${total === 1 ? 'matches' : 'match'} your filters`;
};

interface ReportsDirectoryPageProps {
  reportType: ReportType;
}

export function ReportsDirectoryPage({
  reportType,
}: ReportsDirectoryPageProps) {
  const content = CONTENT[reportType];
  const { filters, updateFilters, clearFilters } = useReportFilters();
  const query = useReports({ type: reportType, ...filters });
  const filtered = hasActiveFilters(filters);
  // Older results stay visible while the new ones load
  const updating = query.isPlaceholderData;

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div>
          <h1 style={textStyles.pageTitle}>{content.title}</h1>
          <p style={textStyles.pageSubtitle}>{content.subtitle}</p>
        </div>
        <Link
          to={content.ctaTo}
          className={`directory-cta directory-cta--${content.tone}`}
        >
          <Icon
            name={content.tone === 'lost' ? 'add_alert' : 'add_location_alt'}
          />
          {content.cta}
        </Link>
      </div>

      <ReportFilters
        filters={filters}
        onChange={updateFilters}
        onClear={clearFilters}
        noun={content.noun}
      />

      <QueryView query={query} loading={content.loading}>
        {(data) => (
          <div
            className="directory-results"
            aria-busy={updating}
            data-updating={updating || undefined}
          >
            <p role="status" className="directory-results__count">
              {resultsSummary(data, content.noun, filtered)}
            </p>
            {filtered && data.reports.length === 0 ? (
              <div className="reports-empty">
                <Icon name="search_off" />
                <h2>No {content.noun} match your search</h2>
                <p>Try other words, or remove a filter.</p>
                <button
                  type="button"
                  onClick={clearFilters}
                  style={buttonStyles.outline}
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <ReportGrid reports={data.reports} reportType={reportType} />
            )}
          </div>
        )}
      </QueryView>
    </section>
  );
}
