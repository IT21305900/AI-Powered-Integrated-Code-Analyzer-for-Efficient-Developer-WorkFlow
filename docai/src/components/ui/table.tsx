import * as React from "react";

const Table = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <table className={`w-full border-collapse ${className}`}>{children}</table>
  );
};

const TableHeader = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return <thead className={`bg-gray-100 ${className}`}>{children}</thead>;
};

const TableRow = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return <tr className={`border-b ${className}`}>{children}</tr>;
};

const TableHead = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <th className={`px-4 py-2 text-left font-semibold ${className}`}>
      {children}
    </th>
  );
};

const TableBody = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return <tbody className={className}>{children}</tbody>;
};

const TableCell = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return <td className={`px-4 py-2 ${className}`}>{children}</td>;
};

export { Table, TableHeader, TableRow, TableHead, TableBody, TableCell };
