type Row = { cells: string[] };
type TableValue = { rows: Row[]; hasHeaderRow?: boolean };

export function TableBlock({ value }: { value: TableValue }) {
  const rows = value.rows ?? [];
  if (rows.length === 0) return null;

  const [headerRow, ...bodyRows] = value.hasHeaderRow ? rows : [null, ...rows];

  return (
    <div className="not-prose mx-auto my-[var(--space-10)] max-w-[52rem] overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border)]">
      <table className="w-full border-collapse text-left">
        {headerRow ? (
          <thead className="bg-[color-mix(in_srgb,var(--color-primary)_6%,transparent)]">
            <tr>
              {headerRow.cells.map((cell, i) => (
                <th
                  key={i}
                  className="border-b border-[var(--color-border)] px-4 py-3 font-display text-base text-[var(--color-primary)]"
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {bodyRows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-[var(--color-border)] last:border-0 hover:bg-[color-mix(in_srgb,var(--color-primary)_3%,transparent)]"
            >
              {row?.cells.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-[var(--color-text)]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
