import { Empty } from './Loading.jsx';

/**
 * Generic, styled data table.
 *
 * columns: [{ key, header, render?(row), num?, width? }]
 * rows:    array of objects
 * onRowClick?: (row) => void
 */
export default function DataTable({ columns, rows, onRowClick, empty }) {
  if (!rows?.length) {
    return empty || <Empty />;
  }
  return (
    <div className="table-wrap">
      <table className="tbl">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={c.num ? 'num' : ''} style={c.width ? { width: c.width } : undefined}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.id || i}
              className={onRowClick ? 'clickable' : ''}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((c) => (
                <td key={c.key} className={c.num ? 'num' : ''}>
                  {c.render ? c.render(row) : row[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
