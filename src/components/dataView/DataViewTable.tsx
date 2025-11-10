import { DataTable, type DataTableProps } from 'mantine-datatable';

export type DataViewTableProps<T> = {
    records: DataTableProps<T>['records'];
    columns: NonNullable<DataTableProps<T>['columns']>;
} & Omit<DataTableProps<T>, 'records' | 'columns' | 'groups' | 'customLoader'>;

export function DataViewTable<T>({
    records,
    columns,
    highlightOnHover = true,
    striped = true,
    withTableBorder = true,
    borderRadius = 'sm',
    ...rest
}: DataViewTableProps<T>) {
    const tableProps = {
        records,
        columns,
        highlightOnHover,
        striped,
        withTableBorder,
        borderRadius,
        ...rest,
    } as DataTableProps<T>;

    return <DataTable {...tableProps} />;
}
