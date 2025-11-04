import { DataTable, type DataTableColumn, type DataTableProps } from 'mantine-datatable';

export type DataViewTableProps<T> = Partial<DataTableProps<T>> & {
    records: T[];
    columns: DataTableColumn<T>[];
};

export function DataViewTable<T>({
    records,
    columns,
    highlightOnHover = true,
    striped = true,
    withTableBorder = true,
    borderRadius = 'sm',
    ...rest
}: DataViewTableProps<T>) {
    return (
        <DataTable
            records={records}
            columns={columns}
            highlightOnHover={highlightOnHover}
            striped={striped}
            withTableBorder={withTableBorder}
            borderRadius={borderRadius}
            {...rest}
        />
    );
}
