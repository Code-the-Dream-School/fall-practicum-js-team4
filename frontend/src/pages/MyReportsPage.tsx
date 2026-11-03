import { Link } from 'react-router';
import { PATHS } from '../app/paths';
import { buttonStyles, textStyles, colors, layout } from '../styles/theme';
import { useMyReports } from '../features/reports/hooks/useMyReports';

export function MyReportsPage() {
    const { data, isLoading, isError } = useMyReports();

    return (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
                <h1 style={textStyles.pageTitle}>My Reports</h1>
                <p style={textStyles.pageSubtitle}>
                    View and manage the pet reports you have submitted.
                </p>
            </div>

            {isLoading && <p>Loading your reports...</p>}
            
            {isError && (
                <p role="alert">
                    We couldn't load your reports. Please try again later.
                </p>
            )}

            {!isLoading && !isError && data?.reports.length === 0 && (
                <div>
                    <p>You haven't submitted any pet reports yet.</p>
                    <Link to={PATHS.reportPet} style={buttonStyles.outline}>
                        Create a report
                    </Link>
                </div>
            )}

            {!isLoading && !isError && data && data.reports.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <p style={textStyles.pageSubtitle}>
                        {data.total} {data.total === 1 ? 'report' : 'reports'}
                    </p>

                    {data.reports.map((report) => (
                        <article
                          key={report.petReportId}
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 16,
                            padding: 16,
                            border: `1px solid ${colors.border}`,
                            borderRadius:layout.radius,
                          }}
                        >
                          {report.photos?.[0] && (
                            <img
                              src={report.photos[0].imageUrl}
                              alt={`${report.petName || report.petType} photo`}
                              style={{
                                width: 120,
                                height: 120,
                                objectFit: 'cover',
                                borderRadius: layout.radius,
                              }}
                            />
                          )}

                          <div style={{ flex: 1, minWidth: 180 }}>
                            <h2 style={{ margin: '0 0 8px' }}>
                                {report.petName || report.petType}
                            </h2>

                            <p>
                                {report.reportType === 'LOST' ? 'Lost pet' : 'Found pet'} ·{' '}
                                {report.status === 'ACTIVE' ? 'Active' : 'Reunited'}
                            </p>

                            <p>Color: {report.color}</p>

                            <p>
                                Date: {new Date(report.eventDate).toLocaleDateString()}
                            </p>

                            {report.location && (
                                <p>
                                Location: {report.location.city}, {report.location.state}
                                </p>
                            )}

                            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                <Link
                                to={PATHS.petDetails(String(report.petReportId))}
                                style={textStyles.link}
                                >
                                View Report
                                </Link>

                                <Link
                                to={PATHS.editReport(String(report.petReportId))}
                                style={textStyles.link}
                                >
                                Edit Report
                                </Link>
                            </div>
                            </div>
                            </article>
                    ))}
                </div>
            )}
        </section>
    );
}